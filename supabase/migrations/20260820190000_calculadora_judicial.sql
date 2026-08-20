CREATE TABLE IF NOT EXISTS public.calculos_judiciais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id uuid REFERENCES public.processos(id) ON DELETE SET NULL,
  nome text NOT NULL DEFAULT 'Novo cálculo',
  data_base date NOT NULL DEFAULT CURRENT_DATE,
  criterios jsonb NOT NULL DEFAULT '{}'::jsonb,
  resultado jsonb,
  versao integer NOT NULL DEFAULT 1,
  observacoes text,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.calculos_judiciais_versoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calculo_id uuid NOT NULL REFERENCES public.calculos_judiciais(id) ON DELETE CASCADE,
  versao integer NOT NULL,
  criterios jsonb NOT NULL,
  resultado jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(calculo_id, versao)
);

CREATE TABLE IF NOT EXISTS public.calculos_documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calculo_id uuid NOT NULL REFERENCES public.calculos_judiciais(id) ON DELETE CASCADE,
  categoria text NOT NULL CHECK (categoria IN ('titulo','autos')),
  nome_arquivo text NOT NULL,
  caminho text NOT NULL UNIQUE,
  tamanho bigint,
  tipo text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calculos_processo ON public.calculos_judiciais(processo_id);
CREATE INDEX IF NOT EXISTS idx_calculos_created_by ON public.calculos_judiciais(created_by);
CREATE INDEX IF NOT EXISTS idx_calculos_documentos_calculo ON public.calculos_documentos(calculo_id);

INSERT INTO storage.buckets (id, name, public)
VALUES ('calculos-judiciais', 'calculos-judiciais', false)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.pode_visualizar_calculo(_calculo_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.calculos_judiciais c
    WHERE c.id = _calculo_id
      AND (c.created_by = auth.uid() OR (c.processo_id IS NOT NULL AND public.pode_visualizar_processo(c.processo_id)))
  );
$$;

CREATE OR REPLACE FUNCTION public.pode_editar_calculo(_calculo_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.calculos_judiciais c
    WHERE c.id = _calculo_id
      AND (c.created_by = auth.uid() OR (c.processo_id IS NOT NULL AND public.pode_acessar_processo(c.processo_id)))
  );
$$;

ALTER TABLE public.calculos_judiciais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calculos_judiciais_versoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calculos_documentos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.calculos_judiciais, public.calculos_judiciais_versoes, public.calculos_documentos FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calculos_judiciais TO authenticated;
GRANT SELECT, INSERT ON public.calculos_judiciais_versoes TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.calculos_documentos TO authenticated;

DROP POLICY IF EXISTS calculos_select ON public.calculos_judiciais;
CREATE POLICY calculos_select ON public.calculos_judiciais FOR SELECT TO authenticated USING (created_by = auth.uid() OR (processo_id IS NOT NULL AND public.pode_visualizar_processo(processo_id)));
DROP POLICY IF EXISTS calculos_insert ON public.calculos_judiciais;
CREATE POLICY calculos_insert ON public.calculos_judiciais FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() AND (processo_id IS NULL OR public.pode_visualizar_processo(processo_id)));
DROP POLICY IF EXISTS calculos_update ON public.calculos_judiciais;
CREATE POLICY calculos_update ON public.calculos_judiciais FOR UPDATE TO authenticated USING (public.pode_editar_calculo(id)) WITH CHECK (public.pode_editar_calculo(id));
DROP POLICY IF EXISTS calculos_delete ON public.calculos_judiciais;
CREATE POLICY calculos_delete ON public.calculos_judiciais FOR DELETE TO authenticated USING (public.pode_editar_calculo(id));

DROP POLICY IF EXISTS calculos_versoes_select ON public.calculos_judiciais_versoes;
CREATE POLICY calculos_versoes_select ON public.calculos_judiciais_versoes FOR SELECT TO authenticated USING (public.pode_visualizar_calculo(calculo_id));
DROP POLICY IF EXISTS calculos_versoes_insert ON public.calculos_judiciais_versoes;
CREATE POLICY calculos_versoes_insert ON public.calculos_judiciais_versoes FOR INSERT TO authenticated WITH CHECK (public.pode_editar_calculo(calculo_id));

DROP POLICY IF EXISTS calculos_docs_select ON public.calculos_documentos;
CREATE POLICY calculos_docs_select ON public.calculos_documentos FOR SELECT TO authenticated USING (public.pode_visualizar_calculo(calculo_id));
DROP POLICY IF EXISTS calculos_docs_insert ON public.calculos_documentos;
CREATE POLICY calculos_docs_insert ON public.calculos_documentos FOR INSERT TO authenticated WITH CHECK (public.pode_editar_calculo(calculo_id) AND created_by = auth.uid());
DROP POLICY IF EXISTS calculos_docs_delete ON public.calculos_documentos;
CREATE POLICY calculos_docs_delete ON public.calculos_documentos FOR DELETE TO authenticated USING (public.pode_editar_calculo(calculo_id));

DROP POLICY IF EXISTS calculos_storage_select ON storage.objects;
CREATE POLICY calculos_storage_select ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'calculos-judiciais' AND public.pode_visualizar_calculo(((storage.foldername(name))[1])::uuid));
DROP POLICY IF EXISTS calculos_storage_insert ON storage.objects;
CREATE POLICY calculos_storage_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'calculos-judiciais' AND public.pode_editar_calculo(((storage.foldername(name))[1])::uuid));
DROP POLICY IF EXISTS calculos_storage_delete ON storage.objects;
CREATE POLICY calculos_storage_delete ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'calculos-judiciais' AND public.pode_editar_calculo(((storage.foldername(name))[1])::uuid));
