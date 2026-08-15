-- Até agora só dava pra liberar acesso a um grupo inteiro (todas as
-- pastas dele) ou processo por processo. Isso adiciona um meio-termo:
-- liberar acesso só a uma pasta específica dentro de um grupo (ex.: só
-- "Perfis MLV (ações de cobrança)" da Equipe Astro, sem dar acesso às
-- outras pastas do mesmo grupo).
--
-- Idempotente (IF NOT EXISTS / CREATE OR REPLACE / DROP+CREATE POLICY),
-- pode rodar com segurança mesmo que parte já tenha sido aplicada.

CREATE TABLE IF NOT EXISTS public.pasta_membros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pasta_id uuid NOT NULL REFERENCES public.pastas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pasta_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.pasta_membros TO authenticated;
GRANT ALL ON public.pasta_membros TO service_role;
ALTER TABLE public.pasta_membros ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pasta_membros FROM anon;
CREATE INDEX IF NOT EXISTS idx_pasta_membros_pasta ON public.pasta_membros (pasta_id);
CREATE INDEX IF NOT EXISTS idx_pasta_membros_user ON public.pasta_membros (user_id);

-- Quem pode gerenciar os membros de uma pasta é quem já pode gerenciar o
-- grupo dela — não existe um "dono da pasta" separado do dono do grupo.
CREATE OR REPLACE FUNCTION public.e_dono_pasta(_pasta_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pastas pa
    WHERE pa.id = _pasta_id AND public.e_dono_grupo(pa.grupo_id)
  );
$$;

REVOKE ALL ON FUNCTION public.e_dono_pasta(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.e_dono_pasta(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS pasta_membros_select ON public.pasta_membros;
CREATE POLICY pasta_membros_select ON public.pasta_membros FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.e_dono_pasta(pasta_id));
DROP POLICY IF EXISTS pasta_membros_insert ON public.pasta_membros;
CREATE POLICY pasta_membros_insert ON public.pasta_membros FOR INSERT TO authenticated
  WITH CHECK (public.e_dono_pasta(pasta_id) AND created_by = auth.uid());
DROP POLICY IF EXISTS pasta_membros_delete ON public.pasta_membros;
CREATE POLICY pasta_membros_delete ON public.pasta_membros FOR DELETE TO authenticated
  USING (public.e_dono_pasta(pasta_id));

-- Estende a checagem de acesso (usada por processos_select e, através de
-- pode_visualizar_processo, por movimentacoes_select) pra também
-- considerar quem tem acesso liberado só pra pasta do processo, mesmo
-- sem ser membro do grupo inteiro. Mesma assinatura de antes — as
-- políticas que já chamam essa função não precisam mudar.
CREATE OR REPLACE FUNCTION public.membro_do_grupo_do_processo(_processo_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.processos p
    JOIN public.pastas pa ON pa.id = p.pasta_id
    WHERE p.id = _processo_id
      AND (
        EXISTS (SELECT 1 FROM public.grupo_membros gm
                WHERE gm.grupo_id = pa.grupo_id AND gm.user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.pasta_membros pm
                   WHERE pm.pasta_id = pa.id AND pm.user_id = auth.uid())
      )
  );
$$;

-- RPCs de gestão de membros da pasta, espelhando as de grupo — mas sem
-- convite pendente pra e-mail sem conta ainda (dá erro claro em vez de
-- guardar convite), já que é um caso de uso mais pontual.
CREATE OR REPLACE FUNCTION public.adicionar_membro_pasta(_pasta_id uuid, _email text)
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
  IF NOT public.e_dono_pasta(_pasta_id) THEN
    RAISE EXCEPTION 'Sem permissão para gerenciar membros desta pasta';
  END IF;

  SELECT id INTO _user_id
  FROM public.profiles
  WHERE lower(email) = lower(trim(_email))
  LIMIT 1;

  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Nenhum usuário cadastrado com esse e-mail';
  END IF;

  INSERT INTO public.pasta_membros (pasta_id, user_id, created_by)
  VALUES (_pasta_id, _user_id, auth.uid())
  ON CONFLICT DO NOTHING
  RETURNING id INTO _id;

  IF _id IS NULL THEN
    SELECT m.id INTO _id FROM public.pasta_membros m
    WHERE m.pasta_id = _pasta_id AND m.user_id = _user_id;
  END IF;

  RETURN _id;
END;
$$;

REVOKE ALL ON FUNCTION public.adicionar_membro_pasta(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.adicionar_membro_pasta(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.listar_membros_pasta(_pasta_id uuid)
RETURNS TABLE (membro_id uuid, user_id uuid, nome text, email text, created_at timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.e_dono_pasta(_pasta_id) THEN
    RAISE EXCEPTION 'Sem permissão para ver os membros desta pasta';
  END IF;

  RETURN QUERY
  SELECT m.id, m.user_id, p.nome, p.email, m.created_at
  FROM public.pasta_membros m
  LEFT JOIN public.profiles p ON p.id = m.user_id
  WHERE m.pasta_id = _pasta_id
  ORDER BY m.created_at;
END;
$$;

REVOKE ALL ON FUNCTION public.listar_membros_pasta(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.listar_membros_pasta(uuid) TO authenticated;
