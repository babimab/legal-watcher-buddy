-- Processos: pasta (grupo/pasta), e desdobramentos (recurso, cumprimento de
-- sentença etc. como processos "filhos" vinculados ao processo principal).

ALTER TABLE public.processos
  ADD COLUMN IF NOT EXISTS pasta_id uuid REFERENCES public.pastas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS processo_pai_id uuid REFERENCES public.processos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tipo_desdobramento text;

DO $$ BEGIN
  ALTER TABLE public.processos ADD CONSTRAINT processos_tipo_desdobramento_check
    CHECK (tipo_desdobramento IS NULL OR tipo_desdobramento IN (
      'Recurso', 'Cumprimento de sentença', 'Execução', 'Embargos', 'Agravo', 'Outro'
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_processos_pasta ON public.processos (pasta_id);
CREATE INDEX IF NOT EXISTS idx_processos_pai ON public.processos (processo_pai_id);

-- Estrutura inicial de grupos/pastas descrita pelo escritório.
DO $$
DECLARE
  _sc_id uuid;
  _astro_id uuid;
BEGIN
  INSERT INTO public.grupos (nome) VALUES ('Equipe Souza Cruz')
    ON CONFLICT (nome) DO UPDATE SET nome = EXCLUDED.nome
    RETURNING id INTO _sc_id;
  INSERT INTO public.grupos (nome) VALUES ('Equipe Astro')
    ON CONFLICT (nome) DO UPDATE SET nome = EXCLUDED.nome
    RETURNING id INTO _astro_id;

  INSERT INTO public.pastas (grupo_id, nome) VALUES
    (_sc_id, 'BDR'), (_sc_id, 'BBS'), (_sc_id, 'MLV'), (_sc_id, 'JGV'), (_sc_id, 'ELV'),
    (_astro_id, 'Perfis MLV (ações de cobrança)'), (_astro_id, 'BDR'),
    (_astro_id, 'RJ Astromaritima'), (_astro_id, 'RJ Astro Navegação')
  ON CONFLICT (grupo_id, nome) DO NOTHING;
END $$;

-- Backfill: associa processos já cadastrados à pasta correspondente a
-- partir do texto livre "carteira". Como o nome "BDR" (e "MLV") se repete
-- entre as duas equipes, usamos as partes do processo para desambiguar:
-- se cliente/autor/réu/parte contrária mencionam "astro", vai para a
-- Equipe Astro; senão cai na Equipe Souza Cruz (cliente padrão do
-- escritório até aqui). Revise o resultado na tela de Grupos depois —
-- esta é uma heurística, não uma classificação garantida.
UPDATE public.processos p
SET pasta_id = pa.id
FROM public.pastas pa
JOIN public.grupos g ON g.id = pa.grupo_id
WHERE p.pasta_id IS NULL
  AND p.carteira IS NOT NULL
  AND (
    (
      g.nome = 'Equipe Astro'
      AND (
        p.cliente ILIKE '%astro%' OR p.autor ILIKE '%astro%'
        OR p.reu ILIKE '%astro%' OR p.parte_contraria ILIKE '%astro%'
      )
      AND (
        lower(trim(p.carteira)) = lower(pa.nome)
        OR (lower(trim(p.carteira)) = 'mlv' AND pa.nome = 'Perfis MLV (ações de cobrança)')
      )
    )
    OR
    (
      g.nome = 'Equipe Souza Cruz'
      AND NOT (
        p.cliente ILIKE '%astro%' OR p.autor ILIKE '%astro%'
        OR p.reu ILIKE '%astro%' OR p.parte_contraria ILIKE '%astro%'
      )
      AND lower(trim(p.carteira)) = lower(pa.nome)
    )
  );
