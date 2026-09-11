-- Campo pra marcar qual estagiária é responsável por revisar as decisões
-- no LD daquele processo antes do encerramento (rotina de toda sexta,
-- dividida entre JUL e LTV). Texto livre (mesmo padrão de socio/
-- coordenador) em vez de enum, pra não precisar de migração toda vez
-- que entrar/sair estagiária.
alter table public.processos add column if not exists estagiario text;

comment on column public.processos.estagiario is
  'Sigla da estagiária responsável por revisar decisões no LD antes do encerramento (ex.: JUL, LTV).';

-- Atribuição inicial combinada: pasta BBS (a mais pesada) fica com a LTV,
-- o resto da Equipe Souza Cruz (JGV, MLV, BDR, ELV) fica com a JUL --
-- ficou ~111 x ~115 processos ativos, divisão equilibrada.
update public.processos pr
set estagiario = 'LTV'
from public.pastas p
join public.grupos g on g.id = p.grupo_id
where pr.pasta_id = p.id
  and g.nome = 'Equipe Souza Cruz'
  and p.nome = 'BBS';

update public.processos pr
set estagiario = 'JUL'
from public.pastas p
join public.grupos g on g.id = p.grupo_id
where pr.pasta_id = p.id
  and g.nome = 'Equipe Souza Cruz'
  and p.nome <> 'BBS';
