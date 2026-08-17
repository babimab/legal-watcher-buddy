-- Comunicacao de decisao gerada por IA (E-law) - texto gerado a partir do
-- PDF de uma decisao/sentenca/acordao, seguindo um prompt fixo, e salvo
-- linkado ao processo. Mesma regra de acesso ja usada por documentos
-- (anexos): ve quem pode ver o processo, grava/apaga quem pode editar o
-- processo (pode_acessar_processo).

CREATE TABLE IF NOT EXISTS public.processo_comunicacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id uuid NOT NULL REFERENCES public.processos(id) ON DELETE CASCADE,
  texto text NOT NULL,
  nome_arquivo_origem text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_processo_comunicacoes_processo
  ON public.processo_comunicacoes (processo_id);

ALTER TABLE public.processo_comunicacoes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.processo_comunicacoes FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.processo_comunicacoes TO authenticated;
GRANT ALL ON public.processo_comunicacoes TO service_role;

DROP POLICY IF EXISTS processo_comunicacoes_select ON public.processo_comunicacoes;
CREATE POLICY processo_comunicacoes_select ON public.processo_comunicacoes FOR SELECT TO authenticated
  USING (public.pode_visualizar_processo(processo_id));

DROP POLICY IF EXISTS processo_comunicacoes_insert ON public.processo_comunicacoes;
CREATE POLICY processo_comunicacoes_insert ON public.processo_comunicacoes FOR INSERT TO authenticated
  WITH CHECK (public.pode_acessar_processo(processo_id) AND created_by = auth.uid());

DROP POLICY IF EXISTS processo_comunicacoes_update ON public.processo_comunicacoes;
CREATE POLICY processo_comunicacoes_update ON public.processo_comunicacoes FOR UPDATE TO authenticated
  USING (public.pode_acessar_processo(processo_id))
  WITH CHECK (public.pode_acessar_processo(processo_id));

DROP POLICY IF EXISTS processo_comunicacoes_delete ON public.processo_comunicacoes;
CREATE POLICY processo_comunicacoes_delete ON public.processo_comunicacoes FOR DELETE TO authenticated
  USING (public.pode_acessar_processo(processo_id));
