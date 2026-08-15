-- Guarda a sigla (iniciais usadas como "responsável" nos processos, ex.:
-- BDR, ELV) no perfil, em vez de só adivinhar a partir do e-mail. Isso
-- evita que "Meus processos"/"Meus prazos" fiquem vazios pra quem tem
-- e-mail que não começa com a sigla.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sigla text;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email, sigla)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'nome', NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NULLIF(upper(trim(NEW.raw_user_meta_data ->> 'sigla')), '')
  )
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

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
