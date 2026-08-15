-- Anexos de documentos por processo (petição, decisão, PDF etc.) — usa o
-- Supabase Storage pra guardar o arquivo e uma tabela pra guardar quem
-- anexou o quê. O acesso segue exatamente a mesma regra já usada pra
-- movimentações: pode ver quem pode ver o processo, pode anexar/excluir
-- quem pode editar o processo (pode_acessar_processo).

-- 1) Bucket privado (não é public=true — só se acessa via link assinado
-- gerado pelo backend, respeitando o RLS de storage.objects abaixo).
INSERT INTO storage.buckets (id, name, public)
VALUES ('documentos-processos', 'documentos-processos', false)
ON CONFLICT (id) DO NOTHING;

-- 2) Metadados de cada documento anexado.
CREATE TABLE IF NOT EXISTS public.documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id uuid NOT NULL REFERENCES public.processos(id) ON DELETE CASCADE,
  nome_arquivo text NOT NULL,
  caminho text NOT NULL UNIQUE,
  tamanho bigint,
  tipo text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documentos_processo ON public.documentos (processo_id);

ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.documentos FROM anon;
GRANT SELECT, INSERT, DELETE ON public.documentos TO authenticated;
GRANT ALL ON public.documentos TO service_role;

DROP POLICY IF EXISTS documentos_select ON public.documentos;
CREATE POLICY documentos_select ON public.documentos FOR SELECT TO authenticated
  USING (public.pode_visualizar_processo(processo_id));

DROP POLICY IF EXISTS documentos_insert ON public.documentos;
CREATE POLICY documentos_insert ON public.documentos FOR INSERT TO authenticated
  WITH CHECK (public.pode_acessar_processo(processo_id) AND created_by = auth.uid());

DROP POLICY IF EXISTS documentos_delete ON public.documentos;
CREATE POLICY documentos_delete ON public.documentos FOR DELETE TO authenticated
  USING (public.pode_acessar_processo(processo_id));

-- 3) Políticas do storage: cada arquivo é salvo em
-- "{processo_id}/{nome-unico}", então dá pra checar o acesso pelo
-- primeiro pedaço do caminho, sem precisar de outra tabela.
DROP POLICY IF EXISTS documentos_processos_select ON storage.objects;
CREATE POLICY documentos_processos_select ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'documentos-processos'
    AND public.pode_visualizar_processo(((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS documentos_processos_insert ON storage.objects;
CREATE POLICY documentos_processos_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documentos-processos'
    AND public.pode_acessar_processo(((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS documentos_processos_delete ON storage.objects;
CREATE POLICY documentos_processos_delete ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'documentos-processos'
    AND public.pode_acessar_processo(((storage.foldername(name))[1])::uuid)
  );
