-- Marcador de cor no card do processo (amarelo/verde/azul/vermelho/cinza)
-- -- flag visual livre, sem significado fixo, pra cada advogado(a)/
-- estagiaria usar do jeito que fizer sentido pra ela (ex.: vermelho =
-- atencao, verde = ok). Nao mexe em nada existente, so um marcador a mais.

ALTER TABLE public.processos ADD COLUMN IF NOT EXISTS cor text;

ALTER TABLE public.processos DROP CONSTRAINT IF EXISTS processos_cor_check;
ALTER TABLE public.processos ADD CONSTRAINT processos_cor_check
  CHECK (cor IS NULL OR cor IN ('amarelo', 'verde', 'azul', 'vermelho', 'cinza'));
