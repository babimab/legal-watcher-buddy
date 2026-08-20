CREATE TABLE IF NOT EXISTS public.baixas_cliente (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id uuid NOT NULL UNIQUE REFERENCES public.processos(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'aguardando' CHECK (status IN ('aguardando','bloqueado','pronto_nova_tentativa','encerrado')),
  pendencia_com text CHECK (pendencia_com IS NULL OR pendencia_com IN ('Juridico interno','Contadores','Outro')),
  descricao_pendencia text,
  ultima_tentativa_em timestamptz,
  ultima_cobranca_em timestamptz,
  proxima_cobranca date,
  encerrado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.baixas_cliente_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  baixa_id uuid NOT NULL REFERENCES public.baixas_cliente(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('criacao','tentativa','cobranca','status','observacao')),
  resultado text,
  pendencia_com text,
  descricao text,
  proxima_cobranca date,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.baixas_cliente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.baixas_cliente_historico ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "baixas_select_autenticados" ON public.baixas_cliente;
CREATE POLICY "baixas_select_autenticados" ON public.baixas_cliente FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "baixas_hist_select_autenticados" ON public.baixas_cliente_historico;
CREATE POLICY "baixas_hist_select_autenticados" ON public.baixas_cliente_historico FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "baixas_admin_insert" ON public.baixas_cliente;
CREATE POLICY "baixas_admin_insert" ON public.baixas_cliente FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND (p.cargo = 'Administrativo' OR lower(p.email) = 'bdr@bcw.com.br'))
);
DROP POLICY IF EXISTS "baixas_admin_update" ON public.baixas_cliente;
CREATE POLICY "baixas_admin_update" ON public.baixas_cliente FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND (p.cargo = 'Administrativo' OR lower(p.email) = 'bdr@bcw.com.br'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND (p.cargo = 'Administrativo' OR lower(p.email) = 'bdr@bcw.com.br'))
);
DROP POLICY IF EXISTS "baixas_hist_admin_insert" ON public.baixas_cliente_historico;
CREATE POLICY "baixas_hist_admin_insert" ON public.baixas_cliente_historico FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND (p.cargo = 'Administrativo' OR lower(p.email) = 'bdr@bcw.com.br'))
);

CREATE OR REPLACE FUNCTION public.criar_baixa_cliente_ao_encerrar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE nova_baixa uuid;
BEGIN
  IF NEW.status = 'encerrado' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.baixas_cliente (processo_id, status)
    VALUES (NEW.id, 'aguardando')
    ON CONFLICT (processo_id) DO NOTHING
    RETURNING id INTO nova_baixa;
    IF nova_baixa IS NOT NULL THEN
      INSERT INTO public.baixas_cliente_historico (baixa_id, tipo, resultado, descricao)
      VALUES (nova_baixa, 'criacao', 'aguardando', 'Processo encerrado no FaroLex e incluído automaticamente na fila de baixa no sistema do cliente.');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_criar_baixa_cliente_ao_encerrar ON public.processos;
CREATE TRIGGER trg_criar_baixa_cliente_ao_encerrar
AFTER INSERT OR UPDATE OF status ON public.processos
FOR EACH ROW EXECUTE FUNCTION public.criar_baixa_cliente_ao_encerrar();
