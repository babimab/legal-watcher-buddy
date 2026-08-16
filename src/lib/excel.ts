import ExcelJS from "exceljs";

import { formatarCNJ, exibir, type Processo } from "@/lib/processos";
import type { GrupoParteAdversa } from "@/lib/saude";

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

export async function exportarProcessosExcel(processos: Processo[], nomeArquivo = "processos") {
  const workbook = new ExcelJS.Workbook();
  const planilha = workbook.addWorksheet("Processos");

  planilha.columns = [
    { header: "Número CNJ", key: "numero_cnj", width: 22 },
    { header: "Cliente", key: "cliente", width: 26 },
    { header: "Parte adversa", key: "parte_contraria", width: 26 },
    { header: "Nº do cliente", key: "numero_cliente", width: 14 },
    { header: "Número do caso", key: "numero_interno", width: 16 },
    { header: "Comarca", key: "comarca", width: 22 },
    { header: "UF", key: "uf", width: 10 },
    { header: "Responsável", key: "responsavel", width: 14 },
    { header: "Sócio", key: "socio", width: 10 },
    { header: "Fase", key: "fase", width: 16 },
    { header: "Status", key: "status", width: 14 },
  ];

  for (const p of processos) {
    planilha.addRow({
      numero_cnj: formatarCNJ(p.numero_cnj),
      cliente: exibir(p.cliente) ?? "",
      parte_contraria: p.parte_contraria ?? "",
      numero_cliente: p.numero_cliente ?? "",
      numero_interno: p.numero_interno ?? "",
      comarca: p.comarca ?? "",
      uf: p.uf ?? "",
      responsavel: p.responsavel ?? "",
      socio: p.socio ?? "",
      fase: p.fase ?? "",
      status: p.status,
    });
  }

  estilizarCabecalho(planilha);
  centralizarLinhas(planilha, new Set());
  finalizarPlanilha(planilha);

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
        numero_cnj: formatarCNJ(p.numero_cnj),
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
  finalizarPlanilha(planilha);

  await baixarPlanilha(workbook, nomeArquivo);
}
