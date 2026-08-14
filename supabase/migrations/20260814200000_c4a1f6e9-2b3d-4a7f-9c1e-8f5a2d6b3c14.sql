-- Sócio (advogado que supervisiona/é responsável perante o cliente),
-- separado do responsavel (advogado que efetivamente trabalha o caso no
-- dia a dia). Backfill único: todos os processos que já existem e ainda
-- não têm sócio definido são da sócia ELV.

ALTER TABLE public.processos ADD COLUMN IF NOT EXISTS socio text;

UPDATE public.processos SET socio = 'ELV' WHERE socio IS NULL;
