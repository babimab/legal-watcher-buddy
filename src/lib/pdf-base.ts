// Gerador de PDF próprio, sem biblioteca externa -- escreve os bytes do
// PDF na mão (texto, retângulos, linhas, imagem JPEG). Extraído de
// pdf-calculo.ts pra ser reaproveitado por qualquer outro documento que
// precise desse mesmo tipo de PDF gerado no navegador (ex.: fatura).
export type ImagemPdf = { bytes: Uint8Array; width: number; height: number };
type PdfObject = Uint8Array;

export const A4_W = 595.28;
export const A4_H = 841.89;
export const MARGIN = 36;

export const CORES = {
  navy: [8, 46, 69] as const,
  blue: [13, 73, 104] as const,
  accent: [45, 126, 165] as const,
  light: [243, 249, 252] as const,
  lighter: [248, 251, 253] as const,
  border: [198, 220, 231] as const,
  text: [23, 52, 71] as const,
  muted: [88, 120, 139] as const,
  white: [255, 255, 255] as const,
};

const encoder = new TextEncoder();

export function isoBR(data: string) {
  if (!data) return "";
  const [a, m, d] = data.split("-");
  return `${d}/${m}/${a}`;
}

export function moeda(n: number, codigo = "BRL") {
  return n.toLocaleString("pt-BR", { style: "currency", currency: codigo });
}

export function nomeSeguro(nome: string) {
  return (
    nome
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "documento"
  );
}

function cp1252Byte(ch: string): number {
  const code = ch.charCodeAt(0);
  if (code <= 0x7f || (code >= 0xa0 && code <= 0xff)) return code;
  const mapa: Record<string, number> = {
    "€": 128,
    "‚": 130,
    ƒ: 131,
    "„": 132,
    "…": 133,
    "†": 134,
    "‡": 135,
    ˆ: 136,
    "‰": 137,
    Š: 138,
    "‹": 139,
    Œ: 140,
    Ž: 142,
    "‘": 145,
    "’": 146,
    "“": 147,
    "”": 148,
    "•": 149,
    "–": 150,
    "—": 151,
    "˜": 152,
    "™": 153,
    š: 154,
    "›": 155,
    œ: 156,
    ž: 158,
    Ÿ: 159,
  };
  return mapa[ch] ?? 63;
}

function pdfLiteral(texto: string) {
  let out = "";
  for (const ch of texto) {
    const b = cp1252Byte(ch);
    if (b === 40 || b === 41 || b === 92) out += `\\${String.fromCharCode(b)}`;
    else if (b >= 32 && b <= 126) out += String.fromCharCode(b);
    else out += `\\${b.toString(8).padStart(3, "0")}`;
  }
  return `(${out})`;
}

function rgb(c: readonly [number, number, number]) {
  return `${(c[0] / 255).toFixed(4)} ${(c[1] / 255).toFixed(4)} ${(c[2] / 255).toFixed(4)}`;
}

function concatBytes(partes: Uint8Array[]) {
  const total = partes.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(total);
  let pos = 0;
  for (const p of partes) {
    out.set(p, pos);
    pos += p.length;
  }
  return out;
}

function objTexto(texto: string): PdfObject {
  return encoder.encode(texto);
}

function objStream(conteudo: Uint8Array, dicionario = "") {
  return concatBytes([
    encoder.encode(`<< ${dicionario} /Length ${conteudo.length} >>\nstream\n`),
    conteudo,
    encoder.encode("\nendstream"),
  ]);
}

async function carregarImagem(url: string) {
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Não foi possível carregar a imagem ${url}.`));
    img.src = url;
  });
}

// Converte qualquer imagem (PNG com transparência, etc.) pra JPEG com fundo
// sólido -- é o único formato de imagem que esse gerador sabe embutir.
export async function imagemComoJpeg(
  url: string,
  fundo: readonly [number, number, number],
  opacidade = 1,
): Promise<ImagemPdf> {
  const img = await carregarImagem(url);
  const largura = 1000;
  const altura = Math.max(1, Math.round((img.naturalHeight / img.naturalWidth) * largura));
  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível preparar a imagem.");
  ctx.fillStyle = `rgb(${fundo[0]},${fundo[1]},${fundo[2]})`;
  ctx.fillRect(0, 0, largura, altura);
  ctx.globalAlpha = opacidade;
  ctx.drawImage(img, 0, 0, largura, altura);
  ctx.globalAlpha = 1;
  const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
  const base64 = dataUrl.split(",")[1] ?? "";
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { bytes, width: largura, height: altura };
}

// Larguras reais da Helvetica / Helvetica-Bold (AFM, em unidades de
// 1/1000 em) -- a aproximação antiga (comprimento × tamanho × 0.5) errava
// bastante em texto maiúsculo/negrito (nomes de parte, títulos), o
// suficiente pra texto "caber" na conta e estourar a margem de verdade no
// render. Caracteres acentuados caem no caractere-base (o desenho do
// acento não muda a largura de avanço na Helvetica).
const LARGURA_HELVETICA: Record<string, number> = {
  " ": 278,
  "!": 278,
  '"': 355,
  "#": 556,
  $: 556,
  "%": 889,
  "&": 667,
  "'": 191,
  "(": 333,
  ")": 333,
  "*": 389,
  "+": 584,
  ",": 278,
  "-": 333,
  ".": 278,
  "/": 278,
  "0": 556,
  "1": 556,
  "2": 556,
  "3": 556,
  "4": 556,
  "5": 556,
  "6": 556,
  "7": 556,
  "8": 556,
  "9": 556,
  ":": 278,
  ";": 278,
  "<": 584,
  "=": 584,
  ">": 584,
  "?": 556,
  "@": 1015,
  A: 667,
  B: 667,
  C: 722,
  D: 722,
  E: 667,
  F: 611,
  G: 778,
  H: 722,
  I: 278,
  J: 500,
  K: 667,
  L: 556,
  M: 833,
  N: 722,
  O: 778,
  P: 667,
  Q: 778,
  R: 722,
  S: 667,
  T: 611,
  U: 722,
  V: 667,
  W: 944,
  X: 667,
  Y: 667,
  Z: 611,
  "[": 278,
  "\\": 278,
  "]": 278,
  "^": 469,
  _: 556,
  "`": 333,
  a: 556,
  b: 556,
  c: 500,
  d: 556,
  e: 556,
  f: 278,
  g: 556,
  h: 556,
  i: 222,
  j: 222,
  k: 500,
  l: 222,
  m: 833,
  n: 556,
  o: 556,
  p: 556,
  q: 556,
  r: 333,
  s: 500,
  t: 278,
  u: 556,
  v: 500,
  w: 722,
  x: 500,
  y: 500,
  z: 500,
  "{": 334,
  "|": 260,
  "}": 334,
  "~": 584,
};
const LARGURA_HELVETICA_BOLD: Record<string, number> = {
  " ": 278,
  "!": 333,
  '"': 474,
  "#": 556,
  $: 556,
  "%": 889,
  "&": 722,
  "'": 238,
  "(": 333,
  ")": 333,
  "*": 389,
  "+": 584,
  ",": 278,
  "-": 333,
  ".": 278,
  "/": 278,
  "0": 556,
  "1": 556,
  "2": 556,
  "3": 556,
  "4": 556,
  "5": 556,
  "6": 556,
  "7": 556,
  "8": 556,
  "9": 556,
  ":": 333,
  ";": 333,
  "<": 584,
  "=": 584,
  ">": 584,
  "?": 611,
  "@": 975,
  A: 722,
  B: 722,
  C: 722,
  D: 722,
  E: 667,
  F: 611,
  G: 778,
  H: 722,
  I: 278,
  J: 556,
  K: 722,
  L: 611,
  M: 833,
  N: 722,
  O: 778,
  P: 667,
  Q: 778,
  R: 722,
  S: 667,
  T: 611,
  U: 722,
  V: 667,
  W: 944,
  X: 667,
  Y: 667,
  Z: 611,
  "[": 333,
  "\\": 278,
  "]": 333,
  "^": 584,
  _: 556,
  "`": 333,
  a: 556,
  b: 611,
  c: 556,
  d: 611,
  e: 556,
  f: 333,
  g: 611,
  h: 611,
  i: 278,
  j: 278,
  k: 556,
  l: 278,
  m: 889,
  n: 611,
  o: 611,
  p: 611,
  q: 611,
  r: 389,
  s: 556,
  t: 333,
  u: 611,
  v: 556,
  w: 778,
  x: 556,
  y: 556,
  z: 500,
  "{": 389,
  "|": 280,
  "}": 389,
  "~": 584,
};
// Larguras reais da Times-Roman / Times-Bold (AFM) -- documento jurídico
// (substabelecimento etc.) usa Times New Roman no modelo real, não dá
// pra reaproveitar a tabela da Helvetica (larguras bem diferentes).
const LARGURA_TIMES: Record<string, number> = {
  " ": 250,
  "!": 333,
  '"': 408,
  "#": 500,
  $: 500,
  "%": 833,
  "&": 778,
  "'": 180,
  "(": 333,
  ")": 333,
  "*": 500,
  "+": 564,
  ",": 250,
  "-": 333,
  ".": 250,
  "/": 278,
  "0": 500,
  "1": 500,
  "2": 500,
  "3": 500,
  "4": 500,
  "5": 500,
  "6": 500,
  "7": 500,
  "8": 500,
  "9": 500,
  ":": 278,
  ";": 278,
  "<": 564,
  "=": 564,
  ">": 564,
  "?": 444,
  "@": 921,
  A: 722,
  B: 667,
  C: 667,
  D: 722,
  E: 611,
  F: 556,
  G: 722,
  H: 722,
  I: 333,
  J: 389,
  K: 722,
  L: 611,
  M: 889,
  N: 722,
  O: 722,
  P: 556,
  Q: 722,
  R: 667,
  S: 556,
  T: 611,
  U: 722,
  V: 722,
  W: 944,
  X: 722,
  Y: 722,
  Z: 611,
  "[": 333,
  "\\": 278,
  "]": 333,
  "^": 469,
  _: 500,
  "`": 333,
  a: 444,
  b: 500,
  c: 444,
  d: 500,
  e: 444,
  f: 333,
  g: 500,
  h: 500,
  i: 278,
  j: 278,
  k: 500,
  l: 278,
  m: 778,
  n: 500,
  o: 500,
  p: 500,
  q: 500,
  r: 333,
  s: 389,
  t: 278,
  u: 500,
  v: 500,
  w: 722,
  x: 500,
  y: 500,
  z: 444,
  "{": 480,
  "|": 200,
  "}": 480,
  "~": 541,
};
const LARGURA_TIMES_BOLD: Record<string, number> = {
  " ": 250,
  "!": 333,
  '"': 555,
  "#": 500,
  $: 500,
  "%": 1000,
  "&": 833,
  "'": 278,
  "(": 333,
  ")": 333,
  "*": 500,
  "+": 570,
  ",": 250,
  "-": 333,
  ".": 250,
  "/": 278,
  "0": 500,
  "1": 500,
  "2": 500,
  "3": 500,
  "4": 500,
  "5": 500,
  "6": 500,
  "7": 500,
  "8": 500,
  "9": 500,
  ":": 333,
  ";": 333,
  "<": 570,
  "=": 570,
  ">": 570,
  "?": 500,
  "@": 930,
  A: 722,
  B: 667,
  C: 722,
  D: 722,
  E: 667,
  F: 611,
  G: 778,
  H: 778,
  I: 389,
  J: 500,
  K: 778,
  L: 667,
  M: 944,
  N: 722,
  O: 778,
  P: 611,
  Q: 778,
  R: 722,
  S: 556,
  T: 667,
  U: 722,
  V: 722,
  W: 1000,
  X: 722,
  Y: 722,
  Z: 667,
  "[": 333,
  "\\": 278,
  "]": 333,
  "^": 581,
  _: 500,
  "`": 333,
  a: 500,
  b: 556,
  c: 444,
  d: 556,
  e: 444,
  f: 333,
  g: 500,
  h: 556,
  i: 278,
  j: 333,
  k: 556,
  l: 278,
  m: 833,
  n: 556,
  o: 500,
  p: 556,
  q: 556,
  r: 444,
  s: 389,
  t: 333,
  u: 556,
  v: 500,
  w: 722,
  x: 500,
  y: 500,
  z: 444,
  "{": 394,
  "|": 220,
  "}": 394,
  "~": 520,
};

export type Fonte = "helvetica" | "times";

// Letra-base de um acentuado Latin-1 comum em PT-BR (á->a, Ç->C etc.), pra
// cair numa largura próxima da real em vez do valor "desconhecido".
const BASE_ACENTO: Record<string, string> = {
  á: "a",
  à: "a",
  â: "a",
  ã: "a",
  ä: "a",
  Á: "A",
  À: "A",
  Â: "A",
  Ã: "A",
  Ä: "A",
  é: "e",
  è: "e",
  ê: "e",
  ë: "e",
  É: "E",
  È: "E",
  Ê: "E",
  Ë: "E",
  í: "i",
  ì: "i",
  î: "i",
  ï: "i",
  Í: "I",
  Ì: "I",
  Î: "I",
  Ï: "I",
  ó: "o",
  ò: "o",
  ô: "o",
  õ: "o",
  ö: "o",
  Ó: "O",
  Ò: "O",
  Ô: "O",
  Õ: "O",
  Ö: "O",
  ú: "u",
  ù: "u",
  û: "u",
  ü: "u",
  Ú: "U",
  Ù: "U",
  Û: "U",
  Ü: "U",
  ç: "c",
  Ç: "C",
  ñ: "n",
  Ñ: "N",
};

function larguraCaractere(ch: string, negrito: boolean, fonte: Fonte): number {
  const tabela =
    fonte === "times"
      ? negrito
        ? LARGURA_TIMES_BOLD
        : LARGURA_TIMES
      : negrito
        ? LARGURA_HELVETICA_BOLD
        : LARGURA_HELVETICA;
  const base = BASE_ACENTO[ch] ?? ch;
  return tabela[base] ?? (negrito ? 611 : 556);
}

export function estimarLargura(
  texto: string,
  tamanho: number,
  negrito = false,
  fonte: Fonte = "helvetica",
) {
  let total = 0;
  for (const ch of texto) total += larguraCaractere(ch, negrito, fonte);
  return (total / 1000) * tamanho;
}

export function quebrarTexto(
  texto: string,
  largura: number,
  tamanho: number,
  negrito = false,
  fonte: Fonte = "helvetica",
) {
  const palavras = String(texto ?? "")
    .split(/\s+/)
    .filter(Boolean);
  if (!palavras.length) return [""];
  const linhas: string[] = [];
  let atual = palavras[0] ?? "";
  for (let i = 1; i < palavras.length; i++) {
    const tentativa = `${atual} ${palavras[i]}`;
    if (estimarLargura(tentativa, tamanho, negrito, fonte) <= largura) atual = tentativa;
    else {
      linhas.push(atual);
      atual = palavras[i]!;
    }
  }
  linhas.push(atual);
  return linhas;
}

export class Pagina {
  comandos: string[] = [];
  // Nomes das imagens (XObjects) usadas nessa página -- montarPdf só
  // inclui no /Resources as que cada página realmente referencia.
  imagensUsadas = new Set<string>();

  fill(c: readonly [number, number, number]) {
    this.comandos.push(`${rgb(c)} rg`);
  }
  stroke(c: readonly [number, number, number]) {
    this.comandos.push(`${rgb(c)} RG`);
  }
  rect(x: number, yTopo: number, w: number, h: number, fill = true, stroke = false) {
    const y = A4_H - yTopo - h;
    this.comandos.push(
      `${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re ${fill && stroke ? "B" : fill ? "f" : "S"}`,
    );
  }
  line(x1: number, y1Topo: number, x2: number, y2Topo: number) {
    this.comandos.push(
      `${x1.toFixed(2)} ${(A4_H - y1Topo).toFixed(2)} m ${x2.toFixed(2)} ${(A4_H - y2Topo).toFixed(2)} l S`,
    );
  }
  text(
    texto: string,
    x: number,
    yTopo: number,
    tamanho = 10,
    opts?: {
      bold?: boolean;
      color?: readonly [number, number, number];
      align?: "left" | "center" | "right";
      fonte?: Fonte;
      // Largura alvo pra justificar (margem reta nos dois lados, tipo
      // Word) -- espalha o espaço que sobra entre as palavras da linha
      // via Tw (word spacing). Só faz sentido pra texto align:"left"
      // (ou sem align) com mais de uma palavra; a última linha de um
      // parágrafo normalmente não deve receber isso (fica em trapo).
      justificarLargura?: number;
    },
  ) {
    const bold = opts?.bold ?? false;
    const color = opts?.color ?? CORES.text;
    const fonte = opts?.fonte ?? "helvetica";
    let tx = x;
    if (opts?.align === "center") tx -= estimarLargura(texto, tamanho, bold, fonte) / 2;
    if (opts?.align === "right") tx -= estimarLargura(texto, tamanho, bold, fonte);

    let tw = 0;
    if (opts?.justificarLargura) {
      const numEspacos = (texto.match(/ /g) ?? []).length;
      const natural = estimarLargura(texto, tamanho, bold, fonte);
      if (numEspacos > 0 && natural < opts.justificarLargura) {
        tw = (opts.justificarLargura - natural) / numEspacos;
      }
    }

    const nomeFonte = fonte === "times" ? (bold ? "F4" : "F3") : bold ? "F2" : "F1";
    this.comandos.push(
      `BT /${nomeFonte} ${tamanho.toFixed(2)} Tf ${tw.toFixed(3)} Tw ${rgb(color)} rg ${tx.toFixed(2)} ${(A4_H - yTopo).toFixed(2)} Td ${pdfLiteral(texto)} Tj ET`,
    );
  }
  image(nome: string, x: number, yTopo: number, w: number, h: number) {
    this.imagensUsadas.add(nome);
    const y = A4_H - yTopo - h;
    this.comandos.push(
      `q ${w.toFixed(2)} 0 0 ${h.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm /${nome} Do Q`,
    );
  }
}

export function tituloSecao(p: Pagina, titulo: string, y: number) {
  p.text(titulo, MARGIN, y, 12.5, { bold: true, color: CORES.navy });
  p.stroke(CORES.border);
  p.line(MARGIN, y + 7, A4_W - MARGIN, y + 7);
  p.stroke(CORES.accent);
  p.line(MARGIN, y + 7, MARGIN + 36, y + 7);
}

export function tabelaCabecalho(
  p: Pagina,
  y: number,
  xs: number[],
  larguras: number[],
  cabecalhos: string[],
) {
  p.fill(CORES.blue);
  p.rect(
    MARGIN,
    y,
    larguras.reduce((a, b) => a + b, 0),
    22,
  );
  cabecalhos.forEach((h, i) =>
    p.text(h, xs[i]! + larguras[i]! / 2, y + 14, 7, {
      bold: true,
      color: CORES.white,
      align: "center",
    }),
  );
  return y + 22;
}

export function montarPdf(paginas: Pagina[], imagens: Record<string, ImagemPdf>) {
  const objetos: PdfObject[] = [];
  const add = (obj: PdfObject) => {
    objetos.push(obj);
    return objetos.length;
  };

  const catalogId = add(objTexto(""));
  const pagesId = add(objTexto(""));
  const fontRegularId = add(
    objTexto("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"),
  );
  const fontBoldId = add(
    objTexto(
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    ),
  );
  const fontTimesId = add(
    objTexto("<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman /Encoding /WinAnsiEncoding >>"),
  );
  const fontTimesBoldId = add(
    objTexto("<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold /Encoding /WinAnsiEncoding >>"),
  );

  const imagemIds: Record<string, number> = {};
  for (const [nome, img] of Object.entries(imagens)) {
    imagemIds[nome] = add(
      objStream(
        img.bytes,
        `/Type /XObject /Subtype /Image /Width ${img.width} /Height ${img.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode`,
      ),
    );
  }

  const paginaIds: number[] = [];
  for (const pagina of paginas) {
    const conteudo = encoder.encode(pagina.comandos.join("\n"));
    const contentId = add(objStream(conteudo));
    const xObjects = [...pagina.imagensUsadas]
      .map((nome) => `/${nome} ${imagemIds[nome]} 0 R`)
      .join(" ");
    const pageId = add(
      objTexto(
        `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${A4_W.toFixed(2)} ${A4_H.toFixed(2)}] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R /F3 ${fontTimesId} 0 R /F4 ${fontTimesBoldId} 0 R >> /XObject << ${xObjects} >> >> /Contents ${contentId} 0 R >>`,
      ),
    );
    paginaIds.push(pageId);
  }

  objetos[catalogId - 1] = objTexto(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
  objetos[pagesId - 1] = objTexto(
    `<< /Type /Pages /Kids [${paginaIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${paginaIds.length} >>`,
  );

  const partes: Uint8Array[] = [encoder.encode("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n")];
  const offsets = [0];
  let pos = partes[0]!.length;
  objetos.forEach((obj, idx) => {
    offsets[idx + 1] = pos;
    const inicio = encoder.encode(`${idx + 1} 0 obj\n`);
    const fim = encoder.encode("\nendobj\n");
    partes.push(inicio, obj, fim);
    pos += inicio.length + obj.length + fim.length;
  });
  const xrefPos = pos;
  let xref = `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objetos.length; i++)
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  xref += `trailer\n<< /Size ${objetos.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;
  partes.push(encoder.encode(xref));
  return new Blob([concatBytes(partes)], { type: "application/pdf" });
}

export function baixarBlob(blob: Blob, nomeArquivo: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
