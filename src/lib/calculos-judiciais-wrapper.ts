export * from "./calculos-judiciais";

import type {
  CriteriosCalculo,
  IdentificacaoCalculo,
  ResultadoCalculo,
} from "./calculos-judiciais";
import { exportarCalculoPdfDireto } from "./pdf-calculo";

/**
 * Mantém a API antiga usada pela tela, mas sempre gera um arquivo .pdf para download.
 * Não abre nova aba e não aciona a janela de impressão do navegador.
 */
export function exportarCalculoPdf(
  nome: string,
  dataBase: string,
  criterios: CriteriosCalculo,
  resultado: ResultadoCalculo,
  identificacao?: IdentificacaoCalculo,
) {
  void exportarCalculoPdfDireto(nome, dataBase, criterios, resultado, identificacao).catch((erro) => {
    console.error("Falha ao gerar PDF da calculadora", erro);
  });
}
