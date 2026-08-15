-- Correção: a migração 20260815040000_numero_cliente.sql pôs
-- numero_cliente = 2599 em TODO processo de Souza Cruz com sócio = ELV.
-- Na verdade 2599 é só pros processos em que a Eliane é a responsável
-- (responsavel = 'ELV') — são só 4 processos, não todos os que têm ELV
-- como sócio. Corrige os que foram marcados errado de volta pra 4608, e
-- garante 2599 nos 4 processos certos.

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
