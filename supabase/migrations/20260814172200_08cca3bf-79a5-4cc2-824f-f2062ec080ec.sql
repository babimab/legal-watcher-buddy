-- Limpeza automática de processos duplicados (a pedido do escritório, sem
-- precisar de uma tela de revisão manual). Dois critérios, aplicados até
-- não sobrar nenhum duplicado:
--   1) mesmo número CNJ, ignorando formatação/pontuação;
--   2) número antigo de um processo bate com o número CNJ atual de outro
--      (mesmo caso, registrado duas vezes sob numeração diferente).
-- Em cada par, mantém o processo criado primeiro (created_at mais antigo),
-- move as movimentações do duplicado para ele (descartando as que já
-- existirem repetidas), repassa desdobramentos e acessos, e então remove
-- o duplicado.
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

  LOOP
    SELECT p2.id AS mantido, p1.id AS removido
    INTO par
    FROM public.processos p1
    JOIN public.processos p2
      ON p2.id <> p1.id
     AND p1.numero_antigo IS NOT NULL
     AND regexp_replace(p1.numero_antigo, '\D', '', 'g') <> ''
     AND regexp_replace(p2.numero_cnj, '\D', '', 'g') = regexp_replace(p1.numero_antigo, '\D', '', 'g')
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
