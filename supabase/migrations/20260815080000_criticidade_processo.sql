-- Campo de criticidade do processo (Alta/Média/Baixa), pra priorizar
-- visualmente na lista e no relatório. Sem CHECK constraint, mesmo
-- padrão usado em fase/status hoje (validado só no front).
ALTER TABLE public.processos ADD COLUMN IF NOT EXISTS criticidade text;
