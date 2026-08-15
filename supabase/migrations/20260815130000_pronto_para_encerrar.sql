-- Flag que o advogado marca ao revisar um processo em fase Encerramento
-- e decidir que já pode ser fechado de fato. É o que vira a lista
-- enviada pra Eliane (quem faz o encerramento efetivo) — junto com o
-- valor e a observação que ela precisa pra dar baixa.
ALTER TABLE public.processos
  ADD COLUMN IF NOT EXISTS pronto_para_encerrar boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS valor_encerramento numeric,
  ADD COLUMN IF NOT EXISTS observacao_encerramento text;
