-- Corrige na raiz a mesma lacuna encontrada na migracao anterior
-- (link_tribunal_manual): a funcao pode_acessar_processo (usada por
-- processos_update, documentos_insert/delete, e agora tambem
-- processo_comunicacoes) nunca tinha sido estendida pro acesso por
-- pasta/grupo -- so valia pra quem criou o processo, tem o "admin" de um
-- bootstrap antigo, ou recebeu compartilhamento avulso.
--
-- Isso bloqueava silenciosamente, pra quase toda a equipe (quem so tem
-- acesso via pasta/grupo, como a maioria das estagiarias e advogados que
-- entraram depois do bootstrap): anexar/excluir documento do processo, e
-- agora tambem gerar/salvar comunicacao de decisao.
--
-- pode_visualizar_processo ja fazia "pode_acessar_processo OR
-- membro_do_grupo_do_processo" -- estendendo pode_acessar_processo aqui
-- deixa esse OR redundante (inofensivo) e conserta de uma vez todo mundo
-- que depende dela.

CREATE OR REPLACE FUNCTION public.pode_acessar_processo(_processo_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.processos p
    WHERE p.id = _processo_id
      AND (p.created_by = auth.uid()
           OR public.has_role(auth.uid(), 'admin')
           OR EXISTS (SELECT 1 FROM public.processo_acessos a
                      WHERE a.processo_id = p.id AND a.user_id = auth.uid())
           OR (p.pasta_id IS NOT NULL AND public.membro_do_grupo_do_processo(p.id)))
  );
$$;
