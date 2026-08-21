import type { CriteriosCalculo, IdentificacaoCalculo, ResultadoCalculo } from "@/lib/calculos-judiciais";

type JpegAsset = { bytes: Uint8Array; width: number; height: number };
type PdfObject = Uint8Array;

const encoder = new TextEncoder();
const A4_W = 595.28;
const A4_H = 841.89;
const MARGIN = 36;

const COLORS = {
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

function isoBR(data: string) {
  if (!data) return "";
  const [a, m, d] = data.split("-");
  return `${d}/${m}/${a}`;
}

function moeda(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function nomeSeguro(nome: string) {
  return nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "judicial";
}

function cp1252Byte(ch: string): number {
  const code = ch.charCodeAt(0);
  if (code <= 0x7f || (code >= 0xa0 && code <= 0xff)) return code;
  const mapa: Record<string, number> = {
    "€": 128, "‚": 130, "ƒ": 131, "„": 132, "…": 133, "†": 134, "‡": 135,
    "ˆ": 136, "‰": 137, "Š": 138, "‹": 139, "Œ": 140, "Ž": 142,
    "‘": 145, "’": 146, "“": 147, "”": 148, "•": 149, "–": 150, "—": 151,
    "˜": 152, "™": 153, "š": 154, "›": 155, "œ": 156, "ž": 158, "Ÿ": 159,
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
    img.onerror = () => reject(new Error("Não foi possível carregar a logo do FaroLex."));
    img.src = url;
  });
}

async function logoComoJpeg(url: string, fundo: readonly [number, number, number], opacidade = 1): Promise<JpegAsset> {
  const img = await carregarImagem(url);
  const largura = 1000;
  const altura = Math.max(1, Math.round((img.naturalHeight / img.naturalWidth) * largura));
  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível preparar a logo do FaroLex.");
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

function estimarLargura(texto: string, tamanho: number, negrito = false) {
  return texto.length * tamanho * (negrito ? 0.54 : 0.5);
}

function quebrarTexto(texto: string, largura: number, tamanho: number) {
  const palavras = String(texto ?? "").split(/\s+/).filter(Boolean);
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

class Pagina {
  comandos: string[] = [];
  y = 0;

  fill(c: readonly [number, number, number]) { this.comandos.push(`${rgb(c)} rg`); }
  stroke(c: readonly [number, number, number]) { this.comandos.push(`${rgb(c)} RG`); }
  rect(x: number, yTopo: number, w: number, h: number, fill = true, stroke = false) {
    const y = A4_H - yTopo - h;
    this.comandos.push(`${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re ${fill && stroke ? "B" : fill ? "f" : "S"}`);
  }
  line(x1: number, y1Topo: number, x2: number, y2Topo: number) {
    this.comandos.push(`${x1.toFixed(2)} ${(A4_H - y1Topo).toFixed(2)} m ${x2.toFixed(2)} ${(A4_H - y2Topo).toFixed(2)} l S`);
  }
  text(texto: string, x: number, yTopo: number, tamanho = 10, opts?: { bold?: boolean; color?: readonly [number, number, number]; align?: "left" | "center" | "right" }) {
    const bold = opts?.bold ?? false;
    const color = opts?.color ?? COLORS.text;
    let tx = x;
    if (opts?.align === "center") tx -= estimarLargura(texto, tamanho, bold) / 2;
    if (opts?.align === "right") tx -= estimarLargura(texto, tamanho, bold);
    this.comandos.push(`BT /${bold ? "F2" : "F1"} ${tamanho.toFixed(2)} Tf ${rgb(color)} rg ${tx.toFixed(2)} ${(A4_H - yTopo).toFixed(2)} Td ${pdfLiteral(texto)} Tj ET`);
  }
  image(nome: "ImLogo" | "ImWater", x: number, yTopo: number, w: number, h: number) {
    const y = A4_H - yTopo - h;
    this.comandos.push(`q ${w.toFixed(2)} 0 0 ${h.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm /${nome} Do Q`);
  }
}

function linhasIdentificacao(identificacao?: IdentificacaoCalculo) {
  const linhas: Array<[string, string]> = [];
  if (!identificacao) return linhas;
  if (identificacao.processo) linhas.push(["Processo", identificacao.processo]);
  if (identificacao.clienteCaso) linhas.push(["Cliente/Caso", identificacao.clienteCaso]);
  if (identificacao.parteAutora) linhas.push(["Parte autora", identificacao.parteAutora]);
  if (identificacao.parteRe) linhas.push(["Parte ré", identificacao.parteRe]);
  if (!identificacao.parteAutora && identificacao.cliente) linhas.push(["Cliente", identificacao.cliente]);
  if (!identificacao.parteRe && identificacao.parteContraria) linhas.push(["Parte contrária", identificacao.parteContraria]);
  return linhas;
}

function cabecalhoPrincipal(p: Pagina, logoRatio: number, dataBase: string, watermarkRatio: number) {
  p.fill(COLORS.navy);
  p.rect(MARGIN, 32, A4_W - MARGIN * 2, 67);
  const logoW = 125;
  const logoH = logoW / logoRatio;
  p.image("ImLogo", MARGIN + 14, 45, logoW, logoH);
  p.stroke([71, 125, 151]);
  p.line(MARGIN + 151, 46, MARGIN + 151, 86);
  p.text("Memória de cálculo judicial", MARGIN + 166, 61, 12.5, { bold: true, color: COLORS.white });
  p.text("ATUALIZAÇÃO E DEMONSTRATIVO", MARGIN + 166, 77, 7.5, { color: [216, 235, 244] });
  p.text("DATA-BASE DO CÁLCULO", A4_W - MARGIN - 18, 59, 6.5, { color: [188, 217, 231], align: "right" });
  p.text(isoBR(dataBase), A4_W - MARGIN - 18, 76, 11, { bold: true, color: COLORS.white, align: "right" });

  const waterW = 330;
  const waterH = waterW / watermarkRatio;
  p.image("ImWater", (A4_W - waterW) / 2, 225, waterW, waterH);
}

function cabecalhoContinuacao(p: Pagina) {
  p.fill(COLORS.navy);
  p.rect(MARGIN, 25, A4_W - MARGIN * 2, 32);
  p.text("FaroLex", MARGIN + 12, 46, 12, { bold: true, color: COLORS.white });
  p.text("Memória de cálculo judicial", A4_W - MARGIN - 12, 46, 8, { color: [216, 235, 244], align: "right" });
}

function tituloSecao(p: Pagina, titulo: string, y: number) {
  p.text(titulo, MARGIN, y, 12.5, { bold: true, color: COLORS.navy });
  p.stroke(COLORS.border);
  p.line(MARGIN, y + 7, A4_W - MARGIN, y + 7);
  p.stroke(COLORS.accent);
  p.line(MARGIN, y + 7, MARGIN + 36, y + 7);
}

function tabelaCabecalho(p: Pagina, y: number, xs: number[], larguras: number[], cabecalhos: string[]) {
  p.fill(COLORS.blue);
  p.rect(MARGIN, y, larguras.reduce((a, b) => a + b, 0), 22);
  cabecalhos.forEach((h, i) => p.text(h, xs[i]! + larguras[i]! / 2, y + 14, 7, { bold: true, color: COLORS.white, align: "center" }));
  return y + 22;
}

function rodape(p: Pagina, pagina: number, total: number) {
  p.stroke(COLORS.border);
  p.line(MARGIN, A4_H - 31, A4_W - MARGIN, A4_H - 31);
  p.text("FaroLex · Memória de cálculo judicial", MARGIN, A4_H - 18, 6.8, { color: COLORS.muted });
  p.text(`Página ${pagina} de ${total}`, A4_W - MARGIN, A4_H - 18, 6.8, { color: COLORS.muted, align: "right" });
}

function montarPdf(paginas: Pagina[], logo: JpegAsset, watermark: JpegAsset) {
  const objetos: PdfObject[] = [];
  const add = (obj: PdfObject) => { objetos.push(obj); return objetos.length; };

  const catalogId = add(objTexto(""));
  const pagesId = add(objTexto(""));
  const fontRegularId = add(objTexto("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"));
  const fontBoldId = add(objTexto("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"));
  const logoId = add(objStream(logo.bytes, `/Type /XObject /Subtype /Image /Width ${logo.width} /Height ${logo.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode`));
  const watermarkId = add(objStream(watermark.bytes, `/Type /XObject /Subtype /Image /Width ${watermark.width} /Height ${watermark.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode`));

  const paginaIds: number[] = [];
  for (const pagina of paginas) {
    const conteudo = encoder.encode(pagina.comandos.join("\n"));
    const contentId = add(objStream(conteudo));
    const pageId = add(objTexto(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${A4_W.toFixed(2)} ${A4_H.toFixed(2)}] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> /XObject << /ImLogo ${logoId} 0 R /ImWater ${watermarkId} 0 R >> >> /Contents ${contentId} 0 R >>`));
    paginaIds.push(pageId);
  }

  objetos[catalogId - 1] = objTexto(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
  objetos[pagesId - 1] = objTexto(`<< /Type /Pages /Kids [${paginaIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${paginaIds.length} >>`);

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
  for (let i = 1; i <= objetos.length; i++) xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  xref += `trailer\n<< /Size ${objetos.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;
  partes.push(encoder.encode(xref));
  return new Blob([concatBytes(partes)], { type: "application/pdf" });
}

function baixarBlob(blob: Blob, nomeArquivo: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportarCalculoPdfDireto(
  nome: string,
  dataBase: string,
  criterios: CriteriosCalculo,
  resultado: ResultadoCalculo,
  identificacao?: IdentificacaoCalculo,
) {
  const [logo, watermark] = await Promise.all([
    logoComoJpeg("/faro-logo-white.png", COLORS.navy),
    logoComoJpeg("/faro-logo-navy.png", COLORS.white, 0.045),
  ]);
  const logoRatio = logo.width / logo.height;
  const watermarkRatio = watermark.width / watermark.height;
  const paginas: Pagina[] = [];
  let p = new Pagina();
  paginas.push(p);
  cabecalhoPrincipal(p, logoRatio, dataBase, watermarkRatio);

  let y = 126;
  p.text(nome, MARGIN, y, 17, { bold: true, color: COLORS.navy });
  p.fill(COLORS.accent);
  p.rect(MARGIN, y + 8, 52, 3);
  y += 27;

  const ident = linhasIdentificacao(identificacao ?? criterios.identificacao);
  const identComData: Array<[string, string]> = [...ident, ["Data-base do cálculo", isoBR(dataBase)]];
  const colW = (A4_W - MARGIN * 2) / 2;
  const linhasMeta = Math.ceil(identComData.length / 2);
  const metaH = Math.max(34, linhasMeta * 34);
  p.fill(COLORS.lighter);
  p.stroke(COLORS.border);
  p.rect(MARGIN, y, A4_W - MARGIN * 2, metaH, true, true);
  identComData.forEach(([rotulo, valor], i) => {
    const col = i % 2;
    const linha = Math.floor(i / 2);
    const x = MARGIN + col * colW + 10;
    const yy = y + linha * 34 + 12;
    p.text(rotulo.toUpperCase(), x, yy, 6.5, { color: COLORS.muted });
    const linhas = quebrarTexto(valor, colW - 20, 9);
    p.text(linhas[0] ?? "", x, yy + 13, 9, { bold: true, color: COLORS.text });
  });
  y += metaH + 22;

  tituloSecao(p, "Resumo do cálculo", y);
  y += 18;
  const comps = [
    ["Principal", resultado.principal],
    ["Correção monetária", resultado.correcao],
    ["Juros", resultado.juros],
    ["Multa de execução", resultado.multaExecucao],
    ["Honorários de execução", resultado.honorariosExecucao],
    ["Honorários sucumbenciais", resultado.honorariosSucumbenciais],
    ["Abatimentos", -resultado.abatimentos],
  ] as const;
  const cardGap = 7;
  const cardW = (A4_W - MARGIN * 2 - cardGap * 3) / 4;
  comps.forEach(([rotulo, valor], i) => {
    const col = i % 4;
    const linha = Math.floor(i / 4);
    const x = MARGIN + col * (cardW + cardGap);
    const yy = y + linha * 52;
    p.fill(COLORS.light);
    p.stroke(COLORS.border);
    p.rect(x, yy, cardW, 45, true, true);
    p.text(rotulo.toUpperCase(), x + 7, yy + 13, 6.3, { color: COLORS.muted });
    p.text(moeda(valor), x + 7, yy + 31, 10.5, { bold: true, color: COLORS.blue });
  });
  y += Math.ceil(comps.length / 4) * 52 + 3;
  p.fill(COLORS.blue);
  p.rect(MARGIN, y, A4_W - MARGIN * 2, 49);
  p.text("TOTAL ATUALIZADO", MARGIN + 13, y + 29, 8, { color: [216, 235, 244] });
  p.text(moeda(resultado.total), A4_W - MARGIN - 13, y + 31, 18, { bold: true, color: COLORS.white, align: "right" });
  y += 72;

  tituloSecao(p, "Memória de cálculo", y);
  y += 15;
  const larguras = [88, 48, 74, 56, 72, 72, 85];
  const xs: number[] = [];
  let xAc = MARGIN;
  larguras.forEach((w) => { xs.push(xAc); xAc += w; });
  const cabecalhos = ["Verba", "Data", "Principal", "Fator", "Correção", "Juros", "Atualizado"];
  y = tabelaCabecalho(p, y, xs, larguras, cabecalhos);

  resultado.memoria.forEach((linha, idx) => {
    const valores = [linha.verba, isoBR(linha.data), moeda(linha.principal), linha.fatorCorrecao.toFixed(6), moeda(linha.correcao), moeda(linha.juros), moeda(linha.atualizado)];
    const linhasVerba = quebrarTexto(linha.verba, larguras[0]! - 8, 6.5);
    const rowH = Math.max(24, 12 + linhasVerba.length * 7);
    if (y + rowH > A4_H - 55) {
      p = new Pagina();
      paginas.push(p);
      cabecalhoContinuacao(p);
      y = 76;
      tituloSecao(p, "Memória de cálculo · continuação", y);
      y += 15;
      y = tabelaCabecalho(p, y, xs, larguras, cabecalhos);
    }
    if (idx % 2) {
      p.fill(COLORS.lighter);
      p.rect(MARGIN, y, larguras.reduce((a, b) => a + b, 0), rowH);
    }
    p.stroke([220, 232, 238]);
    p.line(MARGIN, y + rowH, MARGIN + larguras.reduce((a, b) => a + b, 0), y + rowH);
    linhasVerba.forEach((txt, li) => p.text(txt, xs[0]! + 4, y + 15 + li * 7, 6.5, { color: COLORS.text }));
    for (let i = 1; i < valores.length; i++) {
      const isNum = i >= 2;
      p.text(valores[i]!, isNum ? xs[i]! + larguras[i]! - 4 : xs[i]! + 4, y + 15, 6.5, { bold: i === 6, color: i === 6 ? COLORS.blue : COLORS.text, align: isNum ? "right" : "left" });
    }
    y += rowH;
  });

  // Seções finais nunca começam coladas à última linha da memória.
  y += 18;

  const garantirEspaco = (necessario: number) => {
    if (y + necessario <= A4_H - 55) return false;
    p = new Pagina();
    paginas.push(p);
    cabecalhoContinuacao(p);
    y = 78;
    return true;
  };

  if (resultado.fontes.length) {
    garantirEspaco(55);
    tituloSecao(p, "Fontes e critérios", y);
    y += 22;
    for (const fonte of resultado.fontes) {
      const linhas = quebrarTexto(`• ${fonte}`, A4_W - MARGIN * 2 - 22, 8);
      const h = linhas.length * 11 + 8;
      const mudouPagina = garantirEspaco(h + 26);
      if (mudouPagina) {
        tituloSecao(p, "Fontes e critérios · continuação", y);
        y += 22;
      }
      p.fill(COLORS.light);
      p.rect(MARGIN, y, A4_W - MARGIN * 2, h);
      linhas.forEach((txt, i) => p.text(txt, MARGIN + 10, y + 14 + i * 11, 8, { color: [64, 95, 112] }));
      y += h + 6;
    }
    y += 10;
  }

  if (criterios.observacoes) {
    const linhas = quebrarTexto(criterios.observacoes, A4_W - MARGIN * 2 - 20, 8);
    const h = linhas.length * 11 + 18;
    garantirEspaco(h + 42);
    tituloSecao(p, "Observações", y);
    y += 22;
    p.fill([237, 246, 250]);
    p.stroke(COLORS.border);
    p.rect(MARGIN, y, A4_W - MARGIN * 2, h, true, true);
    linhas.forEach((txt, i) => p.text(txt, MARGIN + 10, y + 14 + i * 11, 8, { color: [49, 86, 104] }));
    y += h;
  }

  paginas.forEach((pagina, idx) => rodape(pagina, idx + 1, paginas.length));
  const blob = montarPdf(paginas, logo, watermark);
  const arquivo = `calculo-${nomeSeguro(nome)}-${new Date().toISOString().slice(0, 10)}.pdf`;
  baixarBlob(blob, arquivo);
}