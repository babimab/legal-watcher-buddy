import ExcelJS from "exceljs";

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
