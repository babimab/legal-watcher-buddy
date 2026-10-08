-- Docs de Representação deixa de ser restrito a um grupo de siglas
-- (LSO/NYM/BDR) e passa a ficar aberto a qualquer usuário autenticado,
-- igual o resto do sistema (processos, movimentações etc.) -- só a
-- Fatura continua com acesso restrito (SIGLAS_PERMITIDAS_FATURA, que é
-- uma trava separada, não mexida aqui).
--
-- Em vez de reescrever cada política de clientes_substabelecimento e
-- dos 4 buckets (assinaturas/procurações/cartas/substabelecimentos-
-- modelo) uma por uma, só redefine a função usada por todas elas pra
-- não checar mais sigla -- qualquer usuário autenticado passa.
CREATE OR REPLACE FUNCTION public.pode_gerenciar_representacao()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL;
$$;

NOTIFY pgrst, 'reload schema';
