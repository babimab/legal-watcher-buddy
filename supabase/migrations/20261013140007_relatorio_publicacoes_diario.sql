-- Relatório diário automático de publicações (pedido da BDR: rodar
-- sozinho todo dia às 11h e mandar e-mail). A API do DJEN bloqueia
-- acesso de fora do Brasil, então a função não busca nada nova -- ela
-- resume o que já foi importado manualmente pela tela Publicações. Ver
-- supabase/functions/relatorio-publicacoes-diario e AGENTS.md.

-- Registro do que já foi mandado, pra não repetir a mesma publicação
-- no dia seguinte só porque a janela de busca no DJEN (3 dias) se
-- sobrepõe com a de ontem. Sem acesso de cliente nenhum -- só a função
-- (via service role, que ignora RLS) mexe aqui.
CREATE TABLE IF NOT EXISTS public.publicacoes_relatorio_enviadas (
  chave text PRIMARY KEY,
  cnj_digits text NOT NULL,
  enviado_em timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.publicacoes_relatorio_enviadas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.publicacoes_relatorio_enviadas FROM anon, authenticated;

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- O agendamento em si (cron.schedule, 11h de Brasília = 14h UTC) NÃO fica
-- mais neste arquivo. A versão original daqui só tinha marcadores
-- <PROJECT_REF>/<ANON_KEY> -- reaplicar esta migração recriaria o job
-- quebrado, sobrescrevendo o que já está configurado com os valores reais
-- direto no banco (foi o Lovable quem corrigiu, ver AGENTS.md). Pra
-- conferir ou ajustar o agendamento hoje, use:
--   SELECT * FROM cron.job WHERE jobname = 'relatorio-publicacoes-diario';
