import { supabase } from "@/integrations/supabase/client";
import { supabaseSolto } from "@/lib/supabase-solto";
import {
  buscarTudoPaginado,
  siglaOuEmailAtual,
  type MovimentacaoComProcesso,
} from "@/lib/processos";

export type ItemCaixaEntrada = MovimentacaoComProcesso;

const CAMPOS_PROCESSO_CAIXA =
  "id, numero_cnj, cliente, numero_interno, numero_cliente, tribunal, autor, reu, parte_contraria, responsavel, socio, vara, comarca, uf, pasta_id";

export async function listarCaixaEntrada(): Promise<ItemCaixaEntrada[]> {
  return buscarTudoPaginado<ItemCaixaEntrada>(
    (offset, limite) =>
      supabase
        .from("movimentacoes")
        .select(`*, processos(${CAMPOS_PROCESSO_CAIXA})`)
        .eq("validado", false)
        .in("fonte", ["publicacoes", "citacoes"])
        .order("data_movimentacao", { ascending: false })
        .order("created_at", { ascending: false })
        .order("id", { ascending: true })
        .range(offset, offset + limite - 1) as unknown as PromiseLike<{
        data: ItemCaixaEntrada[] | null;
        error: { message: string } | null;
      }>,
  );
}

export async function concluirTriagem(ids: string[]): Promise<void> {
  if (!ids.length) return;
  const quem = await siglaOuEmailAtual();
  const { data, error } = await supabaseSolto.rpc("concluir_triagem_movimentacoes", {
    _ids: ids,
    _validado_por: quem,
  });
  if (error) throw error;

  const quantidade = typeof data === "number" ? data : Number(data ?? 0);
  if (quantidade !== ids.length) {
    throw new Error(
      quantidade === 0
        ? "A publicação não pôde ser concluída. Atualize a página e tente novamente."
        : `${quantidade} de ${ids.length} item(ns) foram concluídos. Atualize a página antes de tentar os demais.`,
    );
  }
}

export async function excluirItensCaixaEntrada(ids: string[]): Promise<void> {
  if (!ids.length) return;
  const { error } = await supabaseSolto.from("movimentacoes").delete().in("id", ids);
  if (error) throw error;
}

export async function definirDestaqueCaixa(ids: string[], destacar: boolean): Promise<void> {
  if (!ids.length) return;
  const { error } = await supabaseSolto
    .from("movimentacoes")
    .update({ destacar_email: destacar })
    .in("id", ids);
  if (error) throw error;
}

export async function criarPrazoNaTriagem(id: string, prazo: string): Promise<void> {
  const quem = await siglaOuEmailAtual();
  const { error } = await supabaseSolto
    .from("movimentacoes")
    .update({
      exige_acao: true,
      prazo,
      validado: true,
      validado_por: quem,
      validado_em: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}
