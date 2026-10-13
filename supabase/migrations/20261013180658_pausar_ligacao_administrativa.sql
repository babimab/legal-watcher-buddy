-- Alguns processos da carteira Administrativos ficam parados por um
-- tempo (aguardando algo externo) e não precisam da ligação semanal de
-- checagem -- sem isso, o painel marcava como "atrasado" mesmo sendo
-- intencional. Guarda o motivo e quem/quando pausou, pra aparecer no
-- card em vez de some tudo em branco.
ALTER TABLE public.processos
  ADD COLUMN IF NOT EXISTS administrativo_pausado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS administrativo_pausado_motivo text,
  ADD COLUMN IF NOT EXISTS administrativo_pausado_por text,
  ADD COLUMN IF NOT EXISTS administrativo_pausado_em timestamptz;

NOTIFY pgrst, 'reload schema';
