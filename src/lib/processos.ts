import { supabase } from "@/integrations/supabase/client";

export type Processo = {
  id: string;
  numero_cnj: string;
  cliente: string;
  parte_contraria: string | null;
  numero_interno: string | null;
  numero_antigo: string | null;
  autor: string | null;
  reu: string | null;
  uf: string | null;
  sistema: string | null;
  carteira: string | null;
  tribunal: string | null;
  vara: string | null;
  comarca: string | null;
  classe: string | null;
  fase: string | null;
  pasta_id: string | null;
  processo_pai_id: string | null;
  tipo_desdobramento: string | null;
  status: string;
  valor_causa: number | null;
  responsavel: string | null;
  socio: string | null;
  observacoes: string | null;
  ultima_verificacao_em: string | null;
  fonte: string;
  monitorar: boolean;
  created_at: string;
  updated_at: string;
};

export type Movimentacao = {
  id: string;
  processo_id: string;
  data_movimentacao: string;
  descricao: string;
  tipo: string | null;
  exige_acao: boolean;
  prazo: string | null;
  concluida: boolean;
  observacao: string | null;
  fonte: string;
  created_at: string;
};

export const STATUS_OPCOES = ["ativo", "suspenso", "arquivado", "baixado", "encerrado"] as const;

export const UF_OPCOES = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
] as const;

// Apelidos que contam como "meus processos" no filtro de Advogado. Ajuste
// aqui se a pessoa aparecer na base sob outros nomes.
const MEUS_APELIDOS = ["bdr", "barbara"];

export function normalizarNome(valor: string) {
  return valor
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

export function ehMeuApelido(responsavel: string | null | undefined) {
  return !!responsavel && MEUS_APELIDOS.includes(normalizarNome(responsavel));
}

// Siglas dos outros advogados do escritório, pra já aparecerem no filtro
// de Advogado mesmo antes de eles terem processo cadastrado.
export const OUTROS_ADVOGADOS_CONHECIDOS = ["BBS", "MLV", "JGV", "ELV"];

// Sócios conhecidos, pra já aparecerem no filtro de Sócio mesmo antes de
// ter processo com esse sócio cadastrado.
export const SOCIOS_CONHECIDOS = ["ELV", "GFC"];

export const TIPOS_DESDOBRAMENTO = [
  "Recurso",
  "Cumprimento de sentenca",
  "Execucao",
  "Embargos",
  "Agravo",
  "Outro",
] as const;

export const TIPOS_MOVIMENTACAO = [
  "Despacho",
  "Decisão",
  "Sentença",
  "Audiência",
  "Petição",
  "Intimação",
  "Publicação",
  "Acórdão",
  "Outro",
] as const;

export async function listarProcessos(): Promise<Processo[]> {
  const { data, error } = await supabase
    .from("processos")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Processo[];
}

export async function buscarProcesso(id: string): Promise<Processo> {
  const { data, error } = await supabase.from("processos").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Processo não encontrado");
  return data as Processo;
}

export async function listarDesdobramentos(processoId: string): Promise<Processo[]> {
  const { data, error } = await supabase
    .from("processos")
    .select("*")
    .eq("processo_pai_id", processoId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Processo[];
}

export async function listarMovimentacoes(processoId: string): Promise<Movimentacao[]> {
  const { data, error } = await supabase
    .from("movimentacoes")
    .select("*")
    .eq("processo_id", processoId)
    .order("data_movimentacao", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Movimentacao[];
}

export type MovimentacaoComProcesso = Movimentacao & {
  processos: Pick<
    Processo,
    | "id"
    | "numero_cnj"
    | "cliente"
    | "tribunal"
    | "autor"
    | "reu"
    | "parte_contraria"
    | "responsavel"
  > | null;
};

export async function listarMovimentacoesDesde(
  desde: string | null,
): Promise<MovimentacaoComProcesso[]> {
  let query = supabase
    .from("movimentacoes")
    .select(
      "*, processos(id, numero_cnj, cliente, tribunal, autor, reu, parte_contraria, responsavel)",
    )
    .order("created_at", { ascending: false });
  if (desde) query = query.gt("created_at", desde);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as MovimentacaoComProcesso[];
}

export async function listarUltimasMovimentacoes(): Promise<Map<string, Movimentacao>> {
  const { data, error } = await supabase
    .from("movimentacoes")
    .select("*")
    .order("data_movimentacao", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  const ultimas = new Map<string, Movimentacao>();
  for (const m of (data ?? []) as Movimentacao[]) {
    if (!ultimas.has(m.processo_id)) ultimas.set(m.processo_id, m);
  }
  return ultimas;
}

export async function listarPendencias(): Promise<MovimentacaoComProcesso[]> {
  const { data, error } = await supabase
    .from("movimentacoes")
    .select(
      "*, processos(id, numero_cnj, cliente, tribunal, autor, reu, parte_contraria, responsavel)",
    )
    .eq("exige_acao", true)
    .eq("concluida", false)
    .order("prazo", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as unknown as MovimentacaoComProcesso[];
}

export async function ultimaVerificacao() {
  const { data, error } = await supabase
    .from("verificacoes")
    .select("*")
    .order("executado_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export function formatarCNJ(valor: string) {
  const d = valor.replace(/\D/g, "").slice(0, 20);
  if (d.length < 20) return valor;
  return `${d.slice(0, 7)}-${d.slice(7, 9)}.${d.slice(9, 13)}.${d.slice(13, 14)}.${d.slice(14, 16)}.${d.slice(16, 20)}`;
}
