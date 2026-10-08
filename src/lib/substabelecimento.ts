import * as XLSX from "xlsx";

// Acesso restrito -- mesma trava da Fatura: esses documentos citam
// cliente, processo e carregam a assinatura escaneada de um sócio, não é
// pra ficar visível pra quem não precisa.
export const SIGLAS_PERMITIDAS_REPRESENTACAO = ["LSO", "NYM", "BDR"];

// Cadastro de cliente de substabelecimento -- vem do banco (tabela
// clientes_substabelecimento), não mais fixo no código. A assinatura é
// opcional e fica guardada num bucket privado (assinaturas-substabelecimento),
// gerenciada pela própria BDR na tela de Docs de Representação. Ver
// src/lib/clientes-substabelecimento.ts pras funções que leem/gravam
// isso no Supabase.
export type ClienteSubstabelecimento = {
  id: string;
  nome: string;
  // Como o cliente aparece na cláusula "os poderes que me foram
  // conferidos por ___" -- geralmente a razão social completa.
  textoOutorgante: string;
  // Nome/OAB só pra exibição na tela (quem assina) -- a assinatura em
  // si (imagem) já vem com nome/OAB impressos nela.
  assinanteNome: string | null;
  assinanteOab: string | null;
  // Caminho no bucket de assinaturas, ou null se esse cliente ainda não
  // tem assinatura cadastrada (documento sai com espaço em branco).
  assinaturaCaminho: string | null;
  // Procuração do cliente (PDF), guardada à parte -- só a versão atual
  // é mantida, subir uma nova substitui a anterior.
  procuracaoCaminho: string | null;
  procuracaoNomeArquivo: string | null;
  // Carta de preposição "modelo pronto" (PDF) -- além do gerador
  // dinâmico (planilha -> PDF), alguns clientes preferem só anexar uma
  // carta fixa. Mesmo padrão da procuração: só a versão atual.
  cartaPreposicaoCaminho: string | null;
  cartaPreposicaoNomeArquivo: string | null;
  // Substabelecimento "modelo pronto" (PDF) -- pra cliente com texto
  // próprio (ex.: Souza Cruz), diferente da cláusula padrão usada pelo
  // gerador dinâmico. Mesmo padrão: só a versão atual.
  substabelecimentoModeloCaminho: string | null;
  substabelecimentoModeloNomeArquivo: string | null;
};

export type ItemSubstabelecimento = {
  idx: number;
  processo: string | null;
  autor: string | null;
  juizo: string | null;
  comReserva: boolean;
  cidade: string;
  data: string; // ISO yyyy-mm-dd
};

// Exportadas pra reaproveitar na leitura da planilha de Carta de
// Preposição (mesmo padrão de planilha, mesmo jeito de ler célula).
export function normalizar(texto: string) {
  return texto.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

export function texto(valor: unknown): string | null {
  if (valor == null) return null;
  const s = String(valor).trim();
  return s === "" || s.toLowerCase() === "nan" ? null : s;
}

export function dataISO(valor: unknown): string | null {
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

type CampoBase =
  "processo" | "autor" | "juizo" | "vara" | "comarca" | "uf" | "reserva" | "cidade" | "data";

const CAMPOS_BASE: Record<CampoBase, string[]> = {
  processo: ["processo", "numero do processo", "cnj"],
  autor: ["autor", "movido por", "reclamante"],
  juizo: ["juizo", "juízo", "em tramite perante", "vara/comarca"],
  vara: ["vara"],
  comarca: ["comarca"],
  uf: ["uf"],
  reserva: ["reserva", "com ou sem reserva", "reserva de poderes"],
  cidade: ["cidade"],
  data: ["data", "data do documento"],
};
const SINONIMOS: Record<string, CampoBase> = {};
for (const [campo, nomes] of Object.entries(CAMPOS_BASE)) {
  for (const nome of nomes) SINONIMOS[nome] = campo as CampoBase;
}

// Juízo pode vir pronto numa única coluna ou espalhado em vara/comarca/uf
// -- igual o padrão já usado na leitura da planilha de Fatura.
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

export function lerPlanilhaSubstabelecimento(buffer: ArrayBuffer): ItemSubstabelecimento[] {
  const wb = XLSX.read(buffer, { cellDates: true, cellFormula: false, cellHTML: false });
  const sheet = wb.Sheets[wb.SheetNames[0]!];
  if (!sheet) return [];

  const matriz = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false });
  if (matriz.length === 0) return [];
  const cabecalho = (matriz[0] ?? []).map((c) => normalizar(texto(c) ?? ""));

  const itens: ItemSubstabelecimento[] = [];
  for (let i = 1; i < matriz.length; i++) {
    const bruta = matriz[i] ?? [];
    if (!bruta.some((c) => texto(c) != null)) continue;
    const dados: Partial<Record<CampoBase, unknown>> = {};
    cabecalho.forEach((col, j) => {
      const campo = SINONIMOS[col];
      if (campo && dados[campo] == null) dados[campo] = bruta[j];
    });

    const reservaTexto = normalizar(texto(dados.reserva) ?? "com");
    const comReserva = !reservaTexto.startsWith("sem");

    itens.push({
      idx: itens.length,
      processo: texto(dados.processo),
      autor: texto(dados.autor),
      juizo: compuserJuizo(dados),
      comReserva,
      cidade: texto(dados.cidade) ?? "Rio de Janeiro",
      data: dataISO(dados.data) ?? new Date().toISOString().slice(0, 10),
    });
  }
  return itens;
}

const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

export function dataPorExtenso(iso: string): string {
  const [ano, mes, dia] = iso.split("-").map(Number);
  if (!ano || !mes || !dia) return iso;
  return `${dia} de ${MESES[mes - 1]} de ${ano}`;
}

export function nomeArquivoSubstabelecimento(
  cliente: ClienteSubstabelecimento,
  item: ItemSubstabelecimento,
): string {
  const base = (item.processo ?? String(item.idx + 1))
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `substabelecimento-${cliente.id}-${base || item.idx + 1}.pdf`;
}
