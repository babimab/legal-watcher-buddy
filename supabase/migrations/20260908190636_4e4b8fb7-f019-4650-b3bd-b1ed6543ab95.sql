CREATE TABLE IF NOT EXISTS public.advogados_fixados_djen (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL,
  numero_oab text,
  uf_oab text,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.advogados_fixados_djen TO authenticated;
GRANT ALL ON public.advogados_fixados_djen TO service_role;
ALTER TABLE public.advogados_fixados_djen ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "advogados_fixados_djen_own" ON public.advogados_fixados_djen;
CREATE POLICY "advogados_fixados_djen_own" ON public.advogados_fixados_djen FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX IF NOT EXISTS advogados_fixados_djen_user_ordem_idx ON public.advogados_fixados_djen (user_id, ordem);