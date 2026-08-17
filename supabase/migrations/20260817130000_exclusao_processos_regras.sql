-- Regra de exclusao de processos. Antes era "quem criou o processo pelo
-- sistema (ou tem admin do bootstrap antigo)" -- como quase todo processo
-- veio de importacao em massa, isso na pratica deixava a exclusao
-- incontrolada (quase ninguem, ou qualquer admin antigo). Agora:
--   1) BDR e ELV podem excluir qualquer processo.
--   2) Qualquer outro advogado (cargo = Advogado) so pode excluir
--      processo da propria banca (responsavel bate com a sigla dele).
--   3) Estagiario e Administrativo nao excluem nada.

DROP POLICY IF EXISTS processos_delete ON public.processos;
CREATE POLICY processos_delete ON public.processos FOR DELETE TO authenticated
  USING (
    lower(coalesce(auth.jwt() ->> 'email', '')) IN ('bdr@bcw.com.br', 'elv@bcw.com.br')
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.cargo = 'Advogado'
        AND p.sigla IS NOT NULL
        AND processos.responsavel IS NOT NULL
        AND upper(p.sigla) = upper(processos.responsavel)
    )
  );
