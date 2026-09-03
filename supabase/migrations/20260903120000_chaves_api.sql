-- Chaves de API para a integracao externa (andamentos/encerramentos).
-- Nunca guarda a chave em claro -- so o hash (sha-256) e um prefixo
-- curto pra identificar qual chave e qual na listagem. So quem passa em
-- e_administrativo() (funcao ja existente, hoje sem uso no front) pode
-- ler, criar ou revogar chaves.

create table if not exists public.chaves_api (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  chave_hash text not null unique,
  prefixo text not null,
  ativo boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  revogada_em timestamptz
);

alter table public.chaves_api enable row level security;

drop policy if exists chaves_api_select_administrativo on public.chaves_api;
create policy chaves_api_select_administrativo
  on public.chaves_api
  for select
  to authenticated
  using (public.e_administrativo());

drop policy if exists chaves_api_insert_administrativo on public.chaves_api;
create policy chaves_api_insert_administrativo
  on public.chaves_api
  for insert
  to authenticated
  with check (public.e_administrativo());

drop policy if exists chaves_api_update_administrativo on public.chaves_api;
create policy chaves_api_update_administrativo
  on public.chaves_api
  for update
  to authenticated
  using (public.e_administrativo())
  with check (public.e_administrativo());
