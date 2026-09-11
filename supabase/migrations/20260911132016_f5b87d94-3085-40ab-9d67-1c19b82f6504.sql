alter table public.processos add column if not exists estagiario text;

comment on column public.processos.estagiario is
  'Sigla da estagiária responsável por revisar decisões no LD antes do encerramento (ex.: JUL, LTV).';