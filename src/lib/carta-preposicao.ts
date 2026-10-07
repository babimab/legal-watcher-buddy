import * as XLSX from "xlsx";

import { dataISO, dataPorExtenso, normalizar, texto } from "@/lib/substabelecimento";

export type Preposto = { nome: string; cpf: string | null };

export type ItemCartaPreposicao = {
  idx: number;
  processo: string | null;
  poloAtivo: string | null;
  juizo: string | null;
  prepostos: Preposto[];
  cidade: string;
  data: string; // ISO yyyy-mm-dd
};

type CampoBase =
  "processo" | "poloAtivo" | "juizo" | "vara" | "comarca" | "uf" | "prepostos" | "cidade" | "data";

const CAMPOS_BASE: Record<CampoBase, string[]> = {
  processo: ["processo", "numero do processo", "cnj"],
  poloAtivo: ["polo ativo", "autor", "reclamante", "requerente"],
  juizo: ["juizo", "juízo", "em tramite perante", "vara/comarca"],
  vara: ["vara"],
  comarca: ["comarca"],
  uf: ["uf"],
  prepostos: ["prepostos", "preposto", "preposto(s)"],
  cidade: ["cidade"],
  data: ["data", "data do documento"],
};
const SINONIMOS: Record<string, CampoBase> = {};
for (const [campo, nomes] of Object.entries(CAMPOS_BASE)) {
  for (const nome of nomes) SINONIMOS[nome] = campo as CampoBase;
}

// Juízo pode vir pronto numa única coluna ou espalhado em vara/comarca/uf
// -- igual o padrão já usado no Substabelecimento e na Fatura.
function compuserJuizo(dados: Partial<Record<CampoBase, unknown>>): string | null {
  const direto = texto(dados.juizo);
  if (direto) return direto;
  const vara = texto(dados.vara);
  const comarca = texto(dados.comarca);
  const uf = texto(dados.uf);
  if (!vara && !comarca) return null;
  const partes = [vara, comarca ? `comarca de ${comarca}` : null].filter(Boolean).join(" da ");
  return uf ? `${partes} - ${uf.toUpperCase()}` : partes;
}

// Cada preposto numa linha ("Alt+Enter" no Excel, ou na caixa de texto
// do editor), nome e CPF separados pelo último "-" ou "–" da linha. Sem
// separador, a linha inteira vira o nome (sai sem cláusula de CPF nesse
// caso). Exportada também pro editor de item reaproveitar o mesmo
// parser da planilha.
export function lerPrepostos(valor: unknown): Preposto[] {
  const bruto = texto(valor);
  if (!bruto) return [];
  return bruto
    .split(/\r?\n|;/)
    .map((linha) => linha.trim())
    .filter(Boolean)
    .map((linha) => {
      const m = linha.match(/^(.*?)\s*[-–]\s*([\d./-]{8,})\s*$/);
      if (m) return { nome: m[1]!.trim(), cpf: m[2]!.trim() };
      return { nome: linha, cpf: null };
    })
    .filter((p) => p.nome.length > 0);
}

// Inverso de lerPrepostos -- pra pré-preencher a caixa de texto do
// editor com os prepostos que o item já tem.
export function serializarPrepostos(prepostos: Preposto[]): string {
  return prepostos.map((p) => (p.cpf ? `${p.nome} - ${p.cpf}` : p.nome)).join("\n");
}

export function lerPlanilhaCartaPreposicao(buffer: ArrayBuffer): ItemCartaPreposicao[] {
  const wb = XLSX.read(buffer, { cellDates: true, cellFormula: false, cellHTML: false });
  const sheet = wb.Sheets[wb.SheetNames[0]!];
  if (!sheet) return [];

  const matriz = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false });
  if (matriz.length === 0) return [];
  const cabecalho = (matriz[0] ?? []).map((c) => normalizar(texto(c) ?? ""));

  const itens: ItemCartaPreposicao[] = [];
  for (let i = 1; i < matriz.length; i++) {
    const bruta = matriz[i] ?? [];
    if (!bruta.some((c) => texto(c) != null)) continue;
    const dados: Partial<Record<CampoBase, unknown>> = {};
    cabecalho.forEach((col, j) => {
      const campo = SINONIMOS[col];
      if (campo && dados[campo] == null) dados[campo] = bruta[j];
    });

    itens.push({
      idx: itens.length,
      processo: texto(dados.processo),
      poloAtivo: texto(dados.poloAtivo),
      juizo: compuserJuizo(dados),
      prepostos: lerPrepostos(dados.prepostos),
      cidade: texto(dados.cidade) ?? "Rio de Janeiro",
      data: dataISO(dados.data) ?? new Date().toISOString().slice(0, 10),
    });
  }
  return itens;
}

export { dataPorExtenso };

export function nomeArquivoCartaPreposicao(clienteId: string, item: ItemCartaPreposicao): string {
  const base = (item.processo ?? String(item.idx + 1))
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `carta-preposicao-${clienteId}-${base || item.idx + 1}.pdf`;
}
