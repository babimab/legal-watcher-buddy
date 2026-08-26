-- A migracao anterior (20260826250000) foi colada via texto no chat em
-- vez do arquivo, e os acentos de 2 valores de parte_contraria se
-- perderam nesse caminho (virou "Prontoplastica"/"Leandro Jose da
-- Costa" sem acento). Corrige so esses 2 valores. Protegida contra
-- rodar de novo (idempotente) e segura mesmo se ela ja tiver corrigido
-- manualmente.

update public.processos
set parte_contraria = E'Prontopl\u00e1stica'
where regexp_replace(numero_cnj, '\D', '', 'g') = '05359342020008060001'
  and parte_contraria is distinct from E'Prontopl\u00e1stica';

update public.processos
set parte_contraria = E'Leandro Jos\u00e9 da Costa'
where regexp_replace(numero_cnj, '\D', '', 'g') in ('10042091520258130702', '10364466820268130702')
  and parte_contraria is distinct from E'Leandro Jos\u00e9 da Costa';

select numero_cnj, parte_contraria
from public.processos
where regexp_replace(numero_cnj, '\D', '', 'g') in (
  '05359342020008060001', '10042091520258130702', '10364466820268130702'
)
order by numero_cnj;
