// Busca publicacoes diretamente no Diario de Justica Eletronico Nacional
// (DJEN) por nome do advogado e/ou numero da OAB -- a outra metade do
// fluxo que ja existe pra planilha do TI (ver classificar-publicacoes),
// pra achar publicacoes que a planilha nao pegou. Aceita varios
// advogados numa busca so (roda uma busca por advogado e junta tudo).
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
const MAX_PAGINAS_POR_ADVOGADO = 3;
const MAX_ITENS = 300;

type AdvogadoFiltro = {
  nome?: string;
  numeroOab?: string;
  ufOab?: string;
};

type FiltrosBusca = {
  advogados?: AdvogadoFiltro[];
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

async function buscarUmAdvogado(
  advogado: AdvogadoFiltro,
  comuns: { siglaTribunal?: string; dataInicio?: string; dataFim?: string },
  limiteRestante: number,
): Promise<unknown[]> {
  const itens: unknown[] = [];
  let pagina = 1;
  let totalDisponivel: number | null = null;

  while (pagina <= MAX_PAGINAS_POR_ADVOGADO && itens.length < limiteRestante) {
    const params = new URLSearchParams({
      itensPorPagina: String(ITENS_POR_PAGINA),
      pagina: String(pagina),
    });
    if (advogado.nome?.trim()) params.set("nomeAdvogado", advogado.nome.trim());
    if (advogado.numeroOab?.trim()) params.set("numeroOab", advogado.numeroOab.trim());
    if (advogado.ufOab?.trim()) params.set("ufOab", advogado.ufOab.trim().toUpperCase());
    if (comuns.siglaTribunal?.trim())
      params.set("siglaTribunal", comuns.siglaTribunal.trim().toUpperCase());
    if (comuns.dataInicio) params.set("dataDisponibilizacaoInicio", comuns.dataInicio);
    if (comuns.dataFim) params.set("dataDisponibilizacaoFim", comuns.dataFim);

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

  return itens;
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
    const advogados = (filtros.advogados ?? []).filter(
      (a) => a.nome?.trim() || (a.numeroOab?.trim() && a.ufOab?.trim()),
    );
    if (advogados.length === 0) {
      throw new Error("Informe pelo menos um advogado (nome, ou número da OAB com a UF).");
    }

    const itens: unknown[] = [];
    for (const advogado of advogados) {
      if (itens.length >= MAX_ITENS) break;
      const doAdvogado = await buscarUmAdvogado(advogado, filtros, MAX_ITENS - itens.length);
      itens.push(...doAdvogado);
    }

    return new Response(JSON.stringify({ itens: itens.slice(0, MAX_ITENS) }), {
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
