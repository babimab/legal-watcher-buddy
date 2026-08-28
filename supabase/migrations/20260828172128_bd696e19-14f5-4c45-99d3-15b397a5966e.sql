-- 1) Revoke anon/public EXECUTE on SECURITY DEFINER functions
REVOKE ALL ON FUNCTION public.concluir_triagem_movimentacoes(uuid[], text) FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.corrigir_acento_qualidade(text, uuid, text, text) FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.criar_baixa_cliente_ao_encerrar() FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.pode_editar_calculo(uuid) FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.pode_visualizar_calculo(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.concluir_triagem_movimentacoes(uuid[], text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.corrigir_acento_qualidade(text, uuid, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.criar_baixa_cliente_ao_encerrar() TO service_role;
GRANT EXECUTE ON FUNCTION public.pode_editar_calculo(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.pode_visualizar_calculo(uuid) TO authenticated, service_role;

-- helper: administrative staff check
CREATE OR REPLACE FUNCTION public.e_administrativo()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (p.cargo = 'Administrativo' OR lower(p.email) = 'bdr@bcw.com.br')
  ) OR public.has_role(auth.uid(), 'admin');
$$;
REVOKE ALL ON FUNCTION public.e_administrativo() FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.e_administrativo() TO authenticated, service_role;

-- 2) baixas_cliente: restrict reads
DROP POLICY IF EXISTS baixas_select_autenticados ON public.baixas_cliente;
CREATE POLICY baixas_select_permitidos ON public.baixas_cliente
FOR SELECT TO authenticated
USING (public.e_administrativo() OR public.pode_visualizar_processo(processo_id));

-- 3) baixas_cliente_historico: restrict reads
DROP POLICY IF EXISTS baixas_hist_select_autenticados ON public.baixas_cliente_historico;
CREATE POLICY baixas_hist_select_permitidos ON public.baixas_cliente_historico
FOR SELECT TO authenticated
USING (
  public.e_administrativo()
  OR EXISTS (
    SELECT 1 FROM public.baixas_cliente b
    WHERE b.id = baixas_cliente_historico.baixa_id
      AND public.pode_visualizar_processo(b.processo_id)
  )
);

-- 4) storage: explicit UPDATE policy for calculos-judiciais
DROP POLICY IF EXISTS calculos_storage_update ON storage.objects;
CREATE POLICY calculos_storage_update ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'calculos-judiciais' AND public.pode_editar_calculo(((storage.foldername(name))[1])::uuid))
WITH CHECK (bucket_id = 'calculos-judiciais' AND public.pode_editar_calculo(((storage.foldername(name))[1])::uuid));