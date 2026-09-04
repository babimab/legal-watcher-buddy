// Busca publicacoes diretamente no Diario de Justica Eletronico Nacional
// (DJEN) por nome do advogado e/ou numero da OAB -- a outra metade do
// fluxo que ja existe pra planilha do TI (ver classificar-publicacoes),
// pra achar publicacoes que a planilha nao pegou.
//
// A API do DJEN (comunicaapi.pje.jus.br) e publica e nao exige
// autenticacao propria, mas o fetch e feito aqui no servidor (nao no
// navegador) por dois motivos: evitar bloqueio de CORS de um dominio do
// PJe que nao foi desenhado pra ser chamado direto de um front-end
// alheio, e evitar que qualquer visitante anonimo use o FaroLex como
// proxy gratuito pra bater na API do governo.
//
// Autenticacao do FaroLex: mesmo padrao de classificar-publicacoes /
// gerar-comunicacao-decisao (exige usuario logado via Supabase Auth).
//
// Importante: nao foi possivel validar o formato exato da resposta do
// DJEN a partir deste ambiente (sem acesso de rede externo). Os nomes de
// parametro/campo abaixo sao os documentados publicamente pro DJEN, mas
// se vierem diferentes na pratica, o ajuste fica isolado no mapeamento
// client-side (src/lib/djen.ts) -- aqui a funcao so repassa os itens
// praticamente crus.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DJEN_BASE_URL = "https://comunicaapi.pje.jus.br/api/v1/comunicacao";
const ITENS_POR_PAGINA = 100;
const MAX_PAGINAS = 3;
const MAX_ITENS = 300;

type FiltrosBusca = {
  nomeAdvogado?: string;
  numeroOab?: string;
  ufOab?: string;
  siglaTribunal?: string;
  dataInicio?: string;
  dataFim?: string;
};

function extrairItens(dados: unknown): unknown[] {
  if (Array.isArray(dados)) return dados;
  if (dados && typeof dados === "object") {
    const obj = dados as Record<string, unknown>;
    for (const chave of ["items", "data", "comunicacoes", "content"]) {
      if (Array.isArray(obj[chave])) return obj[chave] as unknown[];
    }
  }
  return [];
}

function extrairTotal(dados: unknown): number | null {
  if (!dados || typeof dados !== "object") return null;
  const obj = dados as Record<string, unknown>;
  for (const chave of ["count", "total", "totalRegistros", "totalElements"]) {
    const v = obj[chave];
    if (typeof v === "number") return v;
  }
  return null;
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

    const filtros = (await req.json()) as FiltrosBusca;
    const temAdvogado = !!filtros.nomeAdvogado?.trim();
    const temOab = !!filtros.numeroOab?.trim() && !!filtros.ufOab?.trim();
    if (!temAdvogado && !temOab) {
      throw new Error("Informe o nome do advogado ou o número da OAB com a UF.");
    }

    const itens: unknown[] = [];
    let pagina = 1;
    let totalDisponivel: number | null = null;

    while (pagina <= MAX_PAGINAS && itens.length < MAX_ITENS) {
      const params = new URLSearchParams({
        itensPorPagina: String(ITENS_POR_PAGINA),
        pagina: String(pagina),
      });
      if (filtros.nomeAdvogado?.trim()) params.set("nomeAdvogado", filtros.nomeAdvogado.trim());
      if (filtros.numeroOab?.trim()) params.set("numeroOab", filtros.numeroOab.trim());
      if (filtros.ufOab?.trim()) params.set("ufOab", filtros.ufOab.trim().toUpperCase());
      if (filtros.siglaTribunal?.trim())
        params.set("siglaTribunal", filtros.siglaTribunal.trim().toUpperCase());
      if (filtros.dataInicio) params.set("dataDisponibilizacaoInicio", filtros.dataInicio);
      if (filtros.dataFim) params.set("dataDisponibilizacaoFim", filtros.dataFim);

      const resposta = await fetch(`${DJEN_BASE_URL}?${params.toString()}`, {
        headers: { accept: "application/json" },
      });
      if (!resposta.ok) {
        const detalhe = await resposta.text();
        throw new Error(
          `A API do DJEN recusou o pedido (${resposta.status}): ${detalhe.slice(0, 300)}`,
        );
      }
      const dados = await resposta.json();
      const paginaItens = extrairItens(dados);
      if (pagina === 1) totalDisponivel = extrairTotal(dados);
      if (paginaItens.length === 0) break;

      itens.push(...paginaItens);
      if (totalDisponivel != null && itens.length >= totalDisponivel) break;
      if (paginaItens.length < ITENS_POR_PAGINA) break;
      pagina++;
    }

    return new Response(JSON.stringify({ itens: itens.slice(0, MAX_ITENS), totalDisponivel }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Falha ao buscar no DJEN.";
    return new Response(JSON.stringify({ error: mensagem }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
