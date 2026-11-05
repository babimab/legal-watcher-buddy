// Paginação interna para os endpoints de integração (Legal Desk/TI):
// junta várias páginas de até 1000 linhas (teto do PostgREST) numa única
// lista antes de responder, sem mudar o formato da resposta.
//
// Em vez de confiar em "a página veio menor que o pedido, então acabou",
// medimos o total real com uma contagem exata (count=exact) ANTES de
// buscar qualquer linha -- isso não é afetado pelo limite de linhas por
// página do PostgREST. Se esse total passar do teto de segurança, a
// consulta é recusada de cara (nunca inicia uma resposta parcial). Ao
// final, conferimos se o total de linhas realmente buscadas bate com o
// total medido no início; se vier menor (ex.: alguma página foi cortada
// por engano, ou uma linha foi removida bem no meio da varredura), isso
// vira erro explícito -- nunca uma lista incompleta com HTTP 200.
//
// Também não garante uma "foto" perfeitamente congelada do banco: se
// novas linhas forem INSERIDAS dentro do período pedido enquanto a
// varredura está em andamento, elas podem ou não entrar na resposta
// (a mesma ambiguidade que já existia numa consulta única, sem
// paginação). O que a checagem acima evita é a lista vir MENOR do que
// o que já existia no instante da contagem -- essa é a garantia que
// importa aqui (nunca perder registro que já estava lá).
export type ResultadoPaginacaoInterna<T> =
  | { ok: true; linhas: T[] }
  | { ok: false; motivo: "limite_excedido"; teto: number; total: number }
  | { ok: false; motivo: "inconsistente"; esperado: number; obtido: number };

export async function buscarTudoComPaginacaoInterna<T extends { id: string }>(args: {
  contarTotal: () => Promise<number>;
  buscarPagina: (cursor: { valor: string; id: string } | null, tamanho: number) => Promise<T[]>;
  valorOrdenacaoDe: (linha: T) => string;
  teto: number;
  tamanhoPagina?: number;
}): Promise<ResultadoPaginacaoInterna<T>> {
  const { contarTotal, buscarPagina, valorOrdenacaoDe, teto, tamanhoPagina = 1000 } = args;

  const total = await contarTotal();
  if (total > teto) {
    return { ok: false, motivo: "limite_excedido", teto, total };
  }

  const acumulado: T[] = [];
  let cursor: { valor: string; id: string } | null = null;
  for (;;) {
    const pagina = await buscarPagina(cursor, tamanhoPagina);
    acumulado.push(...pagina);
    if (pagina.length < tamanhoPagina) break;
    const ultima = pagina[pagina.length - 1]!;
    cursor = { valor: valorOrdenacaoDe(ultima), id: ultima.id };
  }

  if (acumulado.length < total) {
    return { ok: false, motivo: "inconsistente", esperado: total, obtido: acumulado.length };
  }
  return { ok: true, linhas: acumulado };
}

// Monta o filtro OR de busca por cursor (keyset/seek), com desempate por
// id: pega só linhas depois do cursor, na mesma ordenação usada na
// busca (coluna de data ascendente, id ascendente). Evita o problema do
// OFFSET tradicional (.range()), que pode pular ou repetir linhas se
// algo for inserido no meio da varredura.
export function filtroCursorPagina(coluna: string, cursor: { valor: string; id: string }): string {
  return `${coluna}.gt.${cursor.valor},and(${coluna}.eq.${cursor.valor},id.gt.${cursor.id})`;
}

// Teto de segurança do total de linhas que um único pedido de
// integração pode devolver. Não é uma estimativa de volume de negócio
// (não temos esse número hoje) -- é um limite técnico, calculado para
// caber com folga no tempo de execução e no tamanho de resposta que a
// rota/Edge Function aguenta com segurança: com páginas de até 1000
// linhas, 20.000 linhas são ~20 idas e vindas ao banco (poucos
// segundos) e um payload da ordem de poucos MB. Isso está bem acima do
// volume atual do escritório, com folga para anos de crescimento, mas é
// fácil de ajustar aqui quando houver uma estimativa real de volume
// esperado (a confirmar com o TI/Legal Desk).
export const TETO_SEGURANCA_PADRAO = 20_000;
