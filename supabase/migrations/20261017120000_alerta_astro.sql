-- Suporte pra tela "Alerta Astro": a BDR sobe os Word (RTF) que o
-- vendor Alerte manda por e-mail com os recortes de publicação (um por
-- "pacote"/caderno monitorado), o FaroLex separa cada recorte, descarta
-- os trabalhistas e sinaliza quais mencionam uma embarcação/empresa da
-- frota Astro -- em vez da estagiária ler tudo manualmente.

-- Lista (editável pela equipe) de nomes de embarcações/empresas da frota
-- Astro monitoradas pelo Alerte -- usada pra sinalizar "candidato" nos
-- recortes sem processo cadastrado ainda (ex.: embarcação nova, processo
-- recém-distribuído). Separada do cadastro de processos de propósito:
-- o objetivo é pegar casos ANTES de existirem no FaroLex.
CREATE TABLE IF NOT EXISTS public.alerta_astro_nomes_monitorados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  ordem integer,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alerta_astro_nomes_monitorados_ordem
  ON public.alerta_astro_nomes_monitorados(ordem);

ALTER TABLE public.alerta_astro_nomes_monitorados ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.alerta_astro_nomes_monitorados FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alerta_astro_nomes_monitorados TO authenticated;
GRANT ALL ON public.alerta_astro_nomes_monitorados TO service_role;

-- Lista do escritório inteiro (não por usuário) -- mesmo padrão já usado
-- em lista_prazos_manual.
DROP POLICY IF EXISTS alerta_astro_nomes_monitorados_select ON public.alerta_astro_nomes_monitorados;
CREATE POLICY alerta_astro_nomes_monitorados_select ON public.alerta_astro_nomes_monitorados
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS alerta_astro_nomes_monitorados_insert ON public.alerta_astro_nomes_monitorados;
CREATE POLICY alerta_astro_nomes_monitorados_insert ON public.alerta_astro_nomes_monitorados
  FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS alerta_astro_nomes_monitorados_update ON public.alerta_astro_nomes_monitorados;
CREATE POLICY alerta_astro_nomes_monitorados_update ON public.alerta_astro_nomes_monitorados
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS alerta_astro_nomes_monitorados_delete ON public.alerta_astro_nomes_monitorados;
CREATE POLICY alerta_astro_nomes_monitorados_delete ON public.alerta_astro_nomes_monitorados
  FOR DELETE TO authenticated USING (true);

NOTIFY pgrst, 'reload schema';
