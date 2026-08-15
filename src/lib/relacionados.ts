import { supabase } from "@/integrations/supabase/client";
import { type Processo } from "@/lib/processos";

export type ProcessoRelacionado = {
  id: string;
  observacao: string | null;
  created_at: string;
  processo: Pick<
    Processo,
    "id" | "numero_cnj" | "cliente" | "parte_contraria" | "autor" | "reu" | "fase" | "status"
  >;
};

const CAMPOS_PROCESSO_RELACIONADO =
  "id, numero_cnj, cliente, parte_contraria, autor, reu, fase, status";

export async function listarRelacionados(processoId: string): Promise<ProcessoRelacionado[]> {
  const { data, error } = await supabase
    .from("processos_relacionados")
    .select(`id, observacao, created_at, processo:relacionado_id(${CAMPOS_PROCESSO_RELACIONADO})`)
    .eq("processo_id", processoId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as ProcessoRelacionado[];
}

export async function vincularRelacionado(
  processoId: string,
  relacionadoId: string,
  observacao: string | null,
): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const criador = userData.user?.id;
  if (!criador) throw new Error("Sessão expirada. Entre novamente para vincular.");

  const { error } = await supabase.from("processos_relacionados").insert([
    { processo_id: processoId, relacionado_id: relacionadoId, observacao, created_by: criador },
    { processo_id: relacionadoId, relacionado_id: processoId, observacao, created_by: criador },
  ]);
  if (error) throw error;
}

export async function desvincularRelacionado(
  processoId: string,
  relacionadoId: string,
): Promise<void> {
  const { error } = await supabase
    .from("processos_relacionados")
    .delete()
    .or(
      `and(processo_id.eq.${processoId},relacionado_id.eq.${relacionadoId}),and(processo_id.eq.${relacionadoId},relacionado_id.eq.${processoId})`,
    );
  if (error) throw error;
}
