import * as XLSX from "xlsx";

// Acesso restrito -- essa seção lida com dado confidencial de fatura de
// cliente, só essas siglas podem ver (pedido da BDR). Checado tanto pra
// esconder o item do menu quanto no beforeLoad da rota (não é só
// estético, bloqueia de verdade quem tentar entrar pela URL direto).
export const SIGLAS_PERMITIDAS_FATURA = ["LSO", "NYM", "BDR"];

// Lê a planilha de faturamento por ato de um cliente que paga por ato (ex.:
// resseguradora de companhia aérea) -- uma aba por tipo de cobrança
// (Honorários, Preposição, Outras Despesas). O nome das abas pode variar
// de planilha pra planilha (uma por companhia aérea), então a
// classificação é por palavra-chave no nome da aba, não pelo nome exato.
//
// Cada linha normalmente vira um documento ("Nota de Honorários")
// próprio -- mas quando o mesmo Caso Interno aparece tanto na aba de
// Honorários quanto na de Preposição (o processo teve ato E audiência
// cobrados no mesmo período), as duas linhas viram UM documento só, com
// o valor somado e um parágrafo de descrição por item (confirmado com a
// BDR e com o e-mail da sócia pro TI).

export type TipoItemFatura = "Honorários" | "Despesa de Preposição" | "Outra Despesa";

export type ItemFatura = {
  tipo: TipoItemFatura;
  valor: number;
  paragrafo: string;
};

export type NotaFatura = {
  idx: number;
  casoInterno: string | null;
  autor: string | null;
  reu: string | null;
  processo: string | null;
  juizo: string | null;
  bsRef: string | null;
  correspondente: string | null;
  invoicePeriodo: string | null;
  invoiceData: string | null;
  moeda: string;
  itens: ItemFatura[];
  valorTotal: number;
};

function normalizar(texto: string) {
  return texto.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

// Protege o toLocaleString (que lança exceção pra código inválido) caso
// alguma célula de moeda venha com lixo que a varredura de linha de
// resumo não pegou.
function moedaValida(valor: string | null): string | null {
  return valor && /^[a-zA-Z]{3}$/.test(valor) ? valor.toUpperCase() : null;
}

function texto(valor: unknown): string | null {
  if (valor == null) return null;
  const s = String(valor).trim();
  return s === "" || s.toLowerCase() === "nan" ? null : s;
}

function numero(valor: unknown): number | null {
  if (valor == null || valor === "") return null;
  const n = typeof valor === "number" ? valor : Number(String(valor).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function dataISO(valor: unknown): string | null {
  if (valor == null || valor === "") return null;
  if (valor instanceof Date) {
    const d = new Date(valor.getTime() - valor.getTimezoneOffset() * 60000);
    return d.toISOString().slice(0, 10);
  }
  if (typeof valor === "number") {
    const p = XLSX.SSF.parse_date_code(valor);
    if (!p) return null;
    return `${String(p.y).padStart(4, "0")}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
  }
  const s = String(valor).trim();
  const br = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (br) {
    const ano = br[3]!.length === 2 ? `20${br[3]}` : br[3];
    return `${ano}-${br[2]!.padStart(2, "0")}-${br[1]!.padStart(2, "0")}`;
  }
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return iso ? iso[0] : null;
}

export function dataISOparaBR(data: string): string {
  const [a, m, d] = data.split("-");
  return `${d}/${m}/${a}`;
}

function classificarAba(nomeAba: string): TipoItemFatura | null {
  const n = normalizar(nomeAba);
  if (n.includes("honorario")) return "Honorários";
  if (n.includes("preposi")) return "Despesa de Preposição";
  if (n.includes("despesa")) return "Outra Despesa";
  return null;
}

// --- valor por extenso (pt-BR, moeda) -------------------------------

const UNIDADES = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
const DEZ_A_DEZENOVE = [
  "dez",
  "onze",
  "doze",
  "treze",
  "quatorze",
  "quinze",
  "dezesseis",
  "dezessete",
  "dezoito",
  "dezenove",
];
const DEZENAS = [
  "",
  "",
  "vinte",
  "trinta",
  "quarenta",
  "cinquenta",
  "sessenta",
  "setenta",
  "oitenta",
  "noventa",
];
const CENTENAS = [
  "",
  "cento",
  "duzentos",
  "trezentos",
  "quatrocentos",
  "quinhentos",
  "seiscentos",
  "setecentos",
  "oitocentos",
  "novecentos",
];

// 0-999
function grupoPorExtenso(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "cem";
  const partes: string[] = [];
  const c = Math.floor(n / 100);
  const resto = n % 100;
  if (c > 0) partes.push(CENTENAS[c]!);
  if (resto > 0) {
    if (resto < 10) partes.push(UNIDADES[resto]!);
    else if (resto < 20) partes.push(DEZ_A_DEZENOVE[resto - 10]!);
    else {
      const d = Math.floor(resto / 10);
      const u = resto % 10;
      partes.push(u === 0 ? DEZENAS[d]! : `${DEZENAS[d]} e ${UNIDADES[u]}`);
    }
  }
  return partes.join(" e ");
}

export function numeroPorExtenso(n: number): string {
  if (n === 0) return "zero";
  const milhares = Math.floor(n / 1000);
  const resto = n % 1000;
  const segMilhar =
    milhares > 0 ? (milhares === 1 ? "mil" : `${grupoPorExtenso(milhares)} mil`) : "";
  const segResto = resto > 0 ? grupoPorExtenso(resto) : "";
  if (!segMilhar) return segResto;
  if (!segResto) return segMilhar;
  const conector = resto < 100 || resto % 100 === 0 ? " e " : ", ";
  return `${segMilhar}${conector}${segResto}`;
}

export function valorPorExtenso(valor: number, moeda = "BRL"): string {
  const inteiro = Math.floor(Math.round(valor * 100) / 100);
  const centavos = Math.round((valor - inteiro) * 100);
  const unidade = moeda === "BRL" ? (inteiro === 1 ? "real" : "reais") : moeda;
  let out = `${numeroPorExtenso(inteiro)} ${unidade}`;
  if (centavos > 0) {
    out += ` e ${numeroPorExtenso(centavos)} centavo${centavos === 1 ? "" : "s"}`;
  }
  return out;
}

export function formatarMoeda(valor: number, moeda = "BRL"): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: moeda });
}

// --- descrição de cada item (frase fixa por categoria) ---------------
// Mapeamento tirado direto dos invoices reais que a BDR mandou -- não é
// texto inventado, é o que o escritório já usa pra cada tipo de ato.
const FRASES_HONORARIOS: Record<string, string> = {
  cadastramento: "ao cadastramento do processo",
  acordo: "ao acordo celebrado",
  sentenca: "a prolação de sentença",
  acordao: "a prolação do acórdão",
  "transito em julgado": "ao trânsito em julgado da demanda",
};

function paragrafoHonorarios(valor: number, moeda: string, tipoPagamento: string | null): string {
  const chave = tipoPagamento ? normalizar(tipoPagamento) : "";
  const frase =
    FRASES_HONORARIOS[chave] ??
    (tipoPagamento ? `a ${tipoPagamento.toLowerCase()}` : "ao ato praticado");
  return `Honorários no valor de ${formatarMoeda(valor, moeda)} (${valorPorExtenso(valor, moeda)}), referentes ${frase}.`;
}

function paragrafoPreposicao(valor: number, moeda: string, dataAudiencia: string | null): string {
  const dataFmt = dataAudiencia ? ` no dia ${dataISOparaBR(dataAudiencia)}` : "";
  return `Despesas no valor de ${formatarMoeda(valor, moeda)} (${valorPorExtenso(valor, moeda)}), referentes ao fornecimento de preposto para realização da audiência${dataFmt}.`;
}

function paragrafoOutraDespesa(valor: number, moeda: string, tipoDespesa: string | null): string {
  const frase = tipoDespesa ? tipoDespesa.toLowerCase() : "despesas do processo";
  return `Despesas no valor de ${formatarMoeda(valor, moeda)} (${valorPorExtenso(valor, moeda)}), referentes a ${frase}.`;
}

// --- Juízo: "{vara} de {comarca} - {uf}" ------------------------------
// A coluna de cartório/foro vem tipo "Foro de Santana de Parnaiba - Vara
// Cível" ou "Foro Central - 16ª Vara Cível" -- o nome da vara é sempre o
// que vem depois do último " - ". Comarca vem com "(UF)" redundante no
// fim, que aqui é descartado em favor da coluna UF (mais confiável --
// vi um erro de UF digitado à mão no invoice real que isso evita).
function compuserJuizo(
  foro: string | null,
  comarca: string | null,
  uf: string | null,
): string | null {
  const partes = (foro ?? "").split(" - ").map((p) => p.trim());
  const vara = partes.length > 1 ? partes[partes.length - 1] : foro?.trim();
  const comarcaLimpa = comarca ? comarca.replace(/\s*\([^)]*\)\s*$/, "").trim() : null;
  if (!vara && !comarcaLimpa) return null;
  const sufixoUf = uf ? ` - ${uf.toUpperCase()}` : "";
  if (vara && comarcaLimpa) return `${vara} de ${comarcaLimpa}${sufixoUf}`;
  return `${vara ?? comarcaLimpa}${sufixoUf}`;
}

// --- leitura e agrupamento por Caso Interno ---------------------------

type CampoBase =
  | "caso"
  | "autor"
  | "reu"
  | "processo"
  | "uf"
  | "comarca"
  | "foro"
  | "valor"
  | "moeda"
  | "invoiceNumero"
  | "invoicePeriodo"
  | "invoiceData"
  | "bsRef"
  | "correspondente"
  | "tipoPagamento"
  | "tipoDespesa"
  | "dataEvento";

const CAMPOS_BASE: Record<CampoBase, string[]> = {
  caso: ["caso"],
  autor: ["autor", "nome autor"],
  reu: ["reu", "nome reu"],
  processo: ["processo"],
  uf: ["uf"],
  comarca: ["comarca"],
  foro: ["foro", "cartorio"],
  valor: ["amount", "valor"],
  moeda: ["currency", "moeda"],
  invoiceNumero: ["invoice"],
  invoicePeriodo: ["invoice period"],
  invoiceData: ["invoice date"],
  bsRef: ["b&s ref.", "b&s ref", "bs ref"],
  correspondente: ["correspondente"],
  tipoPagamento: ["tipo pagamento"],
  tipoDespesa: ["tipo despesa"],
  dataEvento: ["data da audiencia", "data despesa", "data audiencia"],
};
const SINONIMOS: Record<string, CampoBase> = {};
for (const [campo, nomes] of Object.entries(CAMPOS_BASE)) {
  for (const nome of nomes) SINONIMOS[nome] = campo as CampoBase;
}

type LinhaBruta = {
  tipo: TipoItemFatura;
  dados: Partial<Record<CampoBase, unknown>>;
};

export function lerPlanilhaFatura(buffer: ArrayBuffer): NotaFatura[] {
  const wb = XLSX.read(buffer, { cellDates: true, cellFormula: false, cellHTML: false });
  const porCaso = new Map<string, LinhaBruta[]>();
  const ordemCaso: string[] = [];
  let semCasoSeq = 0;

  for (const nomeAba of wb.SheetNames) {
    const tipo = classificarAba(nomeAba);
    if (!tipo) continue;
    const sheet = wb.Sheets[nomeAba];
    if (!sheet) continue;

    const matriz = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false });
    if (matriz.length === 0) continue;
    const cabecalho = (matriz[0] ?? []).map((c) => normalizar(texto(c) ?? ""));

    for (let i = 1; i < matriz.length; i++) {
      const bruta = matriz[i] ?? [];
      if (!bruta.some((c) => texto(c) != null)) continue;
      const dados: Partial<Record<CampoBase, unknown>> = {};
      cabecalho.forEach((col, j) => {
        const campo = SINONIMOS[col];
        if (campo && dados[campo] == null) dados[campo] = bruta[j];
      });

      // Pula linha de resumo ("Total do invoice" etc.) que planilhas desse
      // tipo costumam ter no fim -- ela não é um lançamento de verdade e,
      // se cair num campo de texto, trava a geração (ex.: "TOTAL" lido
      // como código de moeda).
      const camposTexto = [
        dados.caso,
        dados.autor,
        dados.reu,
        dados.processo,
        dados.moeda,
        dados.tipoPagamento,
        dados.tipoDespesa,
      ]
        .map((v) => texto(v))
        .filter((v): v is string => v != null)
        .map(normalizar);
      if (camposTexto.some((v) => v === "total" || v === "totais")) continue;

      const chaveCaso = texto(dados.caso) ?? `sem-caso-${semCasoSeq++}`;
      if (!porCaso.has(chaveCaso)) {
        porCaso.set(chaveCaso, []);
        ordemCaso.push(chaveCaso);
      }
      porCaso.get(chaveCaso)!.push({ tipo, dados });
    }
  }

  const notas: NotaFatura[] = [];
  ordemCaso.forEach((chaveCaso, idx) => {
    const linhas = porCaso.get(chaveCaso)!;
    const primeira = linhas[0]!.dados;
    const moeda = moedaValida(texto(primeira.moeda)) ?? "BRL";

    const itens: ItemFatura[] = linhas.map(({ tipo, dados }) => {
      const valor = numero(dados.valor) ?? 0;
      const moedaItem = moedaValida(texto(dados.moeda)) ?? moeda;
      const paragrafo =
        tipo === "Honorários"
          ? paragrafoHonorarios(valor, moedaItem, texto(dados.tipoPagamento))
          : tipo === "Despesa de Preposição"
            ? paragrafoPreposicao(valor, moedaItem, dataISO(dados.dataEvento))
            : paragrafoOutraDespesa(valor, moedaItem, texto(dados.tipoDespesa));
      return { tipo, valor, paragrafo };
    });

    notas.push({
      idx,
      casoInterno: texto(primeira.caso),
      autor: texto(primeira.autor),
      reu: texto(primeira.reu),
      processo: texto(primeira.processo),
      juizo: compuserJuizo(texto(primeira.foro), texto(primeira.comarca), texto(primeira.uf)),
      bsRef: texto(primeira.bsRef),
      correspondente: texto(primeira.correspondente),
      invoicePeriodo: texto(primeira.invoicePeriodo),
      invoiceData: dataISO(primeira.invoiceData),
      moeda,
      itens,
      valorTotal: itens.reduce((soma, item) => soma + item.valor, 0),
    });
  });

  return notas;
}

export function nomeArquivoFatura(nota: NotaFatura): string {
  const base = (nota.casoInterno ?? String(nota.idx + 1))
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `nota-honorarios-${base || nota.idx + 1}.pdf`;
}
