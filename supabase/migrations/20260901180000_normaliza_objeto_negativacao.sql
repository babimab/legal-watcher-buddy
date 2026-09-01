-- Normaliza variacoes de "negativacao indevida" no campo classe (usado
-- como objeto): processos fora da pasta BDR viram "PDV - Cobranca
-- Indevida"; processos da pasta BDR viram "Fumicultor" (a BDR nao tem
-- esse tipo de caso, entao quando aparece "negativacao" la na verdade e
-- fumicultor).
--
-- Casa por substring "negativa" (cobre "negativacao", "Negativacao",
-- "NEGATIVACAO", com ou sem acento na grafia original) -- pedido da BDR.

update public.processos p
set classe = 'Fumicultor'
where classe ilike '%negativa%'
  and exists (
    select 1 from public.pastas pa
    where pa.id = p.pasta_id and pa.nome = 'BDR'
  );

update public.processos p
set classe = E'PDV - Cobran\u00e7a Indevida'
where classe ilike '%negativa%'
  and not exists (
    select 1 from public.pastas pa
    where pa.id = p.pasta_id and pa.nome = 'BDR'
  );
