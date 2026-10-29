import { supabase } from "@/integrations/supabase/client";
import { supabaseSolto } from "@/lib/supabase-solto";
import { criarMovimentacao, siglaOuEmailAtual, type Processo } from "@/lib/processos";

// Quantos dias sem ligação já contam como atrasado -- checagem é semanal,
// por isso 7 dias corridos (não úteis: telefonema não depende de prazo
// processual).
export const DIAS_PARA_ATRASO = 7;

// Check-in semanal de ligação nos processos administrativos (não têm
// andamento pelo sistema do tribunal, precisam ser checados por
// telefone). Cada linha é uma ligação -- histórico completo por
// processo, não só o último status.
export type AcompanhamentoAdministrativo = {
  id: string;
  processo_id: string;
  data_ligacao: string;
  estagiario: string | null;
  o_que_fez: string | null;
  proximo_passo: string | null;
  created_by: string | null;
  created_at: string;
};

export async function listarAcompanhamentos(
  processoId: string,
): Promise<AcompanhamentoAdministrativo[]> {
  const { data, error } = await supabaseSolto
    .from("acompanhamentos_administrativos")
    .select("*")
    .eq("processo_id", processoId)
    .order("data_ligacao", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AcompanhamentoAdministrativo[];
}

// Último check-in de cada processo administrativo -- usado pro painel
// "Administrativos" saber quem está em dia e quem está atrasado, sem
// precisar buscar o histórico inteiro de cada um.
export async function listarUltimosAcompanhamentos(): Promise<
  Map<string, AcompanhamentoAdministrativo>
> {
  const { data, error } = await supabaseSolto
    .from("acompanhamentos_administrativos")
    .select("*")
    .order("data_ligacao", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  const mapa = new Map<string, AcompanhamentoAdministrativo>();
  for (const a of (data ?? []) as AcompanhamentoAdministrativo[]) {
    if (!mapa.has(a.processo_id)) mapa.set(a.processo_id, a);
  }
  return mapa;
}

export type ItemPainelAdministrativo = {
  // administrativo_pausado* ainda não estão nos tipos gerados do Supabase
  // (coluna nova) -- por isso ficam à parte do Pick<Processo, ...>, cujo
  // uso em outros lugares (select "*" tipado) quebraria se Processo
  // ganhasse esses campos antes dos tipos serem regerados.
  processo: Pick<
    Processo,
    | "id"
    | "numero_cnj"
    | "numero_cliente"
    | "cliente"
    | "autor"
    | "reu"
    | "responsavel"
    | "estagiario"
  > & {
    administrativo_pausado: boolean;
    administrativo_pausado_motivo: string | null;
    administrativo_pausado_por: string | null;
    administrativo_pausado_em: string | null;
  };
  ultimoCheckIn: AcompanhamentoAdministrativo | null;
  diasSemCheckIn: number | null;
  atrasado: boolean;
};

// Junta os processos da carteira "Administrativos" (ativos) com o último
// check-in de cada um, pro painel que a BDR pediu pra saber quem as
// estagiárias já ligaram essa semana e quem ficou pra trás. Processo
// pausado (ver pausarLigacaoAdministrativa) nunca conta como atrasado --
// é intencional não estar ligando, não esquecimento.
export async function listarPainelAdministrativos(): Promise<ItemPainelAdministrativo[]> {
  const [{ data: processos, error }, ultimos] = await Promise.all([
    supabaseSolto
      .from("processos")
      .select(
        "id, numero_cnj, numero_cliente, cliente, autor, reu, responsavel, estagiario, administrativo_pausado, administrativo_pausado_motivo, administrativo_pausado_por, administrativo_pausado_em",
      )
      .eq("carteira", "Administrativos")
      .eq("status", "ativo")
      .order("numero_cnj", { ascending: true }),
    listarUltimosAcompanhamentos(),
  ]);
  if (error) throw error;

  const hoje = new Date();
  return ((processos ?? []) as ItemPainelAdministrativo["processo"][]).map((processo) => {
    const ultimoCheckIn = ultimos.get(processo.id) ?? null;
    const diasSemCheckIn = ultimoCheckIn
      ? Math.floor(
          (hoje.getTime() - new Date(`${ultimoCheckIn.data_ligacao}T12:00:00`).getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : null;
    const atrasado =
      !processo.administrativo_pausado &&
      (!ultimoCheckIn || (diasSemCheckIn ?? 0) >= DIAS_PARA_ATRASO);
    return { processo, ultimoCheckIn, diasSemCheckIn, atrasado };
  });
}

export async function pausarLigacaoAdministrativa(
  processoId: string,
  motivo: string,
): Promise<void> {
  const { error } = await supabaseSolto
    .from("processos")
    .update({
      administrativo_pausado: true,
      administrativo_pausado_motivo: motivo,
      administrativo_pausado_por: await siglaOuEmailAtual(),
      administrativo_pausado_em: new Date().toISOString(),
    })
    .eq("id", processoId);
  if (error) throw error;
}

export async function retomarLigacaoAdministrativa(processoId: string): Promise<void> {
  const { error } = await supabaseSolto
    .from("processos")
    .update({ administrativo_pausado: false })
    .eq("id", processoId);
  if (error) throw error;
}

// Texto do andamento gerado automaticamente a partir de um acompanhamento
// administrativo -- mesma informação do check-in, só reformatada pra
// aparecer na pasta do processo junto com os outros andamentos.
function descricaoAndamentoDoAcompanhamento(input: {
  estagiario: string | null;
  oQueFez: string | null;
  proximoPasso: string | null;
}): string {
  const quem = input.estagiario ? ` (${input.estagiario})` : "";
  const partes = [`Acompanhamento administrativo${quem}: ${input.oQueFez ?? "—"}.`];
  if (input.proximoPasso) partes.push(`Próximo passo: ${input.proximoPasso}.`);
  return partes.join(" ");
}

export async function criarAcompanhamento(input: {
  processoId: string;
  dataLigacao: string;
  estagiario: string | null;
  oQueFez: string | null;
  proximoPasso: string | null;
}): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Sessão expirada.");
  const { error } = await supabaseSolto.from("acompanhamentos_administrativos").insert({
    processo_id: input.processoId,
    data_ligacao: input.dataLigacao,
    estagiario: input.estagiario,
    o_que_fez: input.oQueFez,
    proximo_passo: input.proximoPasso,
    created_by: auth.user.id,
  });
  if (error) throw error;

  // Também registra como andamento na pasta do processo, pra ficar
  // visível junto com o resto do histórico (pedido da BDR).
  await criarMovimentacao({
    processoId: input.processoId,
    dataMovimentacao: input.dataLigacao,
    descricao: descricaoAndamentoDoAcompanhamento(input),
    tipo: "Acompanhamento",
  });
}

export async function excluirAcompanhamento(id: string): Promise<void> {
  const { error } = await supabaseSolto
    .from("acompanhamentos_administrativos")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
