// API de integração: devolve os andamentos processuais cadastrados no
// FaroLex num período, só das pastas dos grupos "Equipe Souza Cruz" e
// "Equipe Astro". Pensada pra um sistema externo puxar diariamente.
//
// Autenticação: header "x-api-key" (ver ../_shared/chave-api.ts).
import { createClient } from "npm:@supabase/supabase-js@2";
import { validarChaveApi } from "../_shared/chave-api.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

const GRUPOS_PERMITIDOS = ["Equipe Souza Cruz", "Equipe Astro"];

function intervaloDoPedido(url: URL): { de: string; ate: string } {
  const data = url.searchParams.get("data");
  const desde = url.searchParams.get("desde");
  const ate = url.searchParams.get("ate");

  if (data) {
    return { de: `${data}T00:00:00.000Z`, ate: `${data}T23:59:59.999Z` };
  }
  if (desde || ate) {
    return {
      de: desde ? `${desde}T00:00:00.000Z` : "1970-01-01T00:00:00.000Z",
      ate: ate ? `${ate}T23:59:59.999Z` : new Date().toISOString(),
    };
  }
  const hoje = new Date().toISOString().slice(0, 10);
  return { de: `${hoje}T00:00:00.000Z`, ate: `${hoje}T23:59:59.999Z` };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Configuração do Supabase ausente no ambiente da função.");
    }
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    if (!(await validarChaveApi(req, supabase))) {
      return new Response(JSON.stringify({ error: "Não autorizado." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const { de, ate } = intervaloDoPedido(url);

    const { data: grupos, error: erroGrupos } = await supabase
      .from("grupos")
      .select("id")
      .in("nome", GRUPOS_PERMITIDOS);
    if (erroGrupos) throw erroGrupos;
    const grupoIds = (grupos ?? []).map((g) => g.id);

    const { data: pastas, error: erroPastas } = await supabase
      .from("pastas")
      .select("id")
      .in("grupo_id", grupoIds);
    if (erroPastas) throw erroPastas;
    const pastaIds = (pastas ?? []).map((p) => p.id);

    if (pastaIds.length === 0) {
      return new Response(JSON.stringify({ andamentos: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: movs, error: erroMovs } = await supabase
      .from("movimentacoes")
      .select(
        "data_movimentacao, descricao, tipo, created_at, processos!inner(numero_cnj, cliente, numero_cliente, pasta_id)",
      )
      .in("processos.pasta_id", pastaIds)
      .gte("created_at", de)
      .lte("created_at", ate)
      .order("created_at", { ascending: true });
    if (erroMovs) throw erroMovs;

    const andamentos = (movs ?? []).map((m) => ({
      numero_cnj: m.processos?.numero_cnj ?? null,
      cliente: m.processos?.cliente ?? null,
      numero_cliente: m.processos?.numero_cliente ?? null,
      data_movimentacao: m.data_movimentacao,
      descricao: m.descricao,
      tipo: m.tipo,
      cadastrado_em: m.created_at,
    }));

    return new Response(JSON.stringify({ andamentos }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Falha ao buscar andamentos.";
    return new Response(JSON.stringify({ error: mensagem }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
