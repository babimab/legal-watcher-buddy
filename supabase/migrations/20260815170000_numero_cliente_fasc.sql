-- Processos com carteira FASC (Souza Cruz, pasta JGV) também são
-- cliente 4608.
UPDATE public.processos
SET numero_cliente = '4608'
WHERE carteira = 'FASC'
  AND lower(cliente) LIKE '%souza cruz%'
  AND numero_cliente IS NULL;
