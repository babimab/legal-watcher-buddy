-- Processos relacionados: link entre dois processos DIFERENTES que têm a
-- ver um com o outro (mesma causa, clientes diferentes etc.), sem ser a
-- relação hierárquica de "desdobramento" (processo_pai_id) que já existe.
-- Guarda uma linha em cada direção (A->B e B->A) pra poder listar "quem
-- está relacionado a X" com uma consulta simples.

CREATE TABLE IF NOT EXISTS public.processos_relacionados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id uuid NOT NULL REFERENCES public.processos(id) ON DELETE CASCADE,
  relacionado_id uuid NOT NULL REFERENCES public.processos(id) ON DELETE CASCADE,
  observacao text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT processos_relacionados_nao_consigo_mesmo CHECK (processo_id <> relacionado_id),
  CONSTRAINT processos_relacionados_par_unico UNIQUE (processo_id, relacionado_id)
);

CREATE INDEX IF NOT EXISTS idx_processos_relacionados_processo ON public.processos_relacionados (processo_id);

ALTER TABLE public.processos_relacionados ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.processos_relacionados FROM anon;
GRANT SELECT, INSERT, DELETE ON public.processos_relacionados TO authenticated;
GRANT ALL ON public.processos_relacionados TO service_role;

DROP POLICY IF EXISTS processos_relacionados_select ON public.processos_relacionados;
CREATE POLICY processos_relacionados_select ON public.processos_relacionados FOR SELECT TO authenticated
  USING (public.pode_visualizar_processo(processo_id));

-- Pra vincular (ou desvincular) os dois lados do par, quem faz a ação
-- precisa poder editar os dois processos envolvidos — como cada direção é
-- uma linha própria, essa checagem por processo_id já cobre isso.
DROP POLICY IF EXISTS processos_relacionados_insert ON public.processos_relacionados;
CREATE POLICY processos_relacionados_insert ON public.processos_relacionados FOR INSERT TO authenticated
  WITH CHECK (public.pode_acessar_processo(processo_id) AND created_by = auth.uid());

DROP POLICY IF EXISTS processos_relacionados_delete ON public.processos_relacionados;
CREATE POLICY processos_relacionados_delete ON public.processos_relacionados FOR DELETE TO authenticated
  USING (public.pode_acessar_processo(processo_id));
