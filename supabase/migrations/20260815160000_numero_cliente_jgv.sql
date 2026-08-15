-- Todos os casos de Souza Cruz da BBS, MLV e JGV são cliente 4608 (só os
-- 4 processos da Eliane, já tratados antes, são 2599). Estende a mesma
-- regra pra JGV, que ainda não tinha sido coberta.
UPDATE public.processos
SET numero_cliente = '4608'
WHERE responsavel IN ('BBS', 'MLV', 'JGV')
  AND lower(cliente) LIKE '%souza cruz%'
  AND numero_cliente IS NULL;
