-- Marca se um andamento já foi conferido por alguém do escritório. Os
-- andamentos digitados manualmente ou importados por planilha própria já
-- nascem validados (default true). Os que a nova aba de Publicações
-- sugerir automaticamente a partir da planilha de publicações do TI
-- nascem com validado = false, pra estagiária revisar e confirmar.
ALTER TABLE public.movimentacoes
  ADD COLUMN IF NOT EXISTS validado boolean NOT NULL DEFAULT true;
