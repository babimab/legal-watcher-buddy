-- Carimbo de quem/quando marcou "Decisões no LD" preenchida -- sem isso o
-- checkbox era só sim/não, então na revisão semanal (JUL/LTV) não dava
-- pra saber se aquilo foi checado ontem ou há um mês.
alter table public.processos add column if not exists decisoes_no_ld_por text;
alter table public.processos add column if not exists decisoes_no_ld_em timestamptz;

comment on column public.processos.decisoes_no_ld_por is
  'Sigla de quem marcou "Decisões no LD" preenchida.';
comment on column public.processos.decisoes_no_ld_em is
  'Quando "Decisões no LD" foi marcada preenchida pela última vez.';
