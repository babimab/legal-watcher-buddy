-- Substabelecimento "modelo pronto" (PDF) por cliente -- mesmo caso da
-- Carta de Preposição: alguns clientes (ex.: Souza Cruz) têm um texto
-- de substabelecimento próprio, diferente da cláusula padrão do
-- escritório usada pelo gerador dinâmico. A BDR anexa o modelo já
-- pronto desse cliente aqui, pra consulta/uso manual. Só a versão
-- atual é mantida, mesmo bucket-por-cliente, mesma trava de sigla
-- (LSO/NYM/BDR).

ALTER TABLE public.clientes_substabelecimento
  ADD COLUMN IF NOT EXISTS substabelecimento_modelo_caminho text,
  ADD COLUMN IF NOT EXISTS substabelecimento_modelo_nome_arquivo text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('substabelecimentos-modelo-clientes', 'substabelecimentos-modelo-clientes', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS substabelecimentos_modelo_clientes_select ON storage.objects;
CREATE POLICY substabelecimentos_modelo_clientes_select ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'substabelecimentos-modelo-clientes' AND public.pode_gerenciar_representacao()
  );

DROP POLICY IF EXISTS substabelecimentos_modelo_clientes_insert ON storage.objects;
CREATE POLICY substabelecimentos_modelo_clientes_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'substabelecimentos-modelo-clientes' AND public.pode_gerenciar_representacao()
  );

DROP POLICY IF EXISTS substabelecimentos_modelo_clientes_update ON storage.objects;
CREATE POLICY substabelecimentos_modelo_clientes_update ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'substabelecimentos-modelo-clientes' AND public.pode_gerenciar_representacao()
  );

DROP POLICY IF EXISTS substabelecimentos_modelo_clientes_delete ON storage.objects;
CREATE POLICY substabelecimentos_modelo_clientes_delete ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'substabelecimentos-modelo-clientes' AND public.pode_gerenciar_representacao()
  );

NOTIFY pgrst, 'reload schema';
