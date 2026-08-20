import { supabase } from "@/integrations/supabase/client";
import { supabaseSolto } from "@/lib/supabase-solto";
import type { Processo } from "@/lib/processos";

export type StatusBaixaCliente = "aguardando" | "bloqueado" | "pronto_nova_tentativa" | "encerrado";
export type PendenciaCom = "Juridico interno" | "Contadores" | "Outro";

export type BaixaCliente = {
  id: string;
  processo_id: string;
  status: StatusBaixaCliente;
  pendencia_com: PendenciaCom | null;
  descricao_pendencia: string | null;
  ultima_tentativa_em: string | null;
  ultima_cobranca_em: string | null;
  proxima_cobranca: string | null;
  encerrado_em: string | null;
  created_at: string;
  updated_at: string;
  processos: Pick<
    Processo,
    | "id"
    | "numero_cnj"
    | "numero_cliente"
    | "numero_interno"
    | "cliente"
    | "parte_contraria"
    | "autor"
    | "reu"
    | "responsavel"
  > | null;
};

export type HistoricoBaixaCliente = {
  id: string;
  baixa_id: string;
  tipo: string;
  resultado: string | null;
  pendencia_com: string | null;
  descricao: string | null;
  proxima_cobranca: string | null;
  created_by: string | null;
  created_at: string;
};

export async function listarBaixasCliente(): Promise<BaixaCliente[]> {
  const { data, error } = await supabaseSolto
    .from("baixas_cliente")
    .select(
      "id, processo_id, status, pendencia_com, descricao_pendencia, ultima_tentativa_em, ultima_cobranca_em, proxima_cobranca, encerrado_em, created_at, updated_at, processos(id, numero_cnj, numero_cliente, numero_interno, cliente, parte_contraria, autor, reu, responsavel)",
    )
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as BaixaCliente[];
}

export async function listarHistoricoBaixa(baixaId: string): Promise<HistoricoBaixaCliente[]> {
  const { data, error } = await supabaseSolto
    .from("baixas_cliente_historico")
    .select("id, baixa_id, tipo, resultado, pendencia_com, descricao, proxima_cobranca, created_by, created_at")
    .eq("baixa_id", baixaId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as HistoricoBaixaCliente[];
}

async function usuarioAtualId() {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function registrarTentativaBaixa(args: {
  baixaId: string;
  resultado: "concluida" | "pendencia" | "nova_tentativa";
  pendenciaCom?: PendenciaCom | null;
  descricao?: string | null;
  proximaCobranca?: string | null;
}) {
  const agora = new Date().toISOString();
  const status: StatusBaixaCliente =
    args.resultado === "concluida"
      ? "encerrado"
      : args.resultado === "pendencia"
        ? "bloqueado"
        : "pronto_nova_tentativa";

  const { error } = await supabaseSolto
    .from("baixas_cliente")
    .update({
      status,
      pendencia_com: args.resultado === "pendencia" ? (args.pendenciaCom ?? null) : null,
      descricao_pendencia: args.resultado === "pendencia" ? (args.descricao?.trim() || null) : null,
      ultima_tentativa_em: agora,
      proxima_cobranca: args.proximaCobranca || null,
      encerrado_em: args.resultado === "concluida" ? agora : null,
      updated_at: agora,
    })
    .eq("id", args.baixaId);
  if (error) throw error;

  const { error: histError } = await supabaseSolto.from("baixas_cliente_historico").insert({
    baixa_id: args.baixaId,
    tipo: "tentativa",
    resultado: args.resultado,
    pendencia_com: args.pendenciaCom ?? null,
    descricao: args.descricao?.trim() || null,
    proxima_cobranca: args.proximaCobranca || null,
    created_by: await usuarioAtualId(),
  });
  if (histError) throw histError;
}

export async function registrarCobrancaBaixa(args: {
  baixaId: string;
  descricao?: string | null;
  proximaCobranca?: string | null;
}) {
  const agora = new Date().toISOString();
  const { error } = await supabaseSolto
    .from("baixas_cliente")
    .update({
      ultima_cobranca_em: agora,
      proxima_cobranca: args.proximaCobranca || null,
      updated_at: agora,
    })
    .eq("id", args.baixaId);
  if (error) throw error;

  const { error: histError } = await supabaseSolto.from("baixas_cliente_historico").insert({
    baixa_id: args.baixaId,
    tipo: "cobranca",
    resultado: "cobranca_registrada",
    descricao: args.descricao?.trim() || null,
    proxima_cobranca: args.proximaCobranca || null,
    created_by: await usuarioAtualId(),
  });
  if (histError) throw histError;
}
