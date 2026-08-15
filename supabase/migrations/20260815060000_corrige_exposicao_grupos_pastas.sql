-- Corrige os 4 problemas apontados pelo scanner de segurança:
--
-- 1) (Crítico) grupos_select estava "USING (true)" — qualquer usuário
--    autenticado via qualquer nome de grupo do escritório, mesmo sem
--    nenhuma relação com ele.
-- 2) (Crítico) pastas_select tinha o mesmo problema.
-- 3) (Aviso) convites_grupo não tinha política nem GRANT de INSERT/UPDATE
--    explícitos — funcionava só por depender implicitamente da RPC
--    SECURITY DEFINER, sem controle direto na tabela.
-- 4) (Aviso) handle_new_user() e restringir_dominio_email() são
--    SECURITY DEFINER e nunca tiveram o EXECUTE revogado de PUBLIC —
--    ambas são triggers em auth.users, então não precisam de EXECUTE
--    concedido a ninguém (o Postgres chama triggers direto, sem checar
--    essa permissão).

-- 1) e 2): só quem já pode gerenciar o grupo (dono/admin) ou é membro
-- dele (do grupo inteiro ou só de uma pasta específica) enxerga o nome
-- do grupo/pasta.
DROP POLICY IF EXISTS grupos_select ON public.grupos;
CREATE POLICY grupos_select ON public.grupos FOR SELECT TO authenticated
  USING (public.e_dono_grupo(id) OR public.membro_do_grupo(id));

DROP POLICY IF EXISTS pastas_select ON public.pastas;
CREATE POLICY pastas_select ON public.pastas FOR SELECT TO authenticated
  USING (
    public.e_dono_grupo(grupo_id)
    OR public.membro_do_grupo(grupo_id)
    OR EXISTS (
      SELECT 1 FROM public.pasta_membros pm
      WHERE pm.pasta_id = pastas.id AND pm.user_id = auth.uid()
    )
  );

-- 3) Controle explícito de insert/update em convites_grupo, espelhando
-- exatamente a mesma regra que a RPC adicionar_membro_grupo já aplica
-- (só o dono do grupo/admin gerencia convites daquele grupo).
GRANT INSERT, UPDATE ON public.convites_grupo TO authenticated;

DROP POLICY IF EXISTS convites_grupo_insert ON public.convites_grupo;
CREATE POLICY convites_grupo_insert ON public.convites_grupo FOR INSERT TO authenticated
  WITH CHECK (public.e_dono_grupo(grupo_id) AND created_by = auth.uid());

DROP POLICY IF EXISTS convites_grupo_update ON public.convites_grupo;
CREATE POLICY convites_grupo_update ON public.convites_grupo FOR UPDATE TO authenticated
  USING (public.e_dono_grupo(grupo_id)) WITH CHECK (public.e_dono_grupo(grupo_id));

-- 4) Essas duas só disparam via trigger em auth.users — não precisam de
-- EXECUTE concedido a nenhum papel.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.restringir_dominio_email() FROM PUBLIC, anon, authenticated;
