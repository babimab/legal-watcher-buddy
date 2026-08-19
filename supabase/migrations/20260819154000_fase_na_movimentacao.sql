-- Guarda na própria movimentação a alteração de fase feita no mesmo lançamento.
-- A exclusão de uma movimentação não reverte automaticamente a fase do processo.
ALTER TABLE public.movimentacoes
  ADD COLUMN IF NOT EXISTS fase_anterior text,
  ADD COLUMN IF NOT EXISTS fase_nova text;
