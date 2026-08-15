-- Novo campo "coordenador" nos processos (papel separado do "sócio").
-- Preenchimento inicial pedido pela Bárbara (BDR):
--   - sócio = GFC  -> coordenador = BDR
--   - sócio = ELV  -> fica em branco (não mexe)
--   - qualquer processo da Astro -> coordenador = BDR

ALTER TABLE public.processos ADD COLUMN IF NOT EXISTS coordenador text;

UPDATE public.processos
SET coordenador = 'BDR'
WHERE socio = 'GFC';

UPDATE public.processos
SET coordenador = 'BDR'
WHERE lower(cliente) LIKE '%astro%';
