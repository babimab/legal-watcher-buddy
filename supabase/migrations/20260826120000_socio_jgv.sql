-- Migracao pontual: define o socio dos processos onde JGV e o
-- responsavel. Padrao ELV (Eliane), exceto quando o polo adverso e
-- Tabacaria Hollywood Ltda, que fica com GFC. Protegida contra rodar de
-- novo (idempotente).

begin;

update public.processos
set socio = 'ELV'
where upper(trim(responsavel)) = 'JGV'
  and coalesce(parte_contraria, '') not ilike '%Tabacaria Hollywood%';

update public.processos
set socio = 'GFC'
where upper(trim(responsavel)) = 'JGV'
  and parte_contraria ilike '%Tabacaria Hollywood%';

-- resumo
select
  socio,
  count(*) as processos
from public.processos
where upper(trim(responsavel)) = 'JGV'
group by socio
order by socio;

commit;
