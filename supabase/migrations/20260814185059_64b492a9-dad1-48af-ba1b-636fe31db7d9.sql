-- Vincula desdobramentos (cumprimento de sentença etc.) ao processo
-- principal quando ambos compartilham o mesmo "número do caso"
-- (numero_interno) E a mesma parte contrária — número de caso sozinho
-- não é confiável (algumas planilhas reaproveitam o mesmo número para
-- processos completamente diferentes). Quando um número de caso tem mais
-- de uma parte contrária distinta, nada é vinculado automaticamente
-- (fica para revisão manual). Entre os processos que batem, o de ano
-- mais antigo (pelo próprio número CNJ) vira o principal; os demais
-- viram filhos dele. Só preenche processo_pai_id quando ainda está
-- vazio — seguro de rodar mais de uma vez.
WITH contagem AS (
  SELECT numero_interno, lower(trim(coalesce(parte_contraria, ''))) AS parte_norm, count(*) AS qtd
  FROM public.processos
  WHERE numero_interno IS NOT NULL AND coalesce(trim(parte_contraria), '') <> ''
  GROUP BY numero_interno, lower(trim(coalesce(parte_contraria, '')))
),
majoritaria AS (
  SELECT DISTINCT ON (numero_interno) numero_interno, parte_norm, qtd
  FROM contagem
  ORDER BY numero_interno, qtd DESC, parte_norm
),
membros AS (
  SELECT
    p.id, p.numero_interno,
    row_number() OVER (
      PARTITION BY p.numero_interno
      ORDER BY substring(regexp_replace(p.numero_cnj, '\D', '', 'g') from 10 for 4)::int, p.created_at
    ) AS ordem
  FROM public.processos p
  JOIN majoritaria m
    ON m.numero_interno = p.numero_interno
   AND lower(trim(coalesce(p.parte_contraria, ''))) = m.parte_norm
  WHERE m.qtd > 1
)
UPDATE public.processos p
SET processo_pai_id = principal.id
FROM membros filho
JOIN membros principal ON principal.numero_interno = filho.numero_interno AND principal.ordem = 1
WHERE p.id = filho.id AND filho.ordem > 1 AND p.processo_pai_id IS NULL;
