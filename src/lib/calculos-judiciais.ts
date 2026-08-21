import ExcelJS from "exceljs";

import { supabase } from "@/integrations/supabase/client";
import { supabaseSolto } from "@/lib/supabase-solto";
import {
  baixarPlanilha,
  centralizarLinhas,
  estilizarCabecalho,
  finalizarPlanilha,
} from "@/lib/excel";

export type ParcelaCalculo = { id: string; valor: number; data: string };
export type AbatimentoCalculo = { id: string; valor: number; data: string; descricao?: string };
export type TipoIndice = "nenhum" | "ipca" | "manual";
export type TipoJuros = "nenhum" | "mensal" | "anual" | "selic" | "taxa_legal";

export type IdentificacaoCalculo = {
  processo?: string;
  clienteCaso?: string;
  parteAutora?: string;
  parteRe?: string;
  cliente?: string;
  parteContraria?: string;
};

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
  identificacao?: IdentificacaoCalculo;
  verbas: VerbaCalculo[];
  multaExecucao: EncargoCalculo;
  honorariosExecucao: EncargoCalculo;
  honorariosSucumbenciais: EncargoCalculo;
  abatimentos: AbatimentoCalculo[];
  observacoes?: string;
};

export type PeriodoJurosCalculo = {
  descricao: string;
  de: string;
  ate: string;
  juros: number;
  fonte: string;
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
  periodosJuros?: PeriodoJurosCalculo[] | undefined;
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
const INICIO_SELIC_TAXA_LEGAL = "2024-08-30";
const FIM_UM_PORCENTO_TAXA_LEGAL = "2024-08-29";
const FONTE_SELIC = "Fonte oficial: Banco Central do Brasil - SGS série 11 (SELIC diária)";
const CRITERIO_TAXA_LEGAL = "Taxa Legal — 1% a.m. até 29/08/2024 + SELIC a partir de 30/08/2024";

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
    identificacao: {},
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

function diasEntre(de: string, ate: string) {
  const a = new Date(`${de}T12:00:00`).getTime();
  const b = new Date(`${ate}T12:00:00`).getTime();
  return Math.max(0, Math.round((b - a) / 864e5));
}

function adicionarDias(data: string, quantidade: number) {
  const d = new Date(`${data}T12:00:00`);
  d.setDate(d.getDate() + quantidade);
  return d.toISOString().slice(0, 10);
}

function mesesEntre(de: string, ate: string) {
  const a = new Date(`${de}T12:00:00`);
  const b = new Date(`${ate}T12:00:00`);
  return Math.max(0, (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth());
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
    .map((x) => Number(String((x as Record<string, unknown>)["V"] ?? "").replace(",", ".")))
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

async function calcularTaxaLegalTransicao(
  base: number,
  inicio: string,
  dataBase: string,
): Promise<{ juros: number; periodos: PeriodoJurosCalculo[] }> {
  const periodos: PeriodoJurosCalculo[] = [];
  let juros = 0;
  if (!inicio || !dataBase || inicio > dataBase) return { juros, periodos };

  if (inicio < INICIO_SELIC_TAXA_LEGAL) {
    const fimPrimeiro = dataBase < INICIO_SELIC_TAXA_LEGAL ? dataBase : FIM_UM_PORCENTO_TAXA_LEGAL;
    if (inicio <= fimPrimeiro) {
      // 1% a.m. proporcional por dias, considerando mês de 30 dias.
      const dias = diasEntre(inicio, adicionarDias(fimPrimeiro, 1));
      const valor = base * 0.01 * (dias / 30);
      juros += valor;
      periodos.push({
        descricao: "Juros de 1% a.m.",
        de: inicio,
        ate: fimPrimeiro,
        juros: valor,
        fonte: "1% a.m. proporcional por dias (mês de 30 dias)",
      });
    }
  }

  if (dataBase >= INICIO_SELIC_TAXA_LEGAL) {
    const inicioSelic = inicio > INICIO_SELIC_TAXA_LEGAL ? inicio : INICIO_SELIC_TAXA_LEGAL;
    if (inicioSelic < dataBase) {
      const fator = await fatorSelic(inicioSelic, dataBase);
      const valor = base * (fator - 1);
      juros += valor;
      periodos.push({
        descricao: "SELIC",
        de: inicioSelic,
        ate: dataBase,
        juros: valor,
        fonte: FONTE_SELIC,
      });
    }
  }

  return { juros, periodos };
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
        fonteCorrecao = "Fonte oficial: IBGE/SIDRA - IPCA, tabela 1737";
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
      let periodosJuros: PeriodoJurosCalculo[] | undefined;

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
        fonteJuros = FONTE_SELIC;
        fontes.add(fonteJuros);
      } else if (verba.juros === "taxa_legal") {
        const calculo = await calcularTaxaLegalTransicao(corrigido, inicioJuros, dataBase);
        juros = calculo.juros;
        periodosJuros = calculo.periodos;
        fonteJuros = CRITERIO_TAXA_LEGAL;
        fontes.add(CRITERIO_TAXA_LEGAL);
        if (calculo.periodos.some((p) => p.descricao === "SELIC")) fontes.add(FONTE_SELIC);
      }

      memoria.push({
        verba: verba.descricao,
        parcela: `${verba.descricao} - ${isoBR(parcela.data)}`,
        data: parcela.data,
        principal,
        fatorCorrecao,
        correcao,
        juros,
        atualizado: corrigido + juros,
        fonteCorrecao,
        fonteJuros,
        periodosJuros,
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
  id?: string | undefined;
  processoId?: string | null | undefined;
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

export async function excluirCalculo(calculoId: string): Promise<void> {
  const { data: docs, error: erroDocs } = await supabaseSolto
    .from("calculos_documentos")
    .select("caminho")
    .eq("calculo_id", calculoId);
  if (erroDocs) throw erroDocs;
  const caminhos = (docs ?? []).map((d) => String(d.caminho ?? "")).filter(Boolean);
  if (caminhos.length) {
    const { error: erroStorage } = await supabase.storage.from(BUCKET).remove(caminhos);
    if (erroStorage) throw erroStorage;
  }
  const { error } = await supabaseSolto.from("calculos_judiciais").delete().eq("id", calculoId);
  if (error) throw error;
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

function linhasIdentificacao(identificacao?: IdentificacaoCalculo) {
  if (!identificacao) return [] as Array<[string, string]>;
  const linhas: Array<[string, string]> = [];
  if (identificacao.processo) linhas.push(["Processo", identificacao.processo]);
  if (identificacao.clienteCaso) linhas.push(["Cliente/Caso", identificacao.clienteCaso]);
  if (identificacao.parteAutora) linhas.push(["Parte autora", identificacao.parteAutora]);
  if (identificacao.parteRe) linhas.push(["Parte ré", identificacao.parteRe]);
  if (!identificacao.parteAutora && identificacao.cliente) linhas.push(["Cliente", identificacao.cliente]);
  if (!identificacao.parteRe && identificacao.parteContraria) linhas.push(["Parte contrária", identificacao.parteContraria]);
  return linhas;
}

function descricaoEncargo(label: string, encargo: EncargoCalculo) {
  if (encargo.modo === "fixo") return `${label} — valor fixo`;
  const base = encargo.base === "principal" ? "principal" : "principal + correção + juros";
  return `${label} — ${Number(encargo.valor) || 0}% sobre ${base}`;
}

export async function exportarCalculoExcel(
  nome: string,
  dataBase: string,
  criterios: CriteriosCalculo,
  resultado: ResultadoCalculo,
  identificacao?: IdentificacaoCalculo,
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "FaroLex";
  wb.created = new Date();

  const resumo = wb.addWorksheet("Resumo");
  resumo.columns = [
    { header: "Campo", key: "campo", width: 50 },
    { header: "Valor", key: "valor", width: 28 },
  ];
  const identificacaoFinal = identificacao ?? criterios.identificacao;
  resumo.addRow({ campo: "Cálculo", valor: nome });
  linhasIdentificacao(identificacaoFinal).forEach(([campo, valor]) => resumo.addRow({ campo, valor }));
  resumo.addRow({ campo: "Data-base do cálculo", valor: isoBR(dataBase) });
  resumo.addRow({ campo: "" });

  const primeiraLinhaValor = resumo.rowCount + 1;
  [
    ["Principal", resultado.principal],
    ["Correção monetária", resultado.correcao],
    ["Juros", resultado.juros],
    ["SUBTOTAL DAS VERBAS", resultado.subtotal],
    [descricaoEncargo("Multa de execução", criterios.multaExecucao), resultado.multaExecucao],
    [descricaoEncargo("Honorários de execução", criterios.honorariosExecucao), resultado.honorariosExecucao],
    [descricaoEncargo("Honorários sucumbenciais", criterios.honorariosSucumbenciais), resultado.honorariosSucumbenciais],
    ["Pagamentos / abatimentos", -resultado.abatimentos],
    ["TOTAL ATUALIZADO", resultado.total],
  ].forEach(([campo, valor]) => resumo.addRow({ campo, valor }));
  const ultimaLinhaValor = resumo.rowCount;
  for (let i = primeiraLinhaValor; i <= ultimaLinhaValor; i++) resumo.getCell(i, 2).numFmt = 'R$ #,##0.00';
  resumo.getRow(primeiraLinhaValor + 3).font = { bold: true };
  resumo.getRow(ultimaLinhaValor).font = { bold: true };

  resumo.addRow({ campo: "" });
  resultado.fontes.forEach((f) => resumo.addRow({ campo: "Fonte/critério", valor: f }));
  if (criterios.observacoes) resumo.addRow({ campo: "Observações", valor: criterios.observacoes });
  resumo.addRow({ campo: "Aviso", valor: "Confira os critérios jurídicos antes de utilizar a memória em juízo." });
  estilizarCabecalho(resumo);
  centralizarLinhas(resumo, new Set(["valor"]));
  finalizarPlanilha(resumo);

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
    { header: "Fonte juros", key: "fonteJuros", width: 58 },
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
  mem.getColumn("fator").numFmt = "0.000000";
  estilizarCabecalho(mem);
  centralizarLinhas(mem, new Set(["verba", "fonteCorrecao", "fonteJuros"]));
  finalizarPlanilha(mem);

  const periodos = resultado.memoria.flatMap((linha) =>
    (linha.periodosJuros ?? []).map((periodo) => ({ linha, periodo })),
  );
  if (periodos.length) {
    const jurosPeriodo = wb.addWorksheet("Juros por período");
    jurosPeriodo.columns = [
      { header: "Verba", key: "verba", width: 24 },
      { header: "Parcela", key: "parcela", width: 32 },
      { header: "De", key: "de", width: 14 },
      { header: "Até", key: "ate", width: 14 },
      { header: "Critério", key: "criterio", width: 38 },
      { header: "Juros", key: "juros", width: 18 },
      { header: "Fonte / metodologia", key: "fonte", width: 56 },
    ];
    periodos.forEach(({ linha, periodo }) => jurosPeriodo.addRow({
      verba: linha.verba,
      parcela: linha.parcela,
      de: isoBR(periodo.de),
      ate: isoBR(periodo.ate),
      criterio: periodo.descricao,
      juros: periodo.juros,
      fonte: periodo.fonte,
    }));
    jurosPeriodo.getColumn("juros").numFmt = 'R$ #,##0.00';
    estilizarCabecalho(jurosPeriodo);
    centralizarLinhas(jurosPeriodo, new Set(["verba", "parcela", "criterio", "fonte"]));
    finalizarPlanilha(jurosPeriodo);
  }

  const nomeSeguro = nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "judicial";
  await baixarPlanilha(wb, `calculo-${nomeSeguro}`);
}
