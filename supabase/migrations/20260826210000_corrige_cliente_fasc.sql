-- Migracao pontual: corrige o campo cliente de 9 processos que estavam
-- com o nome da parte contraria em vez de "FASC" (identificado ao
-- cruzar a aba FASC da planilha "Copia de Planilha JGV Agosto" com o
-- FaroLex -- so 1 dos 10 processos dessa aba ja tinha o cliente certo).
-- Protegida contra rodar de novo (idempotente).

begin;

create temporary table processos_fasc_corrigir (cnj text primary key) on commit drop;

insert into processos_fasc_corrigir (cnj)
values
('00060293420258050080'),
('07139445120268070000'),
('07311947520188070001'),
('08219869220258190002'),
('50022220720198130015'),
('50097387820248130702'),
('50277282420208130702'),
('50280675120188130702'),
('50387042220228130702');

update public.processos p
set cliente = 'FASC'
from processos_fasc_corrigir pl
where regexp_replace(p.numero_cnj, '\D', '', 'g') = pl.cnj
  and p.cliente <> 'FASC';

select count(*) as atualizados from processos_fasc_corrigir;

commit;
