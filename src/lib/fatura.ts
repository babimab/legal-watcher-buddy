import * as XLSX from "xlsx";

// Lê a planilha de faturamento por ato de um cliente que paga por ato (ex.:
// resseguradora de companhia aérea) -- uma aba por tipo de cobrança
// (Honorários, Despesas de Preposição, Outras Despesas), cada linha vira
// um invoice em PDF. O nome das abas pode variar de planilha pra planilha
// (uma por companhia aérea), então a classificação é por palavra-chave no
// nome da aba, não pelo nome exato.

export type TipoAtoFatura = "Honorários" | "Despesa de Preposição" | "Outra Despesa";

export type AtoFatura = {
  idx: number;
  aba: string;
  tipo: TipoAtoFatura;
  caso: string | null;
  autor: string | null;
  reu: string | null;
  processo: string | null;
  uf: string | null;
  comarca: string | null;
  foro: string | null;
  descricao: string | null;
  valor: number | null;
  moeda: string;
  invoiceNumero: string | null;
  invoicePeriodo: string | null;
  invoiceData: string | null;
  bsRef: string | null;
  correspondente: string | null;
  dataEvento: string | null;
};

function normalizar(texto: string) {
  return texto.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

function texto(valor: unknown): string | null {
  if (valor == null) return null;
  const s = String(valor).trim();
  return s === "" || s.toLowerCase() === "nan" ? null : s;
}

function numero(valor: unknown): number | null {
  if (valor == null || valor === "") return null;
  const n = typeof valor === "number" ? valor : Number(String(valor).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function dataISO(valor: unknown): string | null {
  if (valor == null || valor === "") return null;
  if (valor instanceof Date) {
    const d = new Date(valor.getTime() - valor.getTimezoneOffset() * 60000);
    return d.toISOString().slice(0, 10);
  }
  if (typeof valor === "number") {
    const p = XLSX.SSF.parse_date_code(valor);
    if (!p) return null;
    return `${String(p.y).padStart(4, "0")}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
  }
  const s = String(valor).trim();
  const br = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (br) {
    const ano = br[3]!.length === 2 ? `20${br[3]}` : br[3];
    return `${ano}-${br[2]!.padStart(2, "0")}-${br[1]!.padStart(2, "0")}`;
  }
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return iso ? iso[0] : null;
}

function classificarAba(nomeAba: string): TipoAtoFatura | null {
  const n = normalizar(nomeAba);
  if (n.includes("honorario")) return "Honorários";
  if (n.includes("preposi")) return "Despesa de Preposição";
  if (n.includes("despesa")) return "Outra Despesa";
  return null;
}

// Cada campo aceita várias variações de nome de coluna, pra planilhas de
// companhias aéreas diferentes não precisarem ter o cabeçalho idêntico.
const SINONIMOS: Record<string, keyof typeof CAMPOS_BASE> = {};
const CAMPOS_BASE = {
  caso: ["caso"],
  autor: ["autor", "nome autor"],
  reu: ["reu", "nome reu"],
  processo: ["processo"],
  uf: ["uf"],
  comarca: ["comarca"],
  foro: ["foro", "cartorio"],
  valor: ["amount", "valor"],
  moeda: ["currency", "moeda"],
  invoiceNumero: ["invoice"],
  invoicePeriodo: ["invoice period"],
  invoiceData: ["invoice date"],
  bsRef: ["b&s ref.", "b&s ref", "bs ref"],
  correspondente: ["correspondente"],
  tipoPagamento: ["tipo pagamento"],
  tipoDespesa: ["tipo despesa"],
  dataEvento: ["data da audiencia", "data despesa", "data audiencia"],
} as const;
for (const [campo, nomes] of Object.entries(CAMPOS_BASE)) {
  for (const nome of nomes) SINONIMOS[nome] = campo as keyof typeof CAMPOS_BASE;
}

export function lerPlanilhaFatura(buffer: ArrayBuffer): AtoFatura[] {
  const wb = XLSX.read(buffer, { cellDates: true, cellFormula: false, cellHTML: false });
  const atos: AtoFatura[] = [];
  let idx = 0;

  for (const nomeAba of wb.SheetNames) {
    const tipo = classificarAba(nomeAba);
    if (!tipo) continue;
    const sheet = wb.Sheets[nomeAba];
    if (!sheet) continue;

    const matriz = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false });
    if (matriz.length === 0) continue;
    const cabecalho = (matriz[0] ?? []).map((c) => normalizar(texto(c) ?? ""));

    for (let i = 1; i < matriz.length; i++) {
      const bruta = matriz[i] ?? [];
      if (!bruta.some((c) => texto(c) != null)) continue;
      const dados: Partial<Record<keyof typeof CAMPOS_BASE, unknown>> = {};
      cabecalho.forEach((col, j) => {
        const campo = SINONIMOS[col];
        if (campo && dados[campo] == null) dados[campo] = bruta[j];
      });

      const descricao =
        tipo === "Honorários"
          ? texto(dados.tipoPagamento)
          : tipo === "Outra Despesa"
            ? texto(dados.tipoDespesa)
            : "Comparecimento em audiência";

      atos.push({
        idx: idx++,
        aba: nomeAba.trim(),
        tipo,
        caso: texto(dados.caso),
        autor: texto(dados.autor),
        reu: texto(dados.reu),
        processo: texto(dados.processo),
        uf: texto(dados.uf),
        comarca: texto(dados.comarca),
        foro: texto(dados.foro),
        descricao,
        valor: numero(dados.valor),
        moeda: texto(dados.moeda) ?? "BRL",
        invoiceNumero: texto(dados.invoiceNumero),
        invoicePeriodo: texto(dados.invoicePeriodo),
        invoiceData: dataISO(dados.invoiceData),
        bsRef: texto(dados.bsRef),
        correspondente: texto(dados.correspondente),
        dataEvento: dataISO(dados.dataEvento),
      });
    }
  }
  return atos;
}

// Número do invoice que aparece no cabeçalho do PDF -- ref. B&S + o
// número sequencial do ato, quando tiver (o mesmo caso pode ter mais de
// um ato faturado, cada um com seu próprio número de invoice).
export function numeroInvoice(ato: AtoFatura): string {
  if (ato.bsRef && ato.invoiceNumero) return `${ato.bsRef}-${ato.invoiceNumero}`;
  return ato.bsRef ?? ato.invoiceNumero ?? String(ato.idx + 1);
}

export function nomeArquivoFatura(ato: AtoFatura): string {
  const base = numeroInvoice(ato)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `invoice-${base || ato.idx + 1}.pdf`;
}
