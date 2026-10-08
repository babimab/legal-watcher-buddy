-- Carteira "Administrativos" liberada pra todo mundo autenticado, não só
-- quem tem pasta/grupo/compartilhamento nesses processos -- mesmo pedido
-- de abrir a aba pras estagiárias que a representação já teve.
--
-- pode_acessar_processo é o choke-point usado por anexos, decisões,
-- citações, comunicações, calculadora e (principal motivo aqui)
-- acompanhamentos_administrativos -- então um valor aqui já libera ver E
-- registrar ligação nesses processos pra qualquer autenticado.
-- pode_visualizar_processo chama essa função por baixo, então também
-- fica coberta sem precisar mexer nela.
CREATE OR REPLACE FUNCTION public.pode_acessar_processo(_processo_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.processos p
    WHERE p.id = _processo_id
      AND (p.created_by = auth.uid()
           OR public.has_role(auth.uid(), 'admin')
           OR EXISTS (SELECT 1 FROM public.processo_acessos a
                      WHERE a.processo_id = p.id AND a.user_id = auth.uid())
           OR (p.pasta_id IS NOT NULL AND public.membro_do_grupo_do_processo(p.id))
           OR p.carteira = 'Administrativos')
  );
$$;

-- processos_select não chama a função acima (tem a mesma checagem
-- duplicada direto na política) -- sem esse ajuste os processos nem
-- apareceriam na consulta do painel pra quem não tem acesso por pasta.
DROP POLICY IF EXISTS processos_select ON public.processos;
CREATE POLICY processos_select ON public.processos FOR SELECT TO authenticated
  USING (created_by = auth.uid()
         OR public.has_role(auth.uid(), 'admin')
         OR EXISTS (SELECT 1 FROM public.processo_acessos a
                    WHERE a.processo_id = processos.id AND a.user_id = auth.uid())
         OR (pasta_id IS NOT NULL AND public.membro_do_grupo_do_processo(processos.id))
         OR carteira = 'Administrativos');

NOTIFY pgrst, 'reload schema';
