-- Corrige processos onde "carteira" acabou preenchida com uma sigla de
-- estado (ex.: "RS", "SP") em vez de uma carteira de verdade — provável
-- erro de import/planilha. Se o campo UF estiver vazio, aproveita e move
-- o valor pra lá (não perde a informação); senão só limpa a carteira.

UPDATE public.processos
SET uf = upper(trim(carteira)),
    carteira = NULL
WHERE uf IS NULL
  AND upper(trim(carteira)) IN (
    'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
    'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
  );

UPDATE public.processos
SET carteira = NULL
WHERE upper(trim(carteira)) IN (
    'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
    'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
  );
