// Porta Deno de src/lib/publicacoes-regras.ts (mesma lógica de
// classificação por regra fixa, char por char) -- ver o arquivo original
// pra comentários completos sobre cada regra.
import { proximoDiaUtil, somarDiasUteis } from "./dias-uteis.ts";

export type ItemParaClassificar = {
  id: string;
  texto: string;
  dataPublicacao: string | null;
};

export type ClassificacaoPublicacao = {
  id: string;
  tipoAto: string;
  revisar: boolean;
  dataPublicacaoEfetiva: string | null;
  dataVencimento: string | null;
};

function normalizar(texto: string): string {
  return texto.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function contem(alvo: string, ...termos: string[]): boolean {
  return termos.some((t) => alvo.includes(t));
}

const TIPOS_ATO: { rotulo: string; termos: string[] }[] = [
  { rotulo: "Embargos de Declaração", termos: ["embargos de declaracao", "embargos declaratorios"] },
  { rotulo: "Acórdão", termos: ["acordao"] },
  { rotulo: "Sentença", termos: ["sentenca"] },
  { rotulo: "Contrarrazões", termos: ["contrarrazoes", "contra-razoes", "contra razoes"] },
  { rotulo: "Decisão Interlocutória", termos: ["decisao interlocutoria", "decisao"] },
  { rotulo: "Despacho", termos: ["despacho"] },
  { rotulo: "Citação", termos: ["citacao"] },
  { rotulo: "Intimação", termos: ["intimacao"] },
];

function classificarTipoAto(alvo: string): string {
  for (const { rotulo, termos } of TIPOS_ATO) {
    if (contem(alvo, ...termos)) return rotulo;
  }
  return "Outro";
}

const REGEX_PRAZO_EXPLICITO = /prazo\s+de\s+(\d{1,3})\s*(?:\([^)]*\))?\s*dias?/i;
const TERMOS_MANIFESTACAO = ["manifeste-se", "manifestacao", "intime-se", "manifestar-se"];

function classificarPrazo(alvo: string): { dias: number | null; incerto: boolean } {
  const explicito = REGEX_PRAZO_EXPLICITO.exec(alvo);
  if (explicito?.[1]) return { dias: Number(explicito[1]), incerto: false };
  if (contem(alvo, "contrarraz")) return { dias: 15, incerto: false };
  if (contem(alvo, "juizado especial") || /\bjec\b/.test(alvo)) return { dias: 10, incerto: false };
  if (contem(alvo, ...TERMOS_MANIFESTACAO)) return { dias: 5, incerto: false };
  return { dias: null, incerto: contem(alvo, "prazo") };
}

export function classificarLinha(item: ItemParaClassificar): ClassificacaoPublicacao {
  const alvo = normalizar(item.texto);
  const tipoAto = classificarTipoAto(alvo);
  const ehDisponibilizacao = contem(alvo, "disponibiliz");
  const dataPublicacaoEfetiva = !item.dataPublicacao
    ? null
    : ehDisponibilizacao
      ? proximoDiaUtil(item.dataPublicacao)
      : item.dataPublicacao;

  const { dias, incerto } = classificarPrazo(alvo);
  const dataVencimento =
    dataPublicacaoEfetiva && dias != null ? somarDiasUteis(dataPublicacaoEfetiva, dias) : null;

  const revisar = !dataPublicacaoEfetiva || incerto || (tipoAto === "Outro" && dias != null);

  return { id: item.id, tipoAto, revisar, dataPublicacaoEfetiva, dataVencimento };
}

export function classificarPublicacoes(
  itens: ItemParaClassificar[],
): Map<string, ClassificacaoPublicacao> {
  return new Map(itens.map((item) => [item.id, classificarLinha(item)]));
}
