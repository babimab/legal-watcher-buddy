ALTER TABLE public.processos
  ADD COLUMN IF NOT EXISTS resultado_encerramento text;
