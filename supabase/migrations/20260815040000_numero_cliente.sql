-- Número do cliente (código usado no financeiro/faturamento), por cliente.
-- Além disso, padroniza o campo "cliente" dos processos que vieram com
-- carteira MERCK/PRC — hoje esses ficaram com o que estava em "autor"
-- linha a linha (ex.: "Galindo Distribuidores", "Athos Farma"...) em vez
-- do nome do cliente de verdade, porque a identificação automática na
-- importação só reconhecia Souza Cruz e Astro.

ALTER TABLE public.processos ADD COLUMN IF NOT EXISTS numero_cliente text;

UPDATE public.processos
SET cliente = 'Merck S.A.'
WHERE carteira ILIKE 'MERCK' AND cliente IS DISTINCT FROM 'Merck S.A.';

UPDATE public.processos
SET cliente = 'PRC'
WHERE carteira ILIKE 'PRC' AND cliente IS DISTINCT FROM 'PRC';

-- Souza Cruz: número geral, exceto onde o sócio é ELV (número diferente).
UPDATE public.processos
SET numero_cliente = '4608'
WHERE cliente = 'Souza Cruz LTDA.' AND socio IS DISTINCT FROM 'ELV';

UPDATE public.processos
SET numero_cliente = '2599'
WHERE cliente = 'Souza Cruz LTDA.' AND socio = 'ELV';

-- Astro: hoje só temos a carteira de Ações de Cobrança importada.
UPDATE public.processos
SET numero_cliente = '8311'
WHERE cliente = 'Astromaritima';

UPDATE public.processos
SET numero_cliente = '7344'
WHERE cliente = 'PRC';

-- Merck (18 processos) ainda fica sem número — falta confirmar se é
-- 8228 ou 7347 antes de preencher.
