-- Marca ltv@bcw.com.br e jul@bcw.com.br como Estagiario.
--
-- Texto acentuado escrito via E'...\u00XX...' de proposito (nao com o
-- acento literal), pro arquivo ficar puro ASCII e imune ao problema de
-- mojibake no copiar/colar no editor SQL do Supabase (ver corrigir_mojibake).

UPDATE public.profiles
SET cargo = E'Estagi\u00e1rio'
WHERE lower(email) IN ('ltv@bcw.com.br', 'jul@bcw.com.br');
