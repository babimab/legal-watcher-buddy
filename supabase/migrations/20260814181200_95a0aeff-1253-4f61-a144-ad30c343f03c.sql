-- Os nomes de pasta com acento vieram corrompidos ao rodar a migration
-- anterior (colada manualmente no SQL editor). Renomeia para versões sem
-- acento, evitando o problema de vez.
UPDATE public.pastas SET nome = 'Perfis MLV (acoes de cobranca)'
WHERE nome IN ('Perfis MLV (ações de cobrança)', 'Perfis MLV (aÃ§Ãµes de cobranÃ§a)');

UPDATE public.pastas SET nome = 'RJ Astro Navegacao'
WHERE nome IN ('RJ Astro Navegação', 'RJ Astro NavegaÃ§Ã£o');

-- Mesmo motivo: a lista de tipos de desdobramento também foi colada
-- manualmente e usa a mesma checagem (CHECK constraint) — troca para
-- versões sem acento, para não correr o risco de o texto salvo no banco
-- não bater com o que o app envia (o que faria a checagem rejeitar o
-- cadastro).
ALTER TABLE public.processos DROP CONSTRAINT IF EXISTS processos_tipo_desdobramento_check;
ALTER TABLE public.processos ADD CONSTRAINT processos_tipo_desdobramento_check
  CHECK (tipo_desdobramento IS NULL OR tipo_desdobramento IN (
    'Recurso', 'Cumprimento de sentenca', 'Execucao', 'Embargos', 'Agravo', 'Outro'
  ));

UPDATE public.processos SET tipo_desdobramento = 'Cumprimento de sentenca'
WHERE tipo_desdobramento IN ('Cumprimento de sentença', 'Cumprimento de sentenÃ§a');

UPDATE public.processos SET tipo_desdobramento = 'Execucao'
WHERE tipo_desdobramento IN ('Execução', 'ExecuÃ§Ã£o');
