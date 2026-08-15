-- Preenche número do cliente e carteira dos processos de Souza Cruz de
-- BBS e MLV que ainda estão em branco. Não mexe em Astro (que tem outra
-- lógica de carteira) nem em processos que já têm valor preenchido.

-- Número do cliente: mesma regra já usada pro resto da carteira de
-- Souza Cruz (4608 geral, 2599 quando o sócio é ELV).
UPDATE public.processos
SET numero_cliente = CASE WHEN socio = 'ELV' THEN '2599' ELSE '4608' END
WHERE responsavel IN ('BBS', 'MLV')
  AND lower(cliente) LIKE '%souza cruz%'
  AND numero_cliente IS NULL;

-- Carteira: usa a classe (já preenchida a partir do OBJETO da planilha
-- de Encerramento pra quem estava nela) pra separar Acidente de Trânsito
-- e Cash in do resto — a maior parte é Cobrança Indevida.
UPDATE public.processos
SET carteira = CASE
    WHEN classe ILIKE '%acident%' THEN 'Acidente de Trânsito'
    WHEN classe ILIKE '%cash in%' THEN 'Cash in'
    ELSE 'Cobrança Indevida'
  END
WHERE responsavel IN ('BBS', 'MLV')
  AND lower(cliente) LIKE '%souza cruz%'
  AND carteira IS NULL;
