-- Procuração do cliente (PDF) -- guardada junto do mesmo cadastro de
-- cliente do Substabelecimento (clientes_substabelecimento), já que é o
-- mesmo público restrito (LSO/NYM/BDR) que gerencia os dois. Só a
-- versão atual é mantida: subir uma nova procuração substitui a
-- anterior (sem histórico de versões).

ALTER TABLE public.clientes_substabelecimento
  ADD COLUMN IF NOT EXISTS procuracao_caminho text,
  ADD COLUMN IF NOT EXISTS procuracao_nome_arquivo text;

-- Bucket privado -- só acessível via link assinado, como o de
-- assinaturas.
INSERT INTO storage.buckets (id, name, public)
VALUES ('procuracoes-clientes', 'procuracoes-clientes', false)
ON CONFLICT (id) DO NOTHING;

-- Mesma trava de sigla (LSO/NYM/BDR) já usada pro resto de Docs de
-- Representação (função criada em
-- 20261007100000_clientes_substabelecimento.sql).
DROP POLICY IF EXISTS procuracoes_clientes_select ON storage.objects;
CREATE POLICY procuracoes_clientes_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'procuracoes-clientes' AND public.pode_gerenciar_representacao());

DROP POLICY IF EXISTS procuracoes_clientes_insert ON storage.objects;
CREATE POLICY procuracoes_clientes_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'procuracoes-clientes' AND public.pode_gerenciar_representacao());

DROP POLICY IF EXISTS procuracoes_clientes_update ON storage.objects;
CREATE POLICY procuracoes_clientes_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'procuracoes-clientes' AND public.pode_gerenciar_representacao());

DROP POLICY IF EXISTS procuracoes_clientes_delete ON storage.objects;
CREATE POLICY procuracoes_clientes_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'procuracoes-clientes' AND public.pode_gerenciar_representacao());

NOTIFY pgrst, 'reload schema';
