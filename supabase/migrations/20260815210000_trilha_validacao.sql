-- Trilha de quem validou cada andamento sugerido (Publicações) e quando —
-- hoje "Marcar como validado" não deixava rastro de quem confirmou.
-- Guarda a sigla/e-mail de quem validou como texto (não um uuid com FK
-- pra auth.users) porque a política de leitura de "profiles" só permite
-- ler o próprio perfil — um texto simples, escrito no momento da
-- validação por quem já pode ler o próprio perfil, evita esse problema e
-- fica visível pra qualquer um que possa ver o andamento.
ALTER TABLE public.movimentacoes
  ADD COLUMN IF NOT EXISTS validado_por text,
  ADD COLUMN IF NOT EXISTS validado_em timestamptz;
