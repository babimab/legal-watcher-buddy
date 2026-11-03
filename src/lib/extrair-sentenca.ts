import type { TipoIndice, TipoJuros } from "@/lib/calculos-judiciais";

// Leitura de sentença/acórdão/decisão (PDF) pra sugerir campos do cálculo
// judicial -- sem IA generativa, só extração de texto (pdfjs-dist) +
// regex/palavra-chave em cima do texto bruto. Sempre volta como
// SUGESTÃO: quem usa confere e aplica campo a campo, nunca preenche
// sozinho (sentença é texto livre, juiz que foge do padrão não cai em
// regex nenhum, e errar valor/índice em cálculo judicial é sério).

// Import dinâmico (não no topo do arquivo) de propósito: essa função só
// roda no navegador, disparada por quem clica em "Ler sentença/acórdão".
// pdfjs-dist e o worker (sufixo ?worker do Vite) são coisa de browser --
// deixar como import estático no topo arriscaria quebrar o bundle do
// lado servidor nesse app, que usa SSR (TanStack Start).
let workerConfigurado = false;
async function configurarWorker() {
  if (workerConfigurado) return;
  const { GlobalWorkerOptions } = await import("pdfjs-dist");
  const { default: PdfWorker } = await import("pdfjs-dist/build/pdf.worker.mjs?worker");
  GlobalWorkerOptions.workerPort = new PdfWorker();
  workerConfigurado = true;
}

export async function extrairTextoPdf(arquivo: File): Promise<string> {
  await configurarWorker();
  const { getDocument } = await import("pdfjs-dist");
  const bytes = new Uint8Array(await arquivo.arrayBuffer());
  const pdf = await getDocument({ data: bytes }).promise;
  const paginas: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const pagina = await pdf.getPage(i);
    const conteudo = await pagina.getTextContent();
    paginas.push(conteudo.items.map((item) => ("str" in item ? item.str : "")).join(" "));
  }
  return paginas.join("\n");
}

export type SugestaoValor = {
  descricao: string;
  valor: number;
  trecho: string;
};

export type SugestaoIndice = {
  // Só vem preenchido (ipca/igpm) quando o sistema já sabe calcular esse
  // índice -- o nome cru sempre vem em textoEncontrado, mesmo quando
  // indice fica null (ex.: INPC, Tabela Prática do TJ -- esse sistema
  // ainda não calcula esses, preencher manual).
  indice: TipoIndice | null;
  textoEncontrado: string;
};

export type SugestaoJuros = {
  juros: TipoJuros | null;
  taxa: number | null;
  textoEncontrado: string;
};

export type SugestaoTermoInicial = {
  tipo: "correcao" | "juros";
  regra: string;
  // ISO, só quando achou uma data literal de verdade associada à regra
  // (ex.: "desde o arbitramento" = data da própria decisão). Vazio
  // significa "a regra existe, mas a data precisa ser preenchida à mão".
  dataEncontrada: string | null;
};

export type SugestaoSentenca = {
  processo: string | null;
  dataDecisao: string | null;
  valores: SugestaoValor[];
  indice: SugestaoIndice | null;
  juros: SugestaoJuros | null;
  termosIniciais: SugestaoTermoInicial[];
};

const MESES: Record<string, string> = {
  janeiro: "01",
  fevereiro: "02",
  marco: "03",
  abril: "04",
  maio: "05",
  junho: "06",
  julho: "07",
  agosto: "08",
  setembro: "09",
  outubro: "10",
  novembro: "11",
  dezembro: "12",
};

function semAcento(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function extrairProcesso(texto: string): string | null {
  const m = texto.match(/\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/);
  return m ? m[0] : null;
}

// Linha de fechamento típica de sentença/acórdão: "São Paulo, 10 de
// março de 2026." -- pega a ÚLTIMA ocorrência (a primeira pode ser do
// cabeçalho/relatório, citando outra data).
function extrairDataDecisao(texto: string): string | null {
  const regex = /(\d{1,2})\s+de\s+([a-zç]+)\s+de\s+(\d{4})/gi;
  let ultimo: RegExpExecArray | null = null;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(texto)) != null) ultimo = m;
  if (!ultimo) return null;
  const dia = ultimo[1]!.padStart(2, "0");
  const mes = MESES[semAcento(ultimo[2]!.toLowerCase())];
  const ano = ultimo[3]!;
  if (!mes) return null;
  return `${ano}-${mes}-${dia}`;
}

const PALAVRAS_VERBA: { regex: RegExp; descricao: string }[] = [
  { regex: /dano\s+moral/i, descricao: "Dano moral" },
  { regex: /dano\s+material/i, descricao: "Dano material" },
  { regex: /lucros?\s+cessantes?/i, descricao: "Lucros cessantes" },
  { regex: /restitui[çc][ãa]o/i, descricao: "Restituição" },
  { regex: /multa\s+(contratual|compensat[óo]ria|morat[óo]ria)/i, descricao: "Multa contratual" },
  {
    regex: /honor[áa]rios?\s+(advocat[íi]cios|sucumbenciais)/i,
    descricao: "Honorários sucumbenciais",
  },
];

function extrairValores(texto: string): SugestaoValor[] {
  const regexValor = /R\$\s?([\d.]{1,12},\d{2})/g;
  const encontrados: SugestaoValor[] = [];
  const vistos = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = regexValor.exec(texto)) != null) {
    const bruto = m[1]!;
    const valor = Number(bruto.replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(valor) || valor <= 0) continue;

    const inicioJanela = Math.max(0, m.index - 150);
    const fimJanela = Math.min(texto.length, m.index + bruto.length + 150);
    const janela = texto.slice(inicioJanela, fimJanela);

    const tipo = PALAVRAS_VERBA.find((p) => p.regex.test(janela));
    if (!tipo) continue;

    const chave = `${tipo.descricao}|${valor}`;
    if (vistos.has(chave)) continue;
    vistos.add(chave);

    encontrados.push({
      descricao: tipo.descricao,
      valor,
      trecho: janela.replace(/\s+/g, " ").trim(),
    });
  }
  return encontrados;
}

function extrairIndice(texto: string): SugestaoIndice | null {
  if (/ipca-?e?/i.test(texto)) {
    return { indice: "ipca", textoEncontrado: texto.match(/ipca-?e?/i)![0] };
  }
  if (/igp-?m/i.test(texto)) {
    return { indice: "igpm", textoEncontrado: texto.match(/igp-?m/i)![0] };
  }
  if (/inpc/i.test(texto)) {
    return { indice: null, textoEncontrado: "INPC" };
  }
  if (/tabela\s+pr[áa]tica/i.test(texto)) {
    return { indice: null, textoEncontrado: texto.match(/tabela\s+pr[áa]tica[^.,;]{0,30}/i)![0] };
  }
  return null;
}

function extrairJuros(texto: string): SugestaoJuros | null {
  const pct = texto.match(
    /juros[^.]{0,50}?(\d+(?:,\d+)?)\s?%\s?(ao\s+m[êe]s|a\.?\s?m\.?|ao\s+ano|a\.?\s?a\.?)/i,
  );
  if (pct) {
    const taxa = Number(pct[1]!.replace(",", "."));
    const anual = /ano|a\.?\s?a\.?/i.test(pct[2]!);
    return { juros: anual ? "anual" : "mensal", taxa, textoEncontrado: pct[0] };
  }
  if (/taxa\s+selic|juros\s+(da\s+)?selic/i.test(texto)) {
    const m = texto.match(/[^.]{0,20}(taxa\s+selic|juros\s+(da\s+)?selic)[^.]{0,20}/i)!;
    return { juros: "selic", taxa: null, textoEncontrado: m[0].trim() };
  }
  if (/taxa\s+legal|art(?:igo)?\.?\s*406/i.test(texto)) {
    const m = texto.match(/[^.]{0,20}(taxa\s+legal|art(?:igo)?\.?\s*406[^.]{0,30})[^.]{0,20}/i)!;
    return { juros: "taxa_legal", taxa: null, textoEncontrado: m[0].trim() };
  }
  if (/juros\s+legais/i.test(texto)) {
    const m = texto.match(/[^.]{0,20}juros\s+legais[^.]{0,20}/i)!;
    return { juros: null, taxa: null, textoEncontrado: m[0].trim() };
  }
  return null;
}

const REGRAS_TERMO_INICIAL: {
  regex: RegExp;
  regra: string;
  tipo: "juros" | "correcao";
}[] = [
  {
    // "a partir de" contrai com artigo ("a partir da citação"), "desde"
    // não ("desde a citação") -- as duas formas aparecem na prática, por
    // isso cada regra casa os dois conectores com a concordância certa
    // em vez de um conector genérico só.
    regex: /juros[^.]{0,60}?(a\s+contar\s+da|a\s+partir\s+da|desde\s+a)\s+cita[çc][ãa]o/i,
    regra: "a contar da citação",
    tipo: "juros",
  },
  {
    regex:
      /juros[^.]{0,60}?((a\s+partir\s+do|desde\s+o)\s+evento\s+danoso|(a\s+partir\s+da|desde\s+a)\s+data\s+do\s+(fato|il[íi]cito))/i,
    regra: "desde o evento danoso/ato ilícito",
    tipo: "juros",
  },
  {
    // "corrigido/atualizado ... a partir do arbitramento" é mais comum na
    // prática do que "correção a partir de" -- sentença usa o verbo
    // (particípio), não o substantivo.
    regex:
      /(corre[çc][ãa]o|corrigid[oa]|atualizad[oa])[^.]{0,100}?(a\s+partir\s+do|desde\s+o)\s+arbitramento/i,
    regra: "desde o arbitramento (Súmula 362/STJ)",
    tipo: "correcao",
  },
  {
    regex:
      /(corre[çc][ãa]o|corrigid[oa]|atualizad[oa])[^.]{0,100}?(a\s+partir\s+do|desde\s+o)\s+ajuizamento/i,
    regra: "desde o ajuizamento",
    tipo: "correcao",
  },
];

function extrairTermosIniciais(texto: string, dataDecisao: string | null): SugestaoTermoInicial[] {
  const achados: SugestaoTermoInicial[] = [];
  for (const regra of REGRAS_TERMO_INICIAL) {
    const m = texto.match(regra.regex);
    if (!m) continue;
    // "Desde o arbitramento" é, por definição, a própria data da decisão
    // -- as outras regras citam um evento que raramente vem com data
    // literal no corpo da sentença, então fica pra conferir à mão.
    const dataEncontrada = regra.regra.startsWith("desde o arbitramento") ? dataDecisao : null;
    achados.push({ tipo: regra.tipo, regra: regra.regra, dataEncontrada });
  }
  return achados;
}

export function sugerirDadosSentenca(texto: string): SugestaoSentenca {
  const dataDecisao = extrairDataDecisao(texto);
  return {
    processo: extrairProcesso(texto),
    dataDecisao,
    valores: extrairValores(texto),
    indice: extrairIndice(texto),
    juros: extrairJuros(texto),
    termosIniciais: extrairTermosIniciais(texto, dataDecisao),
  };
}
