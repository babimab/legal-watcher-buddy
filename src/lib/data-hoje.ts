// "Hoje" (AAAA-MM-DD) no fuso de Brasília (America/Sao_Paulo), nunca no
// fuso do navegador/servidor que executa o código. Prazo processual
// brasileiro vira de dia na meia-noite de Brasília -- usar
// `new Date().toISOString().slice(0, 10)` (dia UTC) erra isso o tempo
// todo entre 21h e 23h59 horário de Brasília (Brasil é UTC-3 o ano
// inteiro, sem horário de verão desde 2019: às 21h em Brasília já é
// meia-noite em UTC), classificando prazo de hoje como vencido e
// data-base de cálculo/andamento como se já fosse amanhã, bem antes da
// hora. `Intl.DateTimeFormat` com `timeZone` explícito não depende do
// fuso de quem roda o código (navegador do usuário ou SSR num servidor
// em UTC) -- sempre calcula o dia civil de Brasília de verdade.
const FUSO_BRASIL = "America/Sao_Paulo";

export function hojeBrasilia(): string {
  // Locale en-CA formata como AAAA-MM-DD por padrão -- mesmo formato já
  // usado em todo o resto do app pra data_movimentacao/prazo.
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO_BRASIL }).format(new Date());
}

// Soma dias a uma data (AAAA-MM-DD) já conhecida -- não usa "agora" nem
// fuso nenhum, só aritmética de calendário (ano/mês/dia), por isso não
// tem como herdar o bug de fuso horário: diferente de `new Date(); d.
// setDate(d.getDate()+N); d.toISOString()...`, que recalcula a partir
// do instante atual e pode cruzar a mesma borda de meia-noite UTC que
// hojeBrasilia() evita.
export function somarDiasData(dataISO: string, dias: number): string {
  const [ano, mes, dia] = dataISO.split("-").map(Number);
  return new Date(Date.UTC(ano!, mes! - 1, dia! + dias)).toISOString().slice(0, 10);
}
