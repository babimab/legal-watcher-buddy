-- Quem faz a baixa no sistema do cliente às vezes não consegue concluir
-- na hora (falta tarefa das contadoras ou do jurídico interno) -- dá um
-- jeito de registrar isso na própria fila de "Baixa na Souza Cruz", em
-- vez de só ter o botão de confirmar. Mesmas opções de pendência já
-- usadas em baixas_cliente (fluxo de cobrança da Astro), por
-- consistência.

alter table public.processos
  add column if not exists baixa_cliente_pendencia_com text
    check (baixa_cliente_pendencia_com is null or baixa_cliente_pendencia_com in ('Juridico interno', 'Contadores', 'Outro')),
  add column if not exists baixa_cliente_pendencia_descricao text;