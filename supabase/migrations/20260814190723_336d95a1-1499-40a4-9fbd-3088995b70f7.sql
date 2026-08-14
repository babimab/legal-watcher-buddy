-- Todos os processos do cliente Souza Cruz são da BDR. Preenche o
-- responsável só onde ainda está vazio (não sobrescreve se já tiver
-- outra pessoa responsável por engano).
UPDATE public.processos
SET responsavel = 'BDR'
WHERE cliente ILIKE '%souza cruz%'
  AND (responsavel IS NULL OR trim(responsavel) = '');
