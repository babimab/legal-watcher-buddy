import { proximoDiaUtil, somarDiasUteis } from "@/lib/dias-uteis";

// Classificação de publicações por regra fixa (sem IA), a pedido da BDR --
// troca a versão anterior que mandava o teor pra Anthropic
// (classificar-publicacoes). Fica mais rápido e sem custo de API, em
// troca de ser mais grosseiro em casos ambíguos: por isso as regras
// preferem marcar "revisar" a arriscar um prazo errado, mesma filosofia
// do prompt da BDR.
//
// A data efetiva NUNCA foi extraída de texto por regra nenhuma (nem pela
// IA antes) -- ela já vem estruturada (coluna da planilha ou campo do
// DJEN). A única decisão sobre a data é se o texto indica que é uma mera
// "disponibilização" (aplica a regra do 1º dia útil seguinte) ou já é a
// publicação/intimação em si.

export type ItemParaClassificar = {
  id: string;
  texto: string;
  dataPublicacao: string | null;
};

export type ClassificacaoPublicacao = {
  id: string;
  tipoAto: string;
  tipoDataEncontrada: "disponibilizacao" | "publicacao_intimacao" | "nao_identificada";
  dataEncontrada: string | null;
  ehJEC: boolean;
  diasUteisSugeridos: number | null;
  regraAplicada: string;
  revisar: boolean;
  resumo: string | null;
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
  {
    rotulo: "Embargos de Declaração",
    termos: ["embargos de declaracao", "embargos declaratorios"],
  },
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

const REGEX_PRAZO_EXPLICITO = /prazo\s+de\s+(\d{1,3})\s*\(?\s*dias?/i;
const TERMOS_MANIFESTACAO = ["manifeste-se", "manifestacao", "intime-se", "manifestar-se"];

function classificarPrazo(alvo: string): {
  dias: number | null;
  ehJEC: boolean;
  regra: string;
  incerto: boolean;
} {
  const explicito = REGEX_PRAZO_EXPLICITO.exec(alvo);
  if (explicito?.[1]) {
    return {
      dias: Number(explicito[1]),
      ehJEC: false,
      regra: `Conforme texto — ${explicito[1]} dias úteis (regra fixa)`,
      incerto: false,
    };
  }
  if (contem(alvo, "contrarraz")) {
    return {
      dias: 15,
      ehJEC: false,
      regra: "Contrarrazões — 15 dias úteis (regra fixa)",
      incerto: false,
    };
  }
  if (contem(alvo, "juizado especial") || /\bjec\b/.test(alvo)) {
    return { dias: 10, ehJEC: true, regra: "JEC — 10 dias úteis (regra fixa)", incerto: false };
  }
  if (contem(alvo, ...TERMOS_MANIFESTACAO)) {
    return {
      dias: 5,
      ehJEC: false,
      regra: "Despacho/manifestação — 5 dias úteis (regra fixa)",
      incerto: false,
    };
  }
  // Menciona "prazo" mas nenhuma regra fixa bateu -- sinal de que pode
  // haver prazo mesmo sem a gente saber calcular, então fica marcado
  // pra revisão manual em vez de assumir que não há prazo.
  return {
    dias: null,
    ehJEC: false,
    regra: "Sem prazo identificado por regra fixa",
    incerto: contem(alvo, "prazo"),
  };
}

export function classificarLinha(item: ItemParaClassificar): ClassificacaoPublicacao {
  const alvo = normalizar(item.texto);

  const tipoAto = classificarTipoAto(alvo);
  const ehDisponibilizacao = contem(alvo, "disponibiliz");
  const tipoDataEncontrada: ClassificacaoPublicacao["tipoDataEncontrada"] = !item.dataPublicacao
    ? "nao_identificada"
    : ehDisponibilizacao
      ? "disponibilizacao"
      : "publicacao_intimacao";
  const dataPublicacaoEfetiva = !item.dataPublicacao
    ? null
    : ehDisponibilizacao
      ? proximoDiaUtil(item.dataPublicacao)
      : item.dataPublicacao;

  const { dias, ehJEC, regra, incerto } = classificarPrazo(alvo);
  const dataVencimento =
    dataPublicacaoEfetiva && dias != null ? somarDiasUteis(dataPublicacaoEfetiva, dias) : null;

  const revisar = !dataPublicacaoEfetiva || incerto || (tipoAto === "Outro" && dias != null);

  return {
    id: item.id,
    tipoAto,
    tipoDataEncontrada,
    dataEncontrada: item.dataPublicacao,
    ehJEC,
    diasUteisSugeridos: dias,
    regraAplicada: regra,
    revisar,
    resumo: null,
    dataPublicacaoEfetiva,
    dataVencimento,
  };
}

export function classificarPublicacoes(
  itens: ItemParaClassificar[],
): Map<string, ClassificacaoPublicacao> {
  return new Map(itens.map((item) => [item.id, classificarLinha(item)]));
}
