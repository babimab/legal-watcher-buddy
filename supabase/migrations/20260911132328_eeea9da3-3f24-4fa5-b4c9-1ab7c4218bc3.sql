-- A aba "Baixa na Astro" (fluxo de cobrança) saiu do app -- a cliente
-- Astro não tem sistema interno próprio, então esse acompanhamento não
-- se aplica mais. Desliga o gatilho que criava entrada em baixas_cliente
-- automaticamente ao encerrar um processo, já que não tem mais tela
-- nenhuma exibindo isso. As tabelas baixas_cliente/baixas_cliente_historico
-- continuam existindo (histórico preservado), só não recebem entrada nova.

DROP TRIGGER IF EXISTS trg_criar_baixa_cliente_ao_encerrar ON public.processos;