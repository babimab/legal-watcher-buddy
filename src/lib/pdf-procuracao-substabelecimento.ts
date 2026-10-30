import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

import { type ItemSubstabelecimento } from "@/lib/substabelecimento";
import {
  obterUrlModeloPdfCorrespondente,
  type ModeloCorrespondente,
} from "@/lib/modelos-correspondente";

// Preenche as 3 linhas em branco da página 2 (SUBSTABELECIMENTO) do PDF
// de Procuração + Substabelecimento cadastrado como "PDF de referência"
// do modelo de correspondente local daquele estado (modeloPdfCaminho em
// ModeloCorrespondente) -- caso real: AF/KLM mandam a própria Procuração
// + Substabelecimento já assinada pro correspondente local (mesmos
// advogados da lista de correspondente), só faltando preencher processo/
// autor/juízo da página 2. Diferente do gerador de substabelecimento
// normal (pdf-base.ts), que desenha a página inteira do zero: aqui o
// documento já vem assinado digitalmente pela companhia aérea, então só
// sobrepomos texto nas 3 linhas em branco, sem tocar no resto do PDF
// (procuração + assinaturas ficam intactas).
//
// Coordenadas medidas e conferidas visualmente nos PDFs de referência da
// AF e da KLM (layout idêntico nos dois -- mesmo texto gerado de um
// Word/mala direta, só muda o nome da outorgante): renderizado a 150dpi
// com pdftoppm, posição das linhas achada com grade de pixel, depois
// testado de verdade (pdf-lib rodando num script à parte) e o resultado
// renderizado de novo pra conferir que o texto caiu em cima da linha
// certa, sem sobrepor "processo de nº"/"movido por"/"perante o/a". Página
// A4: 595,32 x 841,92pt (origem do pdf-lib é embaixo à esquerda).
const PAGINA_SUBSTABELECIMENTO = 1; // segunda página (índice 0 = procuração)

type Linha = { x: number; y: number; largura: number };

// "processo de nº________________, movido por"
const LINHA_PROCESSO: Linha = { x: 182, y: 501.5, largura: 244 };
// "________________________________, em trâmite perante o/a"
const LINHA_AUTOR: Linha = { x: 100, y: 482.5, largura: 258 };
// "________________________________, bem como para seus"
const LINHA_JUIZO: Linha = { x: 100, y: 461.8, largura: 258 };

const TAMANHO_FONTE_PADRAO = 10;
const TAMANHO_FONTE_MIN = 6;

async function carregarPdf(url: string): Promise<PDFDocument> {
  const resposta = await fetch(url);
  if (!resposta.ok) throw new Error("Não consegui baixar o PDF de referência.");
  const bytes = await resposta.arrayBuffer();
  return PDFDocument.load(bytes);
}

// Reduz a fonte até caber na largura disponível (nunca abaixo do
// mínimo) -- nome do autor (polo ativo) às vezes é bem longo.
function tamanhoQueCabe(texto: string, largura: number, font: PDFFont): number {
  let tamanho = TAMANHO_FONTE_PADRAO;
  while (tamanho > TAMANHO_FONTE_MIN && font.widthOfTextAtSize(texto, tamanho) > largura) {
    tamanho -= 0.5;
  }
  return tamanho;
}

function desenharNaLinha(pagina: PDFPage, font: PDFFont, texto: string | null, linha: Linha) {
  if (!texto) return;
  const tamanho = tamanhoQueCabe(texto, linha.largura, font);
  pagina.drawText(texto, { x: linha.x, y: linha.y, size: tamanho, font, color: rgb(0, 0, 0) });
}

export async function gerarPdfProcuracaoPreenchida(
  modelo: ModeloCorrespondente,
  item: ItemSubstabelecimento,
): Promise<Blob> {
  if (!modelo.modeloPdfCaminho) {
    throw new Error(
      `O estado "${modelo.estado}" não tem o PDF de referência cadastrado em "Modelos de correspondente".`,
    );
  }
  const url = await obterUrlModeloPdfCorrespondente(modelo.modeloPdfCaminho);
  const pdf = await carregarPdf(url);
  if (pdf.getPageCount() < 2) {
    throw new Error(`O PDF de referência de "${modelo.estado}" não tem uma segunda página.`);
  }
  const pagina = pdf.getPage(PAGINA_SUBSTABELECIMENTO);
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  desenharNaLinha(pagina, font, item.processo, LINHA_PROCESSO);
  desenharNaLinha(pagina, font, item.autor, LINHA_AUTOR);
  desenharNaLinha(pagina, font, item.juizo, LINHA_JUIZO);

  const bytes = await pdf.save();
  // pdf-lib tipa o retorno como Uint8Array<ArrayBufferLike>, que o TS
  // mais novo não aceita direto como BlobPart -- copia pra um
  // Uint8Array "liso" antes de passar pro Blob.
  return new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
}

export function nomeArquivoProcuracaoPreenchida(
  modelo: ModeloCorrespondente,
  item: ItemSubstabelecimento,
): string {
  const base = (item.processo ?? String(item.idx + 1))
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `procuracao-substabelecimento-${modelo.id}-${base || item.idx + 1}.pdf`;
}
