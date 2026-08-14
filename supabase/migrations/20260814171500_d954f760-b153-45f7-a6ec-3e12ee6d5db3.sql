-- A pedido do escritório: qualquer processo que ainda não caiu em nenhuma
-- pasta pelo backfill anterior (heurística por carteira/partes) vai direto
-- para Equipe Souza Cruz > BDR, que é onde a carteira atual está hoje.
UPDATE public.processos p
SET pasta_id = pa.id
FROM public.pastas pa
JOIN public.grupos g ON g.id = pa.grupo_id
WHERE p.pasta_id IS NULL
  AND g.nome = 'Equipe Souza Cruz'
  AND pa.nome = 'BDR';
