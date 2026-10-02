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

  // Duas colunas, sem caixa -- só texto puro e divisórias finas, igual ao
  // invoice antigo (nada de fundo/borda coloridos no destinatário ou nos
  // metadados, que é o que a BDR achou "desformatado" na primeira versão).
  const colEsquerdaW = 260;
  const gap = 24;
  const colDireitaX = MARGIN + colEsquerdaW + gap;
  const colDireitaW = larguraUtil - colEsquerdaW - gap;

  let yEsq = 124;
  p.text("DESTINATÁRIO", MARGIN, yEsq, 7.5, { color: CORES.muted });
  yEsq += 14;
  const linhasDestinatario = quebrarTexto(
    `Aos Resseguradores / Seguradores da ${nota.reu ?? "—"}`,
    colEsquerdaW,
    12,
  );
  linhasDestinatario.forEach((linha, i) => {
    p.text(linha, MARGIN, yEsq + i * 15, 12, { bold: true, color: CORES.navy });
  });
  yEsq += linhasDestinatario.length * 15;
  if (nota.correspondente) {
    yEsq += 4;
    const linhasCorr = quebrarTexto(`A/C: ${nota.correspondente}`, colEsquerdaW, 8.5);
    linhasCorr.forEach((linha, i) => {
      p.text(linha, MARGIN, yEsq + i * 11, 8.5, { color: CORES.muted });
    });
    yEsq += linhasCorr.length * 11;
  }

  // Direita: rótulo e valor na MESMA linha, com divisória fina embaixo.
  let yDir = 124;
  const linhaMeta = (rotulo: string, valor: string | null) => {
    if (!valor) return;
    const linhas = quebrarTexto(valor, colDireitaW, 9.5);
    p.text(rotulo, colDireitaX, yDir, 8.5, { color: CORES.muted });
    linhas.forEach((linha, i) => {
      p.text(linha, colDireitaX + colDireitaW, yDir + i * 12, 9.5, {
        bold: true,
        color: CORES.text,
        align: "right",
      });
    });
    yDir += Math.max(12, linhas.length * 12) + 6;
    p.stroke(CORES.border);
    p.line(colDireitaX, yDir, colDireitaX + colDireitaW, yDir);
    yDir += 11;
  };

  linhaMeta("Emissão", nota.invoiceData ? isoBR(nota.invoiceData) : null);
  linhaMeta("Período de referência", nota.invoicePeriodo);
  linhaMeta("Reclamante", nota.autor);
  linhaMeta("Processo", nota.processo);
  linhaMeta("Juízo", nota.juizo);
  linhaMeta("Ref. B&S", nota.bsRef);
  linhaMeta("Moeda", nota.moeda);

  let y = Math.max(yEsq, yDir) + 26;

  // Tabela da descrição: cabeçalho navy, linhas lisas com divisória (sem
  // caixa colorida nenhuma) -- o total vem depois, igual ao "Total do
  // invoice" do modelo antigo.
  const tableX = MARGIN;
  const tableW = larguraUtil;
  const colValW = 90;
  const colDescW = tableW - colValW;

  p.fill(CORES.blue);
  p.rect(tableX, y, tableW, 22);
  p.text("DESCRIÇÃO", tableX + 10, y + 14, 8, { bold: true, color: CORES.white });
  p.text("VALOR", tableX + tableW - 10, y + 14, 8, {
    bold: true,
    color: CORES.white,
    align: "right",
  });
  y += 22;

  nota.itens.forEach((item) => {
    const linhas = quebrarTexto(`${item.tipo}: ${item.paragrafo}`, colDescW - 20, 9);
    linhas.forEach((linha, i) => {
      p.text(linha, tableX + 10, y + 13 + i * 13, 9, { color: CORES.text });
    });
    p.text(formatarMoeda(item.valor, nota.moeda), tableX + tableW - 10, y + 13, 9.5, {
      bold: true,
      color: CORES.navy,
      align: "right",
    });
    y += linhas.length * 13 + 12;
    p.stroke(CORES.border);
    p.line(tableX, y, tableX + tableW, y);
  });

  y += 20;
  p.stroke(CORES.navy);
  p.line(tableX, y, tableX + tableW, y);
  y += 18;
  p.text("Total", tableX, y, 10, { color: CORES.muted });
  p.text(formatarMoeda(nota.valorTotal, nota.moeda), tableX + tableW, y, 13, {
    bold: true,
    color: CORES.navy,
    align: "right",
  });
  y += 14;
  p.text(`(${valorPorExtenso(nota.valorTotal, nota.moeda)})`, tableX, y, 8, {
    color: CORES.muted,
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
