-- Acompanhamento semanal dos processos administrativos -- esses não têm
-- andamento pelo sistema do tribunal, precisam ser checados por telefone
-- pelas estagiárias. Cada linha é um check-in (uma ligação): data,
-- quem ligou, o que fez/descobriu -- histórico completo, não só o
-- último status, pra dar pra BDR enxergar quem está em dia e quem está
-- atrasado.
CREATE TABLE IF NOT EXISTS public.acompanhamentos_administrativos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id uuid NOT NULL REFERENCES public.processos(id) ON DELETE CASCADE,
  data_ligacao date NOT NULL DEFAULT CURRENT_DATE,
  estagiario text,
  o_que_fez text,
  proximo_passo text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_acompanhamentos_administrativos_processo
  ON public.acompanhamentos_administrativos(processo_id, data_ligacao DESC);

ALTER TABLE public.acompanhamentos_administrativos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.acompanhamentos_administrativos FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.acompanhamentos_administrativos TO authenticated;

-- Mesmo padrão de acesso de decisoes_processo: visualizar segue
-- pode_visualizar_processo, editar/excluir seguem pode_acessar_processo.
DROP POLICY IF EXISTS acompanhamentos_administrativos_select ON public.acompanhamentos_administrativos;
CREATE POLICY acompanhamentos_administrativos_select ON public.acompanhamentos_administrativos
  FOR SELECT TO authenticated
  USING (public.pode_visualizar_processo(processo_id));

DROP POLICY IF EXISTS acompanhamentos_administrativos_insert ON public.acompanhamentos_administrativos;
CREATE POLICY acompanhamentos_administrativos_insert ON public.acompanhamentos_administrativos
  FOR INSERT TO authenticated
  WITH CHECK (public.pode_visualizar_processo(processo_id) AND created_by = auth.uid());

DROP POLICY IF EXISTS acompanhamentos_administrativos_update ON public.acompanhamentos_administrativos;
CREATE POLICY acompanhamentos_administrativos_update ON public.acompanhamentos_administrativos
  FOR UPDATE TO authenticated
  USING (public.pode_acessar_processo(processo_id))
  WITH CHECK (public.pode_acessar_processo(processo_id));

DROP POLICY IF EXISTS acompanhamentos_administrativos_delete ON public.acompanhamentos_administrativos;
CREATE POLICY acompanhamentos_administrativos_delete ON public.acompanhamentos_administrativos
  FOR DELETE TO authenticated
  USING (public.pode_acessar_processo(processo_id));
