// Código compartilhado entre as duas edge functions que falam com a API da
// Judit (https://docs.judit.io): consultar-processo-judit (consulta manual,
// um processo por vez, clique da tela) e monitorar-processos-judit (roda
// sozinha, periodicamente, pros processos marcados na tela de
// Monitoramento). As duas gravam andamentos do mesmo jeito, então esse
// arquivo concentra a parte que fala com a Judit e a que grava no FaroLex.

export const JUDIT_BASE_URL = "https://requests.production.judit.io";

export type StepJudit = {
  lawsuit_cnj?: string;
  step_id?: string;
  step_date?: string;
  content?: string;
};

export type PageItem = {
  response_type?: string;
  response_data?: unknown;
};

// A Judit não documenta um formato único pro resumo de IA (judit_ia:
// ["summary"]), então procura em alguns formatos plausíveis em vez de
// travar se não encontrar nada.
export function extrairResumoIA(resultado: unknown, pageData: PageItem[]): string | null {
  const bruto = resultado as { summary?: unknown } | null;
  if (typeof bruto?.summary === "string" && bruto.summary.trim()) {
    return bruto.summary.trim();
  }
  for (const item of pageData) {
    const dados = item.response_data;
    const ehResumo = (item.response_type ?? "").toLowerCase().includes("summary");
    if (typeof dados === "string" && ehResumo && dados.trim()) {
      return dados.trim();
    }
    if (dados && typeof dados === "object") {
      const obj = dados as Record<string, unknown>;
      if (typeof obj.summary === "string" && obj.summary.trim()) return obj.summary.trim();
      if (ehResumo) {
        if (typeof obj.text === "string" && obj.text.trim()) return obj.text.trim();
        if (typeof obj.content === "string" && obj.content.trim()) return obj.content.trim();
      }
    }
  }
  return null;
}

// Pode vir mais de um item em page_data quando o processo tem mais de uma
// "instance" (1ª instância, 2ª instância etc.) -- junta os steps de todos,
// deduplicados por step_id.
export function extrairSteps(pageData: PageItem[]): Map<string, StepJudit> {
  const stepsPorId = new Map<string, StepJudit>();
  for (const item of pageData) {
    const dados = item.response_data as { steps?: StepJudit[] } | undefined;
    for (const step of dados?.steps ?? []) {
      if (step.step_id) stepsPorId.set(step.step_id, step);
    }
  }
  return stepsPorId;
}

// Cria a consulta na Judit e volta na hora (não espera terminar) -- quem
// chamar decide se vai esperar (consulta manual, um processo) ou só
// guardar o request_id pra colher depois (monitoramento em lote).
export async function criarConsultaJudit(
  apiKey: string,
  numeroCnj: string,
): Promise<{ requestId: string | null; status: string; bruto: unknown }> {
  const resposta = await fetch(`${JUDIT_BASE_URL}/requests`, {
    method: "POST",
    headers: { "api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      search: { search_type: "lawsuit_cnj", search_key: numeroCnj },
      cache_ttl_in_days: 7,
      judit_ia: ["summary"],
    }),
  });
  if (!resposta.ok) {
    const detalhe = await resposta.text();
    throw new Error(`A Judit recusou a requisição: ${detalhe}`);
  }
  const criada = await resposta.json();
  return {
    requestId: typeof criada.request_id === "string" ? criada.request_id : null,
    status: criada.status ?? "pending",
    bruto: criada,
  };
}

export async function consultarStatusJudit(apiKey: string, requestId: string): Promise<string> {
  const resposta = await fetch(`${JUDIT_BASE_URL}/requests/${requestId}`, {
    headers: { "api-key": apiKey },
  });
  if (!resposta.ok) return "desconhecido";
  const json = await resposta.json();
  return json.status ?? "desconhecido";
}

export async function buscarResultadoJudit(
  apiKey: string,
  requestId: string,
): Promise<{ pageData: PageItem[]; resumoIa: string | null; bruto: unknown }> {
  const resposta = await fetch(`${JUDIT_BASE_URL}/responses?page=1&request_id=${requestId}`, {
    headers: { "api-key": apiKey },
  });
  if (!resposta.ok) {
    const detalhe = await resposta.text();
    throw new Error(`A Judit recusou a busca do resultado: ${detalhe}`);
  }
  const resultado = await resposta.json();
  const pageData: PageItem[] = Array.isArray(resultado?.page_data) ? resultado.page_data : [];
  return { pageData, resumoIa: extrairResumoIA(resultado, pageData), bruto: resultado };
}

export type ResumoGravacao = {
  processados: number;
  inseridas: number;
  duplicadas: number;
  erros: { step_id: string; erro: string }[];
};

// Grava os andamentos (movimentações) via a mesma RPC que o webhook
// receber-andamento já usa -- deduplicado por processo+data+descrição, e
// sempre como pendente de revisão (validado = false, mesmo padrão de
// citações/publicações). Dados de capa (vara, fase etc.) não são tocados
// de propósito, só andamentos.
type ClienteComRpc = {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

export async function gravarAndamentos(
  supabaseServico: ClienteComRpc,
  processo: { numero_cnj: string },
  pageData: PageItem[],
): Promise<ResumoGravacao> {
  const stepsPorId = extrairSteps(pageData);
  const resultado: ResumoGravacao = { processados: 0, inseridas: 0, duplicadas: 0, erros: [] };
  for (const step of stepsPorId.values()) {
    if (!step.step_date || !step.content) continue;
    resultado.processados++;
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
      resultado.erros.push({ step_id: step.step_id ?? "?", erro: error.message });
      continue;
    }
    const linha = Array.isArray(data) ? data[0] : data;
    if (linha?.inserida) resultado.inseridas++;
    else resultado.duplicadas++;
  }
  return resultado;
}
