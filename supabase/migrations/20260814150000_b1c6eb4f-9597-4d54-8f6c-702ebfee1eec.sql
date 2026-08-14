-- Grupos (equipes) e Pastas: organização hierárquica de processos e acesso
-- em bloco (ex.: liberar uma coordenadora para todos os processos de um
-- grupo inteiro, sem precisar compartilhar processo a processo).

CREATE TABLE IF NOT EXISTS public.grupos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.grupos TO authenticated;
GRANT ALL ON public.grupos TO service_role;
ALTER TABLE public.grupos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.grupos FROM anon;

CREATE TABLE IF NOT EXISTS public.pastas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id uuid NOT NULL REFERENCES public.grupos(id) ON DELETE CASCADE,
  nome text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (grupo_id, nome)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pastas TO authenticated;
GRANT ALL ON public.pastas TO service_role;
ALTER TABLE public.pastas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pastas FROM anon;
CREATE INDEX IF NOT EXISTS idx_pastas_grupo ON public.pastas (grupo_id);

CREATE TABLE IF NOT EXISTS public.grupo_membros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id uuid NOT NULL REFERENCES public.grupos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (grupo_id, user_id)
);

GRANT SELECT, INSERT, DELETE ON public.grupo_membros TO authenticated;
GRANT ALL ON public.grupo_membros TO service_role;
ALTER TABLE public.grupo_membros ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.grupo_membros FROM anon;
CREATE INDEX IF NOT EXISTS idx_grupo_membros_grupo ON public.grupo_membros (grupo_id);
CREATE INDEX IF NOT EXISTS idx_grupo_membros_user ON public.grupo_membros (user_id);

-- Dono de um grupo: quem criou ou admin
CREATE OR REPLACE FUNCTION public.e_dono_grupo(_grupo_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.grupos g
    WHERE g.id = _grupo_id
      AND (g.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  );
$$;

CREATE OR REPLACE FUNCTION public.membro_do_grupo(_grupo_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.grupo_membros m
    WHERE m.grupo_id = _grupo_id AND m.user_id = auth.uid()
  );
$$;

-- Acesso de leitura (perfil de consulta) por pertencer ao grupo dono da
-- pasta do processo. Concede apenas visualização — não some com o modelo
-- de edição existente (dono/admin/compartilhamento individual).
CREATE OR REPLACE FUNCTION public.membro_do_grupo_do_processo(_processo_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.processos p
    JOIN public.pastas pa ON pa.id = p.pasta_id
    JOIN public.grupo_membros gm ON gm.grupo_id = pa.grupo_id
    WHERE p.id = _processo_id AND gm.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.pode_visualizar_processo(_processo_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.pode_acessar_processo(_processo_id)
         OR public.membro_do_grupo_do_processo(_processo_id);
$$;

REVOKE ALL ON FUNCTION public.e_dono_grupo(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.membro_do_grupo(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.membro_do_grupo_do_processo(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.pode_visualizar_processo(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.e_dono_grupo(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.membro_do_grupo(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.membro_do_grupo_do_processo(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.pode_visualizar_processo(uuid) TO authenticated, service_role;

-- Políticas: grupos e pastas são visíveis para toda a equipe (nomes de
-- pasta não são sensíveis e precisam aparecer em seletores/filtros), mas só
-- quem criou o grupo (ou admin) pode gerenciar.
DROP POLICY IF EXISTS grupos_select ON public.grupos;
CREATE POLICY grupos_select ON public.grupos FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS grupos_insert ON public.grupos;
CREATE POLICY grupos_insert ON public.grupos FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND created_by = auth.uid());
DROP POLICY IF EXISTS grupos_update ON public.grupos;
CREATE POLICY grupos_update ON public.grupos FOR UPDATE TO authenticated
  USING (public.e_dono_grupo(id)) WITH CHECK (public.e_dono_grupo(id));
DROP POLICY IF EXISTS grupos_delete ON public.grupos;
CREATE POLICY grupos_delete ON public.grupos FOR DELETE TO authenticated
  USING (public.e_dono_grupo(id));

DROP POLICY IF EXISTS pastas_select ON public.pastas;
CREATE POLICY pastas_select ON public.pastas FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS pastas_insert ON public.pastas;
CREATE POLICY pastas_insert ON public.pastas FOR INSERT TO authenticated
  WITH CHECK (public.e_dono_grupo(grupo_id) AND created_by = auth.uid());
DROP POLICY IF EXISTS pastas_update ON public.pastas;
CREATE POLICY pastas_update ON public.pastas FOR UPDATE TO authenticated
  USING (public.e_dono_grupo(grupo_id)) WITH CHECK (public.e_dono_grupo(grupo_id));
DROP POLICY IF EXISTS pastas_delete ON public.pastas;
CREATE POLICY pastas_delete ON public.pastas FOR DELETE TO authenticated
  USING (public.e_dono_grupo(grupo_id));

-- grupo_membros: só o dono do grupo (ou admin) vê/gerencia a lista de
-- membros; o próprio membro também consegue ver que está no grupo.
DROP POLICY IF EXISTS grupo_membros_select ON public.grupo_membros;
CREATE POLICY grupo_membros_select ON public.grupo_membros FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.e_dono_grupo(grupo_id));
DROP POLICY IF EXISTS grupo_membros_insert ON public.grupo_membros;
CREATE POLICY grupo_membros_insert ON public.grupo_membros FOR INSERT TO authenticated
  WITH CHECK (public.e_dono_grupo(grupo_id) AND created_by = auth.uid());
DROP POLICY IF EXISTS grupo_membros_delete ON public.grupo_membros;
CREATE POLICY grupo_membros_delete ON public.grupo_membros FOR DELETE TO authenticated
  USING (public.e_dono_grupo(grupo_id));

-- RPC: adicionar membro por e-mail (mesmo padrão de compartilhar_processo)
CREATE OR REPLACE FUNCTION public.adicionar_membro_grupo(_grupo_id uuid, _email text)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
  _id uuid;
BEGIN
  IF NOT public.e_dono_grupo(_grupo_id) THEN
    RAISE EXCEPTION 'Sem permissão para gerenciar membros deste grupo';
  END IF;

  SELECT id INTO _user_id
  FROM public.profiles
  WHERE lower(email) = lower(trim(_email))
  LIMIT 1;

  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Nenhum usuário cadastrado com esse e-mail';
  END IF;

  INSERT INTO public.grupo_membros (grupo_id, user_id, created_by)
  VALUES (_grupo_id, _user_id, auth.uid())
  ON CONFLICT DO NOTHING
  RETURNING id INTO _id;

  IF _id IS NULL THEN
    SELECT m.id INTO _id FROM public.grupo_membros m
    WHERE m.grupo_id = _grupo_id AND m.user_id = _user_id;
  END IF;

  RETURN _id;
END;
$$;

REVOKE ALL ON FUNCTION public.adicionar_membro_grupo(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.adicionar_membro_grupo(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.listar_membros_grupo(_grupo_id uuid)
RETURNS TABLE (membro_id uuid, user_id uuid, nome text, email text, created_at timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.e_dono_grupo(_grupo_id) THEN
    RAISE EXCEPTION 'Sem permissão para ver os membros deste grupo';
  END IF;

  RETURN QUERY
  SELECT m.id, m.user_id, p.nome, p.email, m.created_at
  FROM public.grupo_membros m
  LEFT JOIN public.profiles p ON p.id = m.user_id
  WHERE m.grupo_id = _grupo_id
  ORDER BY m.created_at;
END;
$$;

REVOKE ALL ON FUNCTION public.listar_membros_grupo(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.listar_membros_grupo(uuid) TO authenticated;

-- Estende a visualização (SELECT) de processos e movimentações para quem
-- pertence ao grupo dono da pasta do processo — sem alterar quem pode
-- editar/excluir (isso continua exigindo dono, admin ou compartilhamento
-- individual via processo_acessos).
DROP POLICY IF EXISTS processos_select ON public.processos;
CREATE POLICY processos_select ON public.processos FOR SELECT TO authenticated
  USING (created_by = auth.uid()
         OR public.has_role(auth.uid(), 'admin')
         OR EXISTS (SELECT 1 FROM public.processo_acessos a
                    WHERE a.processo_id = processos.id AND a.user_id = auth.uid())
         OR (pasta_id IS NOT NULL AND public.membro_do_grupo_do_processo(processos.id)));

DROP POLICY IF EXISTS movimentacoes_select ON public.movimentacoes;
CREATE POLICY movimentacoes_select ON public.movimentacoes FOR SELECT TO authenticated
  USING (public.pode_visualizar_processo(processo_id));
