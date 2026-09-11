-- Seção "Decisões" do processo -- espelha os mesmos campos que o LegalDesk
-- já usa pra registrar decisão (Juiz, Houve decisão?, Data da decisão,
-- Decisão, Detalhamento da decisão), pra no futuro alimentar o LD com o
-- mínimo de tradução. Fica de fora dela qualquer campo de cálculo (valor,
-- índice, honorários) -- por pedido explícito, isso não mistura com
-- Decisões; quando precisar, o valor/critério só fica descrito em texto
-- no "Detalhamento" mesmo, e o cálculo de verdade é feito à parte na
-- calculadora judicial já existente (/calculos), acessada por um atalho
-- que só vincula o processo, sem copiar nada pra lá.
CREATE TABLE IF NOT EXISTS public.decisoes_processo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id uuid NOT NULL REFERENCES public.processos(id) ON DELETE CASCADE,
  juiz text,
  houve_decisao boolean NOT NULL DEFAULT true,
  data_decisao date,
  decisao text,
  detalhamento text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_decisoes_processo_processo ON public.decisoes_processo(processo_id);

ALTER TABLE public.decisoes_processo ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.decisoes_processo FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.decisoes_processo TO authenticated;

-- Mesmo padrão de acesso de calculos_judiciais: visualizar segue
-- pode_visualizar_processo (mais permissivo, inclui membro de grupo/
-- pasta), editar/excluir seguem pode_acessar_processo.
DROP POLICY IF EXISTS decisoes_processo_select ON public.decisoes_processo;
CREATE POLICY decisoes_processo_select ON public.decisoes_processo
  FOR SELECT TO authenticated
  USING (public.pode_visualizar_processo(processo_id));

DROP POLICY IF EXISTS decisoes_processo_insert ON public.decisoes_processo;
CREATE POLICY decisoes_processo_insert ON public.decisoes_processo
  FOR INSERT TO authenticated
  WITH CHECK (public.pode_visualizar_processo(processo_id) AND created_by = auth.uid());

DROP POLICY IF EXISTS decisoes_processo_update ON public.decisoes_processo;
CREATE POLICY decisoes_processo_update ON public.decisoes_processo
  FOR UPDATE TO authenticated
  USING (public.pode_acessar_processo(processo_id))
  WITH CHECK (public.pode_acessar_processo(processo_id));

DROP POLICY IF EXISTS decisoes_processo_delete ON public.decisoes_processo;
CREATE POLICY decisoes_processo_delete ON public.decisoes_processo
  FOR DELETE TO authenticated
  USING (public.pode_acessar_processo(processo_id));
