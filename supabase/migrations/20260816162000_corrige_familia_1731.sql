-- Migração corretiva: a migração anterior (20260816160000) buscou o
-- processo principal pelo CNJ formatado ("0002104-84.2011.8.24.0082"),
-- mas ele está salvo no banco só com números
-- ("00021048420118240082") — por isso o processo_pai_id ficou vazio
-- nos 4 desdobramentos (o tipo_desdobramento foi salvo certo) e o REsp
-- 2.200.810/SC nem chegou a ser criado. Essa migração corrige os 4,
-- cria o REsp que faltou, e já vincula também o 5005368-38.2022.8.24.0082
-- (honorários do escritório) — substitui a migração 20260816161500,
-- não precisa rodar ela.

BEGIN;

-- Corrige o pai dos 4 desdobramentos que já tinham tipo_desdobramento
-- salvo, mas sem processo_pai_id.
UPDATE public.processos
SET processo_pai_id = (
  SELECT id FROM public.processos
  WHERE regexp_replace(numero_cnj, '\D', '', 'g') = '00021048420118240082'
)
WHERE numero_cnj IN (
  '5000010-68.2017.8.24.0082',
  '5038661-22.2020.8.24.0000',
  '5050568-23.2022.8.24.0000',
  '5034224-30.2023.8.24.0000'
);

-- Vincula o cumprimento de sentença dos honorários do escritório
-- (confirmado pelos "Processos relacionados" do sistema do tribunal).
UPDATE public.processos
SET processo_pai_id = (
      SELECT id FROM public.processos
      WHERE regexp_replace(numero_cnj, '\D', '', 'g') = '00021048420118240082'
    ),
    tipo_desdobramento = 'Cumprimento de sentenca'
WHERE numero_cnj = '5005368-38.2022.8.24.0082';

-- Cria o REsp 2.200.810/SC, que não tinha sido criado da vez passada.
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
WHERE regexp_replace(pai.numero_cnj, '\D', '', 'g') = '00021048420118240082'
  AND NOT EXISTS (
    SELECT 1 FROM public.processos WHERE numero_cnj = 'REsp 2.200.810/SC (2024/0386852-7)'
  );

-- resumo: família completa depois dessa correção
SELECT numero_cnj, tipo_desdobramento, processo_pai_id IS NOT NULL AS tem_pai
FROM public.processos
WHERE numero_interno = '1731'
   OR numero_cnj = 'REsp 2.200.810/SC (2024/0386852-7)'
ORDER BY tem_pai, numero_cnj;

COMMIT;
