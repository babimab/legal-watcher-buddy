-- Reaproveita a tabela de advogados fixados do DJEN pra também guardar
-- as pessoas fixadas no card "Publicações BDR" -- antes só a busca
-- principal (card "Busca Publicação DJEN") salvava; a BDR resetava a
-- cada recarregada de página. "contexto" separa as duas listas (cada
-- uma independente, mesma conta).
alter table public.advogados_fixados_djen add column if not exists contexto text not null default 'busca';
alter table public.advogados_fixados_djen drop constraint if exists advogados_fixados_djen_contexto_check;
alter table public.advogados_fixados_djen add constraint advogados_fixados_djen_contexto_check
  check (contexto in ('busca', 'bdr'));

create index if not exists idx_advogados_fixados_djen_user_contexto
  on public.advogados_fixados_djen(user_id, contexto, ordem);
