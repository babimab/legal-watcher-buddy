import type { NotaFatura } from "@/lib/fatura";
import { formatarMoeda, nomeArquivoFatura, valorPorExtenso } from "@/lib/fatura";
import {
  A4_W,
  MARGIN,
  CORES,
  Pagina,
  baixarBlob,
  estimarLargura,
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

  // Juízo tem um ponto de quebra "certo" (vara em cima, comarca embaixo)
  // -- quando não cabe numa linha, prefere quebrar aí em vez de deixar a
  // quebra de palavra genérica cortar o nome da comarca no meio.
  const juizoPartesForcadas =
    nota.juizoVara && nota.juizoComarcaUf ? [nota.juizoVara, `de ${nota.juizoComarcaUf}`] : null;

  const camposMeta: [string, string | null, string[] | null][] = [
    ["Emissão", nota.invoiceData ? isoBR(nota.invoiceData) : null, null],
    ["Período de referência", nota.invoicePeriodo, null],
    ["Reclamante", nota.autor, null],
    ["Processo", nota.processo, null],
    ["Juízo", nota.juizo, juizoPartesForcadas],
    ["Ref. B&S", nota.bsRef, null],
    ["Moeda", nota.moeda, null],
  ];
  // Espaço do divisor até a linha de base do texto. Numa linha só (rótulo
  // e valor lado a lado), 13 em cima e 8 embaixo -- não é pra ser igual:
  // a parte do caractere ACIMA da linha de base (ascendente) é bem mais
  // alta que a de baixo (descendente), então precisa de mais espaço em
  // cima pra parecer centralizado de verdade. Quando quebra (rótulo numa
  // linha, valor embaixo), esse desbalanço já é absorvido pela linha do
  // próprio rótulo entre os dois, então o espaço antes/depois do bloco
  // inteiro fica igual (11 dos dois lados).
  const PAD_TOPO = 13;
  const PAD_BASE = 8;
  const PAD_BLOCO = 11;
  // Rótulo e valor dividem a mesma linha (rótulo à esquerda, valor à
  // direita) só quando os dois cabem lado a lado com folga -- não basta o
  // valor caber na largura da coluna, porque mesmo sem quebrar ele pode
  // ficar largo o bastante pra encostar no rótulo. Quando não cabe junto,
  // o rótulo ganha uma linha própria em cima e o valor (podendo quebrar)
  // desce pra baixo dele, usando a largura inteira da coluna.
  const GAP_ROTULO = 10;
  const medirCampo = (rotulo: string, valor: string, partesForcadas: string[] | null) => {
    const cabeNaMesmaLinha =
      estimarLargura(rotulo, 8) + GAP_ROTULO + estimarLargura(valor, 9, true) <= colDireitaW;
    if (cabeNaMesmaLinha) {
      return { cabeNaMesmaLinha, linhas: [valor], padTopo: PAD_TOPO, padBase: PAD_BASE, extra: 0 };
    }
    // Rótulo já foi pra linha própria, então o valor não concorre mais
    // com ele -- usa a largura inteira da página (não só a da coluna) pra
    // evitar quebra feia no meio de nome de comarca/vara, já que a essa
    // altura o destinatário à esquerda sempre terminou. Se tiver um ponto
    // de quebra certo (Juízo), quebra ali em vez de deixar a quebra de
    // palavra genérica decidir.
    const linhas = (partesForcadas ?? [valor]).flatMap((parte) =>
      quebrarTexto(parte, larguraUtil - 2, 9, true),
    );
    return {
      cabeNaMesmaLinha,
      linhas,
      padTopo: PAD_BLOCO,
      padBase: PAD_BLOCO,
      extra: linhas.length * 11,
    };
  };
  const alturaDir = camposMeta.reduce((soma, [rotulo, valor, partesForcadas]) => {
    if (!valor) return soma;
    const m = medirCampo(rotulo, valor, partesForcadas);
    return soma + m.extra + m.padBase + m.padTopo;
  }, 0);

  const topo = 124;
  let yEsq = topo + Math.max(0, (alturaDir - alturaEsq) / 2);
  // Cada linha da direita soma o próprio espaço de cima antes de
  // desenhar (pra poder ser simétrico quando quebra), então o ponto de
  // partida sobe o espaço da primeira linha pra ela continuar caindo
  // exatamente em 124 como antes.
  let yDir = topo - PAD_TOPO + Math.max(0, (alturaEsq - alturaDir) / 2);

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
  const linhaMeta = (rotulo: string, valor: string | null, partesForcadas: string[] | null) => {
    if (!valor) return;
    const { cabeNaMesmaLinha, linhas, padTopo, padBase, extra } = medirCampo(
      rotulo,
      valor,
      partesForcadas,
    );
    yDir += padTopo;
    if (cabeNaMesmaLinha) {
      p.text(rotulo, colDireitaX, yDir, 8, { color: CORES.muted });
      p.text(linhas[0]!, colDireitaX + colDireitaW, yDir, 9, {
        bold: true,
        color: CORES.text,
        align: "right",
      });
    } else {
      // Não cabe junto do rótulo: desce pra uma linha própria embaixo dele.
      // O próprio rótulo fica centralizado na vertical em relação às
      // linhas do valor (não grudado na primeira).
      p.text(rotulo, colDireitaX, yDir + (11 * (linhas.length + 1)) / 2, 8, {
        color: CORES.muted,
      });
      linhas.forEach((linha, i) => {
        p.text(linha, colDireitaX + colDireitaW, yDir + 11 + i * 11, 9, {
          bold: true,
          color: CORES.text,
          align: "right",
        });
      });
    }
    yDir += extra + padBase;
    p.stroke(CORES.border);
    p.line(colDireitaX, yDir, colDireitaX + colDireitaW, yDir);
  };

  camposMeta.forEach(([rotulo, valor, partesForcadas]) => linhaMeta(rotulo, valor, partesForcadas));

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
