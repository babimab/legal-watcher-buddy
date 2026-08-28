import { supabase } from "@/integrations/supabase/client";

export type ResultadoConsultaJudit = {
  processados?: number;
  inseridas?: number;
  duplicadas?: number;
  erros?: { step_id: string; erro: string }[];
  status?: string;
  requestId?: string;
  numeroCnj?: string;
  resumoIa?: string | null;
  aviso?: string;
  respostaCriacao?: unknown;
  error?: string;
};

/**
 * Chama a edge function consultar-processo-judit: consulta o processo na
 * Judit e já grava os andamentos novos nas movimentações do FaroLex
 * (deduplicado pela mesma função que o webhook receber-andamento usa).
 */
export async function consultarProcessoJudit(processoId: string): Promise<ResultadoConsultaJudit> {
  const { data, error } = await supabase.functions.invoke<ResultadoConsultaJudit>(
    "consultar-processo-judit",
    { body: { processoId } },
  );
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  if (!data) throw new Error("A Judit não retornou nada.");
  return data;
}

export type ItemMonitoramentoJudit = {
  processoId: string;
  numeroCnj: string;
  status?: string;
  requestId?: string;
  erro?: string | null;
  processados?: number;
  inseridas?: number;
  duplicadas?: number;
};

export type ResultadoMonitoramentoJudit = {
  colhidos?: ItemMonitoramentoJudit[];
  criados?: ItemMonitoramentoJudit[];
  error?: string;
};

/**
 * Chama a edge function monitorar-processos-judit: colhe resultado de
 * consultas já criadas antes e cria consulta nova pros processos marcados
 * (processos.judit_monitoramento) que já passaram uma semana sem checar.
 * É a mesma função que o agendamento automático chama, só que disparada na
 * hora pelo botão "Rodar agora" da tela de Monitoramento.
 */
export async function rodarMonitoramentoJudit(): Promise<ResultadoMonitoramentoJudit> {
  const { data, error } = await supabase.functions.invoke<ResultadoMonitoramentoJudit>(
    "monitorar-processos-judit",
    { body: {} },
  );
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  if (!data) throw new Error("A Judit não retornou nada.");
  return data;
}

/** Liga/desliga o monitoramento automático via Judit pra um processo. */
export async function alternarMonitoramentoJudit(processoId: string, ativo: boolean) {
  const { error } = await supabase
    .from("processos")
    .update({ judit_monitoramento: ativo })
    .eq("id", processoId);
  if (error) throw error;
}
