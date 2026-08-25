-- Corrige achados do scanner de seguranca do Lovable:
--
-- 1) (Critical) baixas_cliente e baixas_cliente_historico tinham SELECT
--    liberado pra qualquer autenticado (USING true) -- expunha status de
--    cobranca, pendencia e dados de faturamento de todos os clientes pra
--    qualquer pessoa logada, inclusive quem nao tem nenhum acesso ao
--    processo em si. Agora so ve quem administra baixas (Administrativo
--    ou BDR) ou quem ja pode ver o processo (mesma regra usada em
--    documentos, comunicacoes etc via pode_visualizar_processo).
--
-- 2) (Warning) pode_editar_calculo e pode_visualizar_calculo (calculadora
--    judicial) foram criadas sem revogar o EXECUTE padrao de PUBLIC --
--    diferente de todas as outras funcoes SECURITY DEFINER do projeto,
--    que sempre revogam PUBLIC e liberam so pra authenticated. Corrigido
--    aqui pra ficar consistente com o resto (efeito pratico e baixo, ja
--    que a funcao so retorna true/false sem uid, mas fecha a brecha).
--
-- 3) Mesma correcao de higiene nas funcoes de trigger
--    (update_updated_at_column, criar_baixa_cliente_ao_encerrar): so sao
--    chamadas pelo proprio Postgres ao disparar o trigger (isso nao
--    depende de EXECUTE), entao revogar de PUBLIC nao muda nada no
--    funcionamento, so fecha o aviso do scanner.

DROP POLICY IF EXISTS "baixas_select_autenticados" ON public.baixas_cliente;
CREATE POLICY "baixas_select_autenticados" ON public.baixas_cliente FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND (p.cargo = 'Administrativo' OR lower(p.email) = 'bdr@bcw.com.br')
  )
  OR public.pode_visualizar_processo(processo_id)
);

DROP POLICY IF EXISTS "baixas_hist_select_autenticados" ON public.baixas_cliente_historico;
CREATE POLICY "baixas_hist_select_autenticados" ON public.baixas_cliente_historico FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.baixas_cliente b
    WHERE b.id = baixa_id
      AND (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND (p.cargo = 'Administrativo' OR lower(p.email) = 'bdr@bcw.com.br')
        )
        OR public.pode_visualizar_processo(b.processo_id)
      )
  )
);

REVOKE ALL ON FUNCTION public.pode_visualizar_calculo(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pode_visualizar_calculo(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.pode_editar_calculo(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pode_editar_calculo(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.criar_baixa_cliente_ao_encerrar() FROM PUBLIC;
