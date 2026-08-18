-- Migracao pontual: marca como encerrados os processos da MLV/Souza
-- Cruz que ja estao com situacao Encerrado na planilha de origem, mas
-- ainda constavam como ativo no FaroLex. So mexe em status -- nao altera
-- fase, valor, observacao nem qualquer outro campo.

begin;

create temporary table planilha_mlv_encerrados (cnj text primary key) on commit drop;

insert into planilha_mlv_encerrados (cnj)
values
('00004078920168180059'),
('00020346620128180028'),
('00753559020268050001'),
('08006094820238100079'),
('08033317420258100050'),
('30000517420268060011'),
('80006116420238050139');

update public.processos p
set status = 'encerrado'
from planilha_mlv_encerrados pl
where regexp_replace(p.numero_cnj, E'\\D', '', 'g') = pl.cnj
  and p.status <> 'encerrado';

select count(*) as atualizados from planilha_mlv_encerrados;

commit;
