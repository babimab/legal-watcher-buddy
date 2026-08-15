-- Histórico de alterações do processo: registra quando alguém muda um
-- campo "administrativo" (responsável, fase, criticidade etc.) — hoje só
-- ficava rastro de andamento novo, não de mudança de campo do próprio
-- processo. Feito via trigger (não no app) pra pegar qualquer caminho que
-- edite o processo, não só o formulário principal.
--
-- "alterado_por" é texto (sigla ou e-mail), não um uuid com FK pra
-- auth.users: a política de leitura de "profiles" só deixa cada um ler o
-- próprio perfil, então mostrar o nome de quem mudou pra QUALQUER outra
-- pessoa da equipe exigiria isso ser resolvido uma vez, no momento da
-- gravação — o trigger roda como SECURITY DEFINER e pode ler profiles
-- sem essa restrição, então resolve o nome ali mesmo e grava só o texto.
CREATE TABLE IF NOT EXISTS public.processos_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id uuid NOT NULL REFERENCES public.processos(id) ON DELETE CASCADE,
  campo text NOT NULL,
  valor_antigo text,
  valor_novo text,
  alterado_por text,
  alterado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_processos_historico_processo ON public.processos_historico (processo_id);

ALTER TABLE public.processos_historico ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.processos_historico FROM anon;
-- Só SELECT pra "authenticated": ninguém insere/edita histórico direto
-- pela API, só o trigger abaixo (que roda como SECURITY DEFINER).
GRANT SELECT ON public.processos_historico TO authenticated;
GRANT ALL ON public.processos_historico TO service_role;

DROP POLICY IF EXISTS processos_historico_select ON public.processos_historico;
CREATE POLICY processos_historico_select ON public.processos_historico FOR SELECT TO authenticated
  USING (public.pode_visualizar_processo(processo_id));

CREATE OR REPLACE FUNCTION public.registrar_historico_processo()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  campo text;
  campos text[] := ARRAY[
    'responsavel', 'socio', 'coordenador', 'fase', 'criticidade', 'carteira',
    'status', 'numero_cliente', 'pronto_para_encerrar', 'decisoes_no_ld',
    'valor_encerramento'
  ];
  old_jsonb jsonb := to_jsonb(OLD);
  new_jsonb jsonb := to_jsonb(NEW);
  quem text;
BEGIN
  SELECT coalesce(pr.sigla, u.email) INTO quem
  FROM auth.users u
  LEFT JOIN public.profiles pr ON pr.id = u.id
  WHERE u.id = auth.uid();

  FOREACH campo IN ARRAY campos LOOP
    IF old_jsonb ->> campo IS DISTINCT FROM new_jsonb ->> campo THEN
      INSERT INTO public.processos_historico (processo_id, campo, valor_antigo, valor_novo, alterado_por)
      VALUES (NEW.id, campo, old_jsonb ->> campo, new_jsonb ->> campo, quem);
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.registrar_historico_processo() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_historico_processo ON public.processos;
CREATE TRIGGER trg_historico_processo
  AFTER UPDATE ON public.processos
  FOR EACH ROW EXECUTE FUNCTION public.registrar_historico_processo();
