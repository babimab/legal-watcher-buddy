-- Lista persistente de "processos em acompanhamento via planilha de
-- citações", pra sobreviver ao upload (hoje a tela zerava depois de
-- importar) e permitir uma segunda conferência durante a semana.
--
-- De propósito NÃO usa processos.pasta_id: um processo dessa planilha
-- também precisa continuar aparecendo na pasta normal do advogado dele
-- (BDR/BBS/JGV/MLV/ELV) — pasta_id é um campo único, então reusar ele
-- pra "Planilha Citações" tiraria o processo de onde já está. Por isso é
-- uma tabela à parte, igual documentos/histórico já fazem.

CREATE TABLE IF NOT EXISTS public.processo_citacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id uuid NOT NULL REFERENCES public.processos(id) ON DELETE CASCADE UNIQUE,
  origem text,
  ultimo_andamento text,
  ultimo_andamento_em date,
  conferido boolean NOT NULL DEFAULT false,
  conferido_por text,
  conferido_em timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_processo_citacoes_conferido
  ON public.processo_citacoes (conferido);

ALTER TABLE public.processo_citacoes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.processo_citacoes FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.processo_citacoes TO authenticated;
GRANT ALL ON public.processo_citacoes TO service_role;

DROP POLICY IF EXISTS processo_citacoes_select ON public.processo_citacoes;
CREATE POLICY processo_citacoes_select ON public.processo_citacoes FOR SELECT TO authenticated
  USING (public.pode_visualizar_processo(processo_id));

DROP POLICY IF EXISTS processo_citacoes_insert ON public.processo_citacoes;
CREATE POLICY processo_citacoes_insert ON public.processo_citacoes FOR INSERT TO authenticated
  WITH CHECK (public.pode_acessar_processo(processo_id) AND created_by = auth.uid());

DROP POLICY IF EXISTS processo_citacoes_update ON public.processo_citacoes;
CREATE POLICY processo_citacoes_update ON public.processo_citacoes FOR UPDATE TO authenticated
  USING (public.pode_acessar_processo(processo_id))
  WITH CHECK (public.pode_acessar_processo(processo_id));

DROP POLICY IF EXISTS processo_citacoes_delete ON public.processo_citacoes;
CREATE POLICY processo_citacoes_delete ON public.processo_citacoes FOR DELETE TO authenticated
  USING (public.pode_acessar_processo(processo_id));
