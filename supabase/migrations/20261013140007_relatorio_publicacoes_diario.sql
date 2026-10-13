-- Relatório diário automático de publicações (pedido da BDR: rodar
-- sozinho todo dia às 11h e mandar e-mail com Localizadas/Não
-- localizadas). Ver supabase/functions/relatorio-publicacoes-diario.

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

-- Agendamento via pg_cron + pg_net, chamando a edge function todo dia.
-- 11h de Brasília (sem horário de verão desde 2019) = 14h UTC.
--
-- ANTES DE RODAR, substitua os dois trechos abaixo:
--   <PROJECT_REF>   -- o ref do seu projeto Supabase (Configurações > API)
--   <ANON_KEY>      -- a "anon public" key do projeto (Configurações > API)
-- O segredo de verdade (quem pode disparar a função) é o header
-- x-webhook-secret, validado dentro da função pelo secret
-- RELATORIO_PUBLICACOES_SECRET -- a anon key aqui serve só pra passar
-- pela checagem de JWT da plataforma, não autoriza nada sozinha.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.unschedule('relatorio-publicacoes-diario')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'relatorio-publicacoes-diario');

SELECT cron.schedule(
  'relatorio-publicacoes-diario',
  '0 14 * * *',
  $$
  SELECT net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/relatorio-publicacoes-diario',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <ANON_KEY>',
      'x-webhook-secret', '<MESMO_VALOR_DO_SECRET_RELATORIO_PUBLICACOES_SECRET>'
    ),
    body := '{}'::jsonb
  );
  $$
);
