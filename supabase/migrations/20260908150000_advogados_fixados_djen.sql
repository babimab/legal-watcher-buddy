-- Advogados que o usuário "fixa" na busca do DJEN (aba Publicações), pra
-- não precisar redigitar nome/OAB toda vez. Antes ficava só no
-- localStorage do navegador, que pode sumir (preview em iframe, limpeza
-- de dados, troca de navegador) -- agora fica vinculado à conta.
create table if not exists public.advogados_fixados_djen (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null default '',
  numero_oab text not null default '',
  uf_oab text not null default '',
  ordem integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_advogados_fixados_djen_user
  on public.advogados_fixados_djen(user_id, ordem);

alter table public.advogados_fixados_djen enable row level security;

revoke all on public.advogados_fixados_djen from anon;
grant select, insert, update, delete on public.advogados_fixados_djen to authenticated;

drop policy if exists advogados_fixados_djen_all on public.advogados_fixados_djen;
create policy advogados_fixados_djen_all
  on public.advogados_fixados_djen
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
