// API de integração: devolve os andamentos processuais cadastrados no
// FaroLex num período, só das pastas dos grupos "Equipe Souza Cruz" e
// "Equipe Astro". Pensada pra um sistema externo puxar diariamente.
//
// Autenticação: header "x-api-key" (ver ../_shared/chave-api.ts).
import { createClient } from "npm:@supabase/supabase-js@2";
import { validarChaveApi } from "../_shared/chave-api.ts";
import {
  buscarTudoComPaginacaoInterna,
  filtroCursorPagina,
  TETO_SEGURANCA_PADRAO,
} from "../_shared/paginacao.ts";

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

    // A relação movimentacao -> processo é muitos-para-um, então o PostgREST
    // devolve um objeto. O verificador de tipos do Deno declara esse embutido
    // como lista, então normalizamos pra um objeto antes de ler os campos.
    type ProcessoEmb = {
      numero_cnj: string | null;
      cliente: string | null;
      numero_cliente: string | null;
    };
    type MovimentacaoComId = {
      id: string;
      data_movimentacao: string | null;
      descricao: string | null;
      tipo: string | null;
      created_at: string;
      processos: ProcessoEmb | ProcessoEmb[] | null;
    };

    const resultado = await buscarTudoComPaginacaoInterna<MovimentacaoComId>({
      contarTotal: async () => {
        const { count, error } = await supabase
          .from("movimentacoes")
          .select("id, processos!inner(pasta_id)", { count: "exact", head: true })
          .in("processos.pasta_id", pastaIds)
          .gte("created_at", de)
          .lte("created_at", ate);
        if (error) throw error;
        return count ?? 0;
      },
      buscarPagina: async (cursor, tamanho) => {
        let query = supabase
          .from("movimentacoes")
          .select(
            "id, data_movimentacao, descricao, tipo, created_at, processos!inner(numero_cnj, cliente, numero_cliente, pasta_id)",
          )
          .in("processos.pasta_id", pastaIds)
          .gte("created_at", de)
          .lte("created_at", ate);
        if (cursor) query = query.or(filtroCursorPagina("created_at", cursor));
        const { data, error } = await query
          .order("created_at", { ascending: true })
          .order("id", { ascending: true })
          .limit(tamanho);
        if (error) throw error;
        return (data ?? []) as unknown as MovimentacaoComId[];
      },
      valorOrdenacaoDe: (linha) => linha.created_at,
      teto: TETO_SEGURANCA_PADRAO,
    });

    if (!resultado.ok) {
      console.error(
        "Paginação interna da integração de andamentos não concluiu com segurança",
        resultado,
      );
      return new Response(JSON.stringify({ error: "Falha ao buscar andamentos." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const andamentos = resultado.linhas.map((m) => {
      const embutido = m.processos as unknown as ProcessoEmb | ProcessoEmb[] | null;
      const p = Array.isArray(embutido) ? embutido[0] : embutido;
      return {
        numero_cnj: p?.numero_cnj ?? null,
        cliente: p?.cliente ?? null,
        numero_cliente: p?.numero_cliente ?? null,
        data_movimentacao: m.data_movimentacao,
        descricao: m.descricao,
        tipo: m.tipo,
        cadastrado_em: m.created_at,
      };
    });

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
