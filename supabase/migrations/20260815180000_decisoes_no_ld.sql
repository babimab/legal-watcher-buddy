-- Caixinha na revisão de Encerramento pra marcar que as decisões do
-- processo já foram preenchidas no LD (Legal Desk).
ALTER TABLE public.processos
  ADD COLUMN IF NOT EXISTS decisoes_no_ld boolean NOT NULL DEFAULT false;
