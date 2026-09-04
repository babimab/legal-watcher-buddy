// Le o teor de publicacoes judiciais (aba Publicacoes) e classifica cada
// uma via IA: tipo de ato, qual data usar como base pra contar o prazo,
// quantos dias uteis se aplicam, e um resumo juridico curto -- espelha
// as regras 2, 5 e 8 do projeto de publicacoes que a BDR ja usa no
// Claude. A conta de dias uteis em si (pular fim de semana/feriado) e
// feita no cliente (src/lib/dias-uteis.ts), nunca aqui -- a IA so decide
// a REGRA (quantos dias uteis, a partir de qual data), nao faz
// aritmetica de calendario.
//
// Autenticacao: mesmo padrao de gerar-comunicacao-decisao (exige usuario
// logado, senao qualquer chamador anonimo consumiria a API paga).
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TAMANHO_MAX_LOTE = 25;

const SYSTEM_PROMPT = `Você é um assistente jurídico especializado em análise de publicações judiciais de um escritório que representa a Souza Cruz Ltda. e a Merck, entre outros clientes.

Você vai receber uma lista de publicações (cada uma com um "id" e o "texto" do andamento/teor tal como veio do Diário da Justiça). Para CADA uma, devolva um objeto JSON com estes campos, sem exceção:

- "id": o mesmo id recebido.
- "tipoAto": classificação curta (ex.: "Sentença", "Despacho", "Decisão Interlocutória", "Acórdão", "Intimação", "Citação", "Embargos de Declaração", "Contrarrazões", "Outro").
- "tipoDataEncontrada": "disponibilizacao" (só há data de disponibilização no DJe), "publicacao_intimacao" (há data explícita de publicação ou intimação) ou "nao_identificada" (não dá pra saber com segurança).
- "dataEncontrada": a data no formato AAAA-MM-DD correspondente ao tipo acima, ou null se não identificada. NUNCA use data de geração do arquivo, nome da planilha ou data de recebimento — só a data que consta na PRÓPRIA publicação.
- "ehJEC": true se o processo tramita em Juizado Especial Cível (JEC/Juizado Especial), false caso contrário.
- "diasUteisSugeridos": número de dias úteis do prazo aplicável, seguindo OBRIGATORIAMENTE estas regras, nesta ordem de prioridade:
  1. Se o texto MENCIONAR EXPLICITAMENTE um prazo em dias (ex.: "no prazo de 10 dias", "intimada para manifestar em 5 dias"), use esse número.
  2. Se for contrarrazões (recurso), 15.
  3. Se ehJEC for true, 10.
  4. Se for manifestação determinada em despacho sem prazo explícito no texto, 5.
  5. Se não for possível determinar com segurança que HÁ prazo/providência a cumprir (ex.: é só uma comunicação informativa do PJe/eproc, sem prazo intimatório), use null.
- "regraAplicada": frase curta explicando a regra usada (ex.: "Contrarrazões — 15 dias úteis", "JEC — 10 dias úteis", "Conforme texto — 7 dias úteis", "Padrão — 5 dias úteis", "Sem prazo intimatório").
- "revisar": true se você NÃO tem confiança suficiente na data encontrada OU no número de dias úteis (nesse caso o valor de diasUteisSugeridos pode ficar null mesmo assim). Quando revisar=true, isso vai aparecer pra um humano conferir manualmente no sistema do tribunal — prefira marcar revisar=true a arriscar um prazo errado.
- "resumo": um resumo jurídico curto (máx. 4-5 frases) contendo: natureza do ato, conteúdo relevante, providência determinada (se houver), se há prazo, a data usada para a contagem, e o fundamento usado para calcular o prazo. NUNCA copie o texto do Diário literalmente — sempre resuma. Quando só havia disponibilização no DJe, mencione que foi considerada publicada no primeiro dia útil seguinte. Quando for só uma movimentação informativa (PJe/eproc) sem prazo, diga isso expressamente.
- "relevanteGeral": SÓ preencha esse campo (true ou false) quando o texto vier marcado com "[ABA: NAO_LOCALIZADA_GERAL]" no início — nesse caso, retorne true apenas se TODAS as condições forem verdadeiras: (a) Souza Cruz ou Merck aparecem como PARTE efetiva do processo (não só citadas de passagem, nem como nome de advogado/magistrado/órgão/precedente/jurisprudência); (b) a advogada responsável mencionada é "Eliane Leve"; (c) o ato representa andamento processual relevante (despacho, decisão, sentença, acórdão, intimação, pauta, redistribuição, cumprimento de sentença, penhora, bloqueio, remessa, extinção, honorários, determinação de manifestação, ou qualquer providência que exija atuação do escritório) — NÃO liste lista genérica, movimentação administrativa, processo criminal sem relação com os clientes, ou publicação sem teor. Se o texto não vier marcado com esse prefixo, deixe "relevanteGeral" como null.

Nunca invente informação. Nunca presuma prazo sem fundamento textual. Responda SOMENTE com um array JSON válido (sem markdown, sem texto antes ou depois), na mesma ordem dos itens recebidos.`;

type ItemEntrada = { id: string; texto: string; aba?: string };

type ItemSaida = {
  id: string;
  tipoAto: string;
  tipoDataEncontrada: "disponibilizacao" | "publicacao_intimacao" | "nao_identificada";
  dataEncontrada: string | null;
  ehJEC: boolean;
  diasUteisSugeridos: number | null;
  regraAplicada: string;
  revisar: boolean;
  resumo: string;
  relevanteGeral: boolean | null;
};

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

    const { itens } = (await req.json()) as { itens?: ItemEntrada[] };
    if (!Array.isArray(itens) || itens.length === 0) {
      throw new Error("Envie a lista de publicações (itens).");
    }
    if (itens.length > TAMANHO_MAX_LOTE) {
      throw new Error(`Máximo de ${TAMANHO_MAX_LOTE} publicações por chamada.`);
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY não configurado nos secrets do projeto.");
    }
    const modelo = Deno.env.get("ANTHROPIC_MODEL") || "claude-sonnet-5";

    const listaTexto = itens
      .map((item) => {
        const prefixo = item.aba === "nao_localizada_geral" ? "[ABA: NAO_LOCALIZADA_GERAL] " : "";
        return `--- id: ${item.id} ---\n${prefixo}${item.texto}`;
      })
      .join("\n\n");

    const resposta = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: modelo,
        max_tokens: 8192,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Classifique estas publicações:\n\n${listaTexto}`,
          },
        ],
      }),
    });

    if (!resposta.ok) {
      const detalhe = await resposta.text();
      throw new Error(`A API da Anthropic recusou o pedido: ${detalhe}`);
    }

    const dados = await resposta.json();
    const textoResposta = (dados.content ?? [])
      .filter((bloco: { type: string }) => bloco.type === "text")
      .map((bloco: { text: string }) => bloco.text)
      .join("\n")
      .trim();

    if (!textoResposta) throw new Error("A IA não retornou nenhum texto.");

    const jsonBruto = textoResposta.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
    let classificacoes: ItemSaida[];
    try {
      classificacoes = JSON.parse(jsonBruto);
    } catch {
      throw new Error("A IA não devolveu um JSON válido.");
    }

    return new Response(JSON.stringify({ classificacoes }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Falha ao classificar publicações.";
    return new Response(JSON.stringify({ error: mensagem }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
