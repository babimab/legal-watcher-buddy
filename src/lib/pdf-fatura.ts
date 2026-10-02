import type { NotaFatura } from "@/lib/fatura";
import { formatarMoeda, nomeArquivoFatura, valorPorExtenso } from "@/lib/fatura";
import {
  A4_W,
  MARGIN,
  CORES,
  Pagina,
  baixarBlob,
  imagemComoJpeg,
  isoBR,
  montarPdf,
  quebrarTexto,
  tituloSecao,
  type ImagemPdf,
} from "@/lib/pdf-base";

const LOGO_URL = "/bcw-logo.png";

// Endereços tirados do timbrado oficial (public/documentos/timbrado-bcw.docx)
// -- mesma fonte usada no relatório Word, pra não divergir caso o
// escritório tenha mudado de endereço.
const ENDERECOS = [
  "Rua Dom Gerardo, 35, 5º Andar, Centro, CEP: 20090-905, Rio de Janeiro – RJ, Brasil, Tel.: +55(21) 3543-1000",
  "Av. Brigadeiro Faria Lima, 4509, 8º andar, Itaim Bibi, CEP: 04538-133, São Paulo – SP, Brasil, Tel.: +55 (11) 3078-3858",
];

let logoCache: Promise<ImagemPdf> | null = null;
function carregarLogo() {
  if (!logoCache) logoCache = imagemComoJpeg(LOGO_URL, CORES.white);
  return logoCache;
}

function construirPaginaNota(nota: NotaFatura, logo: ImagemPdf): Pagina {
  const logoRatio = logo.width / logo.height;
  const larguraUtil = A4_W - MARGIN * 2;

  const p = new Pagina();

  // Cabeçalho: logo à esquerda, título grande à direita (no estilo do
  // invoice antigo que a BDR pediu pra manter).
  const logoW = 110;
  const logoH = logoW / logoRatio;
  p.image("ImLogo", MARGIN, 26, logoW, logoH);

  const xDireita = A4_W - MARGIN;
  p.text("NOTA DE HONORÁRIOS", xDireita, 38, 17, {
    bold: true,
    color: CORES.blue,
    align: "right",
  });
  if (nota.casoInterno) {
    p.text(`Nº ${nota.casoInterno}`, xDireita, 56, 9.5, {
      color: CORES.muted,
      align: "right",
    });
  }

  p.stroke(CORES.border);
  p.line(MARGIN, 96, A4_W - MARGIN, 96);

  // Duas colunas: destinatário (esquerda, em caixa) e metadados (direita,
  // linha a linha com divisória), igual ao "FATURADO PARA" x bloco de
  // dados do invoice antigo.
  const colEsquerdaW = 260;
  const gap = 20;
  const colDireitaX = MARGIN + colEsquerdaW + gap;
  const colDireitaW = larguraUtil - colEsquerdaW - gap;

  const linhasDestinatario = quebrarTexto(
    `Aos Resseguradores / Seguradores da ${nota.reu ?? "—"}`,
    colEsquerdaW - 24,
    11.5,
  );
  const linhasCorrespondente = nota.correspondente
    ? quebrarTexto(`A/C: ${nota.correspondente}`, colEsquerdaW - 24, 8.5)
    : [];
  const alturaCaixa =
    16 +
    linhasDestinatario.length * 15 +
    (linhasCorrespondente.length ? 4 : 0) +
    linhasCorrespondente.length * 11 +
    14;

  const yCaixaTopo = 118;
  p.fill(CORES.light);
  p.stroke(CORES.border);
  p.rect(MARGIN, yCaixaTopo, colEsquerdaW, alturaCaixa, true, true);

  let yCaixa = yCaixaTopo + 20;
  linhasDestinatario.forEach((linha, i) => {
    p.text(linha, MARGIN + 12, yCaixa + i * 15, 11.5, { bold: true, color: CORES.navy });
  });
  yCaixa += linhasDestinatario.length * 15;
  if (linhasCorrespondente.length) {
    yCaixa += 4;
    linhasCorrespondente.forEach((linha, i) => {
      p.text(linha, MARGIN + 12, yCaixa + i * 11, 8.5, { color: CORES.muted });
    });
  }

  let yMeta = yCaixaTopo + 2;
  const linhaMeta = (rotulo: string, valor: string | null) => {
    if (!valor) return;
    p.text(rotulo.toUpperCase(), colDireitaX, yMeta + 8, 7.5, { color: CORES.muted });
    const linhas = quebrarTexto(valor, colDireitaW, 9.5);
    linhas.forEach((linha, i) => {
      p.text(linha, colDireitaX + colDireitaW, yMeta + 21 + i * 12, 9.5, {
        bold: true,
        color: CORES.text,
        align: "right",
      });
    });
    yMeta += 21 + linhas.length * 12;
    p.stroke(CORES.border);
    p.line(colDireitaX, yMeta + 4, colDireitaX + colDireitaW, yMeta + 4);
    yMeta += 13;
  };

  linhaMeta("Emissão", nota.invoiceData ? isoBR(nota.invoiceData) : null);
  linhaMeta("Período de referência", nota.invoicePeriodo);
  linhaMeta("Reclamante", nota.autor);
  linhaMeta("Processo", nota.processo);
  linhaMeta("Juízo", nota.juizo);
  linhaMeta("Ref. B&S", nota.bsRef);
  linhaMeta("Moeda", nota.moeda);

  let y = Math.max(yCaixaTopo + alturaCaixa, yMeta) + 24;

  // Total em destaque, no estilo do "Total do invoice" do modelo antigo.
  p.fill(CORES.light);
  p.stroke(CORES.accent);
  p.rect(MARGIN, y, larguraUtil, 36, true, true);
  p.text("Valor total", MARGIN + 12, y + 16, 9, { color: CORES.muted });
  p.text(formatarMoeda(nota.valorTotal, nota.moeda), xDireita - 12, y + 17, 14, {
    bold: true,
    color: CORES.blue,
    align: "right",
  });
  p.text(`(${valorPorExtenso(nota.valorTotal, nota.moeda)})`, MARGIN + 12, y + 29, 8, {
    color: CORES.muted,
  });
  y += 36 + 24;

  tituloSecao(p, "Descrição", y);
  y += 24;

  for (const item of nota.itens) {
    const linhas = quebrarTexto(item.paragrafo, larguraUtil - 24, 9.5);
    const alturaCard = 20 + linhas.length * 13 + 10;

    p.fill(CORES.lighter);
    p.stroke(CORES.border);
    p.rect(MARGIN, y, larguraUtil, alturaCard, true, true);

    p.text(item.tipo.toUpperCase(), MARGIN + 12, y + 16, 8, {
      bold: true,
      color: CORES.accent,
    });
    p.text(formatarMoeda(item.valor, nota.moeda), xDireita - 12, y + 16, 9.5, {
      bold: true,
      color: CORES.navy,
      align: "right",
    });
    linhas.forEach((linha, i) => {
      p.text(linha, MARGIN + 12, y + 30 + i * 13, 9.5, { color: CORES.text });
    });

    y += alturaCard + 10;
  }

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

  return p;
}

export async function gerarPdfNota(nota: NotaFatura): Promise<Blob> {
  const logo = await carregarLogo();
  return montarPdf([construirPaginaNota(nota, logo)], { ImLogo: logo });
}

export async function gerarEBaixarPdfNota(nota: NotaFatura): Promise<void> {
  const blob = await gerarPdfNota(nota);
  baixarBlob(blob, nomeArquivoFatura(nota));
}

// Junta várias notas num PDF só, multipágina (uma página por nota) -- é o
// que "Gerar Fatura" baixa quando tem mais de uma nota selecionada.
export async function gerarPdfNotas(notas: NotaFatura[]): Promise<Blob> {
  const logo = await carregarLogo();
  const paginas = notas.map((nota) => construirPaginaNota(nota, logo));
  return montarPdf(paginas, { ImLogo: logo });
}
