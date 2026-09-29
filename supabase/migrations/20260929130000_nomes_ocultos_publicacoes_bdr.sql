-- Lista de nomes (partes/clientes) que a BDR quer esconder dos
-- resultados de "Publicações BDR" -- a busca ali é só por nome/OAB dela,
-- então traz publicação de qualquer processo onde ela aparece, mesmo os
-- que não são da equipe dela. Tabela própria, sem nenhuma relação com
-- advogados_fixados_djen, pra não arriscar mexer naquilo.
CREATE TABLE IF NOT EXISTS public.nomes_ocultos_publicacoes_bdr (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nomes_ocultos_publicacoes_bdr_user
  ON public.nomes_ocultos_publicacoes_bdr(user_id, ordem);

ALTER TABLE public.nomes_ocultos_publicacoes_bdr ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.nomes_ocultos_publicacoes_bdr FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nomes_ocultos_publicacoes_bdr TO authenticated;

DROP POLICY IF EXISTS nomes_ocultos_publicacoes_bdr_select ON public.nomes_ocultos_publicacoes_bdr;
CREATE POLICY nomes_ocultos_publicacoes_bdr_select ON public.nomes_ocultos_publicacoes_bdr
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS nomes_ocultos_publicacoes_bdr_insert ON public.nomes_ocultos_publicacoes_bdr;
CREATE POLICY nomes_ocultos_publicacoes_bdr_insert ON public.nomes_ocultos_publicacoes_bdr
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS nomes_ocultos_publicacoes_bdr_update ON public.nomes_ocultos_publicacoes_bdr;
CREATE POLICY nomes_ocultos_publicacoes_bdr_update ON public.nomes_ocultos_publicacoes_bdr
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS nomes_ocultos_publicacoes_bdr_delete ON public.nomes_ocultos_publicacoes_bdr;
CREATE POLICY nomes_ocultos_publicacoes_bdr_delete ON public.nomes_ocultos_publicacoes_bdr
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
