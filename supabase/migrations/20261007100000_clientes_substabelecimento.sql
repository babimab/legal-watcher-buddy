-- Clientes de Substabelecimento: antes era uma lista fixa no código,
-- com a assinatura do sócio embutida como arquivo do app (só dava pra
-- trocar mexendo em código). Isso vira uma tela de cadastro: cada
-- cliente guarda o texto do outorgante e, opcionalmente, uma imagem de
-- assinatura que a própria BDR sobe/troca pelo app -- mais seguro, e
-- tira a assinatura escaneada de dentro do repositório.

-- 1) Bucket privado -- só acessível via link assinado, como os outros
-- buckets de documentos sensíveis do app (ex.: documentos-processos).
INSERT INTO storage.buckets (id, name, public)
VALUES ('assinaturas-substabelecimento', 'assinaturas-substabelecimento', false)
ON CONFLICT (id) DO NOTHING;

-- 2) Quem pode gerenciar Docs de Representação -- mesma lista de
-- siglas (LSO/NYM/BDR) já usada no front em
-- SIGLAS_PERMITIDAS_REPRESENTACAO (src/lib/substabelecimento.ts).
-- Se a lista mudar lá, tem que mudar aqui também.
CREATE OR REPLACE FUNCTION public.pode_gerenciar_representacao()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT upper(COALESCE(pr.sigla, split_part(u.email, '@', 1)))
      FROM auth.users u
      LEFT JOIN public.profiles pr ON pr.id = u.id
      WHERE u.id = auth.uid()
    ) IN ('LSO', 'NYM', 'BDR'),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.pode_gerenciar_representacao() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pode_gerenciar_representacao() TO authenticated;

-- 3) Cadastro de clientes de substabelecimento.
CREATE TABLE IF NOT EXISTS public.clientes_substabelecimento (
  id text PRIMARY KEY,
  nome text NOT NULL,
  texto_outorgante text NOT NULL,
  assinatura_caminho text,
  assinante_nome text,
  assinante_oab text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.clientes_substabelecimento ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.clientes_substabelecimento FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clientes_substabelecimento TO authenticated;
GRANT ALL ON public.clientes_substabelecimento TO service_role;

DROP POLICY IF EXISTS clientes_substabelecimento_select ON public.clientes_substabelecimento;
CREATE POLICY clientes_substabelecimento_select ON public.clientes_substabelecimento
  FOR SELECT TO authenticated USING (public.pode_gerenciar_representacao());

DROP POLICY IF EXISTS clientes_substabelecimento_insert ON public.clientes_substabelecimento;
CREATE POLICY clientes_substabelecimento_insert ON public.clientes_substabelecimento
  FOR INSERT TO authenticated WITH CHECK (public.pode_gerenciar_representacao());

DROP POLICY IF EXISTS clientes_substabelecimento_update ON public.clientes_substabelecimento;
CREATE POLICY clientes_substabelecimento_update ON public.clientes_substabelecimento
  FOR UPDATE TO authenticated USING (public.pode_gerenciar_representacao())
  WITH CHECK (public.pode_gerenciar_representacao());

DROP POLICY IF EXISTS clientes_substabelecimento_delete ON public.clientes_substabelecimento;
CREATE POLICY clientes_substabelecimento_delete ON public.clientes_substabelecimento
  FOR DELETE TO authenticated USING (public.pode_gerenciar_representacao());

DROP TRIGGER IF EXISTS clientes_substabelecimento_updated_at ON public.clientes_substabelecimento;
CREATE TRIGGER clientes_substabelecimento_updated_at
  BEFORE UPDATE ON public.clientes_substabelecimento
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Políticas do storage: cada assinatura é salva em
-- "{cliente_id}/{nome-unico}", então o acesso segue a mesma trava.
DROP POLICY IF EXISTS assinaturas_substabelecimento_select ON storage.objects;
CREATE POLICY assinaturas_substabelecimento_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'assinaturas-substabelecimento' AND public.pode_gerenciar_representacao());

DROP POLICY IF EXISTS assinaturas_substabelecimento_insert ON storage.objects;
CREATE POLICY assinaturas_substabelecimento_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'assinaturas-substabelecimento' AND public.pode_gerenciar_representacao());

DROP POLICY IF EXISTS assinaturas_substabelecimento_update ON storage.objects;
CREATE POLICY assinaturas_substabelecimento_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'assinaturas-substabelecimento' AND public.pode_gerenciar_representacao());

DROP POLICY IF EXISTS assinaturas_substabelecimento_delete ON storage.objects;
CREATE POLICY assinaturas_substabelecimento_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'assinaturas-substabelecimento' AND public.pode_gerenciar_representacao());

NOTIFY pgrst, 'reload schema';
