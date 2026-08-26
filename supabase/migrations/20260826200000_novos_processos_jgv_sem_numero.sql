-- Migracao pontual: cadastra os 3 casos da planilha "PROCESSOS
-- 26_08_2026" que vieram sem numero de processo de verdade ("xxx",
-- "xx", "xxxxxxxxxxxx" na coluna de CNJ) -- confirmado com a BDR que
-- devem entrar mesmo assim, provavelmente consultoria sem processo
-- judicial formal. Como numero_cnj e NOT NULL UNIQUE no banco, cada um
-- recebe um identificador proprio ("SEM NUMERO - CASO N") no lugar do
-- CNJ, faceis de reconhecer e corrigir depois se o numero de verdade
-- aparecer. Mesma pasta JGV (Equipe Souza Cruz) dos outros. Protegida
-- contra duplicar.
--
-- Texto acentuado escrito via E'...\u00XX...' de proposito (nao com o
-- acento literal), pro arquivo ficar puro ASCII e imune ao problema de
-- mojibake no copiar/colar no editor SQL do Supabase (ver corrigir_mojibake).

INSERT INTO public.processos
  (numero_cnj, cliente, reu, autor, parte_contraria, numero_cliente, numero_interno, comarca, uf, vara, responsavel, socio, observacoes, status, fonte, pasta_id)
SELECT
  v.numero_cnj, v.cliente, v.reu, v.autor, v.parte_contraria, v.numero_cliente, v.numero_interno, v.comarca, v.uf, v.vara,
  v.responsavel, v.socio, v.observacoes, 'ativo', 'manual',
  (SELECT pa.id FROM public.pastas pa
   JOIN public.grupos g ON g.id = pa.grupo_id
   WHERE g.nome = 'Equipe Souza Cruz' AND pa.nome = 'JGV')
FROM (
  VALUES
  (
    'SEM NUMERO - CASO 35',
    E'Souza Cruz S.A - Casos Espec\u00edficos',
    E'Souza Cruz S.A - Casos Espec\u00edficos',
    E'INTERFACIAL MANUTEN\u00c7\u00c3O PREDITIVA LTDA',
    E'INTERFACIAL MANUTEN\u00c7\u00c3O PREDITIVA LTDA',
    '5939',
    '35',
    E'Uberl\u00e2ndia',
    'MG',
    E'10\u00aa Vara C\u00edvel',
    'JGV',
    'ELV',
    'Data de entrada (planilha): 06/04/2026. Sem numero de processo na planilha (provavel consultoria).'
  ),
  (
    'SEM NUMERO - CASO 42',
    E'Souza Cruz S.A - Casos Espec\u00edficos',
    E'Souza Cruz S.A - Casos Espec\u00edficos',
    E'Dolc\u00edssimo Lanchonete e Caf\u00e9 Ltda',
    E'Dolc\u00edssimo Lanchonete e Caf\u00e9 Ltda',
    '5939',
    '42',
    'Rio de Janeiro',
    'RJ',
    E'10\u00aa Vara C\u00edvel',
    'JGV',
    'ELV',
    'Data de entrada (planilha): 16/07/2026. Sem numero de processo na planilha (provavel consultoria).'
  ),
  (
    'SEM NUMERO - CASO 44',
    E'Souza Cruz S.A - Casos Espec\u00edficos',
    E'Souza Cruz S.A - Casos Espec\u00edficos',
    E'BVMCross \u2013 rescis\u00f5es contratuais',
    E'BVMCross \u2013 rescis\u00f5es contratuais',
    '5939',
    '44',
    'Rio de Janeiro',
    'RJ',
    'Vara Unica',
    'JGV',
    'ELV',
    'Data de entrada (planilha): 24/08/2026. Sem numero de processo na planilha (provavel consultoria).'
  )
) AS v(numero_cnj, cliente, reu, autor, parte_contraria, numero_cliente, numero_interno, comarca, uf, vara, responsavel, socio, observacoes)
WHERE NOT EXISTS (
  SELECT 1 FROM public.processos p
  WHERE p.numero_cnj = v.numero_cnj
);

-- resumo
SELECT numero_cnj, numero_interno, cliente
FROM public.processos
WHERE numero_cnj IN ('SEM NUMERO - CASO 35', 'SEM NUMERO - CASO 42', 'SEM NUMERO - CASO 44');
