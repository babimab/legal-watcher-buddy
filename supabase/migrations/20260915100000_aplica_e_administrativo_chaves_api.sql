-- Reaplica a migração 20260828172128 (e_administrativo + políticas que
-- dependiam dela) e a migração 20260903120000 (chaves_api) -- nenhuma
-- das duas tinha sido realmente aplicada no banco, apesar de já estarem
-- commitadas no repo. Descoberto numa auditoria depois que a lista de
-- "advogados fixados" sumiu (mesma causa raiz: migração no código, nunca
-- rodada no banco de verdade). Idempotente -- seguro rodar de novo.

CREATE OR REPLACE FUNCTION public.e_administrativo()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (p.cargo = 'Administrativo' OR lower(p.email) = 'bdr@bcw.com.br')
  ) OR public.has_role(auth.uid(), 'admin');
$$;
REVOKE ALL ON FUNCTION public.e_administrativo() FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.e_administrativo() TO authenticated, service_role;

DROP POLICY IF EXISTS baixas_select_autenticados ON public.baixas_cliente;
CREATE POLICY baixas_select_permitidos ON public.baixas_cliente
FOR SELECT TO authenticated
USING (public.e_administrativo() OR public.pode_visualizar_processo(processo_id));

DROP POLICY IF EXISTS baixas_hist_select_autenticados ON public.baixas_cliente_historico;
CREATE POLICY baixas_hist_select_permitidos ON public.baixas_cliente_historico
FOR SELECT TO authenticated
USING (
  public.e_administrativo()
  OR EXISTS (
    SELECT 1 FROM public.baixas_cliente b
    WHERE b.id = baixas_cliente_historico.baixa_id
      AND public.pode_visualizar_processo(b.processo_id)
  )
);

DROP POLICY IF EXISTS calculos_storage_update ON storage.objects;
CREATE POLICY calculos_storage_update ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'calculos-judiciais' AND public.pode_editar_calculo(((storage.foldername(name))[1])::uuid))
WITH CHECK (bucket_id = 'calculos-judiciais' AND public.pode_editar_calculo(((storage.foldername(name))[1])::uuid));

-- chaves_api (dependia de e_administrativo, por isso vem depois)
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
