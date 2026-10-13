-- Carimbo de quando o processo virou "encerrado" -- não existia nenhum
-- campo de data pra isso (só a data de cadastro no sistema, que não
-- serve pra filtrar por data de encerramento). Usado no filtro de data
-- da lista "Baixa na Souza Cruz".
ALTER TABLE public.processos
  ADD COLUMN IF NOT EXISTS encerrado_em timestamptz;

NOTIFY pgrst, 'reload schema';
