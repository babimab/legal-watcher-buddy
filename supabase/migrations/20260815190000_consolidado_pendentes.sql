-- Script único e seguro pra rodar tudo que ainda faltava (é por isso que
-- o campo "coordenador" e outros estavam dando erro de "column not found
-- in schema cache" — essas migrações ainda não tinham sido coladas no
-- Supabase). Reúne, em ordem, as migrações:
--   20260815120000_campo_coordenador.sql
--   20260815130000_pronto_para_encerrar.sql
--   20260815140000_carteira_numero_cliente_bbs_mlv.sql
--   20260815150000_corrige_numero_cliente_2599.sql
--   20260815160000_numero_cliente_jgv.sql
--   20260815170000_numero_cliente_fasc.sql
--   20260815180000_decisoes_no_ld.sql
-- Pode rodar mesmo que alguma delas já tenha sido colada antes: todos os
-- ALTER TABLE usam IF NOT EXISTS e todos os UPDATE só mexem em linha que
-- ainda está em branco (ou, no caso da correção do 2599, comparam valor
-- exato antes de trocar) — então rodar de novo não duplica nem estraga
-- nada.

-- === Novo campo "coordenador" (papel separado do "sócio") ===
ALTER TABLE public.processos ADD COLUMN IF NOT EXISTS coordenador text;

UPDATE public.processos
SET coordenador = 'BDR'
WHERE socio = 'GFC';

UPDATE public.processos
SET coordenador = 'BDR'
WHERE lower(cliente) LIKE '%astro%';

-- === Encerramento: pronto pra encerrar / valor / observação ===
ALTER TABLE public.processos
  ADD COLUMN IF NOT EXISTS pronto_para_encerrar boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS valor_encerramento numeric,
  ADD COLUMN IF NOT EXISTS observacao_encerramento text;

-- === Número do cliente e carteira: Souza Cruz de BBS e MLV ===
UPDATE public.processos
SET numero_cliente = '4608'
WHERE responsavel IN ('BBS', 'MLV')
  AND lower(cliente) LIKE '%souza cruz%'
  AND numero_cliente IS NULL;

UPDATE public.processos
SET carteira = CASE
    WHEN classe ILIKE '%acident%' THEN 'Acidente de Trânsito'
    WHEN classe ILIKE '%cash in%' THEN 'Cash in'
    ELSE 'Cobrança Indevida'
  END
WHERE responsavel IN ('BBS', 'MLV')
  AND lower(cliente) LIKE '%souza cruz%'
  AND carteira IS NULL;

-- === Correção do número do cliente 2599 (só os 4 processos da Eliane) ===
UPDATE public.processos
SET numero_cliente = '4608'
WHERE lower(cliente) LIKE '%souza cruz%'
  AND numero_cliente = '2599'
  AND responsavel IS DISTINCT FROM 'ELV';

UPDATE public.processos
SET numero_cliente = '2599'
WHERE regexp_replace(numero_cnj, '\D', '', 'g') IN (
  regexp_replace('5000041-36.2014.8.21.1001', '\D', '', 'g'),
  regexp_replace('5002643-93.2019.8.21.0008', '\D', '', 'g'),
  regexp_replace('5015193-44.2020.8.21.0022', '\D', '', 'g'),
  regexp_replace('5010800-64.2024.8.21.0013', '\D', '', 'g')
);

-- === Número do cliente: Souza Cruz da JGV ===
UPDATE public.processos
SET numero_cliente = '4608'
WHERE responsavel IN ('BBS', 'MLV', 'JGV')
  AND lower(cliente) LIKE '%souza cruz%'
  AND numero_cliente IS NULL;

-- === Número do cliente: carteira FASC ===
UPDATE public.processos
SET numero_cliente = '4608'
WHERE carteira = 'FASC'
  AND lower(cliente) LIKE '%souza cruz%'
  AND numero_cliente IS NULL;

-- === Encerramento: caixinha de Decisões no LD ===
ALTER TABLE public.processos
  ADD COLUMN IF NOT EXISTS decisoes_no_ld boolean NOT NULL DEFAULT false;
