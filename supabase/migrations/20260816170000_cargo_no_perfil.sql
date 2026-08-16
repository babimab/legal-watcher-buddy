-- Guarda o cargo (Advogado, Estagiario ou Administrativo) no perfil, base
-- pra futuramente simplificar o menu por perfil (ex.: esconder itens
-- administrativos pra quem e estagiario).
--
-- Texto acentuado escrito via E'...\u00XX...' de proposito (nao com o
-- acento literal): colar SQL com acento direto no editor do Supabase tem
-- corrompido o texto nesta base antes (ver corrigir_mojibake). Escapando
-- em unicode o arquivo fica puro ASCII e imune a esse problema de
-- codificacao no caminho copiar/colar.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cargo text;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_cargo_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_cargo_check
  CHECK (cargo IS NULL OR cargo IN ('Advogado', E'Estagi\u00e1rio', 'Administrativo'));

-- Quem ja tinha conta antes desse campo existir vira "Advogado" por
-- padrao (perfil mais comum hoje) - ela pode corrigir depois em "Meu
-- perfil" pra quem for estagiario/administrativo.
UPDATE public.profiles SET cargo = 'Advogado' WHERE cargo IS NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email, sigla, cargo)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'nome', NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NULLIF(upper(trim(NEW.raw_user_meta_data ->> 'sigla')), ''),
    COALESCE(NULLIF(trim(NEW.raw_user_meta_data ->> 'cargo'), ''), 'Advogado')
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
