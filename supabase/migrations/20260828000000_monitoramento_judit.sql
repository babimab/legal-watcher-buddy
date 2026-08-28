-- Monitoramento automatico via Judit: a BDR marca quais processos entram
-- no acompanhamento periodico (judit_monitoramento, default false -- nada
-- muda pra ninguem ate ela marcar manualmente na tela de Monitoramento,
-- pra nao gerar custo com a carteira inteira de uma vez).
--
-- judit_request_pendente/judit_request_criado_em guardam uma consulta que
-- ja foi criada na Judit mas ainda nao foi colhida (o resultado leva um
-- tempo pra ficar pronto). judit_monitorado_em marca a ultima vez que
-- colhemos resultado com sucesso -- e o que decide se ja passou uma
-- semana e pode criar uma consulta nova.

alter table public.processos
  add column if not exists judit_monitoramento boolean not null default false,
  add column if not exists judit_request_pendente text,
  add column if not exists judit_request_criado_em timestamptz,
  add column if not exists judit_monitorado_em timestamptz;
