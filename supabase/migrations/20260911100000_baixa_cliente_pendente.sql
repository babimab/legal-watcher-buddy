-- Fluxo simples pra sinalizar que um processo virou status "encerrado"
-- mas ainda falta comunicar/dar baixa no sistema do próprio cliente
-- (LegalDesk etc.) -- diferente da tabela baixas_cliente já existente,
-- que é o fluxo de cobrança específico da Astro (pendência, próxima
-- cobrança...). Aqui é só um checklist: marca true ao encerrar, marca
-- false (com timestamp) quando a baixa administrativa foi confirmada.

alter table public.processos
  add column if not exists baixa_cliente_pendente boolean not null default false,
  add column if not exists baixa_cliente_confirmada_em timestamptz;

create index if not exists idx_processos_baixa_cliente_pendente
  on public.processos (baixa_cliente_pendente)
  where baixa_cliente_pendente;
