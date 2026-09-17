-- Reorganização de sócio na carteira Souza Cruz: ELV passa a ser sócia
-- de todos os processos, exceto os que envolvem a RKA Comércio e
-- Representações Ltda, que ficam com GFC (pedido explícito da BDR).
-- Não mexe em Astromarítima (NYM) nem nos processos de outros clientes
-- que têm GFC (EISA, BNDES) -- confirmado que ficam como estão.
update public.processos
set socio = 'ELV'
where cliente ilike '%souza cruz%'
  and id not in (
    select id from public.processos
    where cliente ilike '%souza cruz%'
      and (autor ilike '%RKA Com%rcio%' or reu ilike '%RKA Com%rcio%' or parte_contraria ilike '%RKA Com%rcio%')
  );

update public.processos
set socio = 'GFC'
where cliente ilike '%souza cruz%'
  and (autor ilike '%RKA Com%rcio%' or reu ilike '%RKA Com%rcio%' or parte_contraria ilike '%RKA Com%rcio%');

-- Pendente: os processos envolvendo Heráclito e Filhos Ltda. e Carlos
-- Ronaldo Castro - Epp (também GFC, por pedido da BDR) ainda não estão
-- cadastrados no FaroLex -- os CNJ que ela passou (5063225-31.2022.8.13.0702,
-- 0031671-10.1992.8.05.0001, REsp 2022492/BA) não batem com nenhum
-- processo existente. Cadastrar e marcar socio='GFC' quando os dados completos
-- (tribunal, vara, partes) estiverem disponíveis.
