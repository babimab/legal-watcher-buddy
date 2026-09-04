import { supabase } from "@/integrations/supabase/client";
import { proximoDiaUtil, somarDiasUteis } from "@/lib/dias-uteis";

const TAMANHO_LOTE = 25;

export type ItemParaClassificar = { id: string; texto: string; aba?: "nao_localizada_geral" };

type ClassificacaoBruta = {
  id: string;
  tipoAto: string;
  tipoDataEncontrada: "disponibilizacao" | "publicacao_intimacao" | "nao_identificada";
  dataEncontrada: string | null;
  ehJEC: boolean;
  diasUteisSugeridos: number | null;
  regraAplicada: string;
  revisar: boolean;
  resumo: string;
  relevanteGeral: boolean | null;
};

export type ClassificacaoPublicacao = ClassificacaoBruta & {
  /** Data efetiva da publicação/intimação, já com a regra de "disponibilização vira publicada no 1º dia útil seguinte" aplicada. */
  dataPublicacaoEfetiva: string | null;
  /** Data final do prazo, calculada em código (nunca pela IA). */
  dataVencimento: string | null;
};

function calcularVencimento(bruta: ClassificacaoBruta): ClassificacaoPublicacao {
  const dataPublicacaoEfetiva =
    bruta.tipoDataEncontrada === "disponibilizacao" && bruta.dataEncontrada
      ? proximoDiaUtil(bruta.dataEncontrada)
      : bruta.tipoDataEncontrada === "publicacao_intimacao"
        ? bruta.dataEncontrada
        : null;

  const dataVencimento =
    dataPublicacaoEfetiva && bruta.diasUteisSugeridos != null
      ? somarDiasUteis(dataPublicacaoEfetiva, bruta.diasUteisSugeridos)
      : null;

  // Sem data efetiva ou sem regra de dias, não dá pra confiar num prazo —
  // força revisão manual mesmo que a IA não tenha marcado.
  const revisar = bruta.revisar || !dataPublicacaoEfetiva || bruta.diasUteisSugeridos == null;

  return { ...bruta, revisar, dataPublicacaoEfetiva, dataVencimento };
}

export async function classificarPublicacoes(
  itens: ItemParaClassificar[],
): Promise<Map<string, ClassificacaoPublicacao>> {
  const resultado = new Map<string, ClassificacaoPublicacao>();
  if (itens.length === 0) return resultado;

  for (let i = 0; i < itens.length; i += TAMANHO_LOTE) {
    const lote = itens.slice(i, i + TAMANHO_LOTE);
    const { data, error } = await supabase.functions.invoke<{
      classificacoes?: ClassificacaoBruta[];
      error?: string;
    }>("classificar-publicacoes", { body: { itens: lote } });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    if (!data?.classificacoes) throw new Error("A IA não retornou classificação nenhuma.");

    for (const bruta of data.classificacoes) {
      resultado.set(bruta.id, calcularVencimento(bruta));
    }
  }

  return resultado;
}
