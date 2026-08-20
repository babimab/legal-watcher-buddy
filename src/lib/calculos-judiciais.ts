import ExcelJS from "exceljs";

import { supabase } from "@/integrations/supabase/client";
import { supabaseSolto } from "@/lib/supabase-solto";
import { baixarPlanilha } from "@/lib/excel";

export type ParcelaCalculo = { id: string; valor: number; data: string };
export type AbatimentoCalculo = { id: string; valor: number; data: string; descricao?: string };
export type TipoIndice = "nenhum" | "ipca" | "manual";
export type TipoJuros = "nenhum" | "mensal" | "anual" | "selic";

export type VerbaCalculo = {
  id: string;
  descricao: string;
  parcelas: ParcelaCalculo[];
  indice: TipoIndice;
  fatorManual?: number;
  correcaoDesde?: string;
  juros: TipoJuros;
  taxa?: number;
  jurosDesde?: string;
  observacao?: string;
};

export type EncargoCalculo = {
  modo: "percentual" | "fixo";
  valor: number;
  base: "subtotal" | "principal";
};

export type CriteriosCalculo = {
  verbas: VerbaCalculo[];
  multaExecucao: EncargoCalculo;
  honorariosExecucao: EncargoCalculo;
  honorariosSucumbenciais: EncargoCalculo;
  abatimentos: AbatimentoCalculo[];
  observacoes?: string;
};

export type LinhaMemoria = {
  verba: string;
  parcela: string;
  data: string;
  principal: number;
  fatorCorrecao: number;
  correcao: number;
  juros: number;
  atualizado: number;
  fonteCorrecao: string;
  fonteJuros: string;
};

export type ResultadoCalculo = {
  principal: number;
  correcao: number;
  juros: number;
  subtotal: number;
  multaExecucao: number;
  honorariosExecucao: number;
  honorariosSucumbenciais: number;
  abatimentos: number;
  total: number;
  memoria: LinhaMemoria[];
  fontes: string[];
};

export type CalculoJudicial = {
  id: string;
  processo_id: string | null;
  nome: string;
  data_base: string;
  criterios: CriteriosCalculo;
  resultado: ResultadoCalculo | null;
  versao: number;
  observacoes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type DocumentoCalculo = {
  id: string;
  calculo_id: string;
  categoria: "titulo" | "autos";
  nome_arquivo: string;
  caminho: string;
  tamanho: number | null;
  tipo: string | null;
  created_at: string;
};

const BUCKET = "calculos-judiciais";

export function novaVerba(): VerbaCalculo {
  return {
    id: crypto.randomUUID(),
    descricao: "Dano moral",
    parcelas: [{ id: crypto.randomUUID(), valor: 0, data: "" }],
    indice: "nenhum",
    juros: "nenhum",
  };
}

export function criteriosIniciais(): CriteriosCalculo {
  const encargo = (): EncargoCalculo => ({ modo: "percentual", valor: 0, base: "subtotal" });
  return {
    verbas: [novaVerba()],
    multaExecucao: encargo(),
    honorariosExecucao: encargo(),
    honorariosSucumbenciais: encargo(),
    abatimentos: [],
  };
}

function isoBR(data: string) {
  if (!data) return "";
  const [a, m, d] = data.split("-");
  return `${d}/${m}/${a}`;
}

function mesesEntre(de: string, ate: string) {
  const a = new Date(`${de}T12:00:00`);
  const b = new Date(`${ate}T12:00:00`);
  return Math.max(0, (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth());
}

function diasEntre(de: string, ate: string) {
  const a = new Date(`${de}T12:00:00`).getTime();
  const b = new Date(`${ate}T12:00:00`).getTime();
  return Math.max(0, Math.round((b - a) / 864e5));
}

async function obterIpcaMensal(de: string, ate: string): Promise<number[]> {
  const ini = de.slice(0, 7).replace("-", "");
  const fim = ate.slice(0, 7).replace("-", "");
  const url = `https://apisidra.ibge.gov.br/values/t/1737/n1/all/v/63/p/${ini}-${fim}?formato=json`;
  const r = await fetch(url);
  if (!r.ok) throw new Error("Não foi possível consultar o IPCA no IBGE/SIDRA.");
  const json = (await r.json()) as Array<Record<string, string>>;
  return json
    .slice(1)
    .map((x) => Number(String(x.V ?? "").replace(",", ".")))
    .filter((x) => Number.isFinite(x));
}

async function fatorIpca(de: string, ate: string): Promise<number> {
  if (!de || de >= ate) return 1;
  const taxas = await obterIpcaMensal(de, ate);
  return taxas.reduce((f, taxa) => f * (1 + taxa / 100), 1);
}

async function fatorSelic(de: string, ate: string): Promise<number> {
  if (!de || de >= ate) return 1;
  const br = (s: string) => {
    const [a, m, d] = s.split("-");
    return `${d}/${m}/${a}`;
  };
  const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.11/dados?formato=json&dataInicial=${encodeURIComponent(br(de))}&dataFinal=${encodeURIComponent(br(ate))}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error("Não foi possível consultar a SELIC no Banco Central.");
  const json = (await r.json()) as Array<{ valor: string }>;
  return json.reduce((f, item) => {
    const taxa = Number(item.valor.replace(",", "."));
    return Number.isFinite(taxa) ? f * (1 + taxa / 100) : f;
  }, 1);
}

export async function calcularJudicial(
  criterios: CriteriosCalculo,
  dataBase: string,
): Promise<ResultadoCalculo> {
  const memoria: LinhaMemoria[] = [];
  const fontes = new Set<string>();

  for (const verba of criterios.verbas) {
    for (const parcela of verba.parcelas) {
      const principal = Number(parcela.valor) || 0;
      if (!principal) continue;
      const inicioCorrecao = verba.correcaoDesde || parcela.data;
      const inicioJuros = verba.jurosDesde || parcela.data;

      let fatorCorrecao = 1;
      let fonteCorrecao = "Sem correção monetária";
      if (verba.indice === "ipca") {
        fatorCorrecao = await fatorIpca(inicioCorrecao, dataBase);
        fonteCorrecao = "Fonte oficial: IBGE/SIDRA — IPCA, tabela 1737";
        fontes.add(fonteCorrecao);
      } else if (verba.indice === "manual") {
        fatorCorrecao = Math.max(0, Number(verba.fatorManual) || 1);
        fonteCorrecao = "Fator de correção informado manualmente";
        fontes.add(fonteCorrecao);
      }

      const corrigido = principal * fatorCorrecao;
      const correcao = corrigido - principal;
      let juros = 0;
      let fonteJuros = "Sem juros";
      if (verba.juros === "mensal") {
        juros = corrigido * ((Number(verba.taxa) || 0) / 100) * mesesEntre(inicioJuros, dataBase);
        fonteJuros = `Juros simples manuais de ${Number(verba.taxa) || 0}% ao mês`;
        fontes.add(fonteJuros);
      } else if (verba.juros === "anual") {
        juros = corrigido * ((Number(verba.taxa) || 0) / 100) * (diasEntre(inicioJuros, dataBase) / 365);
        fonteJuros = `Juros simples manuais de ${Number(verba.taxa) || 0}% ao ano`;
        fontes.add(fonteJuros);
      } else if (verba.juros === "selic") {
        const fator = await fatorSelic(inicioJuros, dataBase);
        juros = corrigido * (fator - 1);
        fonteJuros = "Fonte oficial: Banco Central do Brasil — SGS série 11 (SELIC diária)";
        fontes.add(fonteJuros);
      }

      memoria.push({
        verba: verba.descricao,
        parcela: `${verba.descricao} — ${isoBR(parcela.data)}`,
        data: parcela.data,
        principal,
        fatorCorrecao,
        correcao,
        juros,
        atualizado: corrigido + juros,
        fonteCorrecao,
        fonteJuros,
      });
    }
  }

  const principal = memoria.reduce((s, x) => s + x.principal, 0);
  const correcao = memoria.reduce((s, x) => s + x.correcao, 0);
  const juros = memoria.reduce((s, x) => s + x.juros, 0);
  const subtotal = principal + correcao + juros;
  const valorEncargo = (e: EncargoCalculo) => {
    if (!e.valor) return 0;
    if (e.modo === "fixo") return Number(e.valor) || 0;
    const base = e.base === "principal" ? principal : subtotal;
    return base * ((Number(e.valor) || 0) / 100);
  };
  const multaExecucao = valorEncargo(criterios.multaExecucao);
  const honorariosExecucao = valorEncargo(criterios.honorariosExecucao);
  const honorariosSucumbenciais = valorEncargo(criterios.honorariosSucumbenciais);
  const abatimentos = criterios.abatimentos.reduce((s, a) => s + (Number(a.valor) || 0), 0);
  const total = subtotal + multaExecucao + honorariosExecucao + honorariosSucumbenciais - abatimentos;

  return {
    principal,
    correcao,
    juros,
    subtotal,
    multaExecucao,
    honorariosExecucao,
    honorariosSucumbenciais,
    abatimentos,
    total,
    memoria,
    fontes: [...fontes],
  };
}

export async function listarCalculos(): Promise<CalculoJudicial[]> {
  const { data, error } = await supabaseSolto
    .from("calculos_judiciais")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as CalculoJudicial[];
}

export async function salvarCalculo(input: {
  id?: string;
  processoId?: string | null;
  nome: string;
  dataBase: string;
  criterios: CriteriosCalculo;
  resultado: ResultadoCalculo | null;
}): Promise<CalculoJudicial> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Sessão expirada.");

  if (!input.id) {
    const { data, error } = await supabaseSolto
      .from("calculos_judiciais")
      .insert({
        processo_id: input.processoId || null,
        nome: input.nome,
        data_base: input.dataBase,
        criterios: input.criterios,
        resultado: input.resultado,
        created_by: auth.user.id,
      })
      .select("*")
      .single();
    if (error) throw error;
    return data as CalculoJudicial;
  }

  const { data: atual, error: erroAtual } = await supabaseSolto
    .from("calculos_judiciais")
    .select("*")
    .eq("id", input.id)
    .single();
  if (erroAtual) throw erroAtual;
  await supabaseSolto.from("calculos_judiciais_versoes").insert({
    calculo_id: input.id,
    versao: atual.versao,
    criterios: atual.criterios,
    resultado: atual.resultado,
    created_by: auth.user.id,
  });
  const { data, error } = await supabaseSolto
    .from("calculos_judiciais")
    .update({
      processo_id: input.processoId || null,
      nome: input.nome,
      data_base: input.dataBase,
      criterios: input.criterios,
      resultado: input.resultado,
      versao: atual.versao + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .select("*")
    .single();
  if (error) throw error;
  return data as CalculoJudicial;
}

export async function enviarDocumentoCalculo(
  calculoId: string,
  categoria: "titulo" | "autos",
  arquivo: File,
): Promise<void> {
  if (arquivo.type && arquivo.type !== "application/pdf") throw new Error("Envie um arquivo PDF.");
  if (arquivo.size > 50 * 1024 * 1024) throw new Error("Arquivo muito grande (máximo 50 MB).");
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Sessão expirada.");
  const caminho = `${calculoId}/${categoria}/${crypto.randomUUID()}-${arquivo.name}`;
  const { error: up } = await supabase.storage.from(BUCKET).upload(caminho, arquivo);
  if (up) throw up;
  const { error } = await supabaseSolto.from("calculos_documentos").insert({
    calculo_id: calculoId,
    categoria,
    nome_arquivo: arquivo.name,
    caminho,
    tamanho: arquivo.size,
    tipo: arquivo.type || null,
    created_by: auth.user.id,
  });
  if (error) {
    await supabase.storage.from(BUCKET).remove([caminho]);
    throw error;
  }
}

export async function listarDocumentosCalculo(calculoId: string): Promise<DocumentoCalculo[]> {
  const { data, error } = await supabaseSolto
    .from("calculos_documentos")
    .select("*")
    .eq("calculo_id", calculoId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as DocumentoCalculo[];
}

export async function abrirDocumentoCalculo(doc: DocumentoCalculo): Promise<void> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(doc.caminho, 60);
  if (error) throw error;
  window.open(data.signedUrl, "_blank");
}

export async function exportarCalculoExcel(
  nome: string,
  dataBase: string,
  criterios: CriteriosCalculo,
  resultado: ResultadoCalculo,
) {
  const wb = new ExcelJS.Workbook();
  const resumo = wb.addWorksheet("Resumo");
  resumo.columns = [
    { header: "Campo", key: "campo", width: 34 },
    { header: "Valor", key: "valor", width: 22 },
  ];
  [
    ["Cálculo", nome],
    ["Data-base", isoBR(dataBase)],
    ["Principal", resultado.principal],
    ["Correção monetária", resultado.correcao],
    ["Juros", resultado.juros],
    ["Multa de execução", resultado.multaExecucao],
    ["Honorários de execução", resultado.honorariosExecucao],
    ["Honorários sucumbenciais", resultado.honorariosSucumbenciais],
    ["Abatimentos", -resultado.abatimentos],
    ["TOTAL", resultado.total],
  ].forEach(([campo, valor]) => resumo.addRow({ campo, valor }));
  for (let i = 3; i <= resumo.rowCount; i++) resumo.getCell(i, 2).numFmt = 'R$ #,##0.00';
  resumo.addRow({ campo: "" });
  resultado.fontes.forEach((f) => resumo.addRow({ campo: "Fonte/critério", valor: f }));
  resumo.addRow({ campo: "Aviso", valor: "Confira os critérios jurídicos antes de utilizar a memória em juízo." });

  const mem = wb.addWorksheet("Memória de cálculo");
  mem.columns = [
    { header: "Verba", key: "verba", width: 24 },
    { header: "Data", key: "data", width: 14 },
    { header: "Principal", key: "principal", width: 16 },
    { header: "Fator correção", key: "fator", width: 16 },
    { header: "Correção", key: "correcao", width: 16 },
    { header: "Juros", key: "juros", width: 16 },
    { header: "Atualizado", key: "atualizado", width: 18 },
    { header: "Fonte correção", key: "fonteCorrecao", width: 42 },
    { header: "Fonte juros", key: "fonteJuros", width: 42 },
  ];
  resultado.memoria.forEach((x) => mem.addRow({
    verba: x.verba,
    data: isoBR(x.data),
    principal: x.principal,
    fator: x.fatorCorrecao,
    correcao: x.correcao,
    juros: x.juros,
    atualizado: x.atualizado,
    fonteCorrecao: x.fonteCorrecao,
    fonteJuros: x.fonteJuros,
  }));
  ["principal", "correcao", "juros", "atualizado"].forEach((k) => (mem.getColumn(k).numFmt = 'R$ #,##0.00'));
  await baixarPlanilha(wb, `calculo-${nome.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "judicial"}.xlsx`);
}
