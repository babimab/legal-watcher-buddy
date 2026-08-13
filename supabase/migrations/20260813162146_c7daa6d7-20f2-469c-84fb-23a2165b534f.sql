CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_team" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.processos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_cnj TEXT NOT NULL UNIQUE,
  cliente TEXT NOT NULL,
  parte_contraria TEXT,
  tribunal TEXT,
  vara TEXT,
  comarca TEXT,
  classe TEXT,
  fase TEXT,
  status TEXT NOT NULL DEFAULT 'ativo',
  valor_causa NUMERIC(14,2),
  responsavel TEXT,
  observacoes TEXT,
  ultima_verificacao_em TIMESTAMPTZ,
  fonte TEXT NOT NULL DEFAULT 'manual',
  provedor_externo TEXT,
  id_externo TEXT,
  sincronizado_em TIMESTAMPTZ,
  monitorar BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.processos TO authenticated;
GRANT ALL ON public.processos TO service_role;
ALTER TABLE public.processos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "processos_team_all" ON public.processos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_processos_cliente ON public.processos (cliente);
CREATE INDEX idx_processos_status ON public.processos (status);

CREATE TABLE public.movimentacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  processo_id UUID NOT NULL REFERENCES public.processos(id) ON DELETE CASCADE,
  data_movimentacao DATE NOT NULL DEFAULT CURRENT_DATE,
  descricao TEXT NOT NULL,
  tipo TEXT,
  exige_acao BOOLEAN NOT NULL DEFAULT false,
  prazo DATE,
  concluida BOOLEAN NOT NULL DEFAULT false,
  fonte TEXT NOT NULL DEFAULT 'manual',
  id_externo TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.movimentacoes TO authenticated;
GRANT ALL ON public.movimentacoes TO service_role;
ALTER TABLE public.movimentacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "movimentacoes_team_all" ON public.movimentacoes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_movimentacoes_processo ON public.movimentacoes (processo_id);
CREATE INDEX idx_movimentacoes_data ON public.movimentacoes (data_movimentacao DESC);
CREATE INDEX idx_movimentacoes_created_at ON public.movimentacoes (created_at DESC);

CREATE TABLE public.verificacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  executado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  executado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  periodo_inicio TIMESTAMPTZ,
  periodo_fim TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_movimentacoes INTEGER NOT NULL DEFAULT 0,
  tipo TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.verificacoes TO authenticated;
GRANT ALL ON public.verificacoes TO service_role;
ALTER TABLE public.verificacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "verificacoes_team_all" ON public.verificacoes FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_processos_updated_at BEFORE UPDATE ON public.processos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_movimentacoes_updated_at BEFORE UPDATE ON public.movimentacoes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'nome', NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();