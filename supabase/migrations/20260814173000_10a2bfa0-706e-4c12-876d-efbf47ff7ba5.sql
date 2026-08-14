-- Migration corretiva. A primeira migration de grupos/pastas criava a
-- política de processos_select referenciando processos.pasta_id antes de
-- essa coluna existir (ela só era criada na migration seguinte), o que
-- pode ter travado a aplicação daquela migration e das seguintes. Tudo
-- abaixo é idempotente (IF NOT EXISTS / CREATE OR REPLACE / DROP+CREATE
-- POLICY / ON CONFLICT), então pode rodar com segurança independente do
-- que já tiver sido aplicado antes.

-- 1) Tabelas de grupos/pastas/membros (idempotente)
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

-- 2) Funções (idempotente)
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

REVOKE ALL ON FUNCTION public.e_dono_grupo(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.membro_do_grupo(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.e_dono_grupo(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.membro_do_grupo(uuid) TO authenticated, service_role;

-- 3) Políticas de grupos/pastas/grupo_membros (idempotente)
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

DROP POLICY IF EXISTS grupo_membros_select ON public.grupo_membros;
CREATE POLICY grupo_membros_select ON public.grupo_membros FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.e_dono_grupo(grupo_id));
DROP POLICY IF EXISTS grupo_membros_insert ON public.grupo_membros;
CREATE POLICY grupo_membros_insert ON public.grupo_membros FOR INSERT TO authenticated
  WITH CHECK (public.e_dono_grupo(grupo_id) AND created_by = auth.uid());
DROP POLICY IF EXISTS grupo_membros_delete ON public.grupo_membros;
CREATE POLICY grupo_membros_delete ON public.grupo_membros FOR DELETE TO authenticated
  USING (public.e_dono_grupo(grupo_id));

-- 4) RPCs de gestão de membros (idempotente)
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

-- 5) Colunas em processos (idempotente) — isso precisa vir ANTES de
-- qualquer política que referencie pasta_id, que é exatamente o que
-- faltou na migration original.
ALTER TABLE public.processos
  ADD COLUMN IF NOT EXISTS pasta_id uuid REFERENCES public.pastas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS processo_pai_id uuid REFERENCES public.processos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tipo_desdobramento text;

DO $$ BEGIN
  ALTER TABLE public.processos ADD CONSTRAINT processos_tipo_desdobramento_check
    CHECK (tipo_desdobramento IS NULL OR tipo_desdobramento IN (
      'Recurso', 'Cumprimento de sentença', 'Execução', 'Embargos', 'Agravo', 'Outro'
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_processos_pasta ON public.processos (pasta_id);
CREATE INDEX IF NOT EXISTS idx_processos_pai ON public.processos (processo_pai_id);

-- 6) Funções que dependem de pasta_id/grupo_membros (agora seguro)
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

REVOKE ALL ON FUNCTION public.membro_do_grupo_do_processo(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.pode_visualizar_processo(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.membro_do_grupo_do_processo(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.pode_visualizar_processo(uuid) TO authenticated, service_role;

-- 7) Agora sim, políticas de processos/movimentações que referenciam
-- pasta_id (coluna já existe, criada no passo 5 acima).
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

-- 8) Estrutura inicial de grupos/pastas (idempotente)
DO $$
DECLARE
  _sc_id uuid;
  _astro_id uuid;
BEGIN
  INSERT INTO public.grupos (nome) VALUES ('Equipe Souza Cruz')
    ON CONFLICT (nome) DO UPDATE SET nome = EXCLUDED.nome
    RETURNING id INTO _sc_id;
  INSERT INTO public.grupos (nome) VALUES ('Equipe Astro')
    ON CONFLICT (nome) DO UPDATE SET nome = EXCLUDED.nome
    RETURNING id INTO _astro_id;

  INSERT INTO public.pastas (grupo_id, nome) VALUES
    (_sc_id, 'BDR'), (_sc_id, 'BBS'), (_sc_id, 'MLV'), (_sc_id, 'JGV'), (_sc_id, 'ELV'),
    (_astro_id, 'Perfis MLV (ações de cobrança)'), (_astro_id, 'BDR'),
    (_astro_id, 'RJ Astromaritima'), (_astro_id, 'RJ Astro Navegação')
  ON CONFLICT (grupo_id, nome) DO NOTHING;
END $$;

-- 9) Backfill por carteira/partes (só toca quem ainda não tem pasta)
UPDATE public.processos p
SET pasta_id = pa.id
FROM public.pastas pa
JOIN public.grupos g ON g.id = pa.grupo_id
WHERE p.pasta_id IS NULL
  AND p.carteira IS NOT NULL
  AND (
    (
      g.nome = 'Equipe Astro'
      AND (
        p.cliente ILIKE '%astro%' OR p.autor ILIKE '%astro%'
        OR p.reu ILIKE '%astro%' OR p.parte_contraria ILIKE '%astro%'
      )
      AND (
        lower(trim(p.carteira)) = lower(pa.nome)
        OR (lower(trim(p.carteira)) = 'mlv' AND pa.nome = 'Perfis MLV (ações de cobrança)')
      )
    )
    OR
    (
      g.nome = 'Equipe Souza Cruz'
      AND NOT (
        p.cliente ILIKE '%astro%' OR p.autor ILIKE '%astro%'
        OR p.reu ILIKE '%astro%' OR p.parte_contraria ILIKE '%astro%'
      )
      AND lower(trim(p.carteira)) = lower(pa.nome)
    )
  );

-- 10) Quem ainda ficou sem pasta vai para Equipe Souza Cruz > BDR
UPDATE public.processos p
SET pasta_id = pa.id
FROM public.pastas pa
JOIN public.grupos g ON g.id = pa.grupo_id
WHERE p.pasta_id IS NULL
  AND g.nome = 'Equipe Souza Cruz'
  AND pa.nome = 'BDR';

-- 11) Correção do critério de duplicados: número antigo de um processo
-- batendo com o número atual de outro processo NÃO é necessariamente o
-- mesmo caso cadastrado duas vezes — pode ser um desdobramento (recurso,
-- cumprimento de sentença) que referencia o número do processo original.
-- Em vez de mesclar/apagar (como a migration anterior de limpeza de
-- duplicados fazia), agora só vincula como desdobramento, preservando os
-- dois registros.
UPDATE public.processos p1
SET processo_pai_id = p2.id
FROM public.processos p2
WHERE p1.id <> p2.id
  AND p1.processo_pai_id IS NULL
  AND p1.numero_antigo IS NOT NULL
  AND regexp_replace(p1.numero_antigo, '\D', '', 'g') <> ''
  AND regexp_replace(p2.numero_cnj, '\D', '', 'g') = regexp_replace(p1.numero_antigo, '\D', '', 'g')
  AND p2.processo_pai_id IS DISTINCT FROM p1.id;
