import { supabase } from "@/integrations/supabase/client";

// Lista de processos "em acompanhamento" pela planilha de citações — fica
// persistida (não some depois do import) pra dar pra conferir de novo
// durante a semana. Não usa processos.pasta_id de propósito: o processo
// continua na pasta normal do advogado dele ao mesmo tempo.
export type AcompanhamentoCitacao = {
  id: string;
  processo_id: string;
  origem: string | null;
  ultimo_andamento: string | null;
  ultimo_andamento_em: string | null;
  conferido: boolean;
  conferido_por: string | null;
  conferido_em: string | null;
  created_at: string;
};

export async function listarAcompanhamentoCitacoes(): Promise<AcompanhamentoCitacao[]> {
  const { data, error } = await supabase
    .from("processo_citacoes")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AcompanhamentoCitacao[];
}

export async function acompanharCitacao(entrada: {
  processo_id: string;
  origem: string | null;
  ultimo_andamento: string | null;
  ultimo_andamento_em: string | null;
  created_by: string;
}): Promise<void> {
  const { error } = await supabase.from("processo_citacoes").upsert(
    {
      ...entrada,
      conferido: false,
      conferido_por: null,
      conferido_em: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "processo_id" },
  );
  if (error) throw error;
}

export async function marcarConferido(id: string, quem: string | null): Promise<void> {
  const { error } = await supabase
    .from("processo_citacoes")
    .update({ conferido: true, conferido_por: quem, conferido_em: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function removerAcompanhamento(id: string): Promise<void> {
  const { error } = await supabase.from("processo_citacoes").delete().eq("id", id);
  if (error) throw error;
}
