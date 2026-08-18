-- Migracao pontual: cadastra o unico processo da planilha "Casos Novos"
-- da MLV/Souza Cruz que ainda nao existia no FaroLex (os outros 10 ja
-- estavam cadastrados). Usa so os dados que vem na planilha, ja na
-- pasta MLV (Equipe Souza Cruz). Protegida contra duplicar.
--
-- Texto acentuado escrito via E'...\u00XX...' de proposito (nao com o
-- acento literal), pro arquivo ficar puro ASCII e imune ao problema de
-- mojibake no copiar/colar no editor SQL do Supabase (ver corrigir_mojibake).

INSERT INTO public.processos
  (numero_cnj, cliente, reu, autor, parte_contraria, numero_interno, classe, comarca, uf, vara, responsavel, observacoes, status, fonte, pasta_id)
SELECT
  v.numero_cnj, v.cliente, v.reu, v.autor, v.parte_contraria, v.numero_interno, v.classe, v.comarca, v.uf, v.vara,
  v.responsavel, v.observacoes, 'ativo', 'manual',
  (SELECT pa.id FROM public.pastas pa
   JOIN public.grupos g ON g.id = pa.grupo_id
   WHERE g.nome = 'Equipe Souza Cruz' AND pa.nome = 'MLV')
FROM (
  VALUES
  (
    '54128677920268090051',
    'Souza Cruz Ltda',
    'Souza Cruz Ltda',
    'LUCAS EDUARDO SILVA COSTA',
    'LUCAS EDUARDO SILVA COSTA',
    '4434',
    E'Declarat\u00f3ria',
    E'Goi\u00e2nia',
    'GO',
    E'Vara \u00danica',
    'MLV',
    'Data de entrada (planilha): 29/06/2026.'
  )
) AS v(numero_cnj, cliente, reu, autor, parte_contraria, numero_interno, classe, comarca, uf, vara, responsavel, observacoes)
WHERE NOT EXISTS (
  SELECT 1 FROM public.processos p
  WHERE regexp_replace(p.numero_cnj, '\D', '', 'g') = v.numero_cnj
);

-- resumo
SELECT count(*) AS processos_cadastrados
FROM public.processos
WHERE numero_interno = '4434' AND cliente = 'Souza Cruz Ltda';
