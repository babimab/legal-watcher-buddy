-- Migracao pontual: corrige o cliente do processo 0199411-59.2016.8.13.0702
-- (Maria Oliveira dos Santos) de "Souza Cruz Ltda" para "FASC" -- foi
-- cadastrado errado numa migracao anterior (novo_processo_jgv_maria_oliveira),
-- confirmado com a BDR que e FASC. Protegida contra rodar de novo.

update public.processos
set cliente = 'FASC'
where regexp_replace(numero_cnj, '\D', '', 'g') = '01994115920168130702'
  and cliente <> 'FASC';

select numero_cnj, cliente
from public.processos
where regexp_replace(numero_cnj, '\D', '', 'g') = '01994115920168130702';
