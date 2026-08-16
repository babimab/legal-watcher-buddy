-- Migração pontual: vincula a família do caso 1731 (RKA Comércio e
-- Representações Ltda. x Souza Cruz S.A.) como desdobramentos do processo
-- principal de 2011, e cadastra o REsp 2.200.810/SC (STJ) que ainda não
-- existia no FaroLex. Baseado no "Relatório BCW — RKA x Souza Cruz —
-- REsp 2.200.810/SC" enviado por Bárbara.
--
-- NÃO inclui o processo 5005368-38.2022.8.24.0082 (8ª Vara Cível) —
-- não aparece no relatório e a vara não bate com o resto da família,
-- fica de fora até confirmação.

BEGIN;

-- Cumprimento de sentença (instaurado 2017)
UPDATE public.processos
SET processo_pai_id = (SELECT id FROM public.processos WHERE numero_cnj = '0002104-84.2011.8.24.0082'),
    tipo_desdobramento = 'Cumprimento de sentenca'
WHERE numero_cnj = '5000010-68.2017.8.24.0082';

-- Agravo de Instrumento n. 5038661 (julgado em 17/05/2022 pela 2ª Câmara
-- de Direito Comercial do TJSC, junto com o AI n. 5039584 que não está
-- cadastrado no FaroLex)
UPDATE public.processos
SET processo_pai_id = (SELECT id FROM public.processos WHERE numero_cnj = '0002104-84.2011.8.24.0082'),
    tipo_desdobramento = 'Agravo'
WHERE numero_cnj = '5038661-22.2020.8.24.0000';

-- Demais fases recursais da mesma tramitação no TJSC (2ª Câmara de
-- Direito Comercial) — o relatório não identifica o número exato de
-- cada uma, mas a época bate com a tramitação do agravo interno/REsp.
UPDATE public.processos
SET processo_pai_id = (SELECT id FROM public.processos WHERE numero_cnj = '0002104-84.2011.8.24.0082'),
    tipo_desdobramento = 'Recurso'
WHERE numero_cnj IN ('5050568-23.2022.8.24.0000', '5034224-30.2023.8.24.0000');

-- REsp 2.200.810/SC (2024/0386852-7) — 3ª Turma do STJ, julgamento
-- pautado para 16/06/2026. Ainda não existia no FaroLex.
INSERT INTO public.processos
  (numero_cnj, cliente, reu, autor, parte_contraria, classe, tribunal, status, fonte, pasta_id, processo_pai_id, tipo_desdobramento, observacoes)
SELECT
  'REsp 2.200.810/SC (2024/0386852-7)',
  'Souza Cruz Ltda',
  'Souza Cruz Ltda',
  'RKA Comércio e Representações Ltda',
  'RKA Comércio e Representações Ltda',
  'Recurso Especial',
  'STJ',
  'ativo',
  'manual',
  pai.pasta_id,
  pai.id,
  'Recurso',
  'Relatora Min. Nancy Andrighi (3ª Turma). Autuado 11/10/2024 (conversão do AREsp 2767920/SC). '
  || 'Discute (i) inclusão do valor de imóvel no cumprimento de sentença e (ii) multa do art. 523 do CPC '
  || 'por garantia via seguro-garantia em vez de pagamento voluntário. '
  || 'Avaliação da equipe: favorável na tese do imóvel (Súmula 7/STJ); risco moderado na multa do art. 523 '
  || '(impacto estimado ~R$ 240.000,00 em valores de 2022, caso reformado) — mitigado pelo fundamento '
  || 'autônomo da iliquidez do título (Tema 380/STJ). Sem pendências da Souza Cruz; processo pronto para julgamento.'
FROM public.processos pai
WHERE pai.numero_cnj = '0002104-84.2011.8.24.0082'
  AND NOT EXISTS (
    SELECT 1 FROM public.processos WHERE numero_cnj = 'REsp 2.200.810/SC (2024/0386852-7)'
  );

-- resumo: família completa depois da migração
SELECT numero_cnj, tipo_desdobramento, processo_pai_id IS NOT NULL AS tem_pai
FROM public.processos
WHERE numero_interno = '1731'
   OR numero_cnj = 'REsp 2.200.810/SC (2024/0386852-7)'
ORDER BY tem_pai, numero_cnj;

COMMIT;
