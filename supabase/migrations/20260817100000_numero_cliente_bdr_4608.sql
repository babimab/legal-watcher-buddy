-- Preenche numero_cliente = 4608 nos processos da BDR que estao sem esse
-- campo, exceto os da Astro (que tem numero de cliente diferente e nao
-- foi definido agora).

UPDATE public.processos
SET numero_cliente = '4608'
WHERE responsavel = 'BDR'
  AND numero_cliente IS NULL
  AND cliente NOT ILIKE '%astro%';
