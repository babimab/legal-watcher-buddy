-- O processo 5002473-90.2022.8.21.0049 estava com "Aguardando intimação
-- para CR" na carteira (texto de andamento que foi parar no campo
-- errado). Corrige pra Fumicultor.
UPDATE public.processos
SET carteira = 'Fumicultor'
WHERE regexp_replace(numero_cnj, '\D', '', 'g') = regexp_replace('5002473-90.2022.8.21.0049', '\D', '', 'g');
