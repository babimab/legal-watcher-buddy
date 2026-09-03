-- O card de processo (lista de processos) mostra o ultimo andamento de
-- cada um, mas a consulta atual busca TODA a tabela movimentacoes
-- paginada no cliente so pra ficar so com o mais recente por processo --
-- ficou lento depois que a base cresceu (separacao dos andamentos
-- historicos colados). Move esse trabalho pro banco: uma unica consulta
-- com DISTINCT ON, que o indice abaixo deixa rapida.

create index if not exists movimentacoes_processo_data_idx
  on public.movimentacoes (processo_id, data_movimentacao desc, created_at desc, id asc);

create or replace function public.listar_ultimas_movimentacoes()
returns table (
  processo_id uuid,
  data_movimentacao date,
  descricao text
)
language sql
stable
security invoker
set search_path = public
as $$
  select distinct on (m.processo_id)
    m.processo_id,
    m.data_movimentacao,
    m.descricao
  from public.movimentacoes m
  order by m.processo_id, m.data_movimentacao desc, m.created_at desc, m.id asc;
$$;
