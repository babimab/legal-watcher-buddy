-- Substabelecimento "para o correspondente local": a BCW (que já tem a
-- procuração da companhia) substabelece poderes pra uma lista de
-- advogados correspondentes de um estado (ex.: a lista enorme de
-- correspondentes do RJ usada hoje em papel/Word), em vez de pros
-- sócios da BCW. É um tipo de documento diferente do Substabelecimento
-- normal (clientes_substabelecimento): aqui o cadastro é por ESTADO,
-- não por cliente/companhia -- a companhia aérea continua vindo da
-- planilha (coluna "Cia aérea"), casada com clientes_substabelecimento
-- normalmente, só quem RECEBE os poderes muda.
--
-- Reaproveita os buckets e a trava de acesso já existentes
-- (assinaturas-substabelecimento, substabelecimentos-modelo-clientes,
-- pode_gerenciar_representacao) -- nenhuma política de storage
-- restringe por prefixo de caminho, só por bucket_id, então dá pra
-- guardar os arquivos desse cadastro novo nos mesmos buckets sem
-- política adicional.

CREATE TABLE IF NOT EXISTS public.modelos_substabelecimento_correspondente (
  id text PRIMARY KEY,
  estado text NOT NULL,
  -- Bloco de texto colado (nome + OAB de cada correspondente, igual já
  -- vem pronto no PDF/Word que a BDR usa hoje) -- usado literalmente no
  -- documento gerado, sem parsing linha a linha.
  lista_advogados text NOT NULL,
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

ALTER TABLE public.modelos_substabelecimento_correspondente ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.modelos_substabelecimento_correspondente FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.modelos_substabelecimento_correspondente TO authenticated;
GRANT ALL ON public.modelos_substabelecimento_correspondente TO service_role;

DROP POLICY IF EXISTS modelos_substabelecimento_correspondente_select ON public.modelos_substabelecimento_correspondente;
CREATE POLICY modelos_substabelecimento_correspondente_select ON public.modelos_substabelecimento_correspondente
  FOR SELECT TO authenticated USING (public.pode_gerenciar_representacao());

DROP POLICY IF EXISTS modelos_substabelecimento_correspondente_insert ON public.modelos_substabelecimento_correspondente;
CREATE POLICY modelos_substabelecimento_correspondente_insert ON public.modelos_substabelecimento_correspondente
  FOR INSERT TO authenticated WITH CHECK (public.pode_gerenciar_representacao());

DROP POLICY IF EXISTS modelos_substabelecimento_correspondente_update ON public.modelos_substabelecimento_correspondente;
CREATE POLICY modelos_substabelecimento_correspondente_update ON public.modelos_substabelecimento_correspondente
  FOR UPDATE TO authenticated USING (public.pode_gerenciar_representacao())
  WITH CHECK (public.pode_gerenciar_representacao());

DROP POLICY IF EXISTS modelos_substabelecimento_correspondente_delete ON public.modelos_substabelecimento_correspondente;
CREATE POLICY modelos_substabelecimento_correspondente_delete ON public.modelos_substabelecimento_correspondente
  FOR DELETE TO authenticated USING (public.pode_gerenciar_representacao());

DROP TRIGGER IF EXISTS modelos_substabelecimento_correspondente_updated_at ON public.modelos_substabelecimento_correspondente;
CREATE TRIGGER modelos_substabelecimento_correspondente_updated_at
  BEFORE UPDATE ON public.modelos_substabelecimento_correspondente
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

NOTIFY pgrst, 'reload schema';
