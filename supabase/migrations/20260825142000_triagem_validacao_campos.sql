ALTER TABLE public.movimentacoes
  ADD COLUMN IF NOT EXISTS validado_por text,
  ADD COLUMN IF NOT EXISTS validado_em timestamptz;

COMMENT ON COLUMN public.movimentacoes.validado_por IS 'Sigla ou e-mail de quem concluiu a triagem.';
COMMENT ON COLUMN public.movimentacoes.validado_em IS 'Data e hora em que a triagem foi concluída.';

CREATE OR REPLACE FUNCTION public.concluir_triagem_movimentacoes(_ids uuid[], _validado_por text DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _qtd integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  UPDATE public.movimentacoes m
     SET validado = true,
         validado_por = COALESCE(NULLIF(trim(_validado_por), ''), auth.email()),
         validado_em = now()
   WHERE m.id = ANY(_ids)
     AND public.pode_visualizar_processo(m.processo_id);

  GET DIAGNOSTICS _qtd = ROW_COUNT;
  RETURN _qtd;
END;
$$;

REVOKE ALL ON FUNCTION public.concluir_triagem_movimentacoes(uuid[], text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.concluir_triagem_movimentacoes(uuid[], text) TO authenticated;
