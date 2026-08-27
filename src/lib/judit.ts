import { supabase } from "@/integrations/supabase/client";

export type ResultadoConsultaJudit = {
  requestId?: string;
  numeroCnj?: string;
  resultado?: unknown;
  aviso?: string;
  error?: string;
};

/**
 * Chama a edge function consultar-processo-judit -- teste da integração com
 * a API da Judit, só leitura (não grava nada no FaroLex ainda). Retorna o
 * JSON bruto que a Judit devolveu, pra a gente ver o formato real antes de
 * mapear os campos.
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
