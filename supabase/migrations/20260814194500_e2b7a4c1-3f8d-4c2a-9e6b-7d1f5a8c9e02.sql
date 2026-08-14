-- Restringe novos cadastros ao domínio @bcw.com.br e permite convidar
-- alguém para um grupo antes mesmo de essa pessoa ter conta no sistema
-- (o convite é aplicado automaticamente quando ela criar a conta).

-- 1) Bloqueia criação de conta (e-mail/senha ou Google) com e-mail fora
-- do domínio @bcw.com.br. Não afeta contas já existentes.
CREATE OR REPLACE FUNCTION public.restringir_dominio_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NOT NULL AND lower(NEW.email) !~ '@bcw\.com\.br$' THEN
    RAISE EXCEPTION 'Apenas e-mails do domínio @bcw.com.br podem acessar esta plataforma.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_domain_check ON auth.users;
CREATE TRIGGER on_auth_user_domain_check
BEFORE INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.restringir_dominio_email();

-- 2) Convites: liberar acesso a um grupo para um e-mail que ainda não
-- tem conta. Quando a pessoa se cadastrar com esse e-mail, ela entra no
-- grupo automaticamente (ver handle_new_user mais abaixo).
CREATE TABLE IF NOT EXISTS public.convites_grupo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id uuid NOT NULL REFERENCES public.grupos(id) ON DELETE CASCADE,
  email text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (grupo_id, email)
);

GRANT SELECT, DELETE ON public.convites_grupo TO authenticated;
GRANT ALL ON public.convites_grupo TO service_role;
ALTER TABLE public.convites_grupo ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.convites_grupo FROM anon;

DROP POLICY IF EXISTS convites_grupo_select ON public.convites_grupo;
CREATE POLICY convites_grupo_select ON public.convites_grupo FOR SELECT TO authenticated
  USING (public.e_dono_grupo(grupo_id));
DROP POLICY IF EXISTS convites_grupo_delete ON public.convites_grupo;
CREATE POLICY convites_grupo_delete ON public.convites_grupo FOR DELETE TO authenticated
  USING (public.e_dono_grupo(grupo_id));

CREATE INDEX IF NOT EXISTS idx_convites_grupo_email ON public.convites_grupo (email);

-- 3) adicionar_membro_grupo agora: se o e-mail já tem conta, libera o
-- acesso na hora (como antes); se não tem, registra um convite pendente.
-- Muda de RETURNS uuid para RETURNS TABLE, por isso o DROP antes.
DROP FUNCTION IF EXISTS public.adicionar_membro_grupo(uuid, text);

CREATE OR REPLACE FUNCTION public.adicionar_membro_grupo(_grupo_id uuid, _email text)
RETURNS TABLE (id uuid, pendente boolean)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
  _email_norm text := lower(trim(_email));
  _id uuid;
BEGIN
  IF NOT public.e_dono_grupo(_grupo_id) THEN
    RAISE EXCEPTION 'Sem permissão para gerenciar membros deste grupo';
  END IF;

  IF _email_norm !~ '@bcw\.com\.br$' THEN
    RAISE EXCEPTION 'Só é possível liberar acesso para e-mails do domínio @bcw.com.br';
  END IF;

  SELECT p.id INTO _user_id FROM public.profiles p WHERE lower(p.email) = _email_norm LIMIT 1;

  IF _user_id IS NOT NULL THEN
    INSERT INTO public.grupo_membros (grupo_id, user_id, created_by)
    VALUES (_grupo_id, _user_id, auth.uid())
    ON CONFLICT (grupo_id, user_id) DO NOTHING
    RETURNING grupo_membros.id INTO _id;

    IF _id IS NULL THEN
      SELECT m.id INTO _id FROM public.grupo_membros m
      WHERE m.grupo_id = _grupo_id AND m.user_id = _user_id;
    END IF;

    RETURN QUERY SELECT _id, false;
  ELSE
    INSERT INTO public.convites_grupo (grupo_id, email, created_by)
    VALUES (_grupo_id, _email_norm, auth.uid())
    ON CONFLICT (grupo_id, email) DO NOTHING
    RETURNING convites_grupo.id INTO _id;

    IF _id IS NULL THEN
      SELECT c.id INTO _id FROM public.convites_grupo c
      WHERE c.grupo_id = _grupo_id AND c.email = _email_norm;
    END IF;

    RETURN QUERY SELECT _id, true;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.adicionar_membro_grupo(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.adicionar_membro_grupo(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.listar_convites_grupo(_grupo_id uuid)
RETURNS TABLE (id uuid, email text, created_at timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.e_dono_grupo(_grupo_id) THEN
    RAISE EXCEPTION 'Sem permissão para ver os convites deste grupo';
  END IF;

  RETURN QUERY
  SELECT c.id, c.email, c.created_at
  FROM public.convites_grupo c
  WHERE c.grupo_id = _grupo_id
  ORDER BY c.created_at;
END;
$$;

REVOKE ALL ON FUNCTION public.listar_convites_grupo(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.listar_convites_grupo(uuid) TO authenticated;

-- 4) Quando alguém cadastra a conta, aplica automaticamente qualquer
-- convite pendente para o e-mail dela.
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

  INSERT INTO public.grupo_membros (grupo_id, user_id, created_by)
  SELECT c.grupo_id, NEW.id, c.created_by
  FROM public.convites_grupo c
  WHERE lower(c.email) = lower(NEW.email)
  ON CONFLICT (grupo_id, user_id) DO NOTHING;

  DELETE FROM public.convites_grupo WHERE lower(email) = lower(NEW.email);

  RETURN NEW;
END;
$$;
