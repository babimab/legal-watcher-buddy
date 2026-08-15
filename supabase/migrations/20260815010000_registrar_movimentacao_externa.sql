-- Função usada pelo webhook de recebimento de andamentos (edge function
-- "receber-andamento") pra gravar movimentações vindas de um provedor
-- externo de monitoramento processual (ex.: Judit, Escavador, DataJud).
-- Só o service_role pode chamar — a edge function usa a service role key,
-- não o login do usuário, já que quem está chamando é o provedor externo.

CREATE OR REPLACE FUNCTION public.registrar_movimentacao_externa(
  _numero_cnj text,
  _data_movimentacao date,
  _descricao text,
  _tipo text DEFAULT NULL,
  _observacao text DEFAULT NULL,
  _provedor text DEFAULT NULL,
  _id_externo text DEFAULT NULL
)
RETURNS TABLE (movimentacao_id uuid, id_processo uuid, inserida boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _proc_id uuid;
  _mov_id uuid;
BEGIN
  -- Compara só os dígitos do CNJ, pra não depender do provedor mandar
  -- exatamente no mesmo formato (com ou sem traço/ponto) que salvamos aqui.
  SELECT p.id INTO _proc_id
  FROM public.processos p
  WHERE regexp_replace(p.numero_cnj, '\D', '', 'g') = regexp_replace(_numero_cnj, '\D', '', 'g')
  LIMIT 1;

  IF _proc_id IS NULL THEN
    RETURN QUERY SELECT NULL::uuid, NULL::uuid, false;
    RETURN;
  END IF;

  INSERT INTO public.movimentacoes
    (processo_id, data_movimentacao, descricao, tipo, observacao, fonte, id_externo)
  VALUES
    (_proc_id, _data_movimentacao, _descricao, _tipo, _observacao, COALESCE(_provedor, 'api_externa'), _id_externo)
  ON CONFLICT (processo_id, data_movimentacao, md5(descricao)) DO NOTHING
  RETURNING movimentacoes.id INTO _mov_id;

  UPDATE public.processos SET ultima_verificacao_em = now() WHERE id = _proc_id;

  RETURN QUERY SELECT _mov_id, _proc_id, (_mov_id IS NOT NULL);
END;
$$;

REVOKE ALL ON FUNCTION public.registrar_movimentacao_externa(text, date, text, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_movimentacao_externa(text, date, text, text, text, text, text) TO service_role;
