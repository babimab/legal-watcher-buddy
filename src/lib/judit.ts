import { supabase } from "@/integrations/supabase/client";

export type ResultadoConsultaJudit = {
  processados?: number;
  inseridas?: number;
  duplicadas?: number;
  erros?: { step_id: string; erro: string }[];
  status?: string;
  requestId?: string;
  numeroCnj?: string;
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
