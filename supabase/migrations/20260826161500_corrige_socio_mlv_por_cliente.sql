-- Corrige a migracao anterior (socio_mlv): o MLV atua tanto na Souza
-- Cruz quanto na Astro, mas o socio e diferente em cada uma -- GFC na
-- Souza Cruz, NYM na Astro. A migracao anterior marcou GFC pra todo
-- mundo, sem separar por cliente. Corrige aqui, seja qual for o estado
-- atual: reafirma GFC nos casos de Souza Cruz e troca pra NYM nos casos
-- de Astro. Protegida contra rodar de novo (idempotente).

begin;

update public.processos
set socio = 'GFC'
where upper(trim(responsavel)) = 'MLV'
  and cliente ~* 'souza\s*cruz';

update public.processos
set socio = 'NYM'
where upper(trim(responsavel)) = 'MLV'
  and cliente ~* 'astro';

-- resumo
select
  case
    when cliente ~* 'souza\s*cruz' then 'Souza Cruz'
    when cliente ~* 'astro' then 'Astro'
    else 'Outro'
  end as grupo_cliente,
  socio,
  count(*) as processos
from public.processos
where upper(trim(responsavel)) = 'MLV'
group by 1, 2
order by 1, 2;

commit;
