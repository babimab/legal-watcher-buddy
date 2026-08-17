-- So a BDR (bdr@bcw.com.br) pode alterar o campo "cargo" de qualquer
-- perfil, inclusive o de outras pessoas. Hoje "profiles_update_own"
-- deixa cada um mudar qualquer coluna da propria linha (inclusive
-- cargo) e ninguem consegue mudar a linha de outra pessoa - os dois
-- precisam mudar pra centralizar essa decisao na BDR.

-- 0) Garante que a BDR consegue LER todas as linhas de profiles (pra
--    listar todo mundo na tela de admin), independente do bootstrap
--    antigo de user_roles/admin ja ter alcancado essa conta ou nao.
DROP POLICY IF EXISTS profiles_select_admin ON public.profiles;
CREATE POLICY profiles_select_admin ON public.profiles FOR SELECT TO authenticated
  USING (lower(coalesce(auth.jwt() ->> 'email', '')) = 'bdr@bcw.com.br');

-- 1) Deixa a BDR atualizar QUALQUER linha de profiles (nao so a dela),
--    pra poder editar o cargo de outras pessoas pela tela de admin.
DROP POLICY IF EXISTS profiles_update_admin ON public.profiles;
CREATE POLICY profiles_update_admin ON public.profiles FOR UPDATE TO authenticated
  USING (lower(coalesce(auth.jwt() ->> 'email', '')) = 'bdr@bcw.com.br')
  WITH CHECK (lower(coalesce(auth.jwt() ->> 'email', '')) = 'bdr@bcw.com.br');

-- 2) Trava a coluna "cargo" especificamente: mesmo alguem editando a
--    propria linha (nome, sigla etc. via profiles_update_own), uma
--    mudanca de cargo so e aceita se quem esta logado for a BDR -
--    qualquer outra tentativa e revertida em silencio (o resto da
--    atualizacao segue normal).
CREATE OR REPLACE FUNCTION public.protege_cargo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.cargo IS DISTINCT FROM OLD.cargo
     AND lower(coalesce(auth.jwt() ->> 'email', '')) <> 'bdr@bcw.com.br' THEN
    NEW.cargo := OLD.cargo;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protege_cargo() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_protege_cargo ON public.profiles;
CREATE TRIGGER trg_protege_cargo
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protege_cargo();
