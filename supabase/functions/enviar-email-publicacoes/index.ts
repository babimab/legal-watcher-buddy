// Envia o e-mail de publicações (botão "Mandar e-mail" da tela
// Publicações) de verdade, pelo servidor via Resend -- antes esse botão
// só abria um mailto: com texto puro (tabulação fingindo tabela), que
// cada programa de e-mail exibia diferente e sem grade de verdade. O
// conteúdo (saudação, Agendamentos, tabela por processo) é montado no
// navegador (já tem tudo calculado ali: classificação, grupo etc.) --
// esta função só recebe o HTML pronto e manda.
//
// Autenticação: mesmo padrão de buscar-djen/gerar-comunicacao-decisao,
// exige usuário logado via Supabase Auth (não é um webhook/cron).
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !anonKey) {
      throw new Error("Configuração do Supabase ausente no ambiente da função.");
    }
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseCliente = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: erroAuth,
    } = await supabaseCliente.auth.getUser();
    if (erroAuth || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const resendFrom = Deno.env.get("RESEND_FROM_EMAIL");
    if (!resendApiKey || !resendFrom) {
      throw new Error("RESEND_API_KEY / RESEND_FROM_EMAIL não configurados nos secrets do projeto.");
    }

    const body = (await req.json()) as {
      destinatarios?: string[];
      assunto?: string;
      html?: string;
    };
    const destinatarios = (body.destinatarios ?? []).map((e) => e.trim()).filter(Boolean);
    const assunto = (body.assunto ?? "").trim();
    const html = body.html ?? "";
    if (destinatarios.length === 0) throw new Error("Informe pelo menos um destinatário.");
    if (!assunto) throw new Error("Informe o assunto.");
    if (!html) throw new Error("Corpo do e-mail vazio.");

    const respostaResend = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: resendFrom, to: destinatarios, subject: assunto, html }),
    });
    if (!respostaResend.ok) {
      const detalhe = await respostaResend.text();
      throw new Error(`Resend recusou o envio (${respostaResend.status}): ${detalhe.slice(0, 300)}`);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Falha ao enviar o e-mail.";
    return new Response(JSON.stringify({ error: mensagem }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
