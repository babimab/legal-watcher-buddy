import { supabase } from "@/integrations/supabase/client";
import { supabaseSolto } from "@/lib/supabase-solto";

// Espelha os campos que o LegalDesk já usa pra registrar decisão --
// pensado pra um dia alimentar o LD de volta sem precisar traduzir nada.
// De propósito NÃO tem campo de valor/índice/juros aqui: isso é papel da
// calculadora judicial (/calculos), que fica desacoplada -- quem
// preencher o "Detalhamento" já escreve o valor e os parâmetros ali como
// texto, igual sai no acórdão.
export type DecisaoProcesso = {
  id: string;
  processo_id: string;
  juiz: string | null;
  houve_decisao: boolean;
  data_decisao: string | null;
  decisao: string | null;
  detalhamento: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export async function listarDecisoesProcesso(processoId: string): Promise<DecisaoProcesso[]> {
  const { data, error } = await supabaseSolto
    .from("decisoes_processo")
    .select("*")
    .eq("processo_id", processoId)
    .order("data_decisao", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as DecisaoProcesso[];
}

export async function criarDecisaoProcesso(input: {
  processoId: string;
  juiz: string | null;
  houveDecisao: boolean;
  dataDecisao: string | null;
  decisao: string | null;
  detalhamento: string | null;
}): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Sessão expirada.");
  const { error } = await supabaseSolto.from("decisoes_processo").insert({
    processo_id: input.processoId,
    juiz: input.juiz,
    houve_decisao: input.houveDecisao,
    data_decisao: input.dataDecisao,
    decisao: input.decisao,
    detalhamento: input.detalhamento,
    created_by: auth.user.id,
  });
  if (error) throw error;
}

export async function atualizarDecisaoProcesso(
  id: string,
  input: {
    juiz: string | null;
    houveDecisao: boolean;
    dataDecisao: string | null;
    decisao: string | null;
    detalhamento: string | null;
  },
): Promise<void> {
  const { error } = await supabaseSolto
    .from("decisoes_processo")
    .update({
      juiz: input.juiz,
      houve_decisao: input.houveDecisao,
      data_decisao: input.dataDecisao,
      decisao: input.decisao,
      detalhamento: input.detalhamento,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}

export async function excluirDecisaoProcesso(id: string): Promise<void> {
  const { error } = await supabaseSolto.from("decisoes_processo").delete().eq("id", id);
  if (error) throw error;
}
