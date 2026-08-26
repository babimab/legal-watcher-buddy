-- Corrige de vez os 10 processos da carteira FASC: cliente = "FASC",
-- carteira = "FASC", e ajusta a parte adversa e o reu pra cada
-- processo -- a planilha de origem tinha colocado o nome da parte
-- adversa na coluna "Cliente" por engano, entao esse nome precisa ir
-- pro campo certo (parte_contraria/reu), nao ficar perdido.
--
-- Essa migracao nao depende de nenhuma migracao anterior ter rodado --
-- seleciona os processos pelo numero do CNJ, nao pelo valor atual de
-- cliente/carteira. Protegida contra rodar de novo (idempotente).
--
-- Texto acentuado escrito via E'...\u00XX...' de proposito, pro arquivo
-- ficar puro ASCII (ver corrigir_mojibake).

begin;

create temporary table fasc_partes (cnj text primary key, parte_adversa text) on commit drop;

insert into fasc_partes (cnj, parte_adversa) values
('00060293420258050080', 'RAMALHO DE OLIVEIRA SANTOS'),
('07139445120268070000', E'MARIA AUXILIADORA NASCIMENTO VIOLATTI'),
('07311947520188070001', E'MARIA AUXILIADORA NASCIMENTO VIOLATTI'),
('08219869220258190002', E'Sandra Cristina Coutinho'),
('50022220720198130015', E'HELOISA ROCHA PINHO'),
('50097387820248130702', E'ANAHITA MARIA SILVA'),
('50277282420208130702', E'JOS\u00c9 ROBERTO SILVA SEVERINO'),
('50280675120188130702', 'PAULO SERGIO GARDIM'),
('50387042220228130702', E'MARIA OLIVEIRA DOS SANTOS'),
('01994115920168130702', E'MARIA OLIVEIRA DOS SANTOS');

update public.processos p
set cliente = 'FASC',
    carteira = 'FASC',
    reu = 'FASC',
    parte_contraria = fp.parte_adversa
from fasc_partes fp
where regexp_replace(p.numero_cnj, '\D', '', 'g') = fp.cnj;

select numero_cnj, cliente, reu, parte_contraria, carteira
from public.processos
where carteira = 'FASC'
order by numero_cnj;

commit;
