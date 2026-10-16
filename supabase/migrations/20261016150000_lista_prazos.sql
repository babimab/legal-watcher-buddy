-- Suporte pra tela "Lista de prazos" (pedido da BDR): lista semanal de
-- prazos/audiências/julgamentos no formato compacto que a chefe dela já
-- usa no Word ("DD/MM/AA: Providência Nome (cliente/caso) Horário Juízo
-- ADVG"), gerada automaticamente a partir dos prazos já cadastrados
-- (tabela movimentacoes, mesma fonte de "Meus prazos"), mais itens
-- manuais (ex.: aviso de férias da equipe) que não têm processo ligado.

-- "Horário" do prazo/audiência (ex.: "16h", "09h30") -- não existia
-- antes porque "Meus prazos" nunca precisou mostrar isso, só a data.
ALTER TABLE public.movimentacoes ADD COLUMN IF NOT EXISTS horario text;

-- Itens manuais da lista (sem processo ligado -- ex.: "[Férias BBS:
-- 15/10 a 29/10]"). "data_ordenacao" é só pra saber onde encaixar o
-- item na lista cronológica, não é um prazo de verdade.
CREATE TABLE IF NOT EXISTS public.lista_prazos_manual (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  texto text NOT NULL,
  data_ordenacao date,
  concluida boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lista_prazos_manual_data
  ON public.lista_prazos_manual(data_ordenacao);

ALTER TABLE public.lista_prazos_manual ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.lista_prazos_manual FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lista_prazos_manual TO authenticated;
GRANT ALL ON public.lista_prazos_manual TO service_role;

-- Lista do escritório inteiro (não é por pasta/time) -- qualquer pessoa
-- autenticada pode ver e editar, mesmo padrão já usado pra abrir
-- Administrativos a todo mundo.
DROP POLICY IF EXISTS lista_prazos_manual_select ON public.lista_prazos_manual;
CREATE POLICY lista_prazos_manual_select ON public.lista_prazos_manual
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS lista_prazos_manual_insert ON public.lista_prazos_manual;
CREATE POLICY lista_prazos_manual_insert ON public.lista_prazos_manual
  FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS lista_prazos_manual_update ON public.lista_prazos_manual;
CREATE POLICY lista_prazos_manual_update ON public.lista_prazos_manual
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS lista_prazos_manual_delete ON public.lista_prazos_manual;
CREATE POLICY lista_prazos_manual_delete ON public.lista_prazos_manual
  FOR DELETE TO authenticated USING (true);

NOTIFY pgrst, 'reload schema';
