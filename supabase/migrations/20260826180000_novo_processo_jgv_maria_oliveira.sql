-- Migracao pontual: cadastra o unico processo da planilha "PROCESSOS
-- 26_08_2026" (JGV) que ainda nao existia no FaroLex (os outros 16 ja
-- estavam cadastrados). Usa so os dados que vem na planilha, ja na
-- pasta JGV (Equipe Souza Cruz), com socio ELV (regra geral do JGV --
-- ver migracao socio_jgv). Protegida contra duplicar.
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
    '01994115920168130702',
    'Souza Cruz Ltda',
    'Souza Cruz Ltda',
    'MARIA OLIVEIRA DOS SANTOS',
    'MARIA OLIVEIRA DOS SANTOS',
    '4608',
    '3252',
    'Cobranca',
    E'Uberl\u00e2ndia',
    'MG',
    E'4\u00aa Vara C\u00edvel',
    'JGV',
    'ELV',
    'Data de entrada (planilha): 08/11/2018.'
  )
) AS v(numero_cnj, cliente, reu, autor, parte_contraria, numero_cliente, numero_interno, classe, comarca, uf, vara, responsavel, socio, observacoes)
WHERE NOT EXISTS (
  SELECT 1 FROM public.processos p
  WHERE regexp_replace(p.numero_cnj, '\D', '', 'g') = v.numero_cnj
);

-- resumo
SELECT count(*) AS processos_cadastrados
FROM public.processos
WHERE numero_interno = '3252' AND cliente = 'Souza Cruz Ltda';
