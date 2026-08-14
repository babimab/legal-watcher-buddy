-- Hoje toda a carteira cadastrada é da BDR (os outros advogados ainda
-- vão cadastrar os processos deles depois). Preenche responsável = BDR
-- em qualquer processo que ainda esteja sem responsável, não só os do
-- cliente Souza Cruz.
UPDATE public.processos
SET responsavel = 'BDR'
WHERE responsavel IS NULL OR trim(responsavel) = '';
