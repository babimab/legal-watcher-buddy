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

export function estimarLargura(texto: string, tamanho: number, negrito = false) {
  return texto.length * tamanho * (negrito ? 0.54 : 0.5);
}

export function quebrarTexto(texto: string, largura: number, tamanho: number) {
  const palavras = String(texto ?? "")
    .split(/\s+/)
    .filter(Boolean);
  if (!palavras.length) return [""];
  const linhas: string[] = [];
  let atual = palavras[0] ?? "";
  for (let i = 1; i < palavras.length; i++) {
    const tentativa = `${atual} ${palavras[i]}`;
    if (estimarLargura(tentativa, tamanho) <= largura) atual = tentativa;
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
    },
  ) {
    const bold = opts?.bold ?? false;
    const color = opts?.color ?? CORES.text;
    let tx = x;
    if (opts?.align === "center") tx -= estimarLargura(texto, tamanho, bold) / 2;
    if (opts?.align === "right") tx -= estimarLargura(texto, tamanho, bold);
    this.comandos.push(
      `BT /${bold ? "F2" : "F1"} ${tamanho.toFixed(2)} Tf ${rgb(color)} rg ${tx.toFixed(2)} ${(A4_H - yTopo).toFixed(2)} Td ${pdfLiteral(texto)} Tj ET`,
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
        `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${A4_W.toFixed(2)} ${A4_H.toFixed(2)}] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> /XObject << ${xObjects} >> >> /Contents ${contentId} 0 R >>`,
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
