// Levantamento (pedido pela BDR) dos processos ativos da Souza Cruz que
// estão suspensos por um de dois motivos: acordo celebrado aguardando
// quitação integral, ou execução suspensa após tentativa frustrada de
// localizar bens penhoráveis. Não existe campo estruturado pra isso no
// cadastro -- o motivo, quando registrado, fica em texto livre
// (observações/detalhamento do objeto). Por isso a classificação aqui é
// só uma PRÉ-TRIAGEM por palavra-chave: aponta candidatos pra revisão,
// não substitui a conferência jurídica.
import { categoriaCliente, type Processo } from "@/lib/processos";

export type MotivoSuspensaoSouzaCruz =
  "acordo_aguardando_quitacao" | "execucao_suspensa_sem_bens" | "ambiguo";

function normalizarTexto(s: string): string {
  return s.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// "acordo" sozinho pega até acordo já cumprido/homologado sem pendência
// -- exige também um sinal de que o cumprimento ainda não terminou.
const ACORDO_PRINCIPAL = /\bacordos?\b/;
const ACORDO_COMPLEMENTO =
  /\b(quita(cao|do|r)?|parcelas?|aguardando|aguarda(ndo)? o pagamento|pagamento integral|cumprimento do acordo|saldo devedor|inadimpl)/;

// "penhora"/"bens" sozinho pega qualquer menção normal de tentativa de
// penhora (inclusive bem-sucedida) -- exige também um sinal de que a
// busca não deu resultado.
const EXECUCAO_PRINCIPAL = /\b(penhoras?|bens? penhora[vb]e(l|is)|bens? a penhorar)\b/;
const EXECUCAO_COMPLEMENTO =
  /\b(frustrad|nao localizad|sem e[xc]ito|infrutifer|suspens\w* da execu[cç]ao|art\.?\s*921)/;

export function classificarSuspensaoSouzaCruz(
  textos: (string | null | undefined)[],
): MotivoSuspensaoSouzaCruz | null {
  const texto = normalizarTexto(textos.filter((t): t is string => !!t).join(" \n "));
  const temAcordo = ACORDO_PRINCIPAL.test(texto) && ACORDO_COMPLEMENTO.test(texto);
  const temExecucaoSemBens = EXECUCAO_PRINCIPAL.test(texto) && EXECUCAO_COMPLEMENTO.test(texto);
  if (temAcordo && temExecucaoSemBens) return "ambiguo";
  if (temAcordo) return "acordo_aguardando_quitacao";
  if (temExecucaoSemBens) return "execucao_suspensa_sem_bens";
  return null;
}

// Universo-base do levantamento: processo da Souza Cruz ainda não
// fechado (nem encerrado, arquivado ou baixado) -- inclui status
// "ativo" de propósito, além de "suspenso": o campo de status nem
// sempre está atualizado, e um processo com status "ativo" cujo texto
// já aponta acordo/execução sem bens é justamente o tipo de
// inconsistência que esse levantamento deveria pegar.
export function ehSouzaCruzAindaAberto(p: Processo): boolean {
  if (categoriaCliente(p.cliente, p.numero_cliente, p.carteira) !== "Souza Cruz") return false;
  return p.status === "ativo" || p.status === "suspenso";
}

export type LevantamentoSuspensosSouzaCruz = {
  acordoAguardandoQuitacao: Processo[];
  execucaoSuspensaSemBens: Processo[];
  ambiguo: Processo[];
  // Suspenso pelo campo de status, mas sem nenhum dos dois padrões no
  // texto -- fica pra revisão manual (motivo não documentado ou
  // documentado com outras palavras).
  semPadraoIdentificado: Processo[];
};

export function levantarSuspensosSouzaCruz(processos: Processo[]): LevantamentoSuspensosSouzaCruz {
  const candidatos = processos.filter(ehSouzaCruzAindaAberto);
  const resultado: LevantamentoSuspensosSouzaCruz = {
    acordoAguardandoQuitacao: [],
    execucaoSuspensaSemBens: [],
    ambiguo: [],
    semPadraoIdentificado: [],
  };
  for (const p of candidatos) {
    const motivo = classificarSuspensaoSouzaCruz([p.observacoes, p.detalhamento_objeto]);
    if (motivo === "acordo_aguardando_quitacao") resultado.acordoAguardandoQuitacao.push(p);
    else if (motivo === "execucao_suspensa_sem_bens") resultado.execucaoSuspensaSemBens.push(p);
    else if (motivo === "ambiguo") resultado.ambiguo.push(p);
    else if (p.status === "suspenso") resultado.semPadraoIdentificado.push(p);
  }
  return resultado;
}
