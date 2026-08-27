-- Adiciona um parametro opcional _validado (default true, pra nao mudar o
-- comportamento do webhook receber-andamento) na funcao compartilhada de
-- gravar andamentos externos. A consulta manual da Judit ("Testar Judit")
-- vai passar _validado = false, pra esses andamentos entrarem na fila de
-- revisao (mesmo padrao ja usado por citacoes/publicacoes) em vez de
-- ficarem marcados como ja conferidos direto.

drop function if exists public.registrar_movimentacao_externa(text, date, text, text, text, text, text);

create or replace function public.registrar_movimentacao_externa(
  _numero_cnj text,
  _data_movimentacao date,
  _descricao text,
  _tipo text default null,
  _observacao text default null,
  _provedor text default null,
  _id_externo text default null,
  _validado boolean default true
)
returns table (movimentacao_id uuid, id_processo uuid, inserida boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  _proc_id uuid;
  _mov_id uuid;
begin
  select p.id into _proc_id
  from public.processos p
  where regexp_replace(p.numero_cnj, '\D', '', 'g') = regexp_replace(_numero_cnj, '\D', '', 'g')
  limit 1;

  if _proc_id is null then
    return query select null::uuid, null::uuid, false;
    return;
  end if;

  insert into public.movimentacoes
    (processo_id, data_movimentacao, descricao, tipo, observacao, fonte, id_externo, validado)
  values
    (_proc_id, _data_movimentacao, _descricao, _tipo, _observacao, coalesce(_provedor, 'api_externa'), _id_externo, _validado)
  on conflict (processo_id, data_movimentacao, md5(descricao)) do nothing
  returning movimentacoes.id into _mov_id;

  update public.processos set ultima_verificacao_em = now() where id = _proc_id;

  return query select _mov_id, _proc_id, (_mov_id is not null);
end;
$$;

revoke all on function public.registrar_movimentacao_externa(text, date, text, text, text, text, text, boolean) from public, anon, authenticated;
grant execute on function public.registrar_movimentacao_externa(text, date, text, text, text, text, text, boolean) to service_role;
