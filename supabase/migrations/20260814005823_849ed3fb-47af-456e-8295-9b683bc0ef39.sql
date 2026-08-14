-- 1. Papéis
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin','member');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

DROP POLICY IF EXISTS user_roles_select_own ON public.user_roles;
CREATE POLICY user_roles_select_own ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- bootstrap: usuários existentes viram admin
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users
ON CONFLICT (user_id, role) DO NOTHING;

-- 2. Compartilhamento de processos
CREATE TABLE IF NOT EXISTS public.processo_acessos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id uuid NOT NULL REFERENCES public.processos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (processo_id, user_id)
);

GRANT SELECT, INSERT, DELETE ON public.processo_acessos TO authenticated;
GRANT ALL ON public.processo_acessos TO service_role;
ALTER TABLE public.processo_acessos ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.pode_acessar_processo(_processo_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.processos p
    WHERE p.id = _processo_id
      AND (p.created_by = auth.uid()
           OR public.has_role(auth.uid(), 'admin')
           OR EXISTS (SELECT 1 FROM public.processo_acessos a
                      WHERE a.processo_id = p.id AND a.user_id = auth.uid()))
  );
$$;

CREATE OR REPLACE FUNCTION public.e_dono_processo(_processo_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.processos p
    WHERE p.id = _processo_id
      AND (p.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  );
$$;

DROP POLICY IF EXISTS processo_acessos_select ON public.processo_acessos;
CREATE POLICY processo_acessos_select ON public.processo_acessos FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.e_dono_processo(processo_id));
DROP POLICY IF EXISTS processo_acessos_insert ON public.processo_acessos;
CREATE POLICY processo_acessos_insert ON public.processo_acessos FOR INSERT TO authenticated
  WITH CHECK (public.e_dono_processo(processo_id) AND created_by = auth.uid());
DROP POLICY IF EXISTS processo_acessos_delete ON public.processo_acessos;
CREATE POLICY processo_acessos_delete ON public.processo_acessos FOR DELETE TO authenticated
  USING (public.e_dono_processo(processo_id));

-- 3. Processos
DROP POLICY IF EXISTS processos_team_all ON public.processos;
ALTER TABLE public.processos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.processos FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.processos TO authenticated;
GRANT ALL ON public.processos TO service_role;

CREATE POLICY processos_select ON public.processos FOR SELECT TO authenticated
  USING (created_by = auth.uid()
         OR public.has_role(auth.uid(), 'admin')
         OR EXISTS (SELECT 1 FROM public.processo_acessos a
                    WHERE a.processo_id = processos.id AND a.user_id = auth.uid()));
CREATE POLICY processos_insert ON public.processos FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY processos_update ON public.processos FOR UPDATE TO authenticated
  USING (created_by = auth.uid()
         OR public.has_role(auth.uid(), 'admin')
         OR EXISTS (SELECT 1 FROM public.processo_acessos a
                    WHERE a.processo_id = processos.id AND a.user_id = auth.uid()))
  WITH CHECK (created_by = auth.uid()
         OR public.has_role(auth.uid(), 'admin')
         OR EXISTS (SELECT 1 FROM public.processo_acessos a
                    WHERE a.processo_id = processos.id AND a.user_id = auth.uid()));
CREATE POLICY processos_delete ON public.processos FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- 4. Movimentações (herdam do processo)
DROP POLICY IF EXISTS movimentacoes_team_all ON public.movimentacoes;
ALTER TABLE public.movimentacoes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.movimentacoes FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.movimentacoes TO authenticated;
GRANT ALL ON public.movimentacoes TO service_role;

CREATE POLICY movimentacoes_select ON public.movimentacoes FOR SELECT TO authenticated
  USING (public.pode_acessar_processo(processo_id));
CREATE POLICY movimentacoes_insert ON public.movimentacoes FOR INSERT TO authenticated
  WITH CHECK (public.pode_acessar_processo(processo_id) AND created_by = auth.uid());
CREATE POLICY movimentacoes_update ON public.movimentacoes FOR UPDATE TO authenticated
  USING (public.pode_acessar_processo(processo_id))
  WITH CHECK (public.pode_acessar_processo(processo_id));
CREATE POLICY movimentacoes_delete ON public.movimentacoes FOR DELETE TO authenticated
  USING (public.pode_acessar_processo(processo_id));

-- 5. Verificações (logs)
DROP POLICY IF EXISTS verificacoes_team_all ON public.verificacoes;
ALTER TABLE public.verificacoes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.verificacoes FROM anon;
REVOKE UPDATE, DELETE ON public.verificacoes FROM authenticated;
GRANT SELECT, INSERT ON public.verificacoes TO authenticated;
GRANT ALL ON public.verificacoes TO service_role;

CREATE POLICY verificacoes_select ON public.verificacoes FOR SELECT TO authenticated
  USING (executado_por = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY verificacoes_insert ON public.verificacoes FOR INSERT TO authenticated
  WITH CHECK (executado_por = auth.uid());

-- 6. Perfis
DROP POLICY IF EXISTS profiles_select_team ON public.profiles;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.profiles FROM anon;

CREATE POLICY profiles_select_own ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));