-- Corrige a parte_contraria de 9 processos MERCK (aba MERCK da planilha
-- JGV Agosto): nesses casos a Merck (ou a Sigma, do mesmo grupo) e' a
-- re, e o campo parte_contraria tinha sido preenchido igual ao reu (ou
-- seja, com "Merck S.A."/"Sigma" de novo) em vez do autor de verdade,
-- que e' a parte adversa. Autor e reu ja estao certos no banco
-- (conferido via diagnostico), so parte_contraria precisa mudar.
--
-- Um caso da aba MERCK que nao tem Merck nem Sigma em nenhum dos lados
-- (Brandao Couto x Pedro Fontana) ficou de fora de proposito, aguardando
-- confirmacao.
--
-- Protegida contra rodar de novo (idempotente).

begin;

create temporary table merck_partes (cnj text primary key, parte_adversa text) on commit drop;

insert into merck_partes (cnj, parte_adversa) values
('00132711520188172001', 'Galindo Distribuidores'),
('00327628920098190021', 'Athos Farma'),
('05359342020008060001', E'Prontopl\u00e1stica'),
('10024904520208260529', 'Pedro Fontana'),
('10033596820188260564', 'Ferticare Comercio de Medicamentos Especiais Ltda-epp'),
('10042091520258130702', E'Leandro Jos\u00e9 da Costa'),
('10364466820268130702', E'Leandro Jos\u00e9 da Costa'),
('08237648920248190210', 'Green Brasil'),
('40000974320258260587', 'Samuel Coelho de Faria');

update public.processos p
set parte_contraria = mp.parte_adversa
from merck_partes mp
where regexp_replace(p.numero_cnj, '\D', '', 'g') = mp.cnj
  and p.parte_contraria is distinct from mp.parte_adversa;

select numero_cnj, cliente, autor, reu, parte_contraria, carteira
from public.processos
where regexp_replace(numero_cnj, '\D', '', 'g') in (select cnj from merck_partes)
order by numero_cnj;

commit;
