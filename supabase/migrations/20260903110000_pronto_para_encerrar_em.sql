-- Data de "quando o processo ficou pronto para encerrar" -- nao existia
-- nenhum campo assim, e a API de integracao (andamentos/encerramentos)
-- precisa filtrar encerramentos por dia. Preenchida automaticamente via
-- trigger na transicao false/null -> true de pronto_para_encerrar, pra
-- cobrir qualquer caminho de escrita (tela, SQL, import), nao so o
-- dialogo de Encerramento. Zera se voltar a false, pra que um reabrir +
-- fechar de novo gere uma data nova.

alter table public.processos add column if not exists pronto_para_encerrar_em timestamptz;

create or replace function public.marcar_pronto_para_encerrar_em()
returns trigger
language plpgsql
as $$
begin
  if new.pronto_para_encerrar is true and coalesce(old.pronto_para_encerrar, false) is false then
    new.pronto_para_encerrar_em := now();
  elsif new.pronto_para_encerrar is false then
    new.pronto_para_encerrar_em := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_pronto_para_encerrar_em on public.processos;
create trigger trg_pronto_para_encerrar_em
before insert or update on public.processos
for each row execute function public.marcar_pronto_para_encerrar_em();
