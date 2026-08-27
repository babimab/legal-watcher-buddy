// Integração com a API da Judit (https://docs.judit.io): consulta um
// processo por CNJ e grava os andamentos encontrados nas movimentações do
// FaroLex como pendentes de revisão (validado = false, mesmo padrão de
// citações/publicações) -- alguém da equipe confere e dá o "ok" antes deles
// contarem como conferidos, em vez de entrarem direto como validados.
// Reaproveita a mesma função registrar_movimentacao_externa que o webhook
// receber-andamento já usa, então a deduplicação por processo+data+descrição
// é automática.
//
// Formato real da resposta da Judit (conferido numa consulta de teste):
//   { page_data: [ { response_data: { steps: [ { step_id, step_date,
//   content, lawsuit_cnj, ... }, ... ], attachments: [...], ... } }, ... ] }
// Pode vir mais de um item em page_data quando o processo tem mais de uma
// "instance" (1ª instância, 2ª instância etc.) -- juntamos os steps de
// todos.
//
// Só grava os andamentos (movimentações). Dados de capa (vara, comarca,
// fase, status etc.) não são tocados de propósito -- esses campos hoje são
// curados manualmente pela equipe, e sobrescrever com o valor bruto da
// Judit sem confirmar antes seria arriscado.
//
// Autenticação: exige um usuário logado válido (mesmo padrão da
// gerar-comunicacao-decisao) -- sem isso, qualquer chamador anônimo
// consumiria a chave paga da Judit à toa.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const JUDIT_BASE_URL = "https://requests.production.judit.io";
const TENTATIVAS_MAXIMAS = 15;
const INTERVALO_MS = 3000;

type StepJudit = {
  lawsuit_cnj?: string;
  step_id?: string;
  step_date?: string;
  content?: string;
};

function dormir(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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

    const { processoId } = await req.json();
    if (!processoId || typeof processoId !== "string") {
      throw new Error("Envie o processoId.");
    }

    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceRoleKey) {
      throw new Error("Configuração do Supabase ausente no ambiente da função.");
    }
    const supabaseServico = createClient(supabaseUrl, serviceRoleKey);

    const { data: processo, error: erroProcesso } = await supabaseServico
      .from("processos")
      .select("id, numero_cnj")
      .eq("id", processoId)
      .single();
    if (erroProcesso || !processo) {
      throw new Error("Processo não encontrado.");
    }

    const apiKey = Deno.env.get("JUDIT_API_KEY");
    if (!apiKey) {
      throw new Error("JUDIT_API_KEY não configurado nos secrets do projeto.");
    }

    const respostaCriar = await fetch(`${JUDIT_BASE_URL}/requests`, {
      method: "POST",
      headers: { "api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        search: { search_type: "lawsuit_cnj", search_key: processo.numero_cnj },
        cache_ttl_in_days: 7,
      }),
    });
    if (!respostaCriar.ok) {
      const detalhe = await respostaCriar.text();
      throw new Error(`A Judit recusou a requisição: ${detalhe}`);
    }
    const criada = await respostaCriar.json();
    const requestId = criada.request_id;
    if (!requestId) {
      return new Response(
        JSON.stringify({
          aviso: "Não encontrei o request_id na resposta de criação. Corpo bruto abaixo.",
          respostaCriacao: criada,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let status = criada.status ?? "pending";
    let tentativas = 0;
    while (status !== "completed" && tentativas < TENTATIVAS_MAXIMAS) {
      await dormir(INTERVALO_MS);
      tentativas++;
      const respostaStatus = await fetch(`${JUDIT_BASE_URL}/requests/${requestId}`, {
        headers: { "api-key": apiKey },
      });
      if (!respostaStatus.ok) break;
      const statusJson = await respostaStatus.json();
      status = statusJson.status ?? status;
    }

    const respostaResultado = await fetch(
      `${JUDIT_BASE_URL}/responses?page=1&request_id=${requestId}`,
      { headers: { "api-key": apiKey } },
    );
    if (!respostaResultado.ok) {
      const detalhe = await respostaResultado.text();
      throw new Error(`A Judit recusou a busca do resultado: ${detalhe}`);
    }
    const resultado = await respostaResultado.json();

    const pageData: Array<{ response_data?: { steps?: StepJudit[] } }> = Array.isArray(
      resultado?.page_data,
    )
      ? resultado.page_data
      : [];

    const stepsPorId = new Map<string, StepJudit>();
    for (const item of pageData) {
      for (const step of item.response_data?.steps ?? []) {
        if (step.step_id) stepsPorId.set(step.step_id, step);
      }
    }

    const resumo = {
      processados: 0,
      inseridas: 0,
      duplicadas: 0,
      erros: [] as { step_id: string; erro: string }[],
      status,
      requestId,
      numeroCnj: processo.numero_cnj,
    };

    for (const step of stepsPorId.values()) {
      if (!step.step_date || !step.content) continue;
      resumo.processados++;
      const { data, error } = await supabaseServico.rpc("registrar_movimentacao_externa", {
        _numero_cnj: step.lawsuit_cnj ?? processo.numero_cnj,
        _data_movimentacao: step.step_date.slice(0, 10),
        _descricao: step.content,
        _tipo: null,
        _observacao: null,
        _provedor: "judit",
        _id_externo: step.step_id ?? null,
        _validado: false,
      });
      if (error) {
        resumo.erros.push({ step_id: step.step_id ?? "?", erro: error.message });
        continue;
      }
      const linha = Array.isArray(data) ? data[0] : data;
      if (linha?.inserida) resumo.inseridas++;
      else resumo.duplicadas++;
    }

    return new Response(JSON.stringify(resumo), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Falha ao consultar a Judit.";
    return new Response(JSON.stringify({ error: mensagem }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
