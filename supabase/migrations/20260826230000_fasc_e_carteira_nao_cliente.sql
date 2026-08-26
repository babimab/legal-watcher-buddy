-- Corrige um erro das duas migracoes anteriores (corrige_cliente_fasc e
-- corrige_cliente_fasc_maria_oliveira): FASC nao e um cliente separado,
-- e carteira do cliente Souza Cruz -- a planilha de origem so tinha a
-- parte contraria escrita na coluna "Cliente" por engano. Volta o
-- cliente desses 10 processos pra Souza Cruz Ltda e marca a carteira
-- como FASC (carteira ja e um valor conhecido no sistema desde antes).
-- Protegida contra rodar de novo (idempotente).

update public.processos
set cliente = 'Souza Cruz Ltda',
    carteira = 'FASC'
where cliente = 'FASC';

select numero_cnj, cliente, carteira
from public.processos
where carteira = 'FASC';
