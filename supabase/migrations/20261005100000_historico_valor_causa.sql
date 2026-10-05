-- Adiciona valor_causa à lista de campos rastreados pelo histórico de
-- alterações do processo (trg_historico_processo, criada em
-- 20260815230000_historico_processo.sql). Hoje só valor_encerramento
-- era rastreado; faltava o valor da causa em si.
CREATE OR REPLACE FUNCTION public.registrar_historico_processo()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  campo text;
  campos text[] := ARRAY[
    'responsavel', 'socio', 'coordenador', 'fase', 'criticidade', 'carteira',
    'status', 'numero_cliente', 'pronto_para_encerrar', 'decisoes_no_ld',
    'valor_encerramento', 'valor_causa'
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

NOTIFY pgrst, 'reload schema';
