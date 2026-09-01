-- Unifica "Fumicultor" e "Fumicultores" (mesma categoria, plural
-- inconsistente por causa das diferentes importacoes) num rotulo so.

update public.processos
set classe = 'Fumicultor'
where classe ilike '%fumicultor%'
  and classe <> 'Fumicultor';
