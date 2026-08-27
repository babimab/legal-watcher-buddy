// Teste de integração com a API da Judit (https://docs.judit.io): consulta
// um processo por CNJ e devolve o resultado bruto pra tela, sem gravar nada
// no FaroLex ainda.
//
// Por quê só ler e não já gravar: a Judit não documenta publicamente o
// formato exato do JSON de resposta (só os tipos de resposta possíveis --
// capa, parties, attachments, step). Preferimos ver o retorno real de um
// processo de verdade antes de mapear os campos e escrever direto nas
// movimentações -- assim que soubermos o formato certo, isso vira uma
// segunda etapa chamando a mesma função registrar_movimentacao_externa que
// o webhook receber-andamento já usa.
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

function dormir(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Exige um usuário autenticado de verdade, mesmo padrão da
    // gerar-comunicacao-decisao.
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

    // 1) Cria a requisição.
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
    const requestId = criada.request_id ?? criada.id;
    if (!requestId) {
      // Não sabemos o nome exato do campo -- devolve o JSON cru pra
      // ajustarmos o mapeamento.
      return new Response(
        JSON.stringify({
          aviso: "Não encontrei o request_id na resposta de criação. Corpo bruto abaixo.",
          respostaCriacao: criada,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2) Acompanha o status até completar (ou até estourar as tentativas).
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

    if (status !== "completed") {
      return new Response(
        JSON.stringify({
          aviso: `Ainda processando depois de ${tentativas} tentativas (status: ${status}). Tenta de novo em instantes.`,
          requestId,
          numeroCnj: processo.numero_cnj,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 3) Busca o resultado.
    const respostaResultado = await fetch(
      `${JUDIT_BASE_URL}/responses?page=1&request_id=${requestId}`,
      { headers: { "api-key": apiKey } },
    );
    if (!respostaResultado.ok) {
      const detalhe = await respostaResultado.text();
      throw new Error(`A Judit recusou a busca do resultado: ${detalhe}`);
    }
    const resultado = await respostaResultado.json();

    return new Response(
      JSON.stringify({ requestId, numeroCnj: processo.numero_cnj, resultado }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Falha ao consultar a Judit.";
    return new Response(JSON.stringify({ error: mensagem }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
