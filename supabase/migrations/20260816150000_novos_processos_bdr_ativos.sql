-- Migração pontual: cadastra 7 processos que estão na planilha "Em
-- andamento" da BDR/Souza Cruz mas ainda não existiam no FaroLex. Usa só
-- os dados que já vêm na planilha (autor/parte contrária, comarca, UF,
-- vara, tipo de ação, número do caso), já na pasta BDR (Equipe Souza
-- Cruz). A "Data de entrada" não tem campo próprio no FaroLex hoje,
-- então entrou como observação pra não se perder.
--
-- Protegida contra duplicar: só insere o que ainda não existe (mesmo CNJ).

INSERT INTO public.processos
  (numero_cnj, cliente, reu, autor, parte_contraria, numero_interno, classe, comarca, uf, vara, responsavel, observacoes, status, fonte, pasta_id)
SELECT
  v.numero_cnj, v.cliente, v.reu, v.autor, v.parte_contraria, v.numero_interno, v.classe, v.comarca, v.uf, v.vara,
  v.responsavel, v.observacoes, 'ativo', 'manual',
  (SELECT pa.id FROM public.pastas pa
   JOIN public.grupos g ON g.id = pa.grupo_id
   WHERE g.nome = 'Equipe Souza Cruz' AND pa.nome = 'BDR')
FROM (
  VALUES
('50064031920268210036', 'Souza Cruz Ltda', 'Souza Cruz Ltda', 'RAFAEL BORGES DE SOUZA', 'RAFAEL BORGES DE SOUZA', '4439', 'Ação de Indenização por Dano Moral', 'Soledade', 'RS', 'Vara Única', 'BDR', 'Data de entrada (planilha LD): 10/08/2026.'),
('00037805820118050256', 'Souza Cruz Ltda', 'Souza Cruz Ltda', 'Nádia Geralda Magalhães', 'Nádia Geralda Magalhães', '1783', 'Indenizatória', NULL, NULL, NULL, 'BDR', 'Data de entrada (planilha LD): 21/07/2011.'),
('00021048420118240082', 'Souza Cruz Ltda', 'Souza Cruz Ltda', 'RKA Comércio e Representações Ltda', 'RKA Comércio e Representações Ltda', '1731', 'Cominatória', NULL, NULL, NULL, 'BDR', 'Data de entrada (planilha LD): 03/05/2011.'),
('00002939720148210137', 'Souza Cruz Ltda', 'Souza Cruz Ltda', 'LORACI DUARTE FERREIRA', 'LORACI DUARTE FERREIRA', '3444', NULL, NULL, NULL, NULL, 'BDR', 'Data de entrada (planilha LD): 20/12/2019.'),
('50005394320228210067', 'Souza Cruz Ltda', 'Souza Cruz Ltda', 'DIEGO HUTTNER BUBOLZ', 'DIEGO HUTTNER BUBOLZ', '3806', 'Indenizatória', 'São Lourenço do Sul', 'RS', 'vara única', 'BDR', 'Data de entrada (planilha LD): 21/03/2022.'),
('50046463620258210032', 'Souza Cruz Ltda', 'Souza Cruz Ltda', 'CLAUDIO SOUZA DE MENEZES', 'CLAUDIO SOUZA DE MENEZES', '4360', 'Ação de Indenização por Dano Moral', 'São Jerônimo', 'RS', '1ª Vara Cível', 'BDR', 'Data de entrada (planilha LD): 26/09/2025.'),
('50014434020258240143', 'Souza Cruz Ltda', 'Souza Cruz Ltda', 'DIEGO HUMENIUK', 'DIEGO HUMENIUK', '4380', 'Ação de Indenização por Dano Moral', 'Rio do Campo', 'SC', 'Vara Única', 'BDR', 'Data de entrada (planilha LD): 05/11/2025.')
) AS v(numero_cnj, cliente, reu, autor, parte_contraria, numero_interno, classe, comarca, uf, vara, responsavel, observacoes)
WHERE NOT EXISTS (
  SELECT 1 FROM public.processos p
  WHERE regexp_replace(p.numero_cnj, '\D', '', 'g') = v.numero_cnj
);

-- resumo
SELECT count(*) AS processos_cadastrados
FROM public.processos
WHERE numero_interno IN ('4439', '1783', '1731', '3444', '3806', '4360', '4380')
  AND cliente = 'Souza Cruz Ltda';
