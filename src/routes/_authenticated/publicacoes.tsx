import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  FileDown,
  Mail,
  Pin,
  PinOff,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import {
  categoriaCliente,
  exibir,
  formatarCNJ,
  listarProcessos,
  type Processo,
} from "@/lib/processos";
import { listarPastas } from "@/lib/grupos";
import { classificarPublicacoes, type ClassificacaoPublicacao } from "@/lib/publicacoes-regras";
import { classificarUrgencia, type Urgencia } from "@/lib/dias-uteis";
import {
  buscarDjen,
  type AdvogadoFiltro,
  type ComunicacaoDjen,
  type FiltrosDjen,
} from "@/lib/djen";
import { baixarBlob, gerarDocxPublicacoes } from "@/lib/publicacoes-docx";
import { linkTribunalEfetivo } from "@/lib/tribunais";
import {
  estilizarCabecalho,
  centralizarLinhas,
  ajustarLargurasAoConteudo,
  fecharLinhasComBorda,
  estilizarComoLink,
  finalizarPlanilha,
  baixarPlanilha as baixarWorkbook,
} from "@/lib/excel";

export const Route = createFileRoute("/_authenticated/publicacoes")({
  head: () => ({
    meta: [
      { title: "Publicações | FaroLex" },
      {
        name: "description",
        content:
          "Envie a planilha de publicações recebida do TI, calcule o prazo automaticamente e monte os e-mails prontos.",
      },
    ],
  }),
  component: PublicacoesPage,
});

const TAMANHO_MAX = 20 * 1024 * 1024;
const EXTENSOES = [".xlsm", ".xlsx", ".xls"];

const GRUPOS = ["ELV", "GFC", "Astro", "Outros"] as const;
type Grupo = (typeof GRUPOS)[number];

const CLIENTES_GRUPO_ELV = ["2599", "8228", "7347", "8247"];
const CLIENTE_GRUPO_GFC = "4608";

type Campo =
  "cliente" | "coord" | "advg" | "autor" | "reu" | "processo" | "fase" | "data" | "andamento";

const SINONIMOS: Record<string, Campo> = {
  cliente: "cliente",
  coord: "coord",
  coordenacao: "coord",
  advg: "advg",
  advogado: "advg",
  "nome do autor": "autor",
  autor: "autor",
  "nome do reu": "reu",
  reu: "reu",
  processo: "processo",
  "numero do processo": "processo",
  fase: "fase",
  "data publicacao": "data",
  "data de publicacao": "data",
  andamento: "andamento",
};

type LinhaLida = { numero: number; origem: Origem; dados: Record<string, unknown> };

type Origem = "Localizada" | "Não Localizada – Advg" | "Não Localizada – Geral" | "DJEN";

type LinhaPublicacao = {
  idx: number;
  linha: number;
  origem: Origem;
  cnjDigits: string;
  cnjTexto: string;
  clientePlanilha: string | null;
  coord: string | null;
  advg: string | null;
  autor: string | null;
  reu: string | null;
  fase: string | null;
  dataPublicacao: string | null;
  andamento: string | null;
};

// socioReal/advgReal vêm do cadastro do processo (Processo.socio e do
// nome da Pasta vinculada por pasta_id), não da planilha/DJEN -- essas
// são as fontes que a BDR pediu pra usar em vez do que vem na publicação.
type LinhaCasada = LinhaPublicacao & {
  processo: Processo;
  grupo: Grupo;
  socioReal: string;
  advgReal: string;
};

function normalizar(coluna: string) {
  return coluna
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function texto(valor: unknown): string | null {
  if (valor == null) return null;
  const s = String(valor).trim();
  return s === "" || s.toLowerCase() === "nan" ? null : s;
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
  if (iso) return iso[0];
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

// Lê as 3 abas do padrão de planilha do TI. "Localizada" já vem com o
// processo identificado; "Não Localizada – Advg" e "Não Localizada –
// Geral" o TI não conseguiu casar automaticamente, então tratamos cada
// uma com regras próprias (ver seções 7 e 8 do projeto de publicações
// da BDR). As demais abas (Termos, Resumo, Duplicada etc.) continuam
// fora do escopo.
const ABAS_RECONHECIDAS: { rotulo: Origem; bate: (nomeNormalizado: string) => boolean }[] = [
  { rotulo: "Localizada", bate: (n) => n === "localizada" },
  {
    rotulo: "Não Localizada – Advg",
    bate: (n) => n.includes("localizada") && n.includes("nao") && n.includes("advg"),
  },
  {
    rotulo: "Não Localizada – Geral",
    bate: (n) => n.includes("localizada") && n.includes("nao") && n.includes("geral"),
  },
];

function lerPublicacoes(buffer: ArrayBuffer): LinhaLida[] {
  const wb = XLSX.read(buffer, { cellDates: true, cellFormula: false, cellHTML: false });
  const linhas: LinhaLida[] = [];

  for (const nomeAba of wb.SheetNames) {
    const rotulo = ABAS_RECONHECIDAS.find((a) => a.bate(normalizar(nomeAba)))?.rotulo;
    if (!rotulo) continue;
    const sheet = wb.Sheets[nomeAba];
    if (!sheet) continue;

    const matriz = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false });
    const idxCabecalho = matriz.findIndex(
      (linha) => Array.isArray(linha) && linha.filter((c) => texto(c)).length >= 2,
    );
    if (idxCabecalho < 0) continue;
    const cabecalho = (matriz[idxCabecalho] ?? []).map((c, i) => texto(c) ?? `Coluna ${i + 1}`);

    for (let i = idxCabecalho + 1; i < matriz.length; i++) {
      const bruta = matriz[i] ?? [];
      if (!bruta.some((c) => texto(c) != null)) continue;
      const dados: Record<string, unknown> = {};
      cabecalho.forEach((col, j) => {
        dados[col] = bruta[j] ?? null;
      });
      linhas.push({ numero: i + 1, origem: rotulo, dados });
    }
  }
  return linhas;
}

function montarLinhas(linhas: LinhaLida[]): LinhaPublicacao[] {
  const resultado: LinhaPublicacao[] = [];
  for (const linha of linhas) {
    const l: Partial<Record<Campo, unknown>> = {};
    for (const [col, valor] of Object.entries(linha.dados)) {
      const campo = SINONIMOS[normalizar(col)];
      if (campo && (l[campo] == null || l[campo] === "")) l[campo] = valor;
    }
    const cnjBruto = texto(l.processo);
    const cnjDigits = cnjBruto ? cnjBruto.replace(/\D/g, "") : "";
    // Nas abas "Não Localizada" é normal não ter um CNJ reconhecível --
    // ainda assim a linha entra, só não vai casar com processo nenhum.
    if (linha.origem === "Localizada" && cnjDigits.length < 15) continue;

    resultado.push({
      idx: resultado.length,
      linha: linha.numero,
      origem: linha.origem,
      cnjDigits: cnjDigits.length >= 15 ? cnjDigits : "",
      cnjTexto: cnjDigits.length >= 15 ? formatarCNJ(cnjDigits) : (cnjBruto ?? "—"),
      clientePlanilha: texto(l.cliente),
      coord: texto(l.coord),
      advg: texto(l.advg),
      autor: texto(l.autor),
      reu: texto(l.reu),
      fase: texto(l.fase),
      dataPublicacao: dataISO(l.data),
      andamento: texto(l.andamento),
    });
  }
  return resultado;
}

// Converte o resultado da busca no DJEN pro mesmo formato de linha da
// planilha, pra entrar na mesma pipeline (cruzamento, prazo, e-mail) sem
// nenhuma lógica separada. "idxInicial" continua a sequência de idx já em
// uso em `linhas`, já que a busca do DJEN é aditiva (não substitui o que já
// foi carregado da planilha).
function linhasDeDjen(comunicacoes: ComunicacaoDjen[], idxInicial: number): LinhaPublicacao[] {
  return comunicacoes.map((c, i) => ({
    idx: idxInicial + i,
    linha: idxInicial + i + 1,
    origem: "DJEN",
    cnjDigits: c.cnjDigits,
    cnjTexto: c.cnjTexto,
    clientePlanilha: null,
    coord: null,
    advg: c.nomesAdvogados.join(", ") || null,
    autor: c.partes[0] ?? null,
    reu: c.partes[1] ?? null,
    fase: c.orgao,
    dataPublicacao: c.dataDisponibilizacao,
    andamento: c.texto,
  }));
}

// Regras 3 do projeto de publicações da BDR: Grupo 1 (Eliane/ELV) =
// Sócio="ELV" no cadastro do processo OU numero_cliente do processo numa
// lista fixa; Grupo 2 (MLV/BBS) = numero_cliente="4608" E Sócio="GFC" --
// checar ELV primeiro garante que cliente 4608 com Sócio ELV fique no
// grupo da Eliane, conforme a exceção explícita do prompt dela. Usa o
// Sócio cadastrado no processo, não o que vem na planilha/DJEN (esse
// pode estar desatualizado ou nem existir). Astro não muda: continua
// pela categoria do cliente.
function grupoDaLinha(p: Processo): Grupo {
  if (categoriaCliente(p.cliente) === "Astro") return "Astro";
  const socio = (p.socio ?? "").trim().toUpperCase();
  const numeroCliente = (p.numero_cliente ?? "").trim();
  if (socio === "ELV" || CLIENTES_GRUPO_ELV.includes(numeroCliente)) return "ELV";
  if (numeroCliente === CLIENTE_GRUPO_GFC && socio === "GFC") return "GFC";
  return "Outros";
}

// Advogados "fixados" na busca do DJEN -- fica salvo no navegador (não é
// dado do escritório, é só conveniência de quem está usando essa tela)
// pra não precisar redigitar nome/OAB toda vez.
const CHAVE_ADVOGADOS_FIXADOS = "farolex.publicacoes.advogadosFixadosDjen";

type AdvogadoDjenRow = AdvogadoFiltro & { fixado: boolean };

function carregarAdvogadosFixados(): AdvogadoDjenRow[] {
  try {
    const bruto = localStorage.getItem(CHAVE_ADVOGADOS_FIXADOS);
    const lista = bruto ? (JSON.parse(bruto) as AdvogadoFiltro[]) : [];
    if (!Array.isArray(lista) || lista.length === 0) return [];
    return lista.map((a) => ({ ...a, fixado: true }));
  } catch {
    return [];
  }
}

function salvarAdvogadosFixados(linhas: AdvogadoDjenRow[]) {
  try {
    const fixados = linhas
      .filter((a) => a.fixado)
      .map(({ nome, numeroOab, ufOab }) => ({ nome, numeroOab, ufOab }));
    localStorage.setItem(CHAVE_ADVOGADOS_FIXADOS, JSON.stringify(fixados));
  } catch {
    // Sem localStorage (aba anônima, storage bloqueado etc.) -- não é
    // crítico, só perde a conveniência de lembrar pra próxima visita.
  }
}

function saudacaoAgora() {
  const hora = new Date().getHours();
  if (hora < 12) return "bom dia";
  if (hora < 18) return "boa tarde";
  return "boa noite";
}

const SAUDACAO_INICIAL: Record<Grupo, string> = {
  ELV: "Eliane, {saudacao}.\n\nSeguem as publicações recebidas em {data}, referentes à sua coordenação (ELV) e aos clientes monitorados.",
  GFC: "MLV e BBS, {saudacao}.\n\nSeguem as publicações recebidas em {data}, referentes ao cliente 4608 sob coordenação GFC.",
  Astro: "Pessoal da Astro, {saudacao}.\n\nSeguem as publicações recebidas em {data}.",
  Outros: "Pessoal, {saudacao}.\n\nSeguem as publicações recebidas em {data}.",
};

const FECHO: Record<Grupo, string> = {
  ELV: "Por gentileza, verificar se o prazo está correto e se há outros compromissos a serem agendados.\n\nPermaneço à disposição.\n\nAbs.,",
  GFC: "BBS, por gentileza, verificar se o prazo está correto e se há outros compromissos a serem agendados.\n\nPermaneço à disposição.\n\nAbs.,",
  Astro: "Abs.,",
  Outros: "Abs.,",
};

const SEPARADOR_EMAIL = "═".repeat(60);

function dataBR(iso: string | null | undefined) {
  return iso ? new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR") : "—";
}

// Formato de tabela (cabeçalho + uma linha de dados, separados por tab)
// pedido pela BDR pra bater com o formato do projeto de Claude dela --
// cada processo repete o cabeçalho, já que os blocos ficam separados por
// uma linha de "═" (ver montarPartesPublicacoes).
function blocoProcesso(l: LinhaCasada, classificacao: ClassificacaoPublicacao | undefined) {
  const clienteCod = l.processo.numero_cliente ?? exibir(l.processo.cliente) ?? "—";
  const caso = l.processo.numero_interno ?? "—";
  const socio = l.socioReal;
  const advg = l.advgReal;
  const contraparte =
    l.processo.parte_contraria || [l.autor, l.reu].filter(Boolean).join(" x ") || null;
  const partes = [exibir(l.processo.cliente), contraparte].filter(Boolean).join(" x ") || "—";
  const juizo =
    [l.processo.vara, [l.processo.comarca, l.processo.uf].filter(Boolean).join("/") || null]
      .filter(Boolean)
      .join(" de ") || "—";
  const teor = classificacao?.resumo ?? l.andamento ?? "—";

  return [
    "Processo\tCliente\tCaso\tSócio\tADVG\tPartes\tJuízo\tTeor da publicação",
    `${l.cnjTexto}\t${clienteCod}\t${caso}\t${socio}\t${advg}\t${partes}\t${juizo}\t${teor}`,
  ].join("\n");
}

function montarAgendamentos(
  itens: LinhaCasada[],
  classificacoes: Map<number, ClassificacaoPublicacao>,
) {
  const comClassificacao = itens
    .map((l) => ({ l, c: classificacoes.get(l.idx) }))
    // Entra em Agendamentos sempre que houver prazo calculado OU a
    // classificação tiver ficado incerta ("revisar") -- nesse caso
    // aparece como "Verificar prazo no sistema" em vez de sumir da lista.
    .filter(
      (x): x is { l: LinhaCasada; c: ClassificacaoPublicacao } =>
        !!x.c && (!!x.c.dataVencimento || x.c.revisar),
    )
    .sort((a, b) => {
      if (!a.c.dataVencimento) return 1;
      if (!b.c.dataVencimento) return -1;
      return a.c.dataVencimento < b.c.dataVencimento ? -1 : 1;
    });

  if (comClassificacao.length === 0) return null;

  const linhas = comClassificacao.map(({ l, c }) => {
    const parteContraria =
      l.processo.parte_contraria || [l.autor, l.reu].filter(Boolean).join(" x ") || "—";
    const clienteCaso = [
      l.processo.numero_cliente ? `Cliente ${l.processo.numero_cliente}` : null,
      l.processo.numero_interno ? `Caso ${l.processo.numero_interno}` : null,
    ]
      .filter(Boolean)
      .join("/");
    const juizo =
      [l.processo.vara, [l.processo.comarca, l.processo.uf].filter(Boolean).join("/") || null]
        .filter(Boolean)
        .join(" de ") || "—";
    const advg = l.advgReal !== "—" ? ` (${l.advgReal})` : "";
    const dataOuRevisar = c.dataVencimento
      ? dataBR(c.dataVencimento)
      : "Verificar prazo no sistema";
    return `${dataOuRevisar}: ${c.tipoAto} — ${parteContraria} (${clienteCaso}) ${juizo}${advg}`;
  });

  return `Agendamentos:\n${linhas.join("\n")}`;
}

function montarNaoLocalizada(
  rotulo: string,
  itens: LinhaPublicacao[],
  classificacoes: Map<number, ClassificacaoPublicacao>,
  colunas: "advg" | "geral",
) {
  if (itens.length === 0) return null;
  const blocos = itens.map((l) => {
    const c = classificacoes.get(l.idx);
    const teor = c?.resumo ?? l.andamento ?? "—";
    if (colunas === "advg") {
      const referencia = [l.advg, l.coord].filter(Boolean).join(" / ") || "—";
      return ["Processo\tReferência\tTeor", `${l.cnjTexto}\t${referencia}\t${teor}`].join("\n");
    }
    const partes = [l.autor, l.reu].filter(Boolean).join(" x ") || "—";
    return [
      "Processo\tCliente\tADVG\tPartes\tTeor",
      `${l.cnjTexto}\t${l.clientePlanilha ?? "—"}\t${l.advg ?? "—"}\t${partes}\t${teor}`,
    ].join("\n");
  });
  return `${rotulo}:\n\n${blocos.join(`\n\n${SEPARADOR_EMAIL}\n\n`)}`;
}

// Quando não há nenhuma publicação relevante na aba "Não Localizada –
// Geral" pra essa remessa, explica o porquê em vez de simplesmente
// omitir a seção (só faz sentido dizer isso quando havia candidatas
// mencionando Souza Cruz/Merck, senão nem vale citar a aba).
function montarSemResultadoGeral(totalCandidatas: number): string | null {
  if (totalCandidatas === 0) return null;
  return (
    `Quanto à aba "Não Localizada – Geral": foram identificadas ${totalCandidatas} ` +
    `publicação(ões) contendo os termos "Souza Cruz" ou "Merck" como parte, porém em ` +
    `nenhuma delas a advogada responsável é Eliane Leve.`
  );
}

function montarAlertas(
  itens: LinhaCasada[],
  classificacoes: Map<number, ClassificacaoPublicacao>,
  naoLocalizadaIncluida: LinhaPublicacao[],
) {
  const alertas: string[] = [];
  for (const l of itens) {
    const c = classificacoes.get(l.idx);
    if (!c) continue;
    const parteContraria =
      l.processo.parte_contraria ?? [l.autor, l.reu].filter(Boolean).join(" x ");
    const rotuloProcesso = `Processo nº ${l.cnjTexto} (${parteContraria ?? "—"} x ${exibir(l.processo.cliente) ?? "—"})`;
    if (c.revisar) {
      alertas.push(`${rotuloProcesso} — não foi possível confirmar a data/prazo automaticamente.`);
    } else if (c.dataVencimento) {
      const urgencia = classificarUrgencia(c.dataVencimento);
      if (urgencia === "vencido")
        alertas.push(`${rotuloProcesso} — prazo já vencido em ${dataBR(c.dataVencimento)}.`);
      else if (urgencia === "urgente")
        alertas.push(`${rotuloProcesso} — prazo urgente, vence em ${dataBR(c.dataVencimento)}.`);
    }
  }
  for (const l of naoLocalizadaIncluida) {
    alertas.push(
      `Processo nº ${l.cnjTexto} — encontrado na aba "${l.origem}", conferir cadastro no FaroLex.`,
    );
  }
  if (alertas.length === 0) return null;
  return `⚠️ Alertas processuais\n\n${alertas.join("\n")}`;
}

// Monta as seções de texto (saudação, agendamentos, publicações por
// processo, não localizadas, alertas, fecho) reaproveitadas tanto pelo
// e-mail (mailto:) quanto pelo download em Word -- só muda como cada um
// renderiza essas seções depois.
function montarPartesPublicacoes(
  grupo: Grupo,
  itens: LinhaCasada[],
  classificacoes: Map<number, ClassificacaoPublicacao>,
  dataPlanilha: string,
  naoLocalizadaAdvg: LinhaPublicacao[],
  naoLocalizadaGeral: LinhaPublicacao[],
  naoLocalizadaGeralTotalCandidatas: number,
): { assunto: string; partes: string[] } {
  const assunto = `Publicações — ${grupo}`;
  const saudacaoInicial = SAUDACAO_INICIAL[grupo]
    .replace("{saudacao}", saudacaoAgora())
    .replace("{data}", dataBR(dataPlanilha));

  const blocos = itens.map((l) => blocoProcesso(l, classificacoes.get(l.idx)));

  // As seções de "Não Localizada" (regras 7 e 8 do prompt da BDR) só se
  // aplicam ao grupo da Eliane/ELV -- os critérios de busca (Eliane
  // Leve/Souza Cruz/Merck) e de relevância (advogada Eliane Leve) são
  // específicos dos clientes dela, não do grupo 4608/GFC.
  const naoLocalizadaAdvgTexto =
    grupo === "ELV"
      ? montarNaoLocalizada(
          'Adicionalmente, na aba "Não Localizada – Advg", foram localizadas as seguintes publicações relevantes',
          naoLocalizadaAdvg,
          classificacoes,
          "advg",
        )
      : null;
  const naoLocalizadaGeralTexto =
    grupo === "ELV"
      ? (montarNaoLocalizada(
          'Adicionalmente, na aba "Não Localizada – Geral", foram localizadas as seguintes publicações relevantes',
          naoLocalizadaGeral,
          classificacoes,
          "geral",
        ) ?? montarSemResultadoGeral(naoLocalizadaGeralTotalCandidatas))
      : null;

  const agendamentos = montarAgendamentos(itens, classificacoes);
  const alertas = montarAlertas(
    itens,
    classificacoes,
    grupo === "ELV" ? [...naoLocalizadaAdvg, ...naoLocalizadaGeral] : [],
  );

  // Cada tabela (um processo, ou uma aba "Não Localizada") fica separada
  // visualmente por uma linha de "═", igual ao formato do projeto de
  // Claude da BDR -- alertas e fecho não entram nessa cadeia.
  const secoesComTabela = [...blocos, naoLocalizadaAdvgTexto, naoLocalizadaGeralTexto].filter(
    (s): s is string => !!s,
  );
  const blocoTabelas =
    secoesComTabela.length > 0
      ? `${SEPARADOR_EMAIL}\n\n${secoesComTabela.join(`\n\n${SEPARADOR_EMAIL}\n\n`)}`
      : null;

  const partes = [saudacaoInicial, agendamentos, blocoTabelas, alertas, FECHO[grupo]].filter(
    (p): p is string => !!p,
  );

  return { assunto, partes };
}

// Quando mais de um grupo é escolhido de uma vez (ex.: ELV + Outros, pra
// não perder uma publicação da Eliane que caiu em "Outros" por engano na
// classificação automática), monta o conteúdo de cada grupo separado
// (com sua própria saudação/fecho) e empilha um atrás do outro num único
// e-mail/Word.
function construirConteudoPublicacoes(
  grupos: Grupo[],
  itens: LinhaCasada[],
  classificacoes: Map<number, ClassificacaoPublicacao>,
  dataPlanilha: string,
  naoLocalizadaAdvg: LinhaPublicacao[],
  naoLocalizadaGeral: LinhaPublicacao[],
  naoLocalizadaGeralTotalCandidatas: number,
  avulsosSelecionados: LinhaPublicacao[],
): { assunto: string; partes: string[] } {
  const assunto = `Publicações — ${grupos.join(" / ")}`;
  const partes: string[] = [];
  for (const g of grupos) {
    const doGrupo = itens.filter((l) => l.grupo === g);
    if (doGrupo.length === 0) continue;
    const secao = montarPartesPublicacoes(
      g,
      doGrupo,
      classificacoes,
      dataPlanilha,
      naoLocalizadaAdvg,
      naoLocalizadaGeral,
      naoLocalizadaGeralTotalCandidatas,
    );
    partes.push(...secao.partes);
  }
  // Publicações do DJEN sem processo cadastrado que a BDR escolheu incluir
  // mesmo assim (nem toda linha sem processo é ruído -- pode ser algo
  // relevante ainda não cadastrado no FaroLex).
  const avulsos = montarNaoLocalizada(
    "Publicações do DJEN sem processo cadastrado (selecionadas manualmente)",
    avulsosSelecionados,
    classificacoes,
    "geral",
  );
  if (avulsos) partes.push(`${SEPARADOR_EMAIL}\n\n${avulsos}`);
  return { assunto, partes };
}

function montarLinkMailto(destinatarios: string[], assunto: string, partes: string[]): string {
  const corpo = partes.join("\n\n");
  return `mailto:${destinatarios.join(",")}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
}

const COLUNA_TEXTO_LIVRE_PUBLICACOES = new Set(["andamento"]);

// Mesmo formato/estilo (cabeçalho azul, bordas, largura automática, link
// no CNJ) já usado nas planilhas de Relatórios -- reaproveita os
// helpers de src/lib/excel.ts em vez de inventar um estilo novo. Colunas
// no formato que a BDR já usa fora do FaroLex (números de cliente/caso,
// autor/réu, UF/comarca/foro/vara/status/fase) -- "Foro" não existe no
// cadastro de processo do FaroLex hoje, então fica em branco.
async function exportarPublicacoesExcel(
  itens: LinhaCasada[],
  avulsos: LinhaPublicacao[],
  nomeArquivo: string,
) {
  const workbook = new ExcelJS.Workbook();
  const planilha = workbook.addWorksheet("Publicações");

  planilha.columns = [
    { header: "Cliente", key: "cliente", width: 12 },
    { header: "Caso", key: "caso", width: 12 },
    { header: "Sócio", key: "socio", width: 10 },
    { header: "Advg", key: "advg", width: 10 },
    { header: "Nome do Autor", key: "autor", width: 26 },
    { header: "Nome do Réu", key: "reu", width: 26 },
    { header: "Processo", key: "processo", width: 22 },
    { header: "UF", key: "uf", width: 8 },
    { header: "Comarca", key: "comarca", width: 22 },
    { header: "Foro", key: "foro", width: 20 },
    { header: "Vara", key: "vara", width: 20 },
    { header: "Status", key: "status", width: 12 },
    { header: "Fase", key: "fase", width: 16 },
    { header: "Data Publicação", key: "data", width: 14 },
    { header: "Andamento", key: "andamento", width: 80 },
  ];

  for (const l of itens) {
    planilha.addRow({
      cliente: l.processo.numero_cliente ?? "—",
      caso: l.processo.numero_interno ?? "—",
      socio: l.socioReal,
      advg: l.advgReal,
      autor: l.autor ?? "—",
      reu: l.reu ?? "—",
      processo: { text: l.cnjTexto, hyperlink: linkTribunalEfetivo(l.processo) },
      uf: l.processo.uf ?? "—",
      comarca: l.processo.comarca ?? "—",
      foro: "—",
      vara: l.processo.vara ?? "—",
      status: l.processo.status ?? "—",
      fase: l.processo.fase ?? "—",
      data: dataBR(l.dataPublicacao),
      andamento: l.andamento ?? "—",
    });
  }

  // Selecionadas na seção "DJEN sem processo cadastrado" -- sem Processo
  // cadastrado, então as colunas que dependem dele ficam em branco e o
  // CNJ não vira link.
  for (const l of avulsos) {
    planilha.addRow({
      cliente: "—",
      caso: "—",
      socio: "—",
      advg: l.advg ?? "—",
      autor: l.autor ?? "—",
      reu: l.reu ?? "—",
      processo: l.cnjTexto,
      uf: "—",
      comarca: "—",
      foro: "—",
      vara: "—",
      status: "—",
      fase: "—",
      data: dataBR(l.dataPublicacao),
      andamento: l.andamento ?? "—",
    });
  }

  estilizarCabecalho(planilha);
  centralizarLinhas(planilha, COLUNA_TEXTO_LIVRE_PUBLICACOES);
  planilha.getColumn("andamento").alignment = {
    vertical: "top",
    horizontal: "left",
    wrapText: true,
  };
  ajustarLargurasAoConteudo(planilha, COLUNA_TEXTO_LIVRE_PUBLICACOES);
  fecharLinhasComBorda(planilha);
  estilizarComoLink(planilha, new Set(["processo"]));
  planilha.pageSetup = { orientation: "landscape", fitToWidth: 1, fitToHeight: 0 };
  finalizarPlanilha(planilha);

  await baixarWorkbook(workbook, nomeArquivo);
}

function badgeUrgencia(urgencia: Urgencia) {
  switch (urgencia) {
    case "vencido":
      return { label: "Vencido", className: "bg-red-600 text-white hover:bg-red-600" };
    case "urgente":
      return { label: "Urgente", className: "bg-red-500 text-white hover:bg-red-500" };
    case "atencao":
      return { label: "Atenção", className: "bg-amber-500 text-white hover:bg-amber-500" };
    case "normal":
      return { label: "Normal", className: "bg-emerald-600 text-white hover:bg-emerald-600" };
    case "sem_prazo":
      return { label: "Sem prazo", className: "" };
  }
}

// Pré-filtro barato antes de gastar chamada de IA -- regra 7/8 do
// prompt da BDR (busca por termos / cliente Souza Cruz ou Merck).
function mencionaTermos(l: LinhaPublicacao, termos: string[]) {
  const alvo = normalizar(
    [l.andamento, l.autor, l.reu, l.advg, l.clientePlanilha].filter(Boolean).join(" "),
  );
  return termos.some((t) => alvo.includes(normalizar(t)));
}

function PublicacoesPage() {
  const [linhas, setLinhas] = useState<LinhaPublicacao[]>([]);
  const [gruposAtivos, setGruposAtivos] = useState<Set<Grupo>>(new Set());
  const [selecionadas, setSelecionadas] = useState<Set<number>>(new Set());
  const [importando, setImportando] = useState(false);
  const [dataPlanilha, setDataPlanilha] = useState(() => new Date().toISOString().slice(0, 10));
  const [advogadosDjen, setAdvogadosDjen] = useState<AdvogadoDjenRow[]>(() => {
    const fixados = carregarAdvogadosFixados();
    return fixados.length > 0 ? fixados : [{ nome: "", numeroOab: "", ufOab: "", fixado: false }];
  });
  useEffect(() => salvarAdvogadosFixados(advogadosDjen), [advogadosDjen]);
  const [periodoDjen, setPeriodoDjen] = useState(() => {
    const hoje = new Date().toISOString().slice(0, 10);
    return { siglaTribunal: "", dataInicio: hoje, dataFim: hoje };
  });
  const [buscandoDjen, setBuscandoDjen] = useState(false);
  const [baixandoDocx, setBaixandoDocx] = useState(false);
  const [baixandoPlanilha, setBaixandoPlanilha] = useState(false);
  // Nem toda publicação do DJEN sem processo cadastrado é ruído -- a BDR
  // escolhe manualmente quais entram na planilha e/ou no e-mail (podem
  // ser conjuntos diferentes: algo pode valer só de registro na planilha
  // sem precisar avisar por e-mail, por exemplo).
  const [selecaoAvulsa, setSelecaoAvulsa] = useState<
    Map<number, { planilha: boolean; email: boolean }>
  >(new Map());
  const queryClient = useQueryClient();

  const processos = useQuery({ queryKey: ["processos"], queryFn: listarProcessos });
  const pastas = useQuery({ queryKey: ["pastas"], queryFn: listarPastas });

  const processoPorCnj = useMemo(() => {
    const mapa = new Map<string, Processo>();
    for (const p of processos.data ?? []) mapa.set(p.numero_cnj.replace(/\D/g, ""), p);
    return mapa;
  }, [processos.data]);

  const pastaPorId = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const p of pastas.data ?? []) mapa.set(p.id, p.nome);
    return mapa;
  }, [pastas.data]);

  const { casadas, semProcesso } = useMemo(() => {
    const casadas: LinhaCasada[] = [];
    const semProcesso: LinhaPublicacao[] = [];
    for (const l of linhas) {
      const processo = l.cnjDigits ? processoPorCnj.get(l.cnjDigits) : undefined;
      if (processo) {
        casadas.push({
          ...l,
          processo,
          grupo: grupoDaLinha(processo),
          socioReal: processo.socio ?? "—",
          advgReal: pastaPorId.get(processo.pasta_id ?? "") ?? "—",
        });
      } else semProcesso.push(l);
    }
    return { casadas, semProcesso };
  }, [linhas, processoPorCnj, pastaPorId]);

  const naoLocalizadaAdvg = useMemo(
    () =>
      semProcesso.filter(
        (l) =>
          l.origem === "Não Localizada – Advg" &&
          mencionaTermos(l, ["Eliane Leve", "Souza Cruz", "Merck"]),
      ),
    [semProcesso],
  );
  // Regra 8 do prompt da BDR: só é relevante quando o processo é da Souza
  // Cruz/Merck E a advogada responsável é a Eliane Leve -- as duas
  // condições, não uma ou outra (senão pega processo de outra advogada só
  // por citar Souza Cruz/Merck de passagem).
  const naoLocalizadaGeralTotalCandidatas = useMemo(
    () =>
      semProcesso.filter(
        (l) => l.origem === "Não Localizada – Geral" && mencionaTermos(l, ["Souza Cruz", "Merck"]),
      ).length,
    [semProcesso],
  );
  const naoLocalizadaGeralCandidatas = useMemo(
    () =>
      semProcesso.filter(
        (l) =>
          l.origem === "Não Localizada – Geral" &&
          mencionaTermos(l, ["Souza Cruz", "Merck"]) &&
          mencionaTermos(l, ["Eliane Leve"]),
      ),
    [semProcesso],
  );
  const djenSemProcesso = useMemo(
    () => semProcesso.filter((l) => l.origem === "DJEN"),
    [semProcesso],
  );

  // Tipo de ato/prazo calculados por regra fixa (sem IA), a partir do teor
  // de cada publicação -- puramente síncrono, então recalcula sozinho
  // sempre que a lista muda (nada de botão manual).
  const classificacoes = useMemo(() => {
    const itens = [
      ...casadas,
      ...naoLocalizadaAdvg,
      ...naoLocalizadaGeralCandidatas,
      ...djenSemProcesso,
    ].filter((l) => l.andamento);
    const resultado = classificarPublicacoes(
      itens.map((l) => ({
        id: String(l.idx),
        texto: l.andamento!,
        dataPublicacao: l.dataPublicacao,
      })),
    );
    const mapa = new Map<number, ClassificacaoPublicacao>();
    for (const [id, c] of resultado) mapa.set(Number(id), c);
    return mapa;
  }, [casadas, naoLocalizadaAdvg, naoLocalizadaGeralCandidatas, djenSemProcesso]);

  const avulsosParaEmail = useMemo(
    () => djenSemProcesso.filter((l) => selecaoAvulsa.get(l.idx)?.email),
    [djenSemProcesso, selecaoAvulsa],
  );
  const avulsosParaPlanilha = useMemo(
    () => djenSemProcesso.filter((l) => selecaoAvulsa.get(l.idx)?.planilha),
    [djenSemProcesso, selecaoAvulsa],
  );

  const contagemPorGrupo = useMemo(() => {
    const c: Record<Grupo, number> = { ELV: 0, GFC: 0, Astro: 0, Outros: 0 };
    for (const l of casadas) c[l.grupo]++;
    return c;
  }, [casadas]);

  const exibidas = useMemo(
    () => (gruposAtivos.size === 0 ? casadas : casadas.filter((l) => gruposAtivos.has(l.grupo))),
    [casadas, gruposAtivos],
  );

  const resumoUrgencia = useMemo(() => {
    const c: Record<Urgencia, number> = {
      vencido: 0,
      urgente: 0,
      atencao: 0,
      normal: 0,
      sem_prazo: 0,
    };
    for (const l of casadas) {
      const classificacao = classificacoes.get(l.idx);
      const urgencia = classificacao
        ? classificarUrgencia(classificacao.dataVencimento)
        : "sem_prazo";
      c[urgencia]++;
    }
    return c;
  }, [casadas, classificacoes]);

  const [emails, setEmails] = useState("");
  const [detalhe, setDetalhe] = useState<LinhaCasada | null>(null);

  const adicionarAdvogadoDjen = () =>
    setAdvogadosDjen((atual) => [...atual, { nome: "", numeroOab: "", ufOab: "", fixado: false }]);

  const removerAdvogadoDjen = (i: number) =>
    setAdvogadosDjen((atual) => atual.filter((_, idx) => idx !== i));

  const atualizarAdvogadoDjen = (i: number, patch: Partial<AdvogadoFiltro>) =>
    setAdvogadosDjen((atual) => atual.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));

  const alternarFixarAdvogadoDjen = (i: number) =>
    setAdvogadosDjen((atual) =>
      atual.map((a, idx) => (idx === i ? { ...a, fixado: !a.fixado } : a)),
    );

  const buscarNoDjen = async () => {
    const advogadosValidos = advogadosDjen
      .filter((a) => a.nome.trim() || (a.numeroOab.trim() && a.ufOab.trim()))
      .map(({ nome, numeroOab, ufOab }) => ({ nome, numeroOab, ufOab }));
    if (advogadosValidos.length === 0) {
      toast.error("Informe pelo menos um advogado (nome, ou OAB com a UF).");
      return;
    }
    setBuscandoDjen(true);
    try {
      const { comunicacoes, totalRecebido, totalComCnj } = await buscarDjen({
        advogados: advogadosValidos,
        ...periodoDjen,
      });
      if (totalRecebido === 0) {
        toast.warning("Nenhuma publicação encontrada no DJEN para esses filtros.");
        return;
      }
      if (totalComCnj === 0) {
        toast.warning(
          `Recebi ${totalRecebido} comunicação(ões) do DJEN, mas não consegui reconhecer o ` +
            "número do processo em nenhuma — avise que o mapeamento de campos do DJEN precisa de ajuste.",
        );
      }

      const chavesExistentes = new Set(
        linhas.map((l) => `${l.cnjDigits}|${l.dataPublicacao}|${l.andamento}`),
      );
      const novas = linhasDeDjen(comunicacoes, linhas.length).filter(
        (l) => !chavesExistentes.has(`${l.cnjDigits}|${l.dataPublicacao}|${l.andamento}`),
      );
      setLinhas((atual) => [...atual, ...novas]);
      setSelecionadas((atual) => {
        const novo = new Set(atual);
        for (const l of novas) if (l.cnjDigits) novo.add(l.idx);
        return novo;
      });
      if (novas.length > 0) {
        toast.success(`${novas.length} publicação(ões) do DJEN adicionada(s) à lista abaixo.`);
      } else {
        toast.info("Nenhuma publicação nova (todas já estavam na lista).");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não consegui buscar no DJEN.");
    } finally {
      setBuscandoDjen(false);
    }
  };

  const enviarEmailDoGrupo = () => {
    if (gruposAtivos.size === 0) {
      toast.error("Escolha ao menos um grupo (ELV, GFC, Astro ou Outros) pra montar o e-mail.");
      return;
    }
    const destinatarios = emails
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);
    if (destinatarios.length === 0) {
      toast.error("Informe pelo menos um e-mail.");
      return;
    }
    if (exibidas.length === 0 && avulsosParaEmail.length === 0) {
      toast.error("Nenhuma publicação desses grupos (nem avulsa selecionada) pra mandar.");
      return;
    }
    const { assunto, partes } = construirConteudoPublicacoes(
      [...gruposAtivos],
      exibidas,
      classificacoes,
      dataPlanilha,
      naoLocalizadaAdvg,
      naoLocalizadaGeralCandidatas,
      naoLocalizadaGeralTotalCandidatas,
      avulsosParaEmail,
    );
    window.location.href = montarLinkMailto(destinatarios, assunto, partes);
  };

  const baixarWordDoGrupo = async () => {
    if (gruposAtivos.size === 0) {
      toast.error("Escolha ao menos um grupo (ELV, GFC, Astro ou Outros) pra baixar o Word.");
      return;
    }
    if (exibidas.length === 0 && avulsosParaEmail.length === 0) {
      toast.error("Nenhuma publicação desses grupos (nem avulsa selecionada) pra baixar.");
      return;
    }
    setBaixandoDocx(true);
    try {
      const { assunto, partes } = construirConteudoPublicacoes(
        [...gruposAtivos],
        exibidas,
        classificacoes,
        dataPlanilha,
        naoLocalizadaAdvg,
        naoLocalizadaGeralCandidatas,
        naoLocalizadaGeralTotalCandidatas,
        avulsosParaEmail,
      );
      const blob = await gerarDocxPublicacoes(assunto, partes);
      baixarBlob(blob, `${assunto}.docx`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não consegui gerar o Word.");
    } finally {
      setBaixandoDocx(false);
    }
  };

  const baixarPlanilha = async () => {
    if (exibidas.length === 0 && avulsosParaPlanilha.length === 0) {
      toast.error("Nenhuma publicação pra exportar.");
      return;
    }
    setBaixandoPlanilha(true);
    try {
      const nomeGrupos =
        gruposAtivos.size === 0 ? "todos" : [...gruposAtivos].map((g) => g.toLowerCase()).join("-");
      await exportarPublicacoesExcel(exibidas, avulsosParaPlanilha, `publicacoes-${nomeGrupos}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não consegui gerar a planilha.");
    } finally {
      setBaixandoPlanilha(false);
    }
  };

  const ler = async (arquivo: File) => {
    const nome = arquivo.name.toLowerCase();
    if (!EXTENSOES.some((ext) => nome.endsWith(ext))) {
      toast.error("Formato não suportado. Envie um arquivo .xlsm, .xlsx ou .xls.");
      return;
    }
    if (arquivo.size > TAMANHO_MAX) {
      toast.error("Arquivo muito grande (máximo 20 MB).");
      return;
    }
    try {
      const lidas = lerPublicacoes(await arquivo.arrayBuffer());
      if (lidas.length === 0) {
        toast.error(
          'Não encontrei as abas "Localizada", "Não Localizada – Advg" ou "Não Localizada – Geral" com linhas de dados nesse arquivo.',
        );
        return;
      }
      const montadas = montarLinhas(lidas);
      setLinhas(montadas);
      setSelecionadas(new Set(montadas.filter((l) => l.cnjDigits).map((l) => l.idx)));
      setGruposAtivos(new Set());
      toast.success(`${montadas.length} publicação(ões) lida(s) (3 abas).`);
    } catch {
      toast.error("Não consegui ler o arquivo.");
    }
  };

  const alternarSelecao = (idx: number) => {
    setSelecionadas((atual) => {
      const novo = new Set(atual);
      if (novo.has(idx)) novo.delete(idx);
      else novo.add(idx);
      return novo;
    });
  };

  const selecionarTodasVisiveis = (marcar: boolean) => {
    setSelecionadas((atual) => {
      const novo = new Set(atual);
      for (const l of exibidas) {
        if (marcar) novo.add(l.idx);
        else novo.delete(l.idx);
      }
      return novo;
    });
  };

  const alternarSelecaoAvulsa = (idx: number, campo: "planilha" | "email") => {
    setSelecaoAvulsa((atual) => {
      const novo = new Map(atual);
      const item = novo.get(idx) ?? { planilha: false, email: false };
      novo.set(idx, { ...item, [campo]: !item[campo] });
      return novo;
    });
  };

  const importar = async () => {
    const escolhidas = casadas.filter(
      (l) => selecionadas.has(l.idx) && l.andamento && l.dataPublicacao,
    );
    if (escolhidas.length === 0) {
      toast.error("Nenhuma publicação selecionada com data e andamento preenchidos.");
      return;
    }
    setImportando(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const criador = userData.user?.id;
      if (!criador) throw new Error("Sessão expirada. Entre novamente para importar.");

      const idsProcessos = [...new Set(escolhidas.map((l) => l.processo.id))];
      const existentes = new Set<string>();
      for (let i = 0; i < idsProcessos.length; i += 100) {
        const { data, error } = await supabase
          .from("movimentacoes")
          .select("processo_id, data_movimentacao, descricao")
          .in("processo_id", idsProcessos.slice(i, i + 100));
        if (error) throw error;
        for (const m of data ?? [])
          existentes.add(`${m.processo_id}|${m.data_movimentacao}|${m.descricao}`);
      }

      const novas: {
        processo_id: string;
        data_movimentacao: string;
        descricao: string;
        tipo: string;
        exige_acao: boolean;
        prazo: string | null;
        prazo_revisar: boolean;
        observacao: string | null;
        fonte: string;
        validado: boolean;
        created_by: string;
      }[] = [];
      for (const l of escolhidas) {
        const chave = `${l.processo.id}|${l.dataPublicacao}|${l.andamento}`;
        if (existentes.has(chave)) continue;
        existentes.add(chave);
        const c = classificacoes.get(l.idx);
        novas.push({
          processo_id: l.processo.id,
          data_movimentacao: l.dataPublicacao!,
          descricao: l.andamento!,
          tipo: c?.tipoAto ?? "Publicação",
          exige_acao: !!c?.dataVencimento,
          prazo: c?.dataVencimento ?? null,
          prazo_revisar: c?.revisar ?? false,
          observacao: c?.resumo ?? null,
          fonte: "publicacoes",
          validado: false,
          created_by: criador,
        });
      }

      let ok = 0;
      const falhas: string[] = [];
      for (let i = 0; i < novas.length; i += 300) {
        const lote = novas.slice(i, i + 300);
        const { error } = await supabase.from("movimentacoes").insert(lote);
        if (error) falhas.push(error.message);
        else ok += lote.length;
      }

      const jaExistiam = escolhidas.length - novas.length;
      if (falhas.length > 0) {
        toast.warning(`${ok} andamento(s) importado(s). Erros: ${falhas.slice(0, 2).join(" | ")}`);
      } else {
        toast.success(
          `${ok} andamento(s) novo(s) sugerido(s), prontos pra validar na aba de Relatórios.` +
            (jaExistiam > 0 ? ` (${jaExistiam} já existiam e foram ignorados.)` : ""),
        );
        setLinhas([]);
        setSelecionadas(new Set());
      }
      await queryClient.invalidateQueries();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao importar.");
    } finally {
      setImportando(false);
    }
  };

  const totalSelecionadas = casadas.filter((l) => selecionadas.has(l.idx)).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold">Publicações</h1>
        <p className="text-muted-foreground">
          Busque direto no DJEN por advogado/OAB ou envie a planilha recebida do TI (abas
          "Localizada", "Não Localizada – Advg" e "Não Localizada – Geral"). O sistema cruza o
          número do processo, calcula o prazo automaticamente e monta os e-mails.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">Busca Publicação DJEN</CardTitle>
          <CardDescription>
            Busca publicações direto no Diário de Justiça Eletrônico Nacional por nome do advogado
            e/ou número da OAB. Os resultados entram na mesma lista de baixo, com cálculo de prazo e
            e-mail automáticos — sem precisar da planilha do TI.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Advogados — fixe os que você busca sempre pra não precisar redigitar
            </Label>
            {advogadosDjen.map((a, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[2fr_1fr_5rem_auto_auto]">
                <Input
                  aria-label="Nome do advogado"
                  placeholder="Nome do advogado (ex.: Eliane Leve)"
                  value={a.nome}
                  onChange={(e) => atualizarAdvogadoDjen(i, { nome: e.target.value })}
                />
                <Input
                  aria-label="OAB nº"
                  placeholder="OAB nº"
                  value={a.numeroOab}
                  onChange={(e) => atualizarAdvogadoDjen(i, { numeroOab: e.target.value })}
                />
                <Input
                  aria-label="UF da OAB"
                  placeholder="UF"
                  maxLength={2}
                  value={a.ufOab}
                  onChange={(e) =>
                    atualizarAdvogadoDjen(i, { ufOab: e.target.value.toUpperCase() })
                  }
                />
                <Button
                  type="button"
                  variant={a.fixado ? "default" : "outline"}
                  size="icon"
                  onClick={() => alternarFixarAdvogadoDjen(i)}
                  aria-label={a.fixado ? "Desfixar advogado" : "Fixar advogado"}
                  title={
                    a.fixado ? "Desfixar (não lembrar da próxima vez)" : "Fixar pra próxima vez"
                  }
                >
                  {a.fixado ? <Pin className="size-4" /> : <PinOff className="size-4" />}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => removerAdvogadoDjen(i)}
                  disabled={advogadosDjen.length <= 1}
                  aria-label="Remover advogado"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={adicionarAdvogadoDjen}>
              <Plus className="size-4" />
              Adicionar advogado
            </Button>
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label htmlFor="djen-tribunal" className="text-xs text-muted-foreground">
                Tribunal (opcional)
              </Label>
              <Input
                id="djen-tribunal"
                placeholder="TJRJ"
                value={periodoDjen.siglaTribunal}
                onChange={(e) =>
                  setPeriodoDjen((a) => ({ ...a, siglaTribunal: e.target.value.toUpperCase() }))
                }
                className="w-32"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="djen-inicio" className="text-xs text-muted-foreground">
                Data início
              </Label>
              <Input
                id="djen-inicio"
                type="date"
                value={periodoDjen.dataInicio}
                onChange={(e) => setPeriodoDjen((a) => ({ ...a, dataInicio: e.target.value }))}
                className="w-44"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="djen-fim" className="text-xs text-muted-foreground">
                Data fim
              </Label>
              <Input
                id="djen-fim"
                type="date"
                value={periodoDjen.dataFim}
                onChange={(e) => setPeriodoDjen((a) => ({ ...a, dataFim: e.target.value }))}
                className="w-44"
              />
            </div>
            <Button type="button" onClick={() => void buscarNoDjen()} disabled={buscandoDjen}>
              <Search className="size-4" />
              {buscandoDjen ? "Buscando..." : "Buscar no DJEN"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">Arquivo</CardTitle>
          <CardDescription>
            Formatos aceitos: .xlsm, .xlsx e .xls (até 20 MB). Só processos que já existem no
            FaroLex são sugeridos pra importar — nada novo é criado a partir daqui.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="flex-1 space-y-1">
            <Label htmlFor="arquivo-publicacoes">Planilha</Label>
            <Input
              id="arquivo-publicacoes"
              type="file"
              accept=".xlsm,.xlsx,.xls"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void ler(f);
              }}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="data-planilha" className="text-xs text-muted-foreground">
              Data da planilha (pro texto do e-mail)
            </Label>
            <Input
              id="data-planilha"
              type="date"
              value={dataPlanilha}
              onChange={(e) => setDataPlanilha(e.target.value)}
              className="w-44"
            />
          </div>
        </CardContent>
      </Card>

      {linhas.length > 0 ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-lg">Prazos</CardTitle>
              <CardDescription>
                Tipo de ato e prazo calculados automaticamente por regra fixa a partir do teor de
                cada publicação (sem IA). Confira sempre o que vier marcado "revisar".
              </CardDescription>
            </CardHeader>
            {classificacoes.size > 0 ? (
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {(
                    [
                      ["vencido", "Vencidos"],
                      ["urgente", "Urgentes"],
                      ["atencao", "Atenção"],
                      ["normal", "Normal"],
                      ["sem_prazo", "Sem prazo"],
                    ] as [Urgencia, string][]
                  ).map(([u, rotulo]) => (
                    <div key={u} className="rounded-md border border-border px-4 py-2 text-center">
                      <p className="text-2xl font-semibold">{resumoUrgencia[u]}</p>
                      <p className="text-xs text-muted-foreground">{rotulo}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            ) : null}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-lg">
                {casadas.length} publicação(ões) de processos já cadastrados
              </CardTitle>
              <CardDescription>
                {semProcesso.length > 0
                  ? `${semProcesso.length} linha(s) não bateram com processo cadastrado (ver seção "Não localizadas" abaixo).`
                  : "Todas as linhas da planilha bateram com processos cadastrados."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  Grupo (pode escolher mais de um):
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant={gruposAtivos.size === 0 ? "default" : "outline"}
                  onClick={() => setGruposAtivos(new Set())}
                >
                  Todos ({casadas.length})
                </Button>
                {GRUPOS.map((g) => (
                  <Button
                    key={g}
                    type="button"
                    size="sm"
                    variant={gruposAtivos.has(g) ? "default" : "outline"}
                    onClick={() =>
                      setGruposAtivos((atual) => {
                        const novo = new Set(atual);
                        if (novo.has(g)) novo.delete(g);
                        else novo.add(g);
                        return novo;
                      })
                    }
                  >
                    {g} ({contagemPorGrupo[g]})
                  </Button>
                ))}
              </div>

              <div className="flex flex-wrap items-end gap-2 rounded-md border border-border bg-muted/40 p-3">
                <div className="min-w-64 flex-1 space-y-1">
                  <Label htmlFor="emails-publicacoes" className="text-xs text-muted-foreground">
                    E-mail(s) de destino
                  </Label>
                  <Input
                    id="emails-publicacoes"
                    placeholder="e-mail@escritorio.com.br, outro@escritorio.com.br"
                    value={emails}
                    onChange={(e) => setEmails(e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  onClick={enviarEmailDoGrupo}
                  disabled={gruposAtivos.size === 0}
                >
                  <Mail className="size-4" />
                  Mandar e-mail —{" "}
                  {gruposAtivos.size === 0 ? "escolha um grupo" : [...gruposAtivos].join(", ")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void baixarWordDoGrupo()}
                  disabled={gruposAtivos.size === 0 || baixandoDocx}
                >
                  <FileDown className="size-4" />
                  {baixandoDocx ? "Gerando..." : "Baixar em Word"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void baixarPlanilha()}
                  disabled={baixandoPlanilha}
                >
                  <FileDown className="size-4" />
                  {baixandoPlanilha ? "Gerando..." : "Baixar planilha"}
                </Button>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <button
                  type="button"
                  className="text-primary underline-offset-4 hover:underline"
                  onClick={() => selecionarTodasVisiveis(true)}
                >
                  Selecionar todas visíveis
                </button>
                <button
                  type="button"
                  className="text-primary underline-offset-4 hover:underline"
                  onClick={() => selecionarTodasVisiveis(false)}
                >
                  Limpar seleção
                </button>
              </div>

              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="w-8 p-2"></th>
                      <th className="p-2 text-left">Processo</th>
                      <th className="p-2 text-left">Cliente</th>
                      <th className="p-2 text-left">Grupo</th>
                      <th className="p-2 text-left">Data publicação</th>
                      <th className="p-2 text-left">Tipo de ato</th>
                      <th className="p-2 text-left">Prazo</th>
                      <th className="p-2 text-left">Andamento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exibidas.map((l) => {
                      const c = classificacoes.get(l.idx);
                      const urgencia = classificarUrgencia(c?.dataVencimento ?? null);
                      const cfgUrgencia = badgeUrgencia(urgencia);
                      return (
                        <tr
                          key={`${l.cnjDigits}-${l.linha}`}
                          className="cursor-pointer border-t border-border hover:bg-muted/50"
                          onClick={() => setDetalhe(l)}
                        >
                          <td className="p-2" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selecionadas.has(l.idx)}
                              onCheckedChange={() => alternarSelecao(l.idx)}
                            />
                          </td>
                          <td className="p-2 font-mono text-xs">{l.cnjTexto}</td>
                          <td className="p-2">{exibir(l.processo.cliente)}</td>
                          <td className="p-2">
                            <Badge variant="outline">{l.grupo}</Badge>
                          </td>
                          <td className="p-2">{dataBR(l.dataPublicacao)}</td>
                          <td className="p-2">{c?.tipoAto ?? "—"}</td>
                          <td className="p-2">
                            {c ? (
                              <div className="flex items-center gap-1.5">
                                <Badge variant="outline" className={cfgUrgencia.className}>
                                  {cfgUrgencia.label}
                                </Badge>
                                {c.dataVencimento ? (
                                  <span className="text-xs">{dataBR(c.dataVencimento)}</span>
                                ) : null}
                                {c.revisar ? (
                                  <AlertTriangle className="size-3.5 text-amber-600" />
                                ) : null}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="max-w-96 truncate p-2 text-xs text-muted-foreground">
                            {l.andamento ?? "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <Button onClick={importar} disabled={importando || totalSelecionadas === 0}>
                <Upload className="size-4" />
                {importando
                  ? "Importando..."
                  : `Sugerir ${totalSelecionadas} andamento(s) pros processos`}
              </Button>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <CheckCircle2 className="size-3.5" /> Os andamentos sugeridos entram como não
                validados — aparecem marcados em Relatórios até alguém confirmar. O prazo calculado
                (quando houver) já vai junto.
              </p>
            </CardContent>
          </Card>

          {naoLocalizadaAdvg.length > 0 || naoLocalizadaGeralCandidatas.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="font-serif text-lg">
                  Não localizadas ({naoLocalizadaAdvg.length + naoLocalizadaGeralCandidatas.length})
                </CardTitle>
                <CardDescription>
                  Linhas sem processo cadastrado que mencionam Eliane Leve/Souza Cruz/Merck — entram
                  automaticamente no e-mail da Eliane (ELV).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { rotulo: "Não Localizada – Advg", itens: naoLocalizadaAdvg },
                  { rotulo: "Não Localizada – Geral", itens: naoLocalizadaGeralCandidatas },
                ].map(({ rotulo, itens }) =>
                  itens.length > 0 ? (
                    <div key={rotulo}>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {rotulo} ({itens.length})
                      </p>
                      <div className="space-y-2">
                        {itens.map((l) => {
                          const c = classificacoes.get(l.idx);
                          return (
                            <div
                              key={l.idx}
                              className="rounded-md border border-border p-3 text-sm"
                            >
                              <div className="mb-1 flex flex-wrap items-center gap-2">
                                <span className="font-mono text-xs">{l.cnjTexto}</span>
                                {c?.tipoAto ? <Badge variant="secondary">{c.tipoAto}</Badge> : null}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {c?.resumo ?? l.andamento ?? "—"}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null,
                )}
              </CardContent>
            </Card>
          ) : null}

          {djenSemProcesso.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="font-serif text-lg">
                  DJEN sem processo cadastrado ({djenSemProcesso.length})
                </CardTitle>
                <CardDescription>
                  Publicações encontradas na busca do DJEN que não correspondem a nenhum processo
                  cadastrado no FaroLex — nem toda uma é ruído, então marque as que valem a pena
                  incluir na planilha e/ou no e-mail (podem ser conjuntos diferentes).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {djenSemProcesso.map((l) => {
                  const sel = selecaoAvulsa.get(l.idx);
                  const c = classificacoes.get(l.idx);
                  return (
                    <div key={l.idx} className="rounded-md border border-border p-3 text-sm">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs">{l.cnjTexto}</span>
                        {l.advg ? <Badge variant="outline">{l.advg}</Badge> : null}
                        {c?.tipoAto ? <Badge variant="secondary">{c.tipoAto}</Badge> : null}
                        {l.dataPublicacao ? (
                          <span className="text-xs text-muted-foreground">
                            {dataBR(l.dataPublicacao)}
                          </span>
                        ) : null}
                      </div>
                      <p className="mb-2 line-clamp-2 text-xs text-muted-foreground">
                        {l.andamento ?? "—"}
                      </p>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-1.5 text-xs">
                          <Checkbox
                            checked={sel?.planilha ?? false}
                            onCheckedChange={() => alternarSelecaoAvulsa(l.idx, "planilha")}
                          />
                          Incluir na planilha
                        </label>
                        <label className="flex items-center gap-1.5 text-xs">
                          <Checkbox
                            checked={sel?.email ?? false}
                            onCheckedChange={() => alternarSelecaoAvulsa(l.idx, "email")}
                          />
                          Incluir no e-mail
                        </label>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ) : null}
        </>
      ) : null}

      <Dialog open={!!detalhe} onOpenChange={(v) => !v && setDetalhe(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">
              {detalhe ? exibir(detalhe.processo.cliente) : ""}
            </DialogTitle>
            <DialogDescription className="font-mono text-xs">{detalhe?.cnjTexto}</DialogDescription>
          </DialogHeader>
          {detalhe ? (
            <div className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{detalhe.grupo}</Badge>
                <Badge variant="secondary">{detalhe.origem}</Badge>
                {detalhe.dataPublicacao ? (
                  <Badge variant="outline">{dataBR(detalhe.dataPublicacao)}</Badge>
                ) : null}
              </div>
              {detalhe.autor || detalhe.reu ? (
                <p className="text-muted-foreground">
                  Partes: {[detalhe.autor, detalhe.reu].filter(Boolean).join(" x ")}
                </p>
              ) : null}
              {detalhe.socioReal !== "—" || detalhe.advgReal !== "—" ? (
                <p className="text-muted-foreground">
                  {[
                    detalhe.socioReal !== "—" ? `Sócio: ${detalhe.socioReal}` : null,
                    detalhe.advgReal !== "—" ? `ADVG: ${detalhe.advgReal}` : null,
                  ]
                    .filter(Boolean)
                    .join("   ")}
                </p>
              ) : null}
              {classificacoes.get(detalhe.idx) ? (
                <div className="rounded-md border border-border bg-muted/40 p-3">
                  <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                    Prazo calculado
                  </p>
                  <p>
                    {classificacoes.get(detalhe.idx)!.tipoAto} —{" "}
                    {classificacoes.get(detalhe.idx)!.regraAplicada}
                  </p>
                  <p>
                    Vencimento: {dataBR(classificacoes.get(detalhe.idx)!.dataVencimento)}
                    {classificacoes.get(detalhe.idx)!.revisar ? " — conferir no sistema" : ""}
                  </p>
                </div>
              ) : null}
              <div>
                <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                  Teor da publicação
                </p>
                <p className="whitespace-pre-wrap">{detalhe.andamento ?? "—"}</p>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
