-- Ajusta o objeto de 2 processos JGV que tinham ficado com rotulo generico
-- "6461 - Outros": sao casos previdenciario/securitario de ex-funcionarios,
-- nao litigio de acidente de transito (pedido da BDR em 2026-09-01).

update public.processos
set classe = 'FASC'
where numero_cnj = '5009738-78.2024.8.13.0702';

update public.processos
set classe = 'Seguro de Vida'
where numero_cnj = '3005735-28.2025.8.06.0071';
