-- Generaliza nomes_ocultos_publicacoes_bdr pra também cobrir a busca
-- geral de Publicações (não só o card "Publicações BDR"), mesmo padrão
-- de "contexto" já usado em advogados_fixados_djen (uma tabela, listas
-- independentes por contexto). Linhas existentes continuam valendo
-- pra "Publicações BDR" (default 'bdr').
ALTER TABLE public.nomes_ocultos_publicacoes_bdr
  ADD COLUMN IF NOT EXISTS contexto text NOT NULL DEFAULT 'bdr';

DROP INDEX IF EXISTS idx_nomes_ocultos_publicacoes_bdr_user;
CREATE INDEX IF NOT EXISTS idx_nomes_ocultos_publicacoes_bdr_user
  ON public.nomes_ocultos_publicacoes_bdr(user_id, contexto, ordem);

NOTIFY pgrst, 'reload schema';
