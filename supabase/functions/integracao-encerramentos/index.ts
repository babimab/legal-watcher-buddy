// API de integração: devolve os processos marcados como "pronto para
// encerrar" (com resultado/valor/observação) num período, só das pastas
// dos grupos "Equipe Souza Cruz" e "Equipe Astro". Mesmo conjunto que
// hoje vira e-mail manual pra Eliane.
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
      return new Response(JSON.stringify({ encerramentos: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    type ProcessoEncerramento = {
      id: string;
      numero_cnj: string;
      cliente: string | null;
      numero_cliente: string | null;
      resultado_encerramento: string | null;
      valor_encerramento: number | null;
      observacao_encerramento: string | null;
      pronto_para_encerrar_em: string;
      fase: string | null;
    };

    const resultado = await buscarTudoComPaginacaoInterna<ProcessoEncerramento>({
      contarTotal: async () => {
        const { count, error } = await supabase
          .from("processos")
          .select("id", { count: "exact", head: true })
          .eq("pronto_para_encerrar", true)
          .in("pasta_id", pastaIds)
          .gte("pronto_para_encerrar_em", de)
          .lte("pronto_para_encerrar_em", ate);
        if (error) throw error;
        return count ?? 0;
      },
      buscarPagina: async (cursor, tamanho) => {
        let query = supabase
          .from("processos")
          .select(
            "id, numero_cnj, cliente, numero_cliente, resultado_encerramento, valor_encerramento, observacao_encerramento, pronto_para_encerrar_em, fase",
          )
          .eq("pronto_para_encerrar", true)
          .in("pasta_id", pastaIds)
          .gte("pronto_para_encerrar_em", de)
          .lte("pronto_para_encerrar_em", ate);
        if (cursor) query = query.or(filtroCursorPagina("pronto_para_encerrar_em", cursor));
        const { data, error } = await query
          .order("pronto_para_encerrar_em", { ascending: true })
          .order("id", { ascending: true })
          .limit(tamanho);
        if (error) throw error;
        return (data ?? []) as ProcessoEncerramento[];
      },
      valorOrdenacaoDe: (linha) => linha.pronto_para_encerrar_em,
      teto: TETO_SEGURANCA_PADRAO,
    });

    if (!resultado.ok) {
      console.error(
        "Paginação interna da integração de encerramentos não concluiu com segurança",
        resultado,
      );
      return new Response(JSON.stringify({ error: "Falha ao buscar encerramentos." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const encerramentos = resultado.linhas.map((p) => ({
      numero_cnj: p.numero_cnj,
      cliente: p.cliente,
      numero_cliente: p.numero_cliente,
      resultado: p.resultado_encerramento,
      valor: p.valor_encerramento,
      observacao: p.observacao_encerramento,
      pronto_para_encerrar_em: p.pronto_para_encerrar_em,
      fase: p.fase,
    }));

    return new Response(JSON.stringify({ encerramentos }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Falha ao buscar encerramentos.";
    return new Response(JSON.stringify({ error: mensagem }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
