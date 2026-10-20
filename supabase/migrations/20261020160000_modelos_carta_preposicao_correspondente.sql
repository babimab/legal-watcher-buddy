-- Carta de Preposição "para o correspondente local": mesma ideia do
-- Substabelecimento para o Correspondente Local
-- (20261020150000_modelos_substabelecimento_correspondente.sql), só que
-- credenciando uma lista enorme de prepostos (nome + CPF) em vez de
-- advogados correspondentes (nome + OAB) -- planilha real de pauta de
-- audiência não traz prepostos nomeados um a um, e sim um cadastro
-- único por estado, igual o modelo real (carta-Muniz-completo.pdf) que
-- a BDR mandou.

CREATE TABLE IF NOT EXISTS public.modelos_carta_preposicao_correspondente (
  id text PRIMARY KEY,
  estado text NOT NULL,
  -- Bloco de texto colado (nome + CPF de cada preposto, igual já vem
  -- pronto no PDF/Word que a BDR usa hoje) -- usado literalmente no
  -- documento gerado, sem parsing linha a linha.
  lista_prepostos text NOT NULL,
  assinatura_caminho text,
  assinante_nome text,
  assinante_oab text,
  -- PDF original só de referência/backup -- não é lido pelo gerador.
  modelo_pdf_caminho text,
  modelo_pdf_nome_arquivo text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.modelos_carta_preposicao_correspondente ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.modelos_carta_preposicao_correspondente FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.modelos_carta_preposicao_correspondente TO authenticated;
GRANT ALL ON public.modelos_carta_preposicao_correspondente TO service_role;

DROP POLICY IF EXISTS modelos_carta_preposicao_correspondente_select ON public.modelos_carta_preposicao_correspondente;
CREATE POLICY modelos_carta_preposicao_correspondente_select ON public.modelos_carta_preposicao_correspondente
  FOR SELECT TO authenticated USING (public.pode_gerenciar_representacao());

DROP POLICY IF EXISTS modelos_carta_preposicao_correspondente_insert ON public.modelos_carta_preposicao_correspondente;
CREATE POLICY modelos_carta_preposicao_correspondente_insert ON public.modelos_carta_preposicao_correspondente
  FOR INSERT TO authenticated WITH CHECK (public.pode_gerenciar_representacao());

DROP POLICY IF EXISTS modelos_carta_preposicao_correspondente_update ON public.modelos_carta_preposicao_correspondente;
CREATE POLICY modelos_carta_preposicao_correspondente_update ON public.modelos_carta_preposicao_correspondente
  FOR UPDATE TO authenticated USING (public.pode_gerenciar_representacao())
  WITH CHECK (public.pode_gerenciar_representacao());

DROP POLICY IF EXISTS modelos_carta_preposicao_correspondente_delete ON public.modelos_carta_preposicao_correspondente;
CREATE POLICY modelos_carta_preposicao_correspondente_delete ON public.modelos_carta_preposicao_correspondente
  FOR DELETE TO authenticated USING (public.pode_gerenciar_representacao());

DROP TRIGGER IF EXISTS modelos_carta_preposicao_correspondente_updated_at ON public.modelos_carta_preposicao_correspondente;
CREATE TRIGGER modelos_carta_preposicao_correspondente_updated_at
  BEFORE UPDATE ON public.modelos_carta_preposicao_correspondente
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

NOTIFY pgrst, 'reload schema';
