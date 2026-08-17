-- Link manual do tribunal (sobrescreve o link automatico quando o
-- algoritmo erra o sistema/tribunal certo) + conserto de uma lacuna de
-- permissao encontrada nesse processo: a politica de UPDATE de processos
-- ainda so liberava quem criou o processo pelo sistema, tem o "admin" do
-- bootstrap antigo, ou recebeu compartilhamento avulso (processo_acessos)
-- -- nunca foi estendida pro acesso por pasta/grupo, diferente do SELECT.
-- Na pratica isso bloqueava silenciosamente a edicao de processo (inclusive
-- desse link) pra quase todo mundo que so tem acesso via pasta/grupo (a
-- maioria da equipe, principalmente quem entrou depois do bootstrap).

ALTER TABLE public.processos ADD COLUMN IF NOT EXISTS link_tribunal_manual text;

DROP POLICY IF EXISTS processos_update ON public.processos;
CREATE POLICY processos_update ON public.processos FOR UPDATE TO authenticated
  USING (created_by = auth.uid()
         OR public.has_role(auth.uid(), 'admin')
         OR EXISTS (SELECT 1 FROM public.processo_acessos a
                    WHERE a.processo_id = processos.id AND a.user_id = auth.uid())
         OR (pasta_id IS NOT NULL AND public.membro_do_grupo_do_processo(processos.id)))
  WITH CHECK (created_by = auth.uid()
         OR public.has_role(auth.uid(), 'admin')
         OR EXISTS (SELECT 1 FROM public.processo_acessos a
                    WHERE a.processo_id = processos.id AND a.user_id = auth.uid())
         OR (pasta_id IS NOT NULL AND public.membro_do_grupo_do_processo(processos.id)));
