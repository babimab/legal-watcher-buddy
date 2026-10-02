import type { AtoFatura } from "@/lib/fatura";
import { numeroInvoice, nomeArquivoFatura } from "@/lib/fatura";
import {
  A4_W,
  MARGIN,
  CORES,
  Pagina,
  baixarBlob,
  imagemComoJpeg,
  isoBR,
  moeda,
  montarPdf,
  quebrarTexto,
  tabelaCabecalho,
  type ImagemPdf,
} from "@/lib/pdf-base";

const LOGO_URL = "/bcw-logo.png";

// Endereços tirados do timbrado oficial (public/documentos/timbrado-bcw.docx)
// -- mesma fonte usada no relatório Word, pra não divergir caso o
// escritório tenha mudado de endereço. Dados bancários e CNPJ ainda não
// tenho, ficam como texto fixo editável aqui até a BDR passar os reais.
const ENDERECOS = [
  "Rua Dom Gerardo, 35, 5º Andar, Centro, CEP: 20090-905, Rio de Janeiro – RJ, Brasil, Tel.: +55(21) 3543-1000",
  "Av. Brigadeiro Faria Lima, 4509, 8º andar, Itaim Bibi, CEP: 04538-133, São Paulo – SP, Brasil, Tel.: +55 (11) 3078-3858",
];
const DADOS_BANCARIOS = "[Banco] · Agência [000] · Conta [00000-0] · CNPJ [000.000.000/0000-00]";

let logoCache: Promise<ImagemPdf> | null = null;
function carregarLogo() {
  if (!logoCache) logoCache = imagemComoJpeg(LOGO_URL, CORES.white);
  return logoCache;
}

export async function gerarPdfAto(ato: AtoFatura): Promise<Blob> {
  const logo = await carregarLogo();
  const logoRatio = logo.width / logo.height;

  const p = new Pagina();
  const logoW = 130;
  const logoH = logoW / logoRatio;
  p.image("ImLogo", MARGIN, 40, logoW, logoH);

  p.text("INVOICE", A4_W - MARGIN, 58, 22, { color: CORES.blue, align: "right" });
  p.text(`Nº ${numeroInvoice(ato)}`, A4_W - MARGIN, 74, 10, { color: CORES.muted, align: "right" });

  p.stroke(CORES.blue);
  p.line(MARGIN, 96, A4_W - MARGIN, 96);

  const metaX = A4_W / 2 + 10;
  const colEsquerdaW = metaX - MARGIN - 20;

  let y = 124;
  p.text("FATURADO PARA", MARGIN, y, 7.5, { color: CORES.muted });
  y += 14;
  p.text(ato.reu ?? "—", MARGIN, y, 11.5, { bold: true, color: CORES.text });
  y += 14;
  if (ato.correspondente) {
    const linhasAC = quebrarTexto(`A/C: ${ato.correspondente} (correspondente)`, colEsquerdaW, 8.5);
    linhasAC.forEach((linha, i) => {
      p.text(linha, MARGIN, y + i * 11, 8.5, { color: CORES.muted });
    });
    y += linhasAC.length * 11;
  }

  let metaY = 124;
  const metaLinha = (rotulo: string, valor: string | null) => {
    if (!valor) return;
    p.text(rotulo, metaX, metaY, 8, { color: CORES.muted });
    p.text(valor, A4_W - MARGIN, metaY, 8.5, { bold: true, color: CORES.text, align: "right" });
    p.stroke(CORES.border);
    p.line(metaX, metaY + 4, A4_W - MARGIN, metaY + 4);
    metaY += 17;
  };
  metaLinha("Data do invoice", ato.invoiceData ? isoBR(ato.invoiceData) : null);
  metaLinha("Período de referência", ato.invoicePeriodo);
  metaLinha("Ref. B&S", ato.bsRef);
  metaLinha("Moeda", ato.moeda);

  y = Math.max(y + 24, metaY + 10);

  const larguras = [30, 92, 92, 100, 52, 94, 63.28];
  const xs: number[] = [];
  let xAc = MARGIN;
  larguras.forEach((w) => {
    xs.push(xAc);
    xAc += w;
  });
  const cabecalhos = [
    "Caso",
    "Autor",
    "Réu",
    "Processo",
    "Comarca/UF",
    "Descrição do ato",
    "Valor",
  ];
  y = tabelaCabecalho(p, y, xs, larguras, cabecalhos);

  const valores = [
    ato.caso ?? "—",
    ato.autor ?? "—",
    ato.reu ?? "—",
    ato.processo ?? "—",
    [ato.comarca, ato.uf].filter(Boolean).join("/") || "—",
    ato.descricao ?? "—",
    ato.valor != null ? moeda(ato.valor, ato.moeda) : "—",
  ];
  const linhasPorColuna = valores.map((v, i) => quebrarTexto(v, larguras[i]! - 8, 7));
  const maxLinhas = Math.max(...linhasPorColuna.map((l) => l.length));
  const rowH = Math.max(24, 10 + maxLinhas * 10);

  p.stroke(CORES.border);
  p.line(MARGIN, y + rowH, MARGIN + larguras.reduce((a, b) => a + b, 0), y + rowH);
  linhasPorColuna.forEach((linhas, i) => {
    const isValor = i === valores.length - 1;
    linhas.forEach((txt, li) =>
      p.text(txt, isValor ? xs[i]! + larguras[i]! - 4 : xs[i]! + 4, y + 15 + li * 10, 7, {
        align: isValor ? "right" : "left",
        bold: isValor,
      }),
    );
  });
  y += rowH + 14;

  p.stroke(CORES.blue);
  p.line(A4_W - MARGIN - 220, y, A4_W - MARGIN, y);
  y += 20;
  p.text("Total do invoice", A4_W - MARGIN - 110, y, 9.5, { color: CORES.muted, align: "right" });
  p.text(ato.valor != null ? moeda(ato.valor, ato.moeda) : "—", A4_W - MARGIN, y + 2, 15, {
    bold: true,
    color: CORES.blue,
    align: "right",
  });
  y += 46;

  p.stroke(CORES.border);
  p.line(MARGIN, y, A4_W - MARGIN, y);
  y += 16;
  quebrarTexto(`Dados bancários: ${DADOS_BANCARIOS}`, A4_W - MARGIN * 2, 7.5).forEach((txt, i) => {
    p.text(txt, MARGIN, y + i * 10, 7.5, { color: CORES.muted });
  });

  const rodapeY = 790;
  p.stroke(CORES.border);
  p.line(MARGIN, rodapeY - 10, A4_W - MARGIN, rodapeY - 10);
  ENDERECOS.forEach((linha, i) => {
    p.text(linha, MARGIN, rodapeY + i * 10, 6.8, { color: CORES.muted });
  });
  p.text("bcw.com.br", MARGIN, rodapeY + ENDERECOS.length * 10 + 2, 6.8, {
    bold: true,
    color: CORES.blue,
  });

  const blob = montarPdf([p], { ImLogo: logo });
  return blob;
}

export async function gerarEBaixarPdfAto(ato: AtoFatura): Promise<void> {
  const blob = await gerarPdfAto(ato);
  baixarBlob(blob, nomeArquivoFatura(ato));
}
