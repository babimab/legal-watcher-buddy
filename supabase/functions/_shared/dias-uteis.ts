// Porta Deno de src/lib/dias-uteis.ts (mesma lógica, char por char) --
// mantém os dois sincronizados manualmente se a regra de feriado mudar,
// já que a função roda em runtime separado (não dá pra importar direto
// do código do site aqui).

function paraDate(iso: string): Date {
  return new Date(`${iso}T12:00:00`);
}

function paraISO(data: Date): string {
  return data.toISOString().slice(0, 10);
}

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
    `${ano}-01-01`,
    `${ano}-04-21`,
    `${ano}-05-01`,
    `${ano}-09-07`,
    `${ano}-10-12`,
    `${ano}-11-02`,
    `${ano}-11-15`,
    `${ano}-11-20`,
    `${ano}-12-25`,
  ];
  const moveis = [
    paraISO(somarDiasCorridos(domingoPascoa, -2)),
    paraISO(somarDiasCorridos(domingoPascoa, 60)),
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

export function somarDiasUteis(iso: string, dias: number): string {
  let atual = iso;
  let restantes = dias;
  while (restantes > 0) {
    atual = paraISO(somarDiasCorridos(paraDate(atual), 1));
    if (ehDiaUtil(atual)) restantes--;
  }
  return atual;
}
