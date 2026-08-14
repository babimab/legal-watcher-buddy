-- Vincula também processos de segunda instância (recurso ao TJRS) que a
-- migration anterior não pegou porque a "parte contrária" cadastrada
-- nesses casos às vezes não é a parte de verdade (vem preenchida com o
-- nome do próprio tribunal, ou de outra parte envolvida só no recurso).
-- Processos de segunda instância no TJRS têm o número CNJ terminando em
-- 7000 (origem genérica do tribunal, em vez do fórum da comarca) — usa
-- isso combinado com o número do caso para achar o processo principal
-- (o "raiz" da família, não um intermediário). Só liga quando existe
-- exatamente um processo principal candidato para aquele número de caso
-- (evita achar sozinho quando é ambíguo). Seguro de rodar mais de uma vez.
WITH candidatos_2a AS (
  SELECT id, numero_interno
  FROM public.processos
  WHERE numero_interno IS NOT NULL
    AND regexp_replace(numero_cnj, '\D', '', 'g') LIKE '%7000'
    AND processo_pai_id IS NULL
),
principais AS (
  SELECT id, numero_interno,
         count(*) OVER (PARTITION BY numero_interno) AS qtd
  FROM public.processos
  WHERE numero_interno IS NOT NULL
    AND regexp_replace(numero_cnj, '\D', '', 'g') NOT LIKE '%7000'
    AND processo_pai_id IS NULL
)
UPDATE public.processos p
SET processo_pai_id = principais.id
FROM candidatos_2a c
JOIN principais ON principais.numero_interno = c.numero_interno AND principais.qtd = 1
WHERE p.id = c.id;
