-- Amplia a normalizacao anterior: alem de "negativacao", agora tambem
-- unifica qualquer variacao que tenha "cobranca" + "indevida" no texto
-- (ex.: "6461 - Cobranca Indevida", "COBRANCA INDEVIDA", "Cobranca
-- Indevida") para "PDV - Cobranca Indevida" -- mesma regra: na pasta BDR
-- vira "Fumicultor" em vez disso (mesmo raciocinio da migracao anterior).

update public.processos p
set classe = 'Fumicultor'
where classe ilike '%cobran%'
  and classe ilike '%indevida%'
  and exists (
    select 1 from public.pastas pa
    where pa.id = p.pasta_id and pa.nome = 'BDR'
  );

update public.processos p
set classe = E'PDV - Cobran\u00e7a Indevida'
where classe ilike '%cobran%'
  and classe ilike '%indevida%'
  and not exists (
    select 1 from public.pastas pa
    where pa.id = p.pasta_id and pa.nome = 'BDR'
  );
