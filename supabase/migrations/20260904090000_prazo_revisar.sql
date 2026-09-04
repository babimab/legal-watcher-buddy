-- Marca andamentos cuja data de prazo foi calculada automaticamente
-- (aba Publicacoes) mas a IA nao conseguiu determinar com seguranca --
-- precisa conferir manualmente no sistema do tribunal antes de confiar
-- na data.

alter table public.movimentacoes add column if not exists prazo_revisar boolean not null default false;
