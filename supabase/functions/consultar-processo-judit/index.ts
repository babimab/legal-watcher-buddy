// Integração com a API da Judit (https://docs.judit.io): consulta um
// processo por CNJ e grava os andamentos encontrados nas movimentações do
// FaroLex como pendentes de revisão (validado = false, mesmo padrão de
// citações/publicações) -- alguém da equipe confere e dá o "ok" antes deles
// contarem como conferidos, em vez de entrarem direto como validados.
//
// Também pede um resumo em linguagem natural do processo via
// judit_ia: ["summary"] (recurso de IA da própria Judit) -- não baixa peças,
// só o texto resumido que a Judit devolve junto do resultado. Isso não é
// gravado em lugar nenhum, só retornado pra tela mostrar.
//
// Essa função é a consulta manual (clique "Judit" na tela do processo) --
// espera o resultado ficar pronto (até ~45s) e devolve na hora. A consulta
// automática em lote (tela de Monitoramento) é a função
// monitorar-processos-judit, que não espera -- as duas reaproveitam o
// mesmo código de _shared/judit.ts.
//
// Autenticação: exige um usuário logado válido (mesmo padrão da
// gerar-comunicacao-decisao) -- sem isso, qualquer chamador anônimo
// consumiria a chave paga da Judit à toa.
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  buscarResultadoJudit,
  consultarStatusJudit,
  criarConsultaJudit,
  gravarAndamentos,
} from "../_shared/judit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const criada = await criarConsultaJudit(apiKey, processo.numero_cnj);
    const requestId = criada.requestId;
    if (!requestId) {
      return new Response(
        JSON.stringify({
          aviso: "Não encontrei o request_id na resposta de criação. Corpo bruto abaixo.",
          respostaCriacao: criada.bruto,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let status = criada.status;
    let tentativas = 0;
    while (status !== "completed" && tentativas < TENTATIVAS_MAXIMAS) {
      await dormir(INTERVALO_MS);
      tentativas++;
      status = await consultarStatusJudit(apiKey, requestId);
    }

    const { pageData, resumoIa } = await buscarResultadoJudit(apiKey, requestId);
    const gravado = await gravarAndamentos(supabaseServico, processo, pageData);

    const resumo = {
      ...gravado,
      status,
      requestId,
      numeroCnj: processo.numero_cnj,
      resumoIa,
    };

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
