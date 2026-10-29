import { proximoDiaUtil, somarDiasUteis } from "@/lib/dias-uteis";

// Classificação de publicações por regra fixa (sem IA), a pedido da BDR --
// troca a versão anterior que mandava o teor pra Anthropic
// (classificar-publicacoes). Fica mais rápido e sem custo de API, em
// troca de ser mais grosseiro em casos ambíguos: por isso as regras
// preferem marcar "revisar"/"conferência" a arriscar um prazo errado,
// mesma filosofia do prompt da BDR.
//
// A data efetiva NUNCA foi extraída de texto por regra nenhuma (nem pela
// IA antes) -- ela já vem estruturada (coluna da planilha ou campo do
// DJEN). A única decisão sobre a data é se o texto indica que é uma mera
// "disponibilização" (aplica a regra do 1º dia útil seguinte) ou já é a
// publicação/intimação em si. Exceção: data de audiência/sessão marcada
// no próprio texto ("designada para o dia"), que é extraída porque é uma
// data fixa do ato, não uma contagem a partir da publicação.
//
// Padrão de "Agendamentos" (out/2026, a pedido da Eliane/BDR): a seção
// precisa sair pronta pra copiar pra lista de prazos do escritório, não
// só identificar o tipo de ato genérico (ver TIPOS_ATO) -- por isso toda
// publicação também ganha uma "providência" concreta (classificarProvidencia)
// e um "tier": "confirmado" (entra em Agendamentos), "conferencia" (entra
// em "Pontos para conferência", com motivo CONFIRMAR_PRAZO ou
// AVALIAR_PROVIDENCIA) ou "sem_acao" (fica só na tabela). Uma decisão/
// sentença/despacho sem providência concreta identificada NUNCA vira
// "confirmado" só por ter um prazo calculado por regra genérica (era
// esse o bug relatado: uma decisão de cancelamento de custas, sem
// determinação de resposta, virando "Sentença" com prazo de 28/10) --
// nesse caso cai em "conferencia"/AVALIAR_PROVIDENCIA.

export type ItemParaClassificar = {
  id: string;
  texto: string;
  dataPublicacao: string | null;
};

export type Tier = "confirmado" | "conferencia" | "sem_acao";
export type MotivoConferencia = "CONFIRMAR_PRAZO" | "AVALIAR_PROVIDENCIA" | null;

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
  // Campos do padrão de Agendamentos da Eliane (ver comentário acima).
  providencia: string;
  horario: string | null;
  tier: Tier;
  motivoConferencia: MotivoConferencia;
};

function normalizar(texto: string): string {
  return texto.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function contem(alvo: string, ...termos: string[]): boolean {
  return termos.some((t) => alvo.includes(t));
}

// "AIJ" (Audiência de Instrução e Julgamento) é abreviação -- usa \b
// (limite de palavra) em vez de contem(), que faria falta exigir espaço
// dos dois lados (" aij "). No texto real a sigla quase sempre vem colada
// em pontuação ("Designo AIJ.", "(AIJ)", "AIJ:") ou no fim/início da
// string, nunca cercada por espaços soltos -- por isso nunca batia.
const REGEX_AIJ = /\baij\b/;

// Só considera "audiência" como providência CONFIRMADA (marcada de fato)
// quando há um verbo de designação já EFETIVADO perto da palavra
// ("designo"/"designada"/"fica designada"/"marcada"/"aprazada"...) -- o
// infinitivo "designar" fica de fora de propósito, porque é exatamente a
// forma usada quando o juiz só está cogitando uma audiência futura,
// condicionada a outro evento ainda pendente ("...no sentido de designar
// audiência de instrução OU promover o julgamento antecipado do mérito"
// -- caso relatado: despacho cobrando certidão de intimação da Autora,
// sem nenhuma audiência marcada, virando "Audiência designada — JEC" com
// vencimento fantasma só porque a palavra "audiência" aparecia em algum
// lugar do texto). O trecho não pode atravessar ponto final, pra não
// juntar um verbo de uma frase com "audiência" de outra sem relação.
const REGEX_DESIGNACAO_ANTES =
  /\b(?:designo|designad[ao]|designe-se|fica\s+designad[ao]|resta\s+designad[ao]|marcad[ao]|marco|aprazad[ao])\b[^.]{0,60}\baudiencia\b/;
const REGEX_DESIGNACAO_DEPOIS =
  /\baudiencia\b[^.]{0,60}\b(?:designad[ao]|marcad[ao]|aprazad[ao])\b/;
const REGEX_AUDIENCIA_DESIGNADA = new RegExp(
  `${REGEX_AIJ.source}|${REGEX_DESIGNACAO_ANTES.source}|${REGEX_DESIGNACAO_DEPOIS.source}`,
);

// Família de atos "decisórios" -- sempre merecem o olho da equipe mesmo
// sem providência concreta identificada (nunca viram "sem_acao" por
// omissão nossa, só quando a própria Eliane/BDR confirmar que não
// precisam). Ordem importa: primeiro match vence.
const TIPOS_ATO: { rotulo: string; termos: string[]; extra?: RegExp }[] = [
  {
    rotulo: "Embargos de Declaração",
    termos: ["embargos de declaracao", "embargos declaratorios"],
  },
  { rotulo: "Acórdão", termos: ["acordao"] },
  // Cabeçalho "DESPACHO/DECISÃO" tem prioridade sobre "Sentença" -- é um
  // marcador bem específico e comum em cumprimento de sentença, onde a
  // palavra "sentença" aparece só como referência ao título já existente
  // ("cumprimento de sentença", "conforme sentença do evento X"), não
  // como o tipo do ato publicado agora (foi exatamente esse o caso
  // relatado: decisão sobre custas, dentro de um cumprimento de
  // sentença, virando "Sentença" por engano).
  { rotulo: "Decisão Interlocutória", termos: ["despacho/decisao", "decisao/despacho"] },
  { rotulo: "Sentença", termos: ["sentenca"] },
  {
    // Rótulo "Audiência" (não "Audiência designada") pra bater com o
    // mesmo nome usado no cadastro manual (TIPOS_MOVIMENTACAO) e com o
    // ato "Audiência" do Legal Desk -- de-para validado em 10/2026.
    rotulo: "Audiência",
    termos: ["instrucao e julgamento"],
    extra: REGEX_AUDIENCIA_DESIGNADA,
  },
  { rotulo: "Contrarrazões", termos: ["contrarrazoes", "contra-razoes", "contra razoes"] },
  { rotulo: "Decisão Interlocutória", termos: ["decisao interlocutoria", "decisao"] },
  { rotulo: "Despacho", termos: ["despacho"] },
  { rotulo: "Citação", termos: ["citacao"] },
  { rotulo: "Intimação", termos: ["intimacao"] },
];
const FAMILIA_DECISORIA = new Set([
  "Embargos de Declaração",
  "Acórdão",
  "Sentença",
  "Decisão Interlocutória",
  "Despacho",
]);

function classificarTipoAto(alvo: string): string {
  for (const { rotulo, termos, extra } of TIPOS_ATO) {
    if (contem(alvo, ...termos) || extra?.test(alvo)) return rotulo;
  }
  // "Outros" (não "Outro") pra bater com TIPOS_MOVIMENTACAO e o ato
  // "Outros" do Legal Desk -- de-para validado em 10/2026.
  return "Outros";
}

// Aceita o número por extenso entre parênteses, que é como a maioria das
// decisões escreve o prazo ("no prazo de 5 (cinco) dias") -- sem isso,
// esse padrão de redação (muito comum) nunca batia com a regra.
const REGEX_PRAZO_EXPLICITO = /prazo\s+de\s+(\d{1,3})\s*(?:\([^)]*\))?\s*dias?/i;
const TERMOS_MANIFESTACAO = ["manifeste-se", "manifestacao", "intime-se", "manifestar-se"];

// Pega a data de audiência/sessão quando o texto traz essa fórmula padrão
// de ato ordinatório ("designo/designada/marco/marcada/aprazo/aprazada
// ... para o dia DD/MM/AAAA") -- bem mais confiável que tentar calcular
// um prazo nesses casos, porque é uma data marcada, não uma contagem a
// partir da publicação. Cobre tanto o particípio ("fica designada ...")
// quanto a 1ª/3ª pessoa do presente ("Designo audiência ... para o
// dia"). Permite um trecho entre o verbo e "para o dia" (sem atravessar
// ponto final) porque, na prática, quase sempre há um complemento no
// meio ("Designo AUDIÊNCIA DE INSTRUÇÃO E JULGAMENTO para o dia...") --
// exigir "para o dia" logo colado no verbo (como era antes) não batia
// com quase nenhum caso real, só com a frase mais seca e rara sem
// complemento nenhum.
const REGEX_DATA_DESIGNADA =
  /\b(?:designo|designa|designad[ao]|marco|marca|marcad[ao]|aprazo|apraza|aprazad[ao])\b[^.]{0,60}?\bpara\s+o\s+dia\s+(\d{2})\/(\d{2})\/(\d{4})/i;

function extrairDataDesignada(alvo: string): string | null {
  const m = REGEX_DATA_DESIGNADA.exec(alvo);
  if (!m) return null;
  const [, dd, mm, aaaa] = m;
  return `${aaaa}-${mm}-${dd}`;
}

// "às 16:00" / "as 16h30" / "as 14h" (acento já foi removido por
// normalizar()) -- exige a palavra "as" logo antes pra não confundir com
// número de processo/vara. Minutos são opcionais (bare "as 14h", sem
// ":00"/"h00", é redação comum e antes não batia). Formato de saída igual
// ao da lista da Eliane: "16h" quando minutos é 00, "09h30" quando não é.
const REGEX_HORARIO = /\bas\s+(\d{1,2})(?:[:h](\d{2}))?h?\b/;

function extrairHorario(alvo: string): string | null {
  const m = REGEX_HORARIO.exec(alvo);
  if (!m) return null;
  const hh = m[1]!.padStart(2, "0");
  const mm = m[2] ?? "00";
  return mm === "00" ? `${hh}h` : `${hh}h${mm}`;
}

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

type Providencia = {
  label: string;
  tier: Tier;
  motivo: MotivoConferencia;
};

function detectarModalidade(alvo: string): string {
  if (contem(alvo, "virtual")) return " virtual";
  if (contem(alvo, "hibrid", "semipresencial")) return " híbrida";
  if (contem(alvo, "presencial")) return " presencial";
  return "";
}

// Identifica a providência CONCRETA (o que precisa ser feito/comparecido),
// não só o tipo de peça -- é isso que permite montar a entrada de
// Agendamentos pronta pra copiar, em vez de um rótulo genérico tipo
// "Sentença"/"Despacho" que não diz o que fazer.
function classificarProvidencia(alvo: string, dias: number | null, tipoAto: string): Providencia {
  const ehAIJ = contem(alvo, "instrucao e julgamento") || REGEX_AIJ.test(alvo);
  const ehAC = contem(alvo, "audiencia") && contem(alvo, "concilia");
  const audienciaDesignada = ehAIJ || ehAC || REGEX_AUDIENCIA_DESIGNADA.test(alvo);
  if (audienciaDesignada) {
    const base = ehAC ? "AC" : "AIJ";
    const modalidade = detectarModalidade(alvo);
    const temContestacao = contem(alvo, "contestacao");
    return {
      label: temContestacao ? `${base}${modalidade}/contestação` : `${base}${modalidade}`,
      tier: "confirmado",
      motivo: null,
    };
  }

  if (contem(alvo, "sessao") && contem(alvo, "julgamento")) {
    if (contem(alvo, "encerra"))
      return { label: "Encerramento do julgamento virtual", tier: "confirmado", motivo: null };
    if (contem(alvo, "inicio"))
      return { label: "Início da sessão virtual", tier: "confirmado", motivo: null };
    return { label: "Julgamento", tier: "confirmado", motivo: null };
  }

  if (contem(alvo, "especifica") && contem(alvo, "provas")) {
    return dias != null
      ? { label: "Especificação de provas", tier: "confirmado", motivo: null }
      : { label: "Especificação de provas", tier: "conferencia", motivo: "AVALIAR_PROVIDENCIA" };
  }

  // Deserção (recurso negado por falta de pagamento de custas) é sempre
  // do RECORRENTE -- quem tinha o ônus de pagar e não pagou. Quando essa
  // decisão aparece numa publicação nossa, normalmente é porque o
  // recurso é da parte contrária, e a decisão é favorável/neutra pro
  // nosso cliente (nada a fazer) -- sem essa checagem, a simples menção
  // a "custas" virava uma falsa pendência de "Recolhimento de custas"
  // nossa (caso relatado: processo I M Costa, deserção do recurso da
  // outra parte, sem nenhuma obrigação da Souza Cruz).
  if (contem(alvo, "deserc") && contem(alvo, "recurso")) {
    return { label: tipoAto, tier: "sem_acao", motivo: null };
  }

  if (contem(alvo, "recolh") && contem(alvo, "custas")) {
    return dias != null
      ? { label: "Recolhimento de custas", tier: "confirmado", motivo: null }
      : { label: "Recolhimento de custas", tier: "conferencia", motivo: "AVALIAR_PROVIDENCIA" };
  }

  if (contem(alvo, "contrarraz")) {
    let label = "Contrarrazões";
    if (contem(alvo, "apelacao")) label = "Contrarrazões de apelação";
    else if (contem(alvo, "agravo de instrumento")) label = "CR AI";
    else if (contem(alvo, "embargos de declaracao")) label = "CR EDs";
    return { label, tier: "confirmado", motivo: null };
  }

  if (contem(alvo, "manifeste-se", "manifestar-se") && contem(alvo, "documento")) {
    return { label: "Manifestação sobre documentos", tier: "confirmado", motivo: null };
  }

  if (contem(alvo, "junte", "junta-se", "apresente", "comprove") && contem(alvo, "documento")) {
    return dias != null
      ? { label: "Juntada de documentos", tier: "confirmado", motivo: null }
      : { label: "Juntada de documentos", tier: "conferencia", motivo: "AVALIAR_PROVIDENCIA" };
  }

  if (contem(alvo, ...TERMOS_MANIFESTACAO)) {
    return dias != null
      ? { label: "Manifestação", tier: "confirmado", motivo: null }
      : { label: "Manifestação", tier: "conferencia", motivo: "AVALIAR_PROVIDENCIA" };
  }

  // Nenhuma providência concreta identificada. Peça da família decisória
  // (sentença/decisão/despacho/acórdão/embargos) nunca é descartada
  // silenciosamente -- vai pra conferência, mesmo sem prazo claro (foi
  // exatamente esse o caso relatado: uma decisão de cancelamento de
  // custas, sem determinação de resposta, virando prazo de "Sentença").
  if (FAMILIA_DECISORIA.has(tipoAto)) {
    return { label: tipoAto, tier: "conferencia", motivo: "AVALIAR_PROVIDENCIA" };
  }

  // Resto (citação/intimação/"Outro" puramente informativo, sem verbo de
  // determinação e sem prazo) -- fica só na tabela, nem Agendamentos nem
  // conferência.
  return { label: tipoAto, tier: "sem_acao", motivo: null };
}

export function classificarLinha(item: ItemParaClassificar): ClassificacaoPublicacao {
  const alvo = normalizar(item.texto);

  const tipoAto = classificarTipoAto(alvo);
  // A data que chega aqui (planilha do TI ou busca no DJEN -- em
  // linhasDeDjen() ela literalmente vem de "dataDisponibilizacao") É a
  // disponibilização no Diário Eletrônico, sempre -- é pra isso que o
  // Diário serve. A contagem de prazo (art. 224 do CPC) considera
  // publicação o 1º dia útil SEGUINTE a essa data, não a própria data,
  // então o deslocamento sempre se aplica -- nunca dependeu de o texto
  // conter a palavra "disponibilização" (esse era o bug: ela quase nunca
  // aparece no corpo do ato em si, só no cabeçalho do Diário, que não
  // faz parte do teor recebido aqui -- por isso as duas colunas saíam
  // sempre iguais).
  const tipoDataEncontrada: ClassificacaoPublicacao["tipoDataEncontrada"] = !item.dataPublicacao
    ? "nao_identificada"
    : "disponibilizacao";
  const dataPublicacaoEfetiva = !item.dataPublicacao ? null : proximoDiaUtil(item.dataPublicacao);

  const horario = extrairHorario(alvo);

  // Data marcada no próprio texto (audiência/sessão) tem prioridade sobre
  // qualquer cálculo de prazo a partir da publicação -- é a data real do
  // ato, não uma contagem de dias.
  const dataDesignada = extrairDataDesignada(alvo);
  if (dataDesignada) {
    const providenciaAudiencia = classificarProvidencia(alvo, null, tipoAto);
    return {
      id: item.id,
      tipoAto,
      tipoDataEncontrada,
      dataEncontrada: item.dataPublicacao,
      ehJEC: false,
      diasUteisSugeridos: null,
      regraAplicada: `Data extraída do texto ("designada para o dia") — ${dataDesignada}`,
      revisar: false,
      resumo: null,
      dataPublicacaoEfetiva,
      dataVencimento: dataDesignada,
      providencia: providenciaAudiencia.label,
      horario,
      tier: "confirmado",
      motivoConferencia: null,
    };
  }

  const { dias, ehJEC, regra, incerto } = classificarPrazo(alvo);
  const dataVencimento =
    dataPublicacaoEfetiva && dias != null ? somarDiasUteis(dataPublicacaoEfetiva, dias) : null;

  const providencia = classificarProvidencia(alvo, dias, tipoAto);
  // "incerto" (menciona "prazo" mas nenhuma regra de dias bateu) sempre
  // vira CONFIRMAR_PRAZO, mesmo quando a providência já foi identificada
  // com confiança -- o que falta aqui é a contagem, não o tipo de ato.
  // "confirmado" sem data (ex.: menciona audiência/sessão, mas sem a
  // fórmula "designada para o dia" nem prazo de dias calculado) nunca
  // vira uma entrada de Agendamentos sem data -- cai pra conferência.
  const semData = dataVencimento == null;
  const tier: Tier =
    incerto || (providencia.tier === "confirmado" && semData) ? "conferencia" : providencia.tier;
  const motivoConferencia: MotivoConferencia =
    incerto || (providencia.tier === "confirmado" && semData)
      ? "CONFIRMAR_PRAZO"
      : providencia.motivo;

  const revisar = tier !== "confirmado";

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
    providencia: providencia.label,
    horario,
    tier,
    motivoConferencia,
  };
}

export function classificarPublicacoes(
  itens: ItemParaClassificar[],
): Map<string, ClassificacaoPublicacao> {
  return new Map(itens.map((item) => [item.id, classificarLinha(item)]));
}
