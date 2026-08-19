ALTER TABLE public.movimentacoes
  ADD COLUMN IF NOT EXISTS destacar_email boolean NOT NULL DEFAULT false;
