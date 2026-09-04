// Calendário de dias úteis pra cálculo de prazo processual. Só considera
// feriados NACIONAIS (fixos + móveis calculados a partir da Páscoa) --
// nunca feriado estadual ou municipal, por pedido explícito da BDR
// (cada comarca tem os seus, e o sistema não sabe em qual comarca cada
// processo está sem risco de errar).
//
// Trabalha com datas em formato "AAAA-MM-DD" (mesmo padrão usado em todo
// o resto do app pra data_movimentacao/prazo), sempre interpretadas ao
// meio-dia local pra evitar bug de fuso horário na borda da meia-noite.

function paraDate(iso: string): Date {
  return new Date(`${iso}T12:00:00`);
}

function paraISO(data: Date): string {
  return data.toISOString().slice(0, 10);
}

// Domingo de Páscoa do ano, pelo algoritmo gregoriano anônimo (Meeus/Jones/Butcher).
function pascoa(ano: number): Date {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(ano, mes - 1, dia, 12);
}

function somarDiasCorridos(data: Date, dias: number): Date {
  const nova = new Date(data);
  nova.setDate(nova.getDate() + dias);
  return nova;
}

function feriadosNacionaisDoAno(ano: number): Set<string> {
  const domingoPascoa = pascoa(ano);
  const fixos = [
    `${ano}-01-01`, // Confraternização Universal
    `${ano}-04-21`, // Tiradentes
    `${ano}-05-01`, // Dia do Trabalho
    `${ano}-09-07`, // Independência
    `${ano}-10-12`, // Nossa Senhora Aparecida
    `${ano}-11-02`, // Finados
    `${ano}-11-15`, // Proclamação da República
    `${ano}-11-20`, // Consciência Negra (Lei nº 14.759/2023)
    `${ano}-12-25`, // Natal
  ];
  const moveis = [
    paraISO(somarDiasCorridos(domingoPascoa, -2)), // Sexta-feira Santa
    paraISO(somarDiasCorridos(domingoPascoa, 60)), // Corpus Christi
  ];
  return new Set([...fixos, ...moveis]);
}

const CACHE_FERIADOS = new Map<number, Set<string>>();

export function ehFeriadoNacional(iso: string): boolean {
  const ano = Number(iso.slice(0, 4));
  let feriados = CACHE_FERIADOS.get(ano);
  if (!feriados) {
    feriados = feriadosNacionaisDoAno(ano);
    CACHE_FERIADOS.set(ano, feriados);
  }
  return feriados.has(iso);
}

export function ehDiaUtil(iso: string): boolean {
  const diaSemana = paraDate(iso).getDay();
  if (diaSemana === 0 || diaSemana === 6) return false;
  return !ehFeriadoNacional(iso);
}

export function proximoDiaUtil(iso: string): string {
  let atual = iso;
  do {
    atual = paraISO(somarDiasCorridos(paraDate(atual), 1));
  } while (!ehDiaUtil(atual));
  return atual;
}

/** Soma N dias úteis a partir de uma data-base (que não precisa ela mesma ser dia útil). */
export function somarDiasUteis(iso: string, dias: number): string {
  let atual = iso;
  let restantes = dias;
  while (restantes > 0) {
    atual = paraISO(somarDiasCorridos(paraDate(atual), 1));
    if (ehDiaUtil(atual)) restantes--;
  }
  return atual;
}

export type Urgencia = "vencido" | "urgente" | "atencao" | "normal" | "sem_prazo";

/** Classifica a urgência de um prazo com base em quantos dias corridos faltam a partir de hoje. */
export function classificarUrgencia(prazo: string | null, hojeISO = paraISO(new Date())): Urgencia {
  if (!prazo) return "sem_prazo";
  const diffMs = paraDate(prazo).getTime() - paraDate(hojeISO).getTime();
  const diasRestantes = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (diasRestantes < 0) return "vencido";
  if (diasRestantes <= 2) return "urgente";
  if (diasRestantes <= 5) return "atencao";
  return "normal";
}
