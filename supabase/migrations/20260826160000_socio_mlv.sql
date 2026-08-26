-- Migracao pontual: define o socio GFC (Cortines) nos processos onde
-- MLV e o responsavel. Protegida contra rodar de novo (idempotente).

begin;

update public.processos
set socio = 'GFC'
where upper(trim(responsavel)) = 'MLV';

-- resumo
select
  socio,
  count(*) as processos
from public.processos
where upper(trim(responsavel)) = 'MLV'
group by socio
order by socio;

commit;
