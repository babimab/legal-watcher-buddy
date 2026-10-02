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

export async function gerarPdfNota(nota: NotaFatura): Promise<Blob> {
  const logo = await carregarLogo();
  const logoRatio = logo.width / logo.height;
  const larguraUtil = A4_W - MARGIN * 2;

  const p = new Pagina();
  const logoW = 130;
  const logoH = logoW / logoRatio;
  p.image("ImLogo", MARGIN, 40, logoW, logoH);

  p.stroke(CORES.border);
  p.line(MARGIN, 96, A4_W - MARGIN, 96);

  let y = 130;
  const linhasEndereco = quebrarTexto(
    `Aos Resseguradores / Seguradores da ${nota.reu ?? "—"}`,
    larguraUtil,
    12,
  );
  linhasEndereco.forEach((linha, i) => {
    p.text(linha, MARGIN, y + i * 15, 12, { color: CORES.text });
  });
  y += linhasEndereco.length * 15 + 20;

  const emissao = nota.invoiceData ? isoBR(nota.invoiceData) : "—";
  p.text(`Nota de Honorários — Emissão ${emissao}`, MARGIN, y, 13.5, {
    bold: true,
    color: CORES.blue,
  });
  y += 24;

  const campo = (rotulo: string, valor: string | null) => {
    if (!valor) return;
    const linhas = quebrarTexto(`${rotulo}: ${valor}`, larguraUtil, 9.5);
    linhas.forEach((linha, i) => {
      p.text(linha, MARGIN, y + i * 13, 9.5, { color: CORES.text });
    });
    y += linhas.length * 13 + 4;
  };

  campo("Período", nota.invoicePeriodo);
  campo("Reclamante", nota.autor);
  campo("Processo", nota.processo);
  campo("Juízo", nota.juizo);
  campo("Identificação Beaumont & Son", nota.bsRef);
  campo("Caso Interno", nota.casoInterno);

  y += 4;
  p.fill(CORES.light);
  p.stroke(CORES.border);
  p.rect(MARGIN, y, larguraUtil, 26, true, true);
  p.text(
    `Valor total: ${formatarMoeda(nota.valorTotal, nota.moeda)} (${valorPorExtenso(nota.valorTotal, nota.moeda)})`,
    MARGIN + 10,
    y + 17,
    10,
    { bold: true, color: CORES.blue },
  );
  y += 26 + 22;

  p.text("Descrição:", MARGIN, y, 10.5, { bold: true, color: CORES.navy });
  p.stroke(CORES.navy);
  p.line(MARGIN, y + 3, MARGIN + 52, y + 3);
  y += 20;

  for (const item of nota.itens) {
    const linhas = quebrarTexto(item.paragrafo, larguraUtil, 9.5);
    linhas.forEach((linha, i) => {
      p.text(linha, MARGIN, y + i * 13, 9.5, { color: CORES.text });
    });
    y += linhas.length * 13 + 8;
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

  return montarPdf([p], { ImLogo: logo });
}

export async function gerarEBaixarPdfNota(nota: NotaFatura): Promise<void> {
  const blob = await gerarPdfNota(nota);
  baixarBlob(blob, nomeArquivoFatura(nota));
}
