-- Defensivo: garante que todo usuário autenticado (inclusive estagiária)
-- tem permissão de executar a função que busca o último andamento de
-- cada processo pro card da lista. Idempotente -- não faz nada se já
-- estava concedido.
GRANT EXECUTE ON FUNCTION public.listar_ultimas_movimentacoes() TO authenticated;
