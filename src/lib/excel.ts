import ExcelJS from "exceljs";

import {
  formatarCNJ,
  exibir,
  listarUltimosAndamentosPorProcessos,
  categoriaCliente,
  CATEGORIAS_CLIENTE,
  type Movimentacao,
  type Processo,
} from "@/lib/processos";
import type { GrupoParteAdversa } from "@/lib/saude";
import { linkTribunalEfetivo } from "@/lib/tribunais";

// Mesmo azul escuro usado no cabeçalho do site (--primary), pra planilha
// exportada ficar com a cara do sistema.
const COR_CABECALHO = "FF0D3A51";

export function estilizarCabecalho(planilha: ExcelJS.Worksheet) {
  const cabecalho = planilha.getRow(1);
  cabecalho.height = 22;
  cabecalho.eachCell((celula) => {
    celula.font = { bold: true, color: { argb: "FFFFFFFF" } };
    celula.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COR_CABECALHO } };
    celula.alignment = { horizontal: "center", vertical: "middle" };
  });
}

/** Centraliza todas as células de dados, exceto as colunas de texto livre (que ficam à esquerda e quebram linha). */
export function centralizarLinhas(planilha: ExcelJS.Worksheet, colunasTextoLivre: Set<string>) {
  planilha.eachRow((linha, numeroLinha) => {
    if (numeroLinha === 1) return;
    linha.eachCell((celula, numeroColuna) => {
      const chave = String(planilha.getColumn(numeroColuna).key);
      const textoLivre = colunasTextoLivre.has(chave);
      celula.alignment = {
        horizontal: textoLivre ? "left" : "center",
        vertical: "middle",
        wrapText: textoLivre,
      };
    });
  });
}

/** Ajusta a largura de cada coluna ao maior texto realmente usado, exceto as de texto livre (que ficam com largura fixa e quebram linha). */
export function ajustarLargurasAoConteudo(
  planilha: ExcelJS.Worksheet,
  colunasTextoLivre: Set<string>,
) {
  for (const coluna of planilha.columns) {
    const chave = String(coluna.key);
    if (colunasTextoLivre.has(chave)) continue;
    let maiorTexto = String(coluna.header ?? "").length;
    coluna.eachCell?.({ includeEmpty: false }, (celula) => {
      const valor = celula.value;
      // Célula com hyperlink guarda { text, hyperlink } em vez de string.
      const texto =
        valor == null
          ? ""
          : typeof valor === "object" && "text" in valor
            ? String((valor as { text: unknown }).text)
            : String(valor);
      if (texto.length > maiorTexto) maiorTexto = texto.length;
    });
    coluna.width = Math.min(Math.max(maiorTexto + 2, 10), 40);
  }
}

/** Estiliza como link (azul, sublinhado) as colunas indicadas, sem mexer no cabeçalho. */
export function estilizarComoLink(planilha: ExcelJS.Worksheet, colunas: Set<string>) {
  planilha.eachRow((linha, numeroLinha) => {
    if (numeroLinha === 1) return;
    linha.eachCell((celula, numeroColuna) => {
      const chave = String(planilha.getColumn(numeroColuna).key);
      if (!colunas.has(chave)) return;
      celula.font = { color: { argb: "FF0563C1" }, underline: true };
    });
  });
}

/** Fecha cada linha de dados (menos o cabeçalho) com borda, pra ficar clara na impressão. */
export function fecharLinhasComBorda(planilha: ExcelJS.Worksheet, quebraDePaginaPorLinha = false) {
  planilha.eachRow((linha, numeroLinha) => {
    if (numeroLinha === 1) return;
    linha.eachCell((celula) => {
      celula.border = {
        top: { style: "medium", color: { argb: "FF9E9E9E" } },
        left: { style: "medium", color: { argb: "FF9E9E9E" } },
        bottom: { style: "medium", color: { argb: "FF9E9E9E" } },
        right: { style: "medium", color: { argb: "FF9E9E9E" } },
      };
    });
    if (quebraDePaginaPorLinha) linha.addPageBreak();
  });
}

export function finalizarPlanilha(planilha: ExcelJS.Worksheet) {
  planilha.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: planilha.columns.length },
  };
  planilha.views = [{ state: "frozen", ySplit: 1 }];
}

export async function baixarPlanilha(workbook: ExcelJS.Workbook, nomeArquivo: string) {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${nomeArquivo}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

const COLUNAS_PROCESSOS: Partial<ExcelJS.Column>[] = [
  { header: "Número CNJ", key: "numero_cnj", width: 22 },
  { header: "Cliente", key: "cliente", width: 26 },
  { header: "Parte adversa", key: "parte_contraria", width: 26 },
  { header: "Nº do cliente", key: "numero_cliente", width: 14 },
  { header: "Número do caso", key: "numero_interno", width: 16 },
  { header: "Comarca", key: "comarca", width: 22 },
  { header: "UF", key: "uf", width: 10 },
  { header: "Juízo", key: "vara", width: 22 },
  { header: "Responsável", key: "responsavel", width: 14 },
  { header: "Sócio", key: "socio", width: 10 },
  { header: "Objeto", key: "objeto", width: 30 },
  {
    header: "Valor da causa",
    key: "valor_causa",
    width: 16,
    style: { numFmt: '"R$" #,##0.00' },
  },
  { header: "Criticidade", key: "criticidade", width: 12 },
  { header: "Fase", key: "fase", width: 16 },
  { header: "Status", key: "status", width: 14 },
  { header: "Últimos andamentos", key: "ultimos_andamentos", width: 50 },
];

/** Preenche uma aba com a lista padrão de colunas de processo, já com toda a formatação (cabeçalho, largura, borda, link, destaque). */
function preencherPlanilhaProcessos(
  planilha: ExcelJS.Worksheet,
  processos: Processo[],
  andamentosPorProcesso: Map<string, Movimentacao[]>,
  destacarIds?: Set<string>,
) {
  planilha.columns = COLUNAS_PROCESSOS;

  for (const p of processos) {
    const ultimos = andamentosPorProcesso.get(p.id) ?? [];
    const ultimosAndamentos = ultimos
      .map(
        (m) =>
          `${new Date(`${m.data_movimentacao}T12:00:00`).toLocaleDateString("pt-BR")} - ${m.descricao}`,
      )
      .join("\n");

    const linha = planilha.addRow({
      numero_cnj: { text: formatarCNJ(p.numero_cnj), hyperlink: linkTribunalEfetivo(p) },
      cliente: exibir(p.cliente) ?? "",
      parte_contraria: p.parte_contraria ?? "",
      numero_cliente: p.numero_cliente ?? "",
      numero_interno: p.numero_interno ?? "",
      comarca: p.comarca ?? "",
      uf: p.uf ?? "",
      vara: p.vara ?? "",
      responsavel: p.responsavel ?? "",
      socio: p.socio ?? "",
      objeto: exibir(p.classe) ?? "",
      valor_causa: p.valor_causa ?? null,
      criticidade: exibir(p.criticidade) ?? "",
      fase: p.fase ?? "",
      status: p.status,
      ultimos_andamentos: ultimosAndamentos,
    });

    if (destacarIds?.has(p.id)) {
      linha.eachCell((celula) => {
        celula.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF00" } };
      });
    }
  }

  estilizarCabecalho(planilha);
  centralizarLinhas(planilha, new Set(["ultimos_andamentos"]));
  ajustarLargurasAoConteudo(planilha, new Set(["ultimos_andamentos"]));
  fecharLinhasComBorda(planilha);
  estilizarComoLink(planilha, new Set(["numero_cnj"]));
  planilha.pageSetup = { orientation: "landscape", fitToWidth: 1, fitToHeight: 0 };
  finalizarPlanilha(planilha);
}

export async function exportarProcessosExcel(
  processos: Processo[],
  nomeArquivo = "processos",
  destacarIds?: Set<string>,
) {
  const workbook = new ExcelJS.Workbook();
  const planilha = workbook.addWorksheet("Processos");

  // Só busca andamento dos processos que estão realmente sendo exportados
  // (não da base inteira), pra não pesar quando a pasta é pequena mas o
  // total de movimentações no sistema é grande.
  const andamentosPorProcesso = await listarUltimosAndamentosPorProcessos(
    processos.map((p) => p.id),
    3,
  );

  preencherPlanilhaProcessos(planilha, processos, andamentosPorProcesso, destacarIds);

  await baixarPlanilha(workbook, nomeArquivo);
}

/**
 * Mesma planilha de processos, mas dividida numa aba por assunto/cliente
 * (Souza Cruz, Merck, PRC, Astro, e uma aba "Outros" pro resto) em vez de
 * tudo numa aba só -- pedido da ELV, que preferia o formato antigo das
 * planilhas por assunto em vez de tudo misturado.
 */
// Uma cor por assunto, pra aba ficar colorida igual às planilhas antigas
// (não são as mesmas cores exatas -- aquelas eram do tema do Excel, sem
// um código fixo pra copiar -- mas o efeito de diferenciar visualmente é
// o mesmo).
const COR_ABA_POR_CATEGORIA: Record<(typeof CATEGORIAS_CLIENTE)[number], string> = {
  Astro: "FF4472C4",
  "Souza Cruz": "FF70AD47",
  Consultoria: "FFC00000",
  Merck: "FFED7D31",
  FASC: "FF7030A0",
  PRC: "FF2E9B9B",
  Outros: "FF9E9E9E",
};

export async function exportarProcessosPorAssuntoExcel(
  processos: Processo[],
  nomeArquivo = "processos-por-assunto",
  destacarIds?: Set<string>,
) {
  const workbook = new ExcelJS.Workbook();

  const andamentosPorProcesso = await listarUltimosAndamentosPorProcessos(
    processos.map((p) => p.id),
    3,
  );

  for (const categoria of CATEGORIAS_CLIENTE) {
    const doGrupo = processos.filter(
      (p) => categoriaCliente(p.cliente, p.numero_cliente, p.carteira) === categoria,
    );
    if (doGrupo.length === 0) continue;
    const planilha = workbook.addWorksheet(categoria, {
      properties: { tabColor: { argb: COR_ABA_POR_CATEGORIA[categoria] } },
    });
    preencherPlanilhaProcessos(planilha, doGrupo, andamentosPorProcesso, destacarIds);
  }

  if (workbook.worksheets.length === 0) {
    workbook.addWorksheet("Processos");
  }

  await baixarPlanilha(workbook, nomeArquivo);
}

/**
 * Planilha pra revisão manual: agrupa processos com a mesma parte adversa
 * (indício de desdobramento) e deixa colunas em branco pra marcar se é
 * desdobramento, de qual tipo, e qual é o processo principal do grupo.
 */
export async function exportarGruposParteAdversaExcel(
  grupos: GrupoParteAdversa[],
  nomeArquivo = "possiveis-desdobramentos",
) {
  const workbook = new ExcelJS.Workbook();
  const planilha = workbook.addWorksheet("Possíveis desdobramentos");

  planilha.columns = [
    { header: "Parte adversa", key: "parte_adversa", width: 30 },
    { header: "Número CNJ", key: "numero_cnj", width: 22 },
    { header: "Cliente", key: "cliente", width: 22 },
    { header: "Classe", key: "classe", width: 26 },
    { header: "Comarca", key: "comarca", width: 20 },
    { header: "Vara", key: "vara", width: 22 },
    { header: "Fase", key: "fase", width: 16 },
    { header: "Status", key: "status", width: 12 },
    { header: "Já vinculado?", key: "ja_vinculado", width: 14 },
    { header: "É desdobramento? (Sim/Não)", key: "e_desdobramento", width: 22 },
    {
      header: "Tipo (Recurso/Cumprimento de sentença/Execução/Embargos/Agravo/Outro)",
      key: "tipo",
      width: 40,
    },
    { header: "Processo principal (CNJ)", key: "principal", width: 22 },
  ];

  const BORDA_GRUPO: Partial<ExcelJS.Borders> = {
    top: { style: "medium", color: { argb: "FF0D3A51" } },
  };

  for (const grupo of grupos) {
    let primeira = true;
    for (const p of grupo.processos) {
      const linha = planilha.addRow({
        parte_adversa: grupo.parteAdversa,
        numero_cnj: { text: formatarCNJ(p.numero_cnj), hyperlink: linkTribunalEfetivo(p) },
        cliente: exibir(p.cliente) ?? "",
        classe: p.classe ?? "",
        comarca: p.comarca ?? "",
        vara: p.vara ?? "",
        fase: p.fase ?? "",
        status: p.status,
        ja_vinculado: p.processo_pai_id ? `Sim (${exibir(p.tipo_desdobramento) ?? "?"})` : "Não",
        e_desdobramento: "",
        tipo: "",
        principal: "",
      });
      if (primeira) {
        linha.eachCell((celula) => {
          celula.border = BORDA_GRUPO;
        });
        primeira = false;
      }
    }
  }

  estilizarCabecalho(planilha);
  centralizarLinhas(planilha, new Set(["classe"]));
  estilizarComoLink(planilha, new Set(["numero_cnj"]));
  finalizarPlanilha(planilha);

  await baixarPlanilha(workbook, nomeArquivo);
}
