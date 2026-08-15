// Envia o relatório de andamentos por e-mail via Resend. Recebe uma lista
// de destinatários, assunto e um HTML já pronto (montado no frontend) e
// só repassa pra API do Resend.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { destinatarios, assunto, html } = await req.json();

    if (!Array.isArray(destinatarios) || destinatarios.length === 0) {
      throw new Error("Informe pelo menos um destinatário.");
    }
    if (!assunto || !html) {
      throw new Error("Assunto e conteúdo do e-mail são obrigatórios.");
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      throw new Error("RESEND_API_KEY não configurado nos secrets do projeto.");
    }

    const resposta = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "FaroLex <onboarding@resend.dev>",
        to: destinatarios,
        subject: assunto,
        html,
      }),
    });

    if (!resposta.ok) {
      const detalhe = await resposta.text();
      throw new Error(`Resend recusou o envio: ${detalhe}`);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Falha ao enviar e-mail.";
    return new Response(JSON.stringify({ error: mensagem }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
