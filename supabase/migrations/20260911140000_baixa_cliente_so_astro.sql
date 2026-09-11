-- O gatilho que cria baixas_cliente automaticamente ao encerrar um
-- processo foi pensado só pro fluxo de cobrança da Astro (ela não tem
-- sistema interno próprio, por isso precisa desse acompanhamento
-- manual de baixa). Mas ele disparava pra QUALQUER processo que virasse
-- status "encerrado", inclusive da Souza Cruz -- que agora também passa
-- a marcar "encerrado" pelos novos botões de Baixa na Souza Cruz.
-- Restringe o gatilho só a processos da Astro (mesmo critério de texto
-- já usado em categoriaCliente() no app).

CREATE OR REPLACE FUNCTION public.criar_baixa_cliente_ao_encerrar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE nova_baixa uuid;
BEGIN
  IF NEW.status = 'encerrado'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status)
     AND NEW.cliente ILIKE '%astro%' THEN
    INSERT INTO public.baixas_cliente (processo_id, status)
    VALUES (NEW.id, 'aguardando')
    ON CONFLICT (processo_id) DO NOTHING
    RETURNING id INTO nova_baixa;
    IF nova_baixa IS NOT NULL THEN
      INSERT INTO public.baixas_cliente_historico (baixa_id, tipo, resultado, descricao)
      VALUES (nova_baixa, 'criacao', 'aguardando', 'Processo encerrado no FaroLex e incluído automaticamente na fila de baixa no sistema do cliente.');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Limpa as entradas criadas por engano pra processos que não são da
-- Astro (efeito colateral do gatilho antigo, sem escopo).
DELETE FROM public.baixas_cliente bc
USING public.processos p
WHERE bc.processo_id = p.id
  AND p.cliente NOT ILIKE '%astro%';
