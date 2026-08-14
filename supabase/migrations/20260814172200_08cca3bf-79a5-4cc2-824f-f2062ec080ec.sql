-- Limpeza automática de processos duplicados (a pedido do escritório, sem
-- precisar de uma tela de revisão manual): processos com o mesmo número
-- CNJ (ignorando formatação/pontuação) são mesclados, mantendo o
-- registrado primeiro (created_at mais antigo) e movendo as
-- movimentações do duplicado para ele antes de removê-lo.
--
-- O número antigo de um processo batendo com o número atual de outro NÃO
-- entra nesse critério: isso também acontece quando o processo mais novo
-- é um desdobramento (recurso, cumprimento de sentença) do mais antigo, e
-- nesse caso os dois são registros legítimos e distintos — a fusão abaixo
-- cuida apenas do caso 1 (duplicado de verdade); o vínculo como
-- desdobramento é tratado em uma migration separada.
DO $$
DECLARE
  par RECORD;
BEGIN
  LOOP
    SELECT p2.id AS mantido, p1.id AS removido
    INTO par
    FROM public.processos p1
    JOIN public.processos p2
      ON p2.id <> p1.id
     AND regexp_replace(p2.numero_cnj, '\D', '', 'g') = regexp_replace(p1.numero_cnj, '\D', '', 'g')
     AND regexp_replace(p1.numero_cnj, '\D', '', 'g') <> ''
     AND (p2.created_at < p1.created_at OR (p2.created_at = p1.created_at AND p2.id < p1.id))
    LIMIT 1;

    EXIT WHEN par IS NULL;

    UPDATE public.movimentacoes m
    SET processo_id = par.mantido
    WHERE m.processo_id = par.removido
      AND NOT EXISTS (
        SELECT 1 FROM public.movimentacoes m2
        WHERE m2.processo_id = par.mantido
          AND m2.data_movimentacao = m.data_movimentacao
          AND md5(m2.descricao) = md5(m.descricao)
      );
    DELETE FROM public.movimentacoes WHERE processo_id = par.removido;
    UPDATE public.processos SET processo_pai_id = par.mantido WHERE processo_pai_id = par.removido;
    INSERT INTO public.processo_acessos (processo_id, user_id, created_by)
    SELECT par.mantido, a.user_id, a.created_by
    FROM public.processo_acessos a WHERE a.processo_id = par.removido
    ON CONFLICT DO NOTHING;
    DELETE FROM public.processos WHERE id = par.removido;
  END LOOP;
END $$;
