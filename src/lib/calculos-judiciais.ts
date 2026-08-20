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
export type TipoJuros = "nenhum" | "mensal" | "anual" | "selic";

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

function moeda(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function escaparHtml(valor: string | undefined | null) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
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
        fonteJuros = "Fonte oficial: Banco Central do Brasil - SGS série 11 (SELIC diária)";
        fontes.add(fonteJuros);
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
    { header: "Campo", key: "campo", width: 34 },
    { header: "Valor", key: "valor", width: 48 },
  ];
  const identificacaoFinal = identificacao ?? criterios.identificacao;
  resumo.addRow({ campo: "Cálculo", valor: nome });
  linhasIdentificacao(identificacaoFinal).forEach(([campo, valor]) => resumo.addRow({ campo, valor }));
  resumo.addRow({ campo: "Data-base do cálculo", valor: isoBR(dataBase) });
  const primeiraLinhaValor = resumo.rowCount + 1;
  [
    ["Principal", resultado.principal],
    ["Correção monetária", resultado.correcao],
    ["Juros", resultado.juros],
    ["Multa de execução", resultado.multaExecucao],
    ["Honorários de execução", resultado.honorariosExecucao],
    ["Honorários sucumbenciais", resultado.honorariosSucumbenciais],
    ["Abatimentos", -resultado.abatimentos],
    ["TOTAL", resultado.total],
  ].forEach(([campo, valor]) => resumo.addRow({ campo, valor }));
  const ultimaLinhaValor = resumo.rowCount;
  for (let i = primeiraLinhaValor; i <= ultimaLinhaValor; i++) resumo.getCell(i, 2).numFmt = 'R$ #,##0.00';
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
  mem.getColumn("fator").numFmt = "0.000000";
  estilizarCabecalho(mem);
  centralizarLinhas(mem, new Set(["verba", "fonteCorrecao", "fonteJuros"]));
  finalizarPlanilha(mem);

  const nomeSeguro = nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "judicial";
  await baixarPlanilha(wb, `calculo-${nomeSeguro}`);
}

export function exportarCalculoPdf(
  nome: string,
  dataBase: string,
  criterios: CriteriosCalculo,
  resultado: ResultadoCalculo,
  identificacao?: IdentificacaoCalculo,
) {
  const janela = window.open("", "_blank", "noopener,noreferrer");
  if (!janela) throw new Error("O navegador bloqueou a abertura do PDF. Autorize pop-ups para o FaroLex.");

  const logoBranca = `${window.location.origin}/faro-logo-white.png`;
  const logoNavy = `${window.location.origin}/faro-logo-navy.png`;
  const identificacaoFinal = identificacao ?? criterios.identificacao;
  const identificacaoHtml = linhasIdentificacao(identificacaoFinal)
    .map(([campo, valor]) => `<div class="meta-item"><span>${escaparHtml(campo)}</span><strong>${escaparHtml(valor)}</strong></div>`)
    .join("");

  const componentes = [
    ["Principal", resultado.principal],
    ["Correção monetária", resultado.correcao],
    ["Juros", resultado.juros],
    ["Multa de execução", resultado.multaExecucao],
    ["Honorários de execução", resultado.honorariosExecucao],
    ["Honorários sucumbenciais", resultado.honorariosSucumbenciais],
    ["Abatimentos", -resultado.abatimentos],
  ] as const;
  const cardsHtml = componentes
    .map(([campo, valor]) => `<div class="valor-card"><span>${escaparHtml(campo)}</span><strong>${escaparHtml(moeda(valor))}</strong></div>`)
    .join("");

  const memoriaHtml = resultado.memoria
    .map((x, indice) => `<tr class="${indice % 2 ? "alternada" : ""}"><td>${escaparHtml(x.verba)}</td><td>${escaparHtml(isoBR(x.data))}</td><td>${escaparHtml(moeda(x.principal))}</td><td>${x.fatorCorrecao.toFixed(6)}</td><td>${escaparHtml(moeda(x.correcao))}</td><td>${escaparHtml(moeda(x.juros))}</td><td class="atualizado">${escaparHtml(moeda(x.atualizado))}</td></tr>`)
    .join("");
  const fontesHtml = resultado.fontes.map((f) => `<li>${escaparHtml(f)}</li>`).join("");
  const geradoEm = new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

  janela.document.write(`<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>${escaparHtml(nome)} - FaroLex</title>
<style>
@page{size:A4;margin:13mm 12mm 14mm}
*{box-sizing:border-box}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:Arial,Helvetica,sans-serif;color:#173447;margin:0;font-size:10.5px;background:#fff;position:relative}
.page-content{position:relative;z-index:2}
.watermark{position:absolute;z-index:0;top:84mm;left:50%;transform:translateX(-50%);width:128mm;opacity:.035;pointer-events:none;filter:grayscale(.08)}
.topo{background:linear-gradient(135deg,#082e45 0%,#0d4968 100%);border-radius:10px;padding:14px 16px;color:#fff;display:flex;align-items:center;justify-content:space-between;gap:20px;min-height:78px;box-shadow:0 2px 8px rgba(8,46,69,.14)}
.brand{display:flex;align-items:center;gap:13px;min-width:0}.brand img{width:150px;max-height:48px;object-fit:contain;object-position:left center}.brand-copy{border-left:1px solid rgba(255,255,255,.32);padding-left:13px}.brand-copy strong{display:block;font-size:14px;letter-spacing:.15px}.brand-copy span{display:block;font-size:9px;color:#d8ebf4;margin-top:3px;text-transform:uppercase;letter-spacing:.7px}
.data-topo{text-align:right;white-space:nowrap}.data-topo span{display:block;font-size:8px;text-transform:uppercase;letter-spacing:.7px;color:#bcd9e7}.data-topo strong{display:block;font-size:12px;margin-top:3px}
.titulo-wrap{padding:16px 2px 6px}.titulo{font-family:Georgia,'Times New Roman',serif;font-size:20px;line-height:1.15;font-weight:700;color:#0b3c58;margin:0}.linha-azul{width:54px;height:3px;background:#2b78a0;border-radius:99px;margin-top:7px}
.meta{display:grid;grid-template-columns:1fr 1fr;gap:0;border:1px solid #c9dce7;border-radius:8px;overflow:hidden;margin:10px 0 16px;background:rgba(247,251,253,.94)}.meta-item{padding:8px 10px;border-bottom:1px solid #dce9ef}.meta-item:nth-child(odd){border-right:1px solid #dce9ef}.meta-item span{display:block;font-size:7.5px;text-transform:uppercase;letter-spacing:.55px;color:#618094;margin-bottom:2px}.meta-item strong{display:block;font-size:10.5px;color:#143c53}.meta-data{padding:8px 10px;background:#edf6fa}.meta-data span{display:block;font-size:7.5px;text-transform:uppercase;letter-spacing:.55px;color:#51788e}.meta-data strong{display:block;color:#0d4968;font-size:11px;margin-top:2px}
.secao{margin-top:16px;position:relative}.secao h2{font-family:Georgia,'Times New Roman',serif;font-size:13.5px;color:#0b3c58;margin:0 0 8px;padding-bottom:5px;border-bottom:1px solid #bdd5e1}.secao h2:after{content:'';display:block;width:34px;border-bottom:2px solid #2d7ea5;position:relative;top:7px}
.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:8px 0}.valor-card{border:1px solid #c6dce7;border-radius:7px;padding:8px;background:#f3f9fc;min-height:53px}.valor-card span{display:block;color:#58788b;font-size:7.8px;text-transform:uppercase;letter-spacing:.35px;line-height:1.2}.valor-card strong{display:block;color:#0b4666;font-size:12px;margin-top:5px;white-space:nowrap}
.total-box{margin-top:8px;border-radius:9px;background:linear-gradient(135deg,#0a3a55,#126387);padding:12px 14px;color:#fff;display:flex;align-items:center;justify-content:space-between}.total-box span{font-size:9px;text-transform:uppercase;letter-spacing:.8px;color:#d4eaf3}.total-box strong{font-family:Georgia,'Times New Roman',serif;font-size:22px;letter-spacing:.2px}
table{width:100%;border-collapse:separate;border-spacing:0;page-break-inside:auto;border:1px solid #bfd5e1;border-radius:7px;overflow:hidden}.memoria{font-size:8.5px}.memoria th{background:#0d4968;color:#fff;font-weight:700;text-align:center;padding:6px 4px;border-right:1px solid #367590}.memoria th:last-child{border-right:0}.memoria td{padding:5px 4px;border-top:1px solid #dce8ee;border-right:1px solid #e4edf1;vertical-align:top}.memoria td:last-child{border-right:0}.memoria td:nth-child(n+3){text-align:right;white-space:nowrap}.memoria .alternada td{background:#f5f9fb}.memoria .atualizado{font-weight:700;color:#0b4e70}tr{page-break-inside:avoid}
.fontes{margin:0;padding:9px 12px 9px 26px;border-left:3px solid #4f98b8;background:#f4f9fb;border-radius:0 7px 7px 0;color:#405f70}.fontes li{margin:3px 0}.obs{background:#edf6fa;border:1px solid #c5dce8;color:#315668;padding:9px 11px;border-radius:7px;white-space:pre-wrap}
.rodape{margin-top:19px;border-top:1px solid #cbdde6;padding-top:7px;display:flex;justify-content:space-between;gap:15px;color:#708b9a;font-size:7.7px}.rodape strong{color:#37677e}
.no-print{margin:0 0 10px;padding:9px 11px;background:#eaf5fa;border:1px solid #bad9e7;border-radius:7px;color:#285d76;font-size:10px}
@media print{.no-print{display:none}.topo{box-shadow:none}}
</style>
</head>
<body>
<img class="watermark" src="${escaparHtml(logoNavy)}" alt="" />
<div class="page-content">
<div class="no-print"><strong>PDF FaroLex pronto.</strong> Na janela de impressão, escolha “Salvar como PDF”.</div>
<header class="topo">
  <div class="brand"><img src="${escaparHtml(logoBranca)}" alt="FaroLex" /><div class="brand-copy"><strong>Memória de cálculo judicial</strong><span>Atualização e demonstrativo</span></div></div>
  <div class="data-topo"><span>Data-base do cálculo</span><strong>${escaparHtml(isoBR(dataBase))}</strong></div>
</header>
<div class="titulo-wrap"><h1 class="titulo">${escaparHtml(nome)}</h1><div class="linha-azul"></div></div>
<div class="meta">${identificacaoHtml}<div class="meta-data"><span>Data-base do cálculo</span><strong>${escaparHtml(isoBR(dataBase))}</strong></div></div>
<section class="secao"><h2>Resumo do cálculo</h2><div class="cards">${cardsHtml}</div><div class="total-box"><span>Total atualizado</span><strong>${escaparHtml(moeda(resultado.total))}</strong></div></section>
<section class="secao"><h2>Memória de cálculo</h2><table class="memoria"><thead><tr><th>Verba</th><th>Data</th><th>Principal</th><th>Fator</th><th>Correção</th><th>Juros</th><th>Atualizado</th></tr></thead><tbody>${memoriaHtml}</tbody></table></section>
${fontesHtml ? `<section class="secao"><h2>Fontes e critérios</h2><ul class="fontes">${fontesHtml}</ul></section>` : ""}
${criterios.observacoes ? `<section class="secao"><h2>Observações</h2><div class="obs">${escaparHtml(criterios.observacoes)}</div></section>` : ""}
<footer class="rodape"><span><strong>FaroLex</strong> · Memória de cálculo judicial</span><span>Gerado em ${escaparHtml(geradoEm)} · Confira os critérios jurídicos antes da utilização em juízo.</span></footer>
</div>
<script>
window.addEventListener('load',()=>{
  const imagens=Array.from(document.images);
  Promise.all(imagens.map(img=>img.complete?Promise.resolve():new Promise(resolve=>{img.onload=resolve;img.onerror=resolve;}))).then(()=>setTimeout(()=>window.print(),300));
});
</script>
</body></html>`);
  janela.document.close();
}
