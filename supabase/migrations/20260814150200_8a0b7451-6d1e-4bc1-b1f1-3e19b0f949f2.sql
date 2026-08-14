-- Fusão de processos duplicados: move movimentações (descartando as que já
-- existirem repetidas no processo mantido), repassa desdobramentos que
-- apontavam para o duplicado, e então remove o duplicado. Só quem tem
-- permissão de dono (ou admin) sobre os dois processos pode executar.
CREATE OR REPLACE FUNCTION public.fundir_processos(_mantido_id uuid, _removido_id uuid)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _mantido_id = _removido_id THEN
    RAISE EXCEPTION 'Selecione dois processos diferentes para fundir';
  END IF;

  IF NOT public.e_dono_processo(_mantido_id) OR NOT public.e_dono_processo(_removido_id) THEN
    RAISE EXCEPTION 'Sem permissão para fundir estes processos';
  END IF;

  UPDATE public.movimentacoes m
  SET processo_id = _mantido_id
  WHERE m.processo_id = _removido_id
    AND NOT EXISTS (
      SELECT 1 FROM public.movimentacoes m2
      WHERE m2.processo_id = _mantido_id
        AND m2.data_movimentacao = m.data_movimentacao
        AND md5(m2.descricao) = md5(m.descricao)
    );

  DELETE FROM public.movimentacoes WHERE processo_id = _removido_id;

  UPDATE public.processos SET processo_pai_id = _mantido_id WHERE processo_pai_id = _removido_id;

  INSERT INTO public.processo_acessos (processo_id, user_id, created_by)
  SELECT _mantido_id, a.user_id, a.created_by
  FROM public.processo_acessos a
  WHERE a.processo_id = _removido_id
  ON CONFLICT DO NOTHING;

  DELETE FROM public.processos WHERE id = _removido_id;
END;
$$;

REVOKE ALL ON FUNCTION public.fundir_processos(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fundir_processos(uuid, uuid) TO authenticated;
