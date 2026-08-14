ALTER TABLE public.processos
  ADD COLUMN IF NOT EXISTS numero_interno text,
  ADD COLUMN IF NOT EXISTS numero_antigo text,
  ADD COLUMN IF NOT EXISTS autor text,
  ADD COLUMN IF NOT EXISTS reu text,
  ADD COLUMN IF NOT EXISTS uf text,
  ADD COLUMN IF NOT EXISTS sistema text,
  ADD COLUMN IF NOT EXISTS carteira text;

ALTER TABLE public.movimentacoes
  ADD COLUMN IF NOT EXISTS observacao text;

CREATE UNIQUE INDEX IF NOT EXISTS movimentacoes_dedupe_idx
  ON public.movimentacoes (processo_id, data_movimentacao, md5(descricao));

CREATE INDEX IF NOT EXISTS processos_carteira_idx ON public.processos (carteira);