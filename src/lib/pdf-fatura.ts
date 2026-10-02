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
  p.text("NOTA DE HONORÁRIOS", xDireita, 38, 15, {
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

  // Mede as duas colunas antes de desenhar, pra poder centralizar
  // verticalmente a mais curta em relação à mais alta (a BDR notou que,
  // com o destinatário sempre bem mais curto que o bloco de metadados,
  // ficava com um vão vazio embaixo em vez de centralizado).
  const linhasDestinatario = quebrarTexto(
    `Aos Resseguradores / Seguradores da ${nota.reu ?? "—"}`,
    colEsquerdaW,
    11,
    true,
  );
  const linhasCorr = nota.correspondente
    ? quebrarTexto(`A/C: ${nota.correspondente}`, colEsquerdaW, 8)
    : [];
  const alturaEsq =
    13 + linhasDestinatario.length * 14 + (linhasCorr.length ? 4 + linhasCorr.length * 10 : 0);

  const camposMeta: [string, string | null][] = [
    ["Emissão", nota.invoiceData ? isoBR(nota.invoiceData) : null],
    ["Período de referência", nota.invoicePeriodo],
    ["Reclamante", nota.autor],
    ["Processo", nota.processo],
    ["Juízo", nota.juizo],
    ["Ref. B&S", nota.bsRef],
    ["Moeda", nota.moeda],
  ];
  // Espaço do divisor até a linha de base do texto (13 em cima, 8 embaixo)
  // -- não é pra ser igual: a parte do caractere ACIMA da linha de base
  // (ascendente) é bem mais alta que a de baixo (descendente), então
  // precisa de mais espaço em cima pra parecer centralizado de verdade.
  const PAD_TOPO = 13;
  const PAD_BASE = 8;
  // Quando o valor cabe numa linha só, rótulo e valor dividem a mesma
  // linha (rótulo à esquerda, valor à direita). Quando quebra em mais de
  // uma linha, a primeira linha quebrada fica quase do tamanho da coluna
  // inteira e esbarraria no rótulo -- nesse caso o rótulo ganha uma linha
  // própria em cima, e o valor (todas as linhas) fica embaixo.
  const extraLinhasValor = (linhas: string[]) => (linhas.length > 1 ? linhas.length * 11 : 0);
  const alturaDir = camposMeta.reduce((soma, [, valor]) => {
    if (!valor) return soma;
    const linhas = quebrarTexto(valor, colDireitaW - 2, 9, true);
    return soma + extraLinhasValor(linhas) + PAD_BASE + PAD_TOPO;
  }, 0);

  const topo = 124;
  let yEsq = topo + Math.max(0, (alturaDir - alturaEsq) / 2);
  let yDir = topo + Math.max(0, (alturaEsq - alturaDir) / 2);

  p.text("DESTINATÁRIO", MARGIN, yEsq, 7, { color: CORES.muted });
  yEsq += 13;
  linhasDestinatario.forEach((linha, i) => {
    p.text(linha, MARGIN, yEsq + i * 14, 11, { bold: true, color: CORES.navy });
  });
  yEsq += linhasDestinatario.length * 14;
  if (linhasCorr.length) {
    yEsq += 4;
    linhasCorr.forEach((linha, i) => {
      p.text(linha, MARGIN, yEsq + i * 10, 8, { color: CORES.muted });
    });
    yEsq += linhasCorr.length * 10;
  }

  // Direita: rótulo e valor na MESMA linha quando o valor cabe numa linha
  // só. Reserva 2pt de folga no fim da linha (a largura agora é medida
  // com a métrica real da Helvetica, então isso é só uma margem de
  // segurança, não um ajuste pra compensar estimativa errada).
  const linhaMeta = (rotulo: string, valor: string | null) => {
    if (!valor) return;
    const linhas = quebrarTexto(valor, colDireitaW - 2, 9, true);
    p.text(rotulo, colDireitaX, yDir, 8, { color: CORES.muted });
    if (linhas.length === 1) {
      p.text(linhas[0]!, colDireitaX + colDireitaW, yDir, 9, {
        bold: true,
        color: CORES.text,
        align: "right",
      });
    } else {
      // Não cabe numa linha: a primeira linha quebrada ficaria quase do
      // tamanho da coluna inteira e esbarraria no rótulo, então o valor
      // desce pra uma linha própria embaixo do rótulo.
      linhas.forEach((linha, i) => {
        p.text(linha, colDireitaX + colDireitaW, yDir + 11 + i * 11, 9, {
          bold: true,
          color: CORES.text,
          align: "right",
        });
      });
    }
    yDir += extraLinhasValor(linhas) + PAD_BASE;
    p.stroke(CORES.border);
    p.line(colDireitaX, yDir, colDireitaX + colDireitaW, yDir);
    yDir += PAD_TOPO;
  };

  camposMeta.forEach(([rotulo, valor]) => linhaMeta(rotulo, valor));

  let y = Math.max(yEsq, yDir) + 26;

  // Tabela da descrição: 3 colunas (Tipo / Descrição / Valor), cabeçalho
  // navy, linhas lisas com divisória (sem caixa colorida) -- o total vem
  // depois, igual ao "Total do invoice" do modelo antigo.
  const tableX = MARGIN;
  const tableW = larguraUtil;
  const colTipoW = 110;
  const colValW = 90;
  const colDescW = tableW - colTipoW - colValW;
  const colDescX = tableX + colTipoW;
  const colValX = colDescX + colDescW;

  p.fill(CORES.blue);
  p.rect(tableX, y, tableW, 22);
  p.text("TIPO", tableX + 10, y + 14, 8, { bold: true, color: CORES.white });
  p.text("DESCRIÇÃO", colDescX + 10, y + 14, 8, { bold: true, color: CORES.white });
  p.text("VALOR", colValX + colValW - 10, y + 14, 8, {
    bold: true,
    color: CORES.white,
    align: "right",
  });
  y += 22;

  nota.itens.forEach((item) => {
    const linhasTipo = quebrarTexto(item.tipo, colTipoW - 20, 8.5, true);
    const linhasDesc = quebrarTexto(item.paragrafo, colDescW - 20, 9);
    const alturaLinha = Math.max(28, Math.max(linhasTipo.length, linhasDesc.length) * 13 + 14);
    linhasTipo.forEach((linha, i) => {
      p.text(linha, tableX + 10, y + 16 + i * 12, 8.5, { bold: true, color: CORES.text });
    });
    linhasDesc.forEach((linha, i) => {
      p.text(linha, colDescX + 10, y + 13 + i * 13, 9, { color: CORES.text });
    });
    p.text(formatarMoeda(item.valor, nota.moeda), colValX + colValW - 10, y + 16, 9, {
      bold: true,
      color: CORES.navy,
      align: "right",
    });
    y += alturaLinha;
    p.stroke(CORES.border);
    p.line(tableX, y, tableX + tableW, y);
  });

  y += 20;
  p.stroke(CORES.navy);
  p.line(tableX, y, tableX + tableW, y);
  y += 18;
  p.text("Total", tableX, y, 12, { bold: true, color: CORES.muted });
  const textoTotal = `${formatarMoeda(nota.valorTotal, nota.moeda)} (${valorPorExtenso(nota.valorTotal, nota.moeda)})`;
  const linhasTotal = quebrarTexto(textoTotal, tableW - 60, 12, true);
  linhasTotal.forEach((linha, i) => {
    p.text(linha, tableX + tableW, y + i * 15, 12, {
      bold: true,
      color: CORES.navy,
      align: "right",
    });
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
