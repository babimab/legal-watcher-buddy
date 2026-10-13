// Relatório diário automático de publicações (pedido da BDR: rodar
// sozinho todo dia às 11h e mandar por e-mail, com Localizadas e Não
// localizadas) -- a versão manual (src/routes/_authenticated/
// publicacoes.tsx) depende de alguém abrir o FaroLex e clicar em
// "Buscar no DJEN"; esta função repete a mesma busca/casamento/
// classificação, mas disparada por um cron (ver migração
// relatorio_publicacoes_diario.sql), sem usuário logado.
//
// Autenticação: chamada só aceita com o header "x-webhook-secret"
// batendo com o secret RELATORIO_PUBLICACOES_SECRET -- mesmo padrão de
// receber-andamento, pra ninguém de fora conseguir disparar a busca/o
// envio de e-mail.
//
// Pra onde manda e de quem busca no DJEN: usa o e-mail configurado no
// secret RELATORIO_PUBLICACOES_EMAIL (a mesma pessoa é dona da lista de
// "advogados fixados" com contexto "busca" E a destinatária do
// relatório -- se um dia precisar separar, é só trocar por dois
// secrets).
//
// Envio por e-mail via Resend (RESEND_API_KEY + RESEND_FROM_EMAIL).
//
// Dedup: cada publicação (CNJ + data de disponibilização + hash do
// teor) só entra numa vez no relatório -- fica registrada em
// publicacoes_relatorio_enviadas depois de mandada, pra não repetir no
// dia seguinte só porque a janela de busca (3 dias) se sobrepõe.
import { createClient } from "npm:@supabase/supabase-js@2";
import { classificarPublicacoes, type ItemParaClassificar } from "../_shared/publicacoes-regras.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

const DJEN_BASE_URL = "https://comunicaapi.pje.jus.br/api/v1/comunicacao";
const ITENS_POR_PAGINA = 100;
const MAX_PAGINAS_POR_ADVOGADO = 3;
const MAX_ITENS = 300;
const DIAS_PARA_TRAS = 3;

const NOMES_CLIENTES_CONHECIDOS = [
  "Souza Cruz",
  "BAT",
  "Astro",
  "FASC",
  "Eduardo de Souza Campos",
  "Ian de Porto Alegre Muniz",
  "Paulo Rogerio de Araujo Brandao Couto",
  "Sigma-Aldrich",
  "Fabio de Andrade Ferreira Braga",
  "Paula Araújo Advogados",
  "Endo Medical",
  "Flamma",
  "Antonio de Pádua Coimbra Tavares Paes",
  "Associação Brasileira da Indústria da Cerveja",
  "CervBrasil",
];

type AdvogadoFiltro = { nome: string; numeroOab: string; ufOab: string };

type ComunicacaoDjen = {
  cnjDigits: string;
  cnjTexto: string;
  orgao: string | null;
  dataDisponibilizacao: string | null;
  texto: string | null;
  nomesAdvogados: string[];
  partes: string[];
};

type ProcessoLinha = {
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

function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function texto(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

// Versão sem DOM do htmlParaTextoPlano de src/lib/djen.ts -- o teor do
// DJEN às vezes vem em HTML inteiro; aqui não tem document/innerHTML
// disponível (Deno), então é regex puro: tira tags e desfaz só as
// entidades mais comuns. Mais grosseiro que a versão do navegador, mas
// o bastante pra um resumo em e-mail.
function htmlParaTextoPlano(bruto: string): string {
  if (!bruto.includes("<") && !bruto.includes("&")) return bruto;
  return bruto
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<(br|\/p|\/div|\/tr|\/section|\/li|\/h[1-6])\s*\/?>/gi, "\n")
    .replace(/<(p|div|tr|section|li|h[1-6])(\s[^>]*)?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&ccedil;/g, "ç")
    .replace(/&atilde;/g, "ã")
    .replace(/&otilde;/g, "õ")
    .replace(/&aacute;/g, "á")
    .replace(/&eacute;/g, "é")
    .replace(/&iacute;/g, "í")
    .replace(/&oacute;/g, "ó")
    .replace(/&uacute;/g, "ú")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function pegar(obj: Record<string, unknown>, ...chaves: string[]): unknown {
  for (const chave of chaves) {
    const v = obj[chave];
    if (v != null && v !== "") return v;
  }
  return undefined;
}

function pegarFuzzy(obj: Record<string, unknown>, ...termos: string[]): unknown {
  for (const [chave, valor] of Object.entries(obj)) {
    const norm = chave.toLowerCase();
    if (termos.every((t) => norm.includes(t)) && valor != null && valor !== "") return valor;
  }
  return undefined;
}

function comoDataISO(valor: unknown): string | null {
  const s = texto(valor);
  if (!s) return null;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[0];
  const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (br) return `${br[3]}-${br[2]!.padStart(2, "0")}-${br[1]!.padStart(2, "0")}`;
  return null;
}

function nomesDeArray(valor: unknown): string[] {
  if (!Array.isArray(valor)) return [];
  const nomes: string[] = [];
  for (const item of valor) {
    if (typeof item === "string") {
      if (item.trim()) nomes.push(item.trim());
      continue;
    }
    if (item && typeof item === "object") {
      const obj = item as Record<string, unknown>;
      const alvo =
        obj["advogado"] && typeof obj["advogado"] === "object"
          ? (obj["advogado"] as Record<string, unknown>)
          : obj;
      const nome = texto(pegar(alvo, "nome") ?? pegarFuzzy(alvo, "nome"));
      if (nome) nomes.push(nome);
    }
  }
  return nomes;
}

function formatarCNJ(valor: string): string {
  const d = valor.replace(/\D/g, "").slice(0, 20);
  if (d.length < 20) return valor;
  return `${d.slice(0, 7)}-${d.slice(7, 9)}.${d.slice(9, 13)}.${d.slice(13, 14)}.${d.slice(14, 16)}.${d.slice(16, 20)}`;
}

function mapearItem(itemBruto: unknown): ComunicacaoDjen | null {
  if (!itemBruto || typeof itemBruto !== "object") return null;
  const obj = itemBruto as Record<string, unknown>;
  const numeroProcesso = texto(
    pegar(
      obj,
      "numero_processo",
      "numeroProcesso",
      "numeroprocesso",
      "numeroprocessocommascara",
      "numeroProcessoComMascara",
    ) ?? pegarFuzzy(obj, "numero", "processo"),
  );
  const cnjDigits = numeroProcesso ? numeroProcesso.replace(/\D/g, "") : "";
  const advogadosRaw =
    pegar(obj, "destinatarioadvogados", "destinatarios_advogados", "advogados") ??
    pegarFuzzy(obj, "advogado");
  const partesRaw = pegar(obj, "destinatarios", "partes") ?? pegarFuzzy(obj, "parte");

  return {
    cnjDigits,
    cnjTexto: cnjDigits.length >= 15 ? formatarCNJ(cnjDigits) : (numeroProcesso ?? "—"),
    orgao: texto(pegar(obj, "nomeOrgao", "nome_orgao", "orgao") ?? pegarFuzzy(obj, "orgao")),
    dataDisponibilizacao: comoDataISO(
      pegar(obj, "data_disponibilizacao", "dataDisponibilizacao", "datadisponibilizacao") ??
        pegarFuzzy(obj, "disponibiliz"),
    ),
    texto: (() => {
      const bruto = pegar(obj, "texto", "teor", "conteudo") ?? pegarFuzzy(obj, "texto");
      return typeof bruto === "string" ? texto(htmlParaTextoPlano(bruto)) : texto(bruto);
    })(),
    nomesAdvogados: nomesDeArray(advogadosRaw),
    partes: nomesDeArray(partesRaw),
  };
}

async function buscarUmAdvogado(advogado: AdvogadoFiltro, dataInicio: string, dataFim: string) {
  const itens: unknown[] = [];
  let pagina = 1;
  let totalDisponivel: number | null = null;

  while (pagina <= MAX_PAGINAS_POR_ADVOGADO && itens.length < MAX_ITENS) {
    const params = new URLSearchParams({
      itensPorPagina: String(ITENS_POR_PAGINA),
      pagina: String(pagina),
      dataDisponibilizacaoInicio: dataInicio,
      dataDisponibilizacaoFim: dataFim,
    });
    if (advogado.nome.trim()) params.set("nomeAdvogado", advogado.nome.trim());
    if (advogado.numeroOab.trim()) params.set("numeroOab", advogado.numeroOab.trim());
    if (advogado.ufOab.trim()) params.set("ufOab", advogado.ufOab.trim().toUpperCase());

    const resposta = await fetch(`${DJEN_BASE_URL}?${params.toString()}`, {
      headers: { accept: "application/json" },
    });
    if (!resposta.ok) {
      throw new Error(`DJEN recusou o pedido (${resposta.status}) pra ${advogado.nome || advogado.numeroOab}.`);
    }
    const dados = (await resposta.json()) as Record<string, unknown>;
    const paginaItens: unknown[] = Array.isArray(dados)
      ? dados
      : (["items", "data", "comunicacoes", "content"]
          .map((c) => dados[c])
          .find((v) => Array.isArray(v)) as unknown[] | undefined) ?? [];
    if (pagina === 1) {
      const t = ["count", "total", "totalRegistros", "totalElements"]
        .map((c) => dados[c])
        .find((v) => typeof v === "number") as number | undefined;
      totalDisponivel = t ?? null;
    }
    if (paginaItens.length === 0) break;
    itens.push(...paginaItens);
    if (totalDisponivel != null && itens.length >= totalDisponivel) break;
    if (paginaItens.length < ITENS_POR_PAGINA) break;
    pagina++;
  }
  return itens;
}

function mencionaTermos(campos: (string | null)[], termos: string[]): boolean {
  const alvo = ` ${normalizar(campos.filter(Boolean).join(" "))} `;
  return termos.some((t) => alvo.includes(` ${normalizar(t)} `));
}

async function hashTexto(s: string): Promise<string> {
  const bytes = new TextEncoder().encode(s);
  const buffer = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function linhaHtml(cols: string[]): string {
  return `<tr>${cols.map((c) => `<td style="padding:4px 8px;border:1px solid #ddd;font-size:13px">${c}</td>`).join("")}</tr>`;
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

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: perfil, error: erroPerfil } = await admin
      .from("profiles")
      .select("id")
      .eq("email", emailDono)
      .maybeSingle();
    if (erroPerfil) throw new Error(erroPerfil.message);
    if (!perfil) throw new Error(`Nenhum perfil encontrado com o e-mail ${emailDono}.`);

    const { data: fixados, error: erroFixados } = await admin
      .from("advogados_fixados_djen")
      .select("nome, numero_oab, uf_oab")
      .eq("user_id", perfil.id)
      .eq("contexto", "busca")
      .order("ordem");
    if (erroFixados) throw new Error(erroFixados.message);

    const advogados: AdvogadoFiltro[] = (fixados ?? [])
      .map((a) => ({ nome: a.nome ?? "", numeroOab: a.numero_oab ?? "", ufOab: a.uf_oab ?? "" }))
      .filter((a) => a.nome.trim() || (a.numeroOab.trim() && a.ufOab.trim()));

    if (advogados.length === 0) {
      return new Response(
        JSON.stringify({
          ok: true,
          aviso: "Nenhum advogado fixado (contexto 'busca') encontrado pra esse e-mail -- nada pra buscar.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const hoje = new Date();
    const inicio = new Date(hoje);
    inicio.setDate(inicio.getDate() - DIAS_PARA_TRAS);
    const dataInicio = inicio.toISOString().slice(0, 10);
    const dataFim = hoje.toISOString().slice(0, 10);

    const itensBrutos: unknown[] = [];
    for (const advogado of advogados) {
      if (itensBrutos.length >= MAX_ITENS) break;
      itensBrutos.push(...(await buscarUmAdvogado(advogado, dataInicio, dataFim)));
    }
    const comunicacoes = itensBrutos
      .map(mapearItem)
      .filter((c): c is ComunicacaoDjen => !!c && !!c.cnjDigits);

    const { data: processosData, error: erroProcessos } = await admin
      .from("processos")
      .select(
        "id, numero_cnj, cliente, numero_cliente, numero_interno, socio, responsavel, autor, reu, parte_contraria, vara, comarca, uf",
      );
    if (erroProcessos) throw new Error(erroProcessos.message);
    const processoPorCnj = new Map<string, ProcessoLinha>();
    for (const p of (processosData ?? []) as ProcessoLinha[]) {
      processoPorCnj.set(p.numero_cnj.replace(/\D/g, ""), p);
    }

    type ItemRelatorio = {
      chave: string;
      comunicacao: ComunicacaoDjen;
      processo: ProcessoLinha | null;
    };

    const relevantes: ItemRelatorio[] = [];
    for (const c of comunicacoes) {
      const processo = processoPorCnj.get(c.cnjDigits) ?? null;
      const relevante =
        !!processo ||
        mencionaTermos([c.texto, ...c.partes], ["Eliane Leve"]) ||
        mencionaTermos([c.texto, ...c.partes], NOMES_CLIENTES_CONHECIDOS);
      if (!relevante) continue;
      const chaveBase = `${c.cnjDigits}|${c.dataDisponibilizacao ?? ""}|${c.texto ?? ""}`;
      relevantes.push({ chave: await hashTexto(chaveBase), comunicacao: c, processo });
    }

    if (relevantes.length === 0) {
      return new Response(JSON.stringify({ ok: true, aviso: "Nenhuma publicação relevante no período." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: jaEnviadas, error: erroJaEnviadas } = await admin
      .from("publicacoes_relatorio_enviadas")
      .select("chave")
      .in(
        "chave",
        relevantes.map((r) => r.chave),
      );
    if (erroJaEnviadas) throw new Error(erroJaEnviadas.message);
    const chavesJaEnviadas = new Set((jaEnviadas ?? []).map((r: { chave: string }) => r.chave));
    const novos = relevantes.filter((r) => !chavesJaEnviadas.has(r.chave));

    if (novos.length === 0) {
      return new Response(JSON.stringify({ ok: true, aviso: "Nada novo (tudo já tinha sido reportado)." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const classificacoes = classificarPublicacoes(
      novos.map(
        (r): ItemParaClassificar => ({
          id: r.chave,
          texto: r.comunicacao.texto ?? "",
          dataPublicacao: r.comunicacao.dataDisponibilizacao,
        }),
      ),
    );

    const localizadas = novos.filter((r) => r.processo);
    const naoLocalizadas = novos.filter((r) => !r.processo);

    const dataBR = (iso: string | null) => (iso ? new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR") : "—");

    const linhasLocalizadas = localizadas
      .map((r) => {
        const p = r.processo!;
        const c = classificacoes.get(r.chave);
        const partes = p.parte_contraria
          ? `${p.cliente} x ${p.parte_contraria}`
          : [p.autor, p.reu].filter(Boolean).join(" x ") || "—";
        const juizo = [p.vara, [p.comarca, p.uf].filter(Boolean).join("/") || null].filter(Boolean).join(" de ") || "—";
        return linhaHtml([
          r.comunicacao.cnjTexto,
          p.numero_cliente ?? "—",
          p.numero_interno ?? "—",
          p.socio ?? "—",
          p.responsavel ?? "—",
          partes,
          juizo,
          c?.tipoAto ?? "—",
          c?.dataVencimento ? dataBR(c.dataVencimento) : c?.revisar ? "Revisar manualmente" : "—",
        ]);
      })
      .join("");

    const linhasNaoLocalizadas = naoLocalizadas
      .map((r) => {
        const c = classificacoes.get(r.chave);
        return linhaHtml([
          r.comunicacao.cnjTexto,
          r.comunicacao.partes.join(", ") || "—",
          r.comunicacao.nomesAdvogados.join(", ") || "—",
          r.comunicacao.orgao ?? "—",
          c?.tipoAto ?? "—",
        ]);
      })
      .join("");

    const secaoLocalizadas =
      localizadas.length > 0
        ? `<h3>Localizadas (${localizadas.length})</h3>
<table style="border-collapse:collapse;width:100%"><thead><tr>${[
            "Processo",
            "Cliente",
            "Caso",
            "Sócio",
            "ADVG",
            "Partes",
            "Juízo",
            "Tipo de ato",
            "Prazo",
          ]
            .map((h) => `<th style="padding:4px 8px;border:1px solid #ddd;background:#f3f3f3;font-size:13px;text-align:left">${h}</th>`)
            .join("")}</tr></thead><tbody>${linhasLocalizadas}</tbody></table>`
        : `<h3>Localizadas</h3><p>Nenhuma publicação nova casou com processo cadastrado.</p>`;

    const secaoNaoLocalizadas =
      naoLocalizadas.length > 0
        ? `<h3>Não localizadas (${naoLocalizadas.length})</h3>
<p style="color:#666;font-size:13px">Processo mencionado no DJEN mas sem cadastro correspondente no FaroLex -- conferir se precisa cadastrar.</p>
<table style="border-collapse:collapse;width:100%"><thead><tr>${["Processo", "Partes", "Advogados", "Órgão", "Tipo de ato"]
            .map((h) => `<th style="padding:4px 8px;border:1px solid #ddd;background:#f3f3f3;font-size:13px;text-align:left">${h}</th>`)
            .join("")}</tr></thead><tbody>${linhasNaoLocalizadas}</tbody></table>`
        : `<h3>Não localizadas</h3><p>Nenhuma.</p>`;

    const assunto = `Publicações do dia — ${dataBR(dataFim)}`;
    const corpoHtml = `<div style="font-family:sans-serif;color:#222">
<p>Relatório automático de publicações (DJEN), período de ${dataBR(dataInicio)} a ${dataBR(dataFim)}.</p>
${secaoLocalizadas}
${secaoNaoLocalizadas}
</div>`;

    const respostaResend = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: resendFrom,
        to: [emailDono],
        subject: assunto,
        html: corpoHtml,
      }),
    });
    if (!respostaResend.ok) {
      const detalhe = await respostaResend.text();
      throw new Error(`Resend recusou o envio (${respostaResend.status}): ${detalhe.slice(0, 300)}`);
    }

    const { error: erroInsercao } = await admin.from("publicacoes_relatorio_enviadas").insert(
      novos.map((r) => ({ chave: r.chave, cnj_digits: r.comunicacao.cnjDigits })),
    );
    if (erroInsercao) throw new Error(erroInsercao.message);

    return new Response(
      JSON.stringify({ ok: true, localizadas: localizadas.length, naoLocalizadas: naoLocalizadas.length }),
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
