-- Adiciona "Incidente de Desconsideracao da Personalidade Juridica (IDPJ)"
-- como tipo de desdobramento válido (sem acento, mesmo padrão dos outros
-- valores dessa checagem).
ALTER TABLE public.processos DROP CONSTRAINT IF EXISTS processos_tipo_desdobramento_check;
ALTER TABLE public.processos ADD CONSTRAINT processos_tipo_desdobramento_check
  CHECK (tipo_desdobramento IS NULL OR tipo_desdobramento IN (
    'Recurso', 'Cumprimento de sentenca', 'Execucao', 'Embargos', 'Agravo',
    'Incidente de Desconsideracao da Personalidade Juridica (IDPJ)', 'Outro'
  ));

NOTIFY pgrst, 'reload schema';
