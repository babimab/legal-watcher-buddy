-- Ajusta o objeto dos ultimos 4 processos que ainda estavam com o rotulo
-- generico "Outros", apos leitura do detalhamento_objeto de cada um
-- (pedido da BDR em 2026-09-01).

update public.processos
set classe = 'FASC'
where numero_cnj = '5002222-07.2019.8.13.0015';

update public.processos
set classe = 'Transportador de Fumo'
where numero_cnj = '5007462-14.2022.8.21.0026';

update public.processos
set classe = 'Descumprimento Contratual'
where numero_cnj = '5001516-29.2021.8.13.0702';

update public.processos
set classe = 'Recuperacao Judicial'
where numero_cnj = '0004411-95.2018.8.16.0079';
