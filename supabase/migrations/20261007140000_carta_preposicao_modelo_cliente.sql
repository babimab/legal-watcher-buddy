-- Carta de Preposição "modelo pronto" (PDF) por cliente -- além do
-- gerador dinâmico (planilha -> PDF por linha), alguns clientes têm uma
-- carta de preposição fixa que a BDR prefere só anexar, sem passar pela
-- planilha. Mesmo padrão da procuração: só a versão atual é mantida,
-- subir uma nova substitui a anterior, mesmo bucket-por-cliente, mesma
-- trava de sigla (LSO/NYM/BDR).

ALTER TABLE public.clientes_substabelecimento
  ADD COLUMN IF NOT EXISTS carta_preposicao_caminho text,
  ADD COLUMN IF NOT EXISTS carta_preposicao_nome_arquivo text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('cartas-preposicao-clientes', 'cartas-preposicao-clientes', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS cartas_preposicao_clientes_select ON storage.objects;
CREATE POLICY cartas_preposicao_clientes_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'cartas-preposicao-clientes' AND public.pode_gerenciar_representacao());

DROP POLICY IF EXISTS cartas_preposicao_clientes_insert ON storage.objects;
CREATE POLICY cartas_preposicao_clientes_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'cartas-preposicao-clientes' AND public.pode_gerenciar_representacao());

DROP POLICY IF EXISTS cartas_preposicao_clientes_update ON storage.objects;
CREATE POLICY cartas_preposicao_clientes_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'cartas-preposicao-clientes' AND public.pode_gerenciar_representacao());

DROP POLICY IF EXISTS cartas_preposicao_clientes_delete ON storage.objects;
CREATE POLICY cartas_preposicao_clientes_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'cartas-preposicao-clientes' AND public.pode_gerenciar_representacao());

NOTIFY pgrst, 'reload schema';
