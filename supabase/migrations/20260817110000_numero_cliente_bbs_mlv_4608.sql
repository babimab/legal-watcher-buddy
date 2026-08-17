-- Mesma ideia da migracao anterior (numero_cliente_bdr_4608), agora pra
-- BBS e MLV: preenche numero_cliente = 4608 nos processos Souza Cruz
-- delas que ainda estao sem esse campo, exceto os da Astro.

UPDATE public.processos
SET numero_cliente = '4608'
WHERE responsavel IN ('BBS', 'MLV')
  AND numero_cliente IS NULL
  AND cliente NOT ILIKE '%astro%';
