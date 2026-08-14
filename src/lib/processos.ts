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
  status: string;
  valor_causa: number | null;
  responsavel: string | null;
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
  fonte: string;
  created_at: string;
};

export const STATUS_OPCOES = [
  "ativo",
  "suspenso",
  "arquivado",
  "baixado",
  "encerrado",
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
  const { data, error } = await supabase
    .from("processos")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Processo não encontrado");
  return data as Processo;
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
  processos: Pick<Processo, "id" | "numero_cnj" | "cliente" | "tribunal"> | null;
};

export async function listarMovimentacoesDesde(
  desde: string | null,
): Promise<MovimentacaoComProcesso[]> {
  let query = supabase
    .from("movimentacoes")
    .select("*, processos(id, numero_cnj, cliente, tribunal)")
    .order("created_at", { ascending: false });
  if (desde) query = query.gt("created_at", desde);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as MovimentacaoComProcesso[];
}

export async function listarPendencias(): Promise<MovimentacaoComProcesso[]> {
  const { data, error } = await supabase
    .from("movimentacoes")
    .select("*, processos(id, numero_cnj, cliente, tribunal)")
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
