-- Permite reordenar manualmente andamentos com a mesma data (ex.: quando a
-- Judit importa varios andamentos do mesmo dia fora da ordem cronologica
-- real). Nulo = usa a ordem atual (created_at); quando a usuaria arrasta um
-- item na tela, todos os andamentos daquele dia ganham um valor sequencial
-- aqui.

alter table public.movimentacoes add column if not exists ordem integer;
