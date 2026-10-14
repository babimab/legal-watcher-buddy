// Relatório diário automático de publicações (pedido da BDR: rodar
// sozinho todo dia às 11h e mandar por e-mail).
//
// Fonte: o que JÁ FOI TRAZIDO AO FAROLEX pela tela Publicações (botão
// "Buscar no DJEN" + importar), gravado em movimentacoes com
// fonte = "publicacoes". A versão anterior consultava o DJEN direto
// daqui, mas a API pública do DJEN é bloqueada por país (CloudFront
// devolve 403 para acessos vindos de fora do Brasil) e o servidor do
// app fica fora do país -- a busca automática nunca conseguia concluir.
// Buscar continua funcionando normalmente pelo navegador de quem está
// no escritório; este relatório só organiza e envia o que já entrou.
//
// Autenticação: chamada só aceita com o header "x-webhook-secret"
// batendo com o secret RELATORIO_PUBLICACOES_SECRET -- mesmo padrão de
// receber-andamento, pra ninguém de fora conseguir disparar o envio.
//
// Destino: RELATORIO_PUBLICACOES_EMAIL (aceita vários e-mails separados
// por vírgula). Envio via Resend (RESEND_API_KEY + RESEND_FROM_EMAIL).
//
// Dedup: cada andamento importado só é reportado uma vez -- a chave
// "mov:<id da movimentação>" fica registrada em
// publicacoes_relatorio_enviadas depois de mandada. Por isso a janela
// de leitura pode ser maior que 24h sem repetir publicação no dia
// seguinte: se um dia o agendamento falhar, o do dia seguinte alcança o
// que ficou pra trás.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

// Puxa um pouco mais que 24h de propósito: se o disparo de um dia
// falhar, o do dia seguinte ainda alcança o que ficou pra trás (o dedup
// impede repetir o que já foi mandado).
const JANELA_DIAS = 3;

type ProcessoResumo = {
  id: string;
  numero_cnj: string;
  cliente: string;
  numero_cliente: string | null;
  numero_interno: string | null;
  socio: string | null;
  responsavel: string | null;
  autor: string | null;
  reu: string | null;
  parte_contraria: string | null;
  vara: string | null;
  comarca: string | null;
  uf: string | null;
};

type AndamentoImportado = {
  id: string;
  data_movimentacao: string;
  descricao: string;
  tipo: string | null;
  prazo: string | null;
  prazo_revisar: boolean;
  exige_acao: boolean;
  observacao: string | null;
  validado: boolean;
  created_at: string;
  processos: ProcessoResumo | null;
};

function dataBR(valor: string | null): string {
  if (!valor) return "—";
  const d = new Date(`${valor.slice(0, 10)}T12:00:00`);
  return Number.isNaN(d.getTime()) ? valor : d.toLocaleDateString("pt-BR");
}

function texto(v: unknown): string {
  const s = v == null ? "" : String(v).trim();
  return s === "" ? "—" : s;
}

function escapar(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function linhaHtml(cols: string[]): string {
  return `<tr>${cols
    .map((c) => `<td style="padding:4px 8px;border:1px solid #ddd;font-size:13px">${escapar(c)}</td>`)
    .join("")}</tr>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const segredoEsperado = Deno.env.get("RELATORIO_PUBLICACOES_SECRET");
    if (!segredoEsperado) throw new Error("RELATORIO_PUBLICACOES_SECRET não configurado nos secrets do projeto.");
    if (req.headers.get("x-webhook-secret") !== segredoEsperado) {
      return new Response(JSON.stringify({ error: "Não autorizado." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const emailDono = Deno.env.get("RELATORIO_PUBLICACOES_EMAIL");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const resendFrom = Deno.env.get("RESEND_FROM_EMAIL");
    if (!supabaseUrl || !serviceRoleKey) throw new Error("Configuração do Supabase ausente.");
    if (!emailDono) throw new Error("RELATORIO_PUBLICACOES_EMAIL não configurado nos secrets do projeto.");
    if (!resendApiKey || !resendFrom) {
      throw new Error("RESEND_API_KEY / RESEND_FROM_EMAIL não configurados nos secrets do projeto.");
    }

    const destinatarios = emailDono
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);
    if (destinatarios.length === 0) throw new Error("RELATORIO_PUBLICACOES_EMAIL está vazio.");

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const desde = new Date();
    desde.setDate(desde.getDate() - JANELA_DIAS);

    const { data: andamentosData, error: erroAndamentos } = await admin
      .from("movimentacoes")
      .select(
        "id, data_movimentacao, descricao, tipo, prazo, prazo_revisar, exige_acao, observacao, validado, created_at, processos(id, numero_cnj, cliente, numero_cliente, numero_interno, socio, responsavel, autor, reu, parte_contraria, vara, comarca, uf)",
      )
      .eq("fonte", "publicacoes")
      .gte("created_at", desde.toISOString())
      .order("created_at", { ascending: true });
    if (erroAndamentos) throw new Error(erroAndamentos.message);

    const andamentos = (andamentosData ?? []) as unknown as AndamentoImportado[];
    if (andamentos.length === 0) {
      return new Response(
        JSON.stringify({
          ok: true,
          aviso: "Nenhuma publicação importada no FaroLex no período -- nada a reportar.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const chaveDe = (id: string) => `mov:${id}`;
    const chaves = andamentos.map((a) => chaveDe(a.id));

    const { data: jaEnviadas, error: erroJaEnviadas } = await admin
      .from("publicacoes_relatorio_enviadas")
      .select("chave")
      .in("chave", chaves);
    if (erroJaEnviadas) throw new Error(erroJaEnviadas.message);
    const chavesJaEnviadas = new Set((jaEnviadas ?? []).map((r: { chave: string }) => r.chave));
    const novos = andamentos.filter((a) => !chavesJaEnviadas.has(chaveDe(a.id)));

    if (novos.length === 0) {
      return new Response(JSON.stringify({ ok: true, aviso: "Nada novo (tudo já tinha sido reportado)." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const semProcesso = novos.filter((a) => !a.processos);

    const linhas = novos
      .filter((a) => a.processos)
      .map((a) => {
        const p = a.processos!;
        const partes = p.parte_contraria
          ? `${p.cliente} x ${p.parte_contraria}`
          : [p.autor, p.reu].filter(Boolean).join(" x ") || "—";
        const juizo =
          [p.vara, [p.comarca, p.uf].filter(Boolean).join("/") || null].filter(Boolean).join(" de ") || "—";
        const prazo = a.prazo ? dataBR(a.prazo) : a.prazo_revisar ? "Revisar manualmente" : "—";
        return linhaHtml([
          texto(p.numero_cnj),
          texto(p.cliente),
          [p.numero_cliente, p.numero_interno].filter(Boolean).join("/") || "—",
          texto(p.socio),
          texto(p.responsavel),
          partes,
          juizo,
          texto(a.tipo ?? "Publicação"),
          prazo,
          a.validado ? "Validado" : "A validar",
        ]);
      })
      .join("");

    const cabecalho = [
      "Processo",
      "Cliente",
      "Caso",
      "Sócio",
      "ADVG",
      "Partes",
      "Juízo",
      "Tipo de ato",
      "Prazo",
      "Situação",
    ]
      .map(
        (h) =>
          `<th style="padding:4px 8px;border:1px solid #ddd;background:#f3f3f3;font-size:13px;text-align:left">${h}</th>`,
      )
      .join("");

    const tabela =
      linhas.length > 0
        ? `<table style="border-collapse:collapse;width:100%"><thead><tr>${cabecalho}</tr></thead><tbody>${linhas}</tbody></table>`
        : `<p>Nenhuma publicação com processo correspondente no período.</p>`;

    const dataInicio = desde.toISOString().slice(0, 10);
    const dataFim = new Date().toISOString().slice(0, 10);

    const corpoHtml = `<div style="font-family:sans-serif;color:#222">
<h2 style="color:#1f3b73;margin:0 0 6px">Publicações importadas no FaroLex</h2>
<p style="margin:0 0 12px">Relatório automático, período de ${dataBR(dataInicio)} a ${dataBR(dataFim)}.
Lista os andamentos que a tela <b>Publicações</b> já trouxe do DJEN e importou para os processos
(${novos.length} ${novos.length === 1 ? "publicação" : "publicações"}).</p>
${tabela}
<p style="color:#666;font-size:13px;margin-top:14px">Publicações do DJEN sem processo cadastrado não ficam
salvas no FaroLex, então não entram neste relatório -- elas continuam aparecendo na própria tela
Publicações, na seção "sem processo cadastrado".</p>
</div>`;

    const respostaResend = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: resendFrom,
        to: destinatarios,
        subject: `Publicações importadas no FaroLex — ${dataBR(dataFim)}`,
        html: corpoHtml,
      }),
    });
    if (!respostaResend.ok) {
      const detalhe = await respostaResend.text();
      throw new Error(`Resend recusou o envio (${respostaResend.status}): ${detalhe.slice(0, 300)}`);
    }

    const { error: erroInsercao } = await admin.from("publicacoes_relatorio_enviadas").insert(
      novos.map((a) => ({ chave: chaveDe(a.id), cnj_digits: a.processos?.numero_cnj.replace(/\D/g, "") ?? "" })),
    );
    if (erroInsercao) throw new Error(erroInsercao.message);

    return new Response(
      JSON.stringify({
        ok: true,
        reportadas: novos.length,
        semProcesso: semProcesso.length,
        destinatarios: destinatarios.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Falha ao gerar o relatório de publicações.";
    return new Response(JSON.stringify({ error: mensagem }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
