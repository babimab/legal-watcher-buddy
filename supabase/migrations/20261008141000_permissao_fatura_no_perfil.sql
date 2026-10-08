-- Acesso à Fatura deixa de ser uma lista fixa de siglas no código
-- (SIGLAS_PERMITIDAS_FATURA) e vira um campo no perfil de cada
-- pessoa, que só a BDR pode ligar/desligar pela tela "Cargo da
-- equipe" (perfil.tsx) -- assim ela concede acesso a quem precisar
-- sem depender de mim pra mexer no código a cada pessoa nova.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pode_ver_fatura boolean NOT NULL DEFAULT false;

-- Preserva quem já tinha acesso pela lista antiga (LSO/NYM/BDR/JNC),
-- usando a sigla cadastrada ou, na falta dela, a sigla derivada do
-- e-mail (mesma lógica de siglaDoEmail no front).
UPDATE public.profiles
SET pode_ver_fatura = true
WHERE upper(coalesce(nullif(sigla, ''), split_part(email, '@', 1))) IN (
  'LSO', 'NYM', 'BDR', 'JNC'
);

-- Generaliza o antigo protege_cargo() pra também proteger
-- pode_ver_fatura: mesma regra, só a BDR pode mudar esses campos,
-- mesmo numa atualização feita por quem está editando a própria linha
-- (profiles_update_own deixa mudar outras colunas livremente).
CREATE OR REPLACE FUNCTION public.protege_campos_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF lower(coalesce(auth.jwt() ->> 'email', '')) <> 'bdr@bcw.com.br' THEN
    IF NEW.cargo IS DISTINCT FROM OLD.cargo THEN
      NEW.cargo := OLD.cargo;
    END IF;
    IF NEW.pode_ver_fatura IS DISTINCT FROM OLD.pode_ver_fatura THEN
      NEW.pode_ver_fatura := OLD.pode_ver_fatura;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protege_campos_admin() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_protege_cargo ON public.profiles;
DROP FUNCTION IF EXISTS public.protege_cargo();

DROP TRIGGER IF EXISTS trg_protege_campos_admin ON public.profiles;
CREATE TRIGGER trg_protege_campos_admin
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protege_campos_admin();

NOTIFY pgrst, 'reload schema';
