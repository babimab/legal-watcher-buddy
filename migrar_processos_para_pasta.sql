-- Só migra: não apaga nada, não cria nada, não mexe em duplicados.
-- Passo 1: tenta casar pela "carteira" já cadastrada em cada processo.
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
        OR (lower(trim(p.carteira)) = 'mlv' AND pa.nome = 'Perfis MLV (acoes de cobranca)')
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

-- Passo 2: qualquer processo que ainda ficou sem pasta vai para
-- Equipe Souza Cruz > BDR.
UPDATE public.processos p
SET pasta_id = pa.id
FROM public.pastas pa
JOIN public.grupos g ON g.id = pa.grupo_id
WHERE p.pasta_id IS NULL
  AND g.nome = 'Equipe Souza Cruz'
  AND pa.nome = 'BDR';

-- Confirma no final: deve mostrar 0.
SELECT count(*) AS ainda_sem_pasta FROM public.processos WHERE pasta_id IS NULL;
