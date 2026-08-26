-- Migracao pontual: cadastra os 3 processos da planilha "PROCESSOS
-- 26_08_2026" (JGV, clientes fora da Souza Cruz) que ainda nao
-- existiam no FaroLex (os outros 26 ja estavam cadastrados). Confirmado
-- com a BDR: vao na mesma pasta JGV dentro da Equipe Souza Cruz, que ja
-- guarda processos de outros clientes do JGV tambem. Protegida contra
-- duplicar.
--
-- Texto acentuado escrito via E'...\u00XX...' de proposito (nao com o
-- acento literal), pro arquivo ficar puro ASCII e imune ao problema de
-- mojibake no copiar/colar no editor SQL do Supabase (ver corrigir_mojibake).

INSERT INTO public.processos
  (numero_cnj, cliente, reu, autor, parte_contraria, numero_cliente, numero_interno, classe, comarca, uf, vara, responsavel, socio, observacoes, status, fonte, pasta_id)
SELECT
  v.numero_cnj, v.cliente, v.reu, v.autor, v.parte_contraria, v.numero_cliente, v.numero_interno, v.classe, v.comarca, v.uf, v.vara,
  v.responsavel, v.socio, v.observacoes, 'ativo', 'manual',
  (SELECT pa.id FROM public.pastas pa
   JOIN public.grupos g ON g.id = pa.grupo_id
   WHERE g.nome = 'Equipe Souza Cruz' AND pa.nome = 'JGV')
FROM (
  VALUES
  (
    '10098048120148260002',
    'Merck S.A.',
    'Merck S.A.',
    'Milliuni Representacoes Ltda.',
    'Milliuni Representacoes Ltda.',
    '7347',
    '21',
    'Prestacao de Contas',
    'Santo Amaro',
    'SP',
    E'3\u00aa Vara C\u00edvel',
    'JGV',
    'ELV',
    'Data de entrada (planilha): 01/04/2014.'
  ),
  (
    '10239978620238260002',
    'Merck Parceiro Preferencial',
    'Interfarma',
    'Merck S.A.',
    'Interfarma',
    '8228',
    '32',
    NULL,
    E'S\u00e3o Paulo',
    'SP',
    E'7\u00aa Vara C\u00edvel',
    'JGV',
    'ELV',
    'Data de entrada (planilha): 05/04/2023. Caso: Interfarma - acao judicial.'
  ),
  (
    '01754197020168190001',
    'Paula Araujo Advogados Associados',
    'Paula Araujo Advogados Associados',
    E'Santa Casa da Miseric\u00f3rdia do Rio de Janeiro',
    E'Santa Casa da Miseric\u00f3rdia do Rio de Janeiro',
    '8227',
    '3',
    E'Execu\u00e7\u00e3o Barreira de Oliveira',
    'Rio de Janeiro',
    'RJ',
    E'39\u00aa Vara C\u00edvel',
    'JGV',
    'ELV',
    'Data de entrada (planilha): 07/10/2024.'
  )
) AS v(numero_cnj, cliente, reu, autor, parte_contraria, numero_cliente, numero_interno, classe, comarca, uf, vara, responsavel, socio, observacoes)
WHERE NOT EXISTS (
  SELECT 1 FROM public.processos p
  WHERE regexp_replace(p.numero_cnj, '\D', '', 'g') = v.numero_cnj
);

-- resumo
SELECT numero_interno, cliente, count(*)
FROM public.processos
WHERE numero_interno IN ('21', '32', '3')
  AND cliente IN ('Merck S.A.', 'Merck Parceiro Preferencial', 'Paula Araujo Advogados Associados')
GROUP BY numero_interno, cliente;
