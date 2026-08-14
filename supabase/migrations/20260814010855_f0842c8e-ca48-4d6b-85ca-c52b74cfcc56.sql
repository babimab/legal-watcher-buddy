CREATE OR REPLACE FUNCTION public.listar_acessos_processo(_processo_id uuid)
RETURNS TABLE (acesso_id uuid, user_id uuid, nome text, email text, created_at timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.e_dono_processo(_processo_id) THEN
    RAISE EXCEPTION 'Sem permissão para ver os acessos deste processo';
  END IF;

  RETURN QUERY
  SELECT a.id, a.user_id, p.nome, p.email, a.created_at
  FROM public.processo_acessos a
  LEFT JOIN public.profiles p ON p.id = a.user_id
  WHERE a.processo_id = _processo_id
  ORDER BY a.created_at;
END;
$$;

REVOKE ALL ON FUNCTION public.listar_acessos_processo(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.listar_acessos_processo(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.compartilhar_processo(_processo_id uuid, _email text)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
  _id uuid;
BEGIN
  IF NOT public.e_dono_processo(_processo_id) THEN
    RAISE EXCEPTION 'Sem permissão para compartilhar este processo';
  END IF;

  SELECT id INTO _user_id
  FROM public.profiles
  WHERE lower(email) = lower(trim(_email))
  LIMIT 1;

  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Nenhum usuário cadastrado com esse e-mail';
  END IF;

  IF _user_id = auth.uid() THEN
    RAISE EXCEPTION 'Você já é o responsável por este processo';
  END IF;

  INSERT INTO public.processo_acessos (processo_id, user_id, created_by)
  VALUES (_processo_id, _user_id, auth.uid())
  ON CONFLICT DO NOTHING
  RETURNING id INTO _id;

  IF _id IS NULL THEN
    SELECT a.id INTO _id FROM public.processo_acessos a
    WHERE a.processo_id = _processo_id AND a.user_id = _user_id;
  END IF;

  RETURN _id;
END;
$$;

REVOKE ALL ON FUNCTION public.compartilhar_processo(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.compartilhar_processo(uuid, text) TO authenticated;