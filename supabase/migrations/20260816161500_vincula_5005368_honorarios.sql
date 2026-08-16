-- Migração pontual: vincula o cumprimento de sentença dos honorários do
-- escritório (exequente BCW Advogados x executada RKA) como desdobramento
-- do mesmo processo principal de 2011 — confirmado pelos "Processos
-- relacionados" do próprio sistema do tribunal (originário
-- 5000010-68.2017.8.24.0082, relacionado aos agravos 5050568-23.2022 e
-- 5034224-30.2023, que já estão vinculados nessa família).

BEGIN;

UPDATE public.processos
SET processo_pai_id = (SELECT id FROM public.processos WHERE numero_cnj = '0002104-84.2011.8.24.0082'),
    tipo_desdobramento = 'Cumprimento de sentenca'
WHERE numero_cnj = '5005368-38.2022.8.24.0082';

-- resumo: família completa depois dessa migração
SELECT numero_cnj, tipo_desdobramento, processo_pai_id IS NOT NULL AS tem_pai
FROM public.processos
WHERE numero_interno = '1731'
   OR numero_cnj = 'REsp 2.200.810/SC (2024/0386852-7)'
ORDER BY tem_pai, numero_cnj;

COMMIT;
