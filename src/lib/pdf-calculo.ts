import type {
  CriteriosCalculo,
  IdentificacaoCalculo,
  ResultadoCalculo,
} from "@/lib/calculos-judiciais";
import {
  A4_H,
  A4_W,
  MARGIN,
  CORES as COLORS,
  Pagina,
  baixarBlob,
  imagemComoJpeg,
  isoBR,
  moeda,
  montarPdf,
  nomeSeguro,
  quebrarTexto,
  tabelaCabecalho,
  tituloSecao,
} from "@/lib/pdf-base";

function linhasIdentificacao(identificacao?: IdentificacaoCalculo) {
  const linhas: Array<[string, string]> = [];
  if (!identificacao) return linhas;
  if (identificacao.processo) linhas.push(["Processo", identificacao.processo]);
  if (identificacao.clienteCaso) linhas.push(["Cliente/Caso", identificacao.clienteCaso]);
  if (identificacao.parteAutora) linhas.push(["Parte autora", identificacao.parteAutora]);
  if (identificacao.parteRe) linhas.push(["Parte ré", identificacao.parteRe]);
  if (!identificacao.parteAutora && identificacao.cliente)
    linhas.push(["Cliente", identificacao.cliente]);
  if (!identificacao.parteRe && identificacao.parteContraria)
    linhas.push(["Parte contrária", identificacao.parteContraria]);
  return linhas;
}

function cabecalhoPrincipal(
  p: Pagina,
  logoRatio: number,
  dataBase: string,
  watermarkRatio: number,
) {
  p.fill(COLORS.navy);
  p.rect(MARGIN, 32, A4_W - MARGIN * 2, 67);
  const logoW = 125;
  const logoH = logoW / logoRatio;
  p.image("ImLogo", MARGIN + 14, 45, logoW, logoH);
  p.stroke([71, 125, 151]);
  p.line(MARGIN + 151, 46, MARGIN + 151, 86);
  p.text("Memória de cálculo judicial", MARGIN + 166, 61, 12.5, {
    bold: true,
    color: COLORS.white,
  });
  p.text("ATUALIZAÇÃO E DEMONSTRATIVO", MARGIN + 166, 77, 7.5, { color: [216, 235, 244] });
  p.text("DATA-BASE DO CÁLCULO", A4_W - MARGIN - 18, 59, 6.5, {
    color: [188, 217, 231],
    align: "right",
  });
  p.text(isoBR(dataBase), A4_W - MARGIN - 18, 76, 11, {
    bold: true,
    color: COLORS.white,
    align: "right",
  });

  const waterW = 330;
  const waterH = waterW / watermarkRatio;
  p.image("ImWater", (A4_W - waterW) / 2, 225, waterW, waterH);
}

function cabecalhoContinuacao(p: Pagina) {
  p.fill(COLORS.navy);
  p.rect(MARGIN, 25, A4_W - MARGIN * 2, 32);
  p.text("FaroLex", MARGIN + 12, 46, 12, { bold: true, color: COLORS.white });
  p.text("Memória de cálculo judicial", A4_W - MARGIN - 12, 46, 8, {
    color: [216, 235, 244],
    align: "right",
  });
}

function rodape(p: Pagina, pagina: number, total: number) {
  p.stroke(COLORS.border);
  p.line(MARGIN, A4_H - 31, A4_W - MARGIN, A4_H - 31);
  p.text("FaroLex · Memória de cálculo judicial", MARGIN, A4_H - 18, 6.8, { color: COLORS.muted });
  p.text(`Página ${pagina} de ${total}`, A4_W - MARGIN, A4_H - 18, 6.8, {
    color: COLORS.muted,
    align: "right",
  });
}

export async function exportarCalculoPdfDireto(
  nome: string,
  dataBase: string,
  criterios: CriteriosCalculo,
  resultado: ResultadoCalculo,
  identificacao?: IdentificacaoCalculo,
) {
  const [logo, watermark] = await Promise.all([
    imagemComoJpeg("/faro-logo-white.png", COLORS.navy),
    imagemComoJpeg("/faro-logo-navy.png", COLORS.white, 0.045),
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
  const identComData: Array<[string, string]> = [
    ...ident,
    ["Data-base do cálculo", isoBR(dataBase)],
  ];
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
    ["Subtotal das verbas", resultado.subtotal],
  ] as const;
  const cardGap = 7;
  const cardW = (A4_W - MARGIN * 2 - cardGap * 3) / 4;
  comps.forEach(([rotulo, valor], i) => {
    const destaque = i === comps.length - 1;
    const x = MARGIN + i * (cardW + cardGap);
    p.fill(destaque ? [226, 240, 247] : COLORS.light);
    p.stroke(destaque ? COLORS.accent : COLORS.border);
    p.rect(x, y, cardW, 45, true, true);
    p.text(rotulo.toUpperCase(), x + 7, y + 13, 6.3, { color: COLORS.muted });
    p.text(moeda(valor), x + 7, y + 31, 10.5, {
      bold: true,
      color: destaque ? COLORS.navy : COLORS.blue,
    });
  });
  y += 45 + 22;

  tituloSecao(p, "Fechamento do cálculo", y);
  y += 18;
  const fechamento = [
    ["Multa de execução", resultado.multaExecucao],
    ["Honorários de execução", resultado.honorariosExecucao],
    ["Honorários sucumbenciais", resultado.honorariosSucumbenciais],
    ["Pagamentos/abatimentos", -resultado.abatimentos],
  ] as const;
  const fechH = 20;
  p.fill(COLORS.lighter);
  p.stroke(COLORS.border);
  p.rect(MARGIN, y, A4_W - MARGIN * 2, fechH * fechamento.length + 8, true, true);
  fechamento.forEach(([rotulo, valor], i) => {
    const yy = y + 8 + i * fechH;
    p.text(rotulo, MARGIN + 12, yy + 9, 8.5, { color: COLORS.text });
    p.text(moeda(valor), A4_W - MARGIN - 12, yy + 9, 8.5, {
      bold: true,
      color: COLORS.blue,
      align: "right",
    });
    if (i < fechamento.length - 1) {
      p.stroke([223, 235, 242]);
      p.line(MARGIN + 12, yy + 15, A4_W - MARGIN - 12, yy + 15);
    }
  });
  y += fechH * fechamento.length + 8 + 12;

  p.fill(COLORS.blue);
  p.rect(MARGIN, y, A4_W - MARGIN * 2, 49);
  p.text("TOTAL ATUALIZADO", MARGIN + 13, y + 29, 8, { color: [216, 235, 244] });
  p.text(moeda(resultado.total), A4_W - MARGIN - 13, y + 31, 18, {
    bold: true,
    color: COLORS.white,
    align: "right",
  });
  y += 72;

  tituloSecao(p, "Memória de cálculo", y);
  y += 15;
  const larguras = [88, 48, 74, 56, 72, 72, 85];
  const xs: number[] = [];
  let xAc = MARGIN;
  larguras.forEach((w) => {
    xs.push(xAc);
    xAc += w;
  });
  const cabecalhos = ["Verba", "Data", "Principal", "Fator", "Correção", "Juros", "Atualizado"];
  y = tabelaCabecalho(p, y, xs, larguras, cabecalhos);

  resultado.memoria.forEach((linha, idx) => {
    const valores = [
      linha.verba,
      isoBR(linha.data),
      moeda(linha.principal),
      linha.fatorCorrecao.toFixed(6),
      moeda(linha.correcao),
      moeda(linha.juros),
      moeda(linha.atualizado),
    ];
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
      p.rect(
        MARGIN,
        y,
        larguras.reduce((a, b) => a + b, 0),
        rowH,
      );
    }
    p.stroke([220, 232, 238]);
    p.line(MARGIN, y + rowH, MARGIN + larguras.reduce((a, b) => a + b, 0), y + rowH);
    linhasVerba.forEach((txt, li) =>
      p.text(txt, xs[0]! + 4, y + 15 + li * 7, 6.5, { color: COLORS.text }),
    );
    for (let i = 1; i < valores.length; i++) {
      const isNum = i >= 2;
      p.text(valores[i]!, isNum ? xs[i]! + larguras[i]! - 4 : xs[i]! + 4, y + 15, 6.5, {
        bold: i === 6,
        color: i === 6 ? COLORS.blue : COLORS.text,
        align: isNum ? "right" : "left",
      });
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

  const periodos = resultado.memoria.flatMap((linha) =>
    (linha.periodosJuros ?? []).map((periodo) => ({ verba: linha.verba, periodo })),
  );
  if (periodos.length) {
    const largJ = [92, 175, 62, 62, 104];
    const xsJ: number[] = [];
    let xAcJ = MARGIN;
    largJ.forEach((w) => {
      xsJ.push(xAcJ);
      xAcJ += w;
    });
    const cabJ = ["Verba", "Período / critério", "De", "Até", "Juros"];
    const largTotalJ = largJ.reduce((a, b) => a + b, 0);

    garantirEspaco(70);
    tituloSecao(p, "Taxa Legal — períodos aplicados", y);
    y += 15;
    y = tabelaCabecalho(p, y, xsJ, largJ, cabJ);

    periodos.forEach(({ verba, periodo }, idx) => {
      const linhasVerbaJ = quebrarTexto(verba, largJ[0]! - 8, 6.5);
      const linhasDesc = quebrarTexto(periodo.descricao, largJ[1]! - 8, 6.5);
      const maxLinhas = Math.max(linhasVerbaJ.length, linhasDesc.length);
      const rowH = Math.max(20, 10 + maxLinhas * 8);
      if (y + rowH > A4_H - 55) {
        p = new Pagina();
        paginas.push(p);
        cabecalhoContinuacao(p);
        y = 76;
        tituloSecao(p, "Taxa Legal — períodos aplicados · continuação", y);
        y += 15;
        y = tabelaCabecalho(p, y, xsJ, largJ, cabJ);
      }
      if (idx % 2) {
        p.fill(COLORS.lighter);
        p.rect(MARGIN, y, largTotalJ, rowH);
      }
      p.stroke([220, 232, 238]);
      p.line(MARGIN, y + rowH, MARGIN + largTotalJ, y + rowH);
      linhasVerbaJ.forEach((txt, li) =>
        p.text(txt, xsJ[0]! + 4, y + 14 + li * 8, 6.5, { color: COLORS.text }),
      );
      linhasDesc.forEach((txt, li) =>
        p.text(txt, xsJ[1]! + 4, y + 14 + li * 8, 6.5, { color: COLORS.text }),
      );
      p.text(isoBR(periodo.de), xsJ[2]! + 4, y + 14, 6.5, { color: COLORS.text });
      p.text(isoBR(periodo.ate), xsJ[3]! + 4, y + 14, 6.5, { color: COLORS.text });
      p.text(moeda(periodo.juros), xsJ[4]! + largJ[4]! - 4, y + 14, 6.5, {
        bold: true,
        color: COLORS.blue,
        align: "right",
      });
      y += rowH;
    });
    y += 18;
  }

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
      linhas.forEach((txt, i) =>
        p.text(txt, MARGIN + 10, y + 14 + i * 11, 8, { color: [64, 95, 112] }),
      );
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
    linhas.forEach((txt, i) =>
      p.text(txt, MARGIN + 10, y + 14 + i * 11, 8, { color: [49, 86, 104] }),
    );
    y += h;
  }

  paginas.forEach((pagina, idx) => rodape(pagina, idx + 1, paginas.length));
  const blob = montarPdf(paginas, { ImLogo: logo, ImWater: watermark });
  const arquivo = `calculo-${nomeSeguro(nome)}-${new Date().toISOString().slice(0, 10)}.pdf`;
  baixarBlob(blob, arquivo);
}
