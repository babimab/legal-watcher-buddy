import JSZip from "jszip";

import {
  exibir,
  formatarCNJ,
  listarUltimosAndamentosPorProcessos,
  type Movimentacao,
  type Processo,
} from "@/lib/processos";

// Mesmo azul da marca BCW (sample de word/media/image2.png do timbrado).
const COR_BCW = "005C85";

const CAMINHO_MODELO = "/documentos/timbrado-bcw.docx";
const CAMINHO_DOCUMENT_XML = "word/document.xml";

function escaparXml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function run(
  texto: string,
  opts: { negrito?: boolean; tamanho?: number; cor?: string } = {},
): string {
  const props: string[] = [];
  if (opts.negrito) props.push("<w:b/>");
  if (opts.cor) props.push(`<w:color w:val="${opts.cor}"/>`);
  if (opts.tamanho) props.push(`<w:sz w:val="${opts.tamanho}"/><w:szCs w:val="${opts.tamanho}"/>`);
  const rPr = props.length ? `<w:rPr>${props.join("")}</w:rPr>` : "";
  return `<w:r>${rPr}<w:t xml:space="preserve">${escaparXml(texto)}</w:t></w:r>`;
}

function paragrafo(
  conteudoXml: string,
  opts: { centralizado?: boolean; antes?: number; depois?: number; linhaSeparadora?: boolean } = {},
): string {
  // Ordem dos filhos de w:pPr é fixa pelo schema OOXML (CT_PPr): pBdr vem
  // antes de spacing, que vem antes de jc. Fora dessa ordem o Word recusa
  // o arquivo como corrompido.
  const pPrParts: string[] = [];
  if (opts.linhaSeparadora) {
    pPrParts.push(
      `<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="4" w:color="${COR_BCW}"/></w:pBdr>`,
    );
  }
  if (opts.antes != null || opts.depois != null) {
    const antes = opts.antes != null ? ` w:before="${opts.antes}"` : "";
    const depois = opts.depois != null ? ` w:after="${opts.depois}"` : "";
    pPrParts.push(`<w:spacing${antes}${depois}/>`);
  }
  if (opts.centralizado) pPrParts.push(`<w:jc w:val="center"/>`);
  const pPr = pPrParts.length ? `<w:pPr>${pPrParts.join("")}</w:pPr>` : "";
  return `<w:p>${pPr}${conteudoXml}</w:p>`;
}

function linhaRotulo(rotulo: string, valor: string, opts?: { depois?: number }): string {
  return paragrafo(run(`${rotulo}: `, { negrito: true }) + run(valor), opts);
}

function tituloRelatorioXml(titulo: string, subtitulo: string, totalProcessos: number): string {
  const dataGeracao = new Date().toLocaleDateString("pt-BR");
  const plural = totalProcessos === 1 ? "processo" : "processos";
  return [
    paragrafo(run(titulo, { negrito: true, tamanho: 32, cor: COR_BCW }), {
      centralizado: true,
      depois: 60,
    }),
    paragrafo(run(subtitulo, { negrito: true, tamanho: 24 }), { centralizado: true, depois: 60 }),
    paragrafo(
      run(`Gerado em ${dataGeracao} — ${totalProcessos} ${plural}`, { tamanho: 18, cor: "666666" }),
      {
        centralizado: true,
        depois: 360,
      },
    ),
  ].join("");
}

function blocoProcessoXml(p: Processo, ultimos: Movimentacao[]): string {
  const partes = `${exibir(p.cliente) ?? "Não informado"} x ${exibir(p.parte_contraria) ?? "Não informado"}`;

  const localJuizo = [
    p.vara,
    p.comarca && p.uf ? `${p.comarca}/${p.uf}` : (p.comarca ?? p.uf),
  ].filter((v): v is string => Boolean(v));
  const juizo = localJuizo.length ? localJuizo.join(" — ") : "Não informado";

  const assunto = exibir(p.carteira) ?? exibir(p.classe) ?? "Não informado";
  const objeto = exibir(p.classe) ?? "Não informado";
  const valorCausa =
    p.valor_causa != null
      ? p.valor_causa.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
      : "Não informado";
  const criticidade = exibir(p.criticidade) ?? "Não informada";

  const formatarAndamento = (m: Movimentacao) =>
    `${new Date(`${m.data_movimentacao}T12:00:00`).toLocaleDateString("pt-BR")} — ${m.descricao}`;

  const [primeiroAndamento, ...demaisAndamentos] = ultimos;
  const andamentosXml = primeiroAndamento
    ? [
        linhaRotulo("Últimos andamentos", formatarAndamento(primeiroAndamento)),
        ...demaisAndamentos.map((m) => paragrafo(run(formatarAndamento(m)))),
      ].join("")
    : linhaRotulo("Últimos andamentos", "Sem andamentos registrados");

  const statusAtual = p.fase ? `${p.status} (${p.fase})` : p.status;
  const responsavel = exibir(p.responsavel) ?? "Não informado";

  return [
    paragrafo(
      run(`Processo nº ${formatarCNJ(p.numero_cnj)}`, { negrito: true, tamanho: 24, cor: COR_BCW }),
      {
        antes: 360,
        depois: 120,
      },
    ),
    linhaRotulo("Partes", partes),
    linhaRotulo("Juízo", juizo),
    linhaRotulo("Assunto", assunto),
    linhaRotulo("Objeto", objeto),
    linhaRotulo("Valor da causa", valorCausa),
    linhaRotulo("Criticidade", criticidade),
    andamentosXml,
    linhaRotulo("Status atual", statusAtual),
    linhaRotulo("Advogado responsável", responsavel, { depois: 120 }),
    paragrafo("", { linhaSeparadora: true, depois: 240 }),
  ].join("");
}

/** Insere o corpo do relatório logo antes do `<w:sectPr>` do modelo, preservando cabeçalho/rodapé/margens do timbrado intactos. */
export function injetarCorpoNoTemplate(xmlTemplate: string, corpoXml: string): string {
  const marcador = "<w:sectPr";
  const indice = xmlTemplate.indexOf(marcador);
  if (indice === -1) {
    throw new Error(
      "Modelo de timbrado inesperado: não encontrei <w:sectPr> em word/document.xml.",
    );
  }
  return xmlTemplate.slice(0, indice) + corpoXml + xmlTemplate.slice(indice);
}

/** Monta o XML do corpo (título + um bloco por processo) sem depender do navegador -- usado tanto na exportação real quanto em testes locais. */
export function montarCorpoRelatorioXml(
  titulo: string,
  subtitulo: string,
  processos: Processo[],
  ultimosAndamentosPorProcesso: Map<string, Movimentacao[]>,
): string {
  return (
    tituloRelatorioXml(titulo, subtitulo, processos.length) +
    processos.map((p) => blocoProcessoXml(p, ultimosAndamentosPorProcesso.get(p.id) ?? [])).join("")
  );
}

export async function gerarRelatorioProcessosWord(
  processos: Processo[],
  opts: { subtitulo: string; nomeArquivo: string; titulo?: string },
): Promise<void> {
  const [respostaModelo, andamentosPorProcesso] = await Promise.all([
    fetch(CAMINHO_MODELO),
    listarUltimosAndamentosPorProcessos(
      processos.map((p) => p.id),
      3,
    ),
  ]);
  if (!respostaModelo.ok) {
    throw new Error("Não consegui carregar o modelo timbrado (documentos/timbrado-bcw.docx).");
  }
  const modeloBuffer = await respostaModelo.arrayBuffer();

  const zip = await JSZip.loadAsync(modeloBuffer);
  const arquivoDocumentXml = zip.file(CAMINHO_DOCUMENT_XML);
  if (!arquivoDocumentXml) {
    throw new Error("Modelo de timbrado inválido: word/document.xml não encontrado.");
  }
  const xmlOriginal = await arquivoDocumentXml.async("text");

  const ultimosAndamentosPorProcesso = new Map(
    processos.map((p) => [p.id, andamentosPorProcesso.get(p.id) ?? []]),
  );
  const corpo = montarCorpoRelatorioXml(
    opts.titulo ?? "Relatório Geral de Processos",
    opts.subtitulo,
    processos,
    ultimosAndamentosPorProcesso,
  );
  zip.file(CAMINHO_DOCUMENT_XML, injetarCorpoNoTemplate(xmlOriginal, corpo));

  const blob = await zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${opts.nomeArquivo}-${new Date().toISOString().slice(0, 10)}.docx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
