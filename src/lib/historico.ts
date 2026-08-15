import { supabase } from "@/integrations/supabase/client";

export type HistoricoEntry = {
  id: string;
  processo_id: string;
  campo: string;
  valor_antigo: string | null;
  valor_novo: string | null;
  alterado_por: string | null;
  alterado_em: string;
};

export const ROTULO_CAMPO_HISTORICO: Record<string, string> = {
  responsavel: "Responsável",
  socio: "Sócio",
  coordenador: "Coordenador",
  fase: "Fase",
  criticidade: "Criticidade",
  carteira: "Carteira",
  status: "Status",
  numero_cliente: "Número do cliente",
  pronto_para_encerrar: "Pronto para encerrar",
  decisoes_no_ld: "Decisões no LD",
  valor_encerramento: "Valor de encerramento",
};

const CAMPOS_BOOLEANOS = new Set(["pronto_para_encerrar", "decisoes_no_ld"]);
const CAMPOS_MOEDA = new Set(["valor_encerramento"]);

export function formatarValorHistorico(campo: string, valor: string | null): string {
  if (valor == null) return "—";
  if (CAMPOS_BOOLEANOS.has(campo)) return valor === "true" ? "Sim" : "Não";
  if (CAMPOS_MOEDA.has(campo)) {
    const n = Number(valor);
    return Number.isFinite(n)
      ? n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
      : valor;
  }
  return valor;
}

export async function listarHistorico(processoId: string): Promise<HistoricoEntry[]> {
  const { data, error } = await supabase
    .from("processos_historico")
    .select("*")
    .eq("processo_id", processoId)
    .order("alterado_em", { ascending: false });
  if (error) throw error;
  return (data ?? []) as HistoricoEntry[];
}
