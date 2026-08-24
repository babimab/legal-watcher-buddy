import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, CalendarPlus, CalendarRange, CheckCircle2, Copy, Download, Mail, Play } from "lucide-react";
import ExcelJS from "exceljs";

import { Button } from "@/components/ui/button";
import { NovoPrazoDialog } from "@/components/NovoPrazoDialog";
import { EncerramentoDialog } from "@/components/EncerramentoDialog";
import { BaixasCliente } from "@/components/BaixasCliente";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { supabaseSolto } from "@/lib/supabase-solto";
import {
  formatarCNJ,
  listarMovimentacoesDesde,
  listarMovimentacoesPorData,
  listarMovimentacoesPorPeriodo,
  listarPendencias,
  listarProcessos,
  ultimaVerificacao,
  ehResponsavelDaSigla,
  useSiglaAtual,
  siglaOuEmailAtual,
  OUTROS_ADVOGADOS_CONHECIDOS,
  exibir,
  type MovimentacaoComProcesso,
  type Processo,
} from "@/lib/processos";
import { listarGrupos, listarPastas } from "@/lib/grupos";
import {
  estilizarCabecalho,
  centralizarLinhas,
  finalizarPlanilha,
  baixarPlanilha,
  exportarProcessosExcel,
} from "@/lib/excel";

type RelatorioSearch = {
  aba?: string;
  advogado?: string;
  urgencia?: string;
  pasta?: string;
  socio?: string;
};

export const Route = createFileRoute("/_authenticated/relatorio")({
  validateSearch: (search: Record<string, unknown>): RelatorioSearch => ({
    ...(typeof search["aba"] === "string" ? { aba: search["aba"] } : {}),
    ...(typeof search["advogado"] === "string" ? { advogado: search["advogado"] } : {}),
    ...(typeof search["urgencia"] === "string" ? { urgencia: search["urgencia"] } : {}),
    ...(typeof search["pasta"] === "string" ? { pasta: search["pasta"] } : {}),
    ...(typeof search["socio"] === "string" ? { socio: search["socio"] } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Relatórios | FaroLex" },
      {
        name: "description",
        content:
          "Resumo das movimentações registradas desde a última verificação e prazos pendentes.",
      },
      { property: "og:title", content: "Relatórios" },
      {
        property: "og:description",
        content:
          "Resumo das movimentações registradas desde a última verificação e prazos pendentes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RelatorioPage,
});

const COLUNAS_TEXTO_LIVRE = new Set(["andamentos", "observacoes"]);

type GrupoAndamentos = {
  chave: string;
  processo: MovimentacaoComProcesso["processos"] | null | undefined;
  itens: MovimentacaoComProcesso[];
};

function agruparAndamentosPorProcesso(itens: MovimentacaoComProcesso[]): GrupoAndamentos[] {
  const mapa = new Map<string, GrupoAndamentos>();

  for (const m of itens) {
    const chave = m.processos?.id ?? `sem-processo-${m.id}`;
    const grupo = mapa.get(chave);
    if (grupo) grupo.itens.push(m);
    else mapa.set(chave, { chave, processo: m.processos, itens: [m] });
  }

  return [...mapa.values()]
    .map((grupo) => ({
      ...grupo,
      itens: [...grupo.itens].sort((a, b) => {
        const porData = a.data_movimentacao.localeCompare(b.data_movimentacao);
        if (porData !== 0) return porData;
        return (a.created_at ?? "").localeCompare(b.created_at ?? "");
      }),
    }))
    .sort((a, b) => {
      const dataA = a.itens[0]?.data_movimentacao ?? "";
      const dataB = b.itens[0]?.data_movimentacao ?? "";
      return dataB.localeCompare(dataA);
    });
}

function formatarDataCurta(data: string) {
  return new Date(`${data}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

function clienteCasoDoProcesso(processo: MovimentacaoComProcesso["processos"] | null | undefined) {
  if (!processo) return "";
  if (processo.numero_cliente && processo.numero_interno)
    return `${processo.numero_cliente}/${processo.numero_interno}`;
  return processo.numero_interno ?? processo.numero_cliente ?? "";
}

async function exportarAndamentosExcel(itens: MovimentacaoComProcesso[], nomeArquivo: string) {
  const workbook = new ExcelJS.Workbook();
  const planilha = workbook.addWorksheet("Andamentos");
  const grupos = agruparAndamentosPorProcesso(itens);

  planilha.columns = [
    { header: "Número CNJ", key: "numero_cnj", width: 22 },
    { header: "Cliente/Caso", key: "cliente_caso", width: 18 },
    { header: "Cliente", key: "cliente", width: 26 },
    { header: "Parte Adversa", key: "parte_adversa", width: 30 },
    { header: "Réu", key: "reu", width: 26 },
    { header: "Parte contrária", key: "parte_contraria", width: 26 },
    { header: "Comarca", key: "comarca", width: 22 },
    { header: "Juízo", key: "vara", width: 26 },
    { header: "UF", key: "uf", width: 10 },
    { header: "Andamentos do período", key: "andamentos", width: 80 },
    { header: "Observações", key: "observacoes", width: 50 },
  ];

  for (const grupo of grupos) {
    const p = grupo.processo;
    const andamentos = grupo.itens
      .map((m) => `${formatarDataCurta(m.data_movimentacao)} — ${m.descricao}`)
      .join("\n");
    const observacoes = grupo.itens
      .filter((m) => m.observacao?.trim())
      .map((m) => `${formatarDataCurta(m.data_movimentacao)} — ${m.observacao!.trim()}`)
      .join("\n");

    planilha.addRow({
      numero_cnj: p ? formatarCNJ(p.numero_cnj) : "",
      cliente_caso: clienteCasoDoProcesso(p),
      cliente: exibir(p?.cliente) ?? "",
      parte_adversa: nomeParteAdversa(p),
      reu: p?.reu ?? "",
      parte_contraria: p?.parte_contraria ?? "",
      comarca: p?.comarca ?? "",
      vara: p?.vara ?? "",
      uf: p?.uf ?? "",
      andamentos,
      observacoes,
    });
  }

  estilizarCabecalho(planilha);
  centralizarLinhas(planilha, COLUNAS_TEXTO_LIVRE);
  planilha.getColumn("andamentos").alignment = { vertical: "top", horizontal: "left", wrapText: true };
  planilha.getColumn("observacoes").alignment = { vertical: "top", horizontal: "left", wrapText: true };
  finalizarPlanilha(planilha);

  await baixarPlanilha(workbook, nomeArquivo);
}

const LIMITE_ULTIMOS_ANDAMENTOS = 50;

const NOME_ARQUIVO_POR_ABA: Record<string, string> = {
  novidades: "novidades",
  semana: "andamentos-da-semana",
  mes: "andamentos-do-mes",
  ultimos: "ultimos-andamentos",
  periodo: "andamentos-do-periodo",
  pendencias: "prazos-pendentes",
};

const TITULO_POR_ABA: Record<string, string> = {
  novidades: "Novidades desde a última verificação",
  semana: "Andamentos da última semana",
  mes: "Andamentos do último mês",
  ultimos: `Últimos ${LIMITE_ULTIMOS_ANDAMENTOS} andamentos`,
  periodo: "Andamentos do período",
  pendencias: "Prazos pendentes",
};

const MAX_PROCESSOS_NO_EMAIL = 30;

function saudacao() {
  const hora = new Date().getHours();
  if (hora < 12) return "bom dia";
  if (hora < 18) return "boa tarde";
  return "boa noite";
}

type DadosEmailProcesso = Pick<
  Processo,
  | "cliente"
  | "parte_contraria"
  | "autor"
  | "reu"
  | "numero_interno"
  | "numero_cliente"
  | "vara"
  | "comarca"
  | "uf"
>;

function normalizarParte(valor: string | null | undefined) {
  return (valor ?? "")
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function nomeParteAdversa(processo: Partial<DadosEmailProcesso> | null | undefined) {
  if (!processo) return "";
  if (processo.parte_contraria?.trim()) return processo.parte_contraria.trim();

  const cliente = normalizarParte(processo.cliente);
  const ehCliente = (parte: string | null | undefined) => {
    const nome = normalizarParte(parte);
    if (!nome) return false;
    if (
      nome.includes("souza cruz") ||
      nome.includes("astromaritima") ||
      nome.includes("astro navegacao") ||
      nome.includes("merck")
    ) {
      return true;
    }
    return !!cliente && (nome.includes(cliente) || cliente.includes(nome));
  };

  if (processo.autor && !ehCliente(processo.autor)) return processo.autor;
  if (processo.reu && !ehCliente(processo.reu)) return processo.reu;
  return processo.autor ?? processo.reu ?? "";
}

function linhaClienteCaso(processo: Partial<DadosEmailProcesso> | null | undefined) {
  if (!processo) return "";
  const clienteCaso =
    processo.numero_cliente && processo.numero_interno
      ? `${processo.numero_cliente}/${processo.numero_interno}`
      : processo.numero_interno ?? processo.numero_cliente ?? "";
  return [
    clienteCaso ? `Cliente/Caso: ${clienteCaso}` : "",
    processo.cliente ? `Cliente: ${exibir(processo.cliente)}` : "",
  ]
    .filter(Boolean)
    .join(" | ");
}

function linhaJuizoUf(processo: Partial<DadosEmailProcesso> | null | undefined) {
  if (!processo) return "";
  const juizo =
    processo.vara && processo.comarca
      ? `${processo.vara} de ${processo.comarca}`
      : processo.vara || processo.comarca || "";
  return [juizo ? `Juízo: ${juizo}` : "", processo.uf ? `UF: ${processo.uf}` : ""]
    .filter(Boolean)
    .join(" | ");
}

type BlocoEmailAndamentos = {
  cabecalho: string;
  clienteCaso: string;
  juizoUf: string;
  andamentos: string;
  observacoes: string;
};

type ConteudoEmailAndamentos = {
  assunto: string;
  saudacao: string;
  introducao: string;
  referencia: string;
  blocos: BlocoEmailAndamentos[];
  fechamento: string;
};

function montarConteudoEmailAndamentos(
  itens: MovimentacaoComProcesso[],
  titulo: string,
  referenciaRelatorio: string,
  processosCompletos: Processo[],
): ConteudoEmailAndamentos {
  const porId = new Map(processosCompletos.map((p) => [p.id, p]));
  const blocos = agruparAndamentosPorProcesso(itens).map((grupo, i) => {
    const processo = grupo.processo
      ? porId.get(grupo.processo.id) ?? grupo.processo
      : grupo.processo;
    const numero = grupo.processo ? formatarCNJ(grupo.processo.numero_cnj) : "—";
    const adversa = nomeParteAdversa(processo);
    const observacoes = grupo.itens
      .filter((m) => m.observacao?.trim())
      .map((m) => `${formatarDataCurta(m.data_movimentacao)} — ${m.observacao!.trim()}`)
      .join(" // ");

    return {
      cabecalho: `${i + 1}. ${[numero, adversa].filter(Boolean).join(" — ")}`,
      clienteCaso: linhaClienteCaso(processo),
      juizoUf: linhaJuizoUf(processo),
      andamentos: grupo.itens
        .map((m) => `${formatarDataCurta(m.data_movimentacao)} — ${m.descricao}`)
        .join(" // "),
      observacoes,
    };
  });

  return {
    assunto: `FaroLex — ${referenciaRelatorio} — ${titulo}`,
    saudacao: `Olá, ${saudacao()}.`,
    introducao: `Seguem os andamentos novos — ${titulo}.`,
    referencia: `Referência: ${referenciaRelatorio}`,
    blocos,
    fechamento: "Abs.,",
  };
}

function blocoEmailTexto(bloco: BlocoEmailAndamentos) {
  return [
    bloco.cabecalho,
    bloco.clienteCaso ? `   ${bloco.clienteCaso}` : "",
    bloco.juizoUf ? `   ${bloco.juizoUf}` : "",
    bloco.andamentos ? `   ${bloco.andamentos}` : "",
    bloco.observacoes ? `   Observações: ${bloco.observacoes}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function conteudoEmailTexto(conteudo: ConteudoEmailAndamentos, limite?: number) {
  const blocos = limite ? conteudo.blocos.slice(0, limite) : conteudo.blocos;
  const restante =
    limite && conteudo.blocos.length > limite
      ? `\n\n... e mais ${conteudo.blocos.length - limite} processo(s). Consulte o Word do relatório para a lista completa.`
      : "";

  return `${conteudo.saudacao}\n\n${conteudo.introducao}\n${conteudo.referencia}\n\n${blocos
    .map(blocoEmailTexto)
    .join("\n\n")}${restante}\n\n${conteudo.fechamento}`;
}

function escaparHtml(valor: string) {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function conteudoEmailHtml(conteudo: ConteudoEmailAndamentos) {
  const blocos = conteudo.blocos
    .map((bloco) => {
      const linhas = [
        bloco.clienteCaso,
        bloco.juizoUf,
        bloco.andamentos,
        bloco.observacoes ? `Observações: ${bloco.observacoes}` : "",
      ].filter(Boolean);

      return `<div style="margin:0 0 16px 0"><div><strong>${escaparHtml(
        bloco.cabecalho,
      )}</strong></div>${linhas
        .map((linha) => `<div>${escaparHtml(linha)}</div>`)
        .join("")}</div>`;
    })
    .join("");

  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:11pt;color:#000"><p>${escaparHtml(
    conteudo.saudacao,
  )}</p><p>${escaparHtml(conteudo.introducao)}<br>${escaparHtml(
    conteudo.referencia,
  )}</p>${blocos}<p>${escaparHtml(conteudo.fechamento)}</p></div>`;
}

function baixarWordEmail(conteudo: ConteudoEmailAndamentos, nomeArquivo: string) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escaparHtml(
    conteudo.assunto,
  )}</title></head><body>${conteudoEmailHtml(conteudo)}</body></html>`;
  const blob = new Blob(["\ufeff", html], { type: "application/msword;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `texto-email-${nomeArquivo}.doc`;
  a.click();
  URL.revokeObjectURL(url);
}

async function copiarEmailFormatado(conteudo: ConteudoEmailAndamentos) {
  const texto = conteudoEmailTexto(conteudo);
  const html = conteudoEmailHtml(conteudo);

  if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
    const item = new ClipboardItem({
      "text/html": new Blob([html], { type: "text/html" }),
      "text/plain": new Blob([texto], { type: "text/plain" }),
    });
    await navigator.clipboard.write([item]);
    return;
  }

  await navigator.clipboard.writeText(texto);
}

function montarMailto(
  destinatarios: string[],
  itens: MovimentacaoComProcesso[],
  titulo: string,
  referenciaRelatorio: string,
  processosCompletos: Processo[],
) {
  const conteudo = montarConteudoEmailAndamentos(
    itens,
    titulo,
    referenciaRelatorio,
    processosCompletos,
  );
  const corpo = conteudoEmailTexto(conteudo, MAX_PROCESSOS_NO_EMAIL);

  return `mailto:${destinatarios.join(",")}?subject=${encodeURIComponent(
    conteudo.assunto,
  )}&body=${encodeURIComponent(corpo)}`;
}

function montarMailtoEncerramento(destinatarios: string[], processos: Processo[]) {
  const assunto = "FaroLex — Processos prontos para encerrar";

  const blocos = processos.map((p, i) => {
    const numero = formatarCNJ(p.numero_cnj);
    const adversa = nomeParteAdversa(p);
    const cabecalho = [numero, adversa].filter(Boolean).join(" — ");
    const clienteCaso = linhaClienteCaso(p);
    const juizoUf = linhaJuizoUf(p);
    const valor =
      p.valor_encerramento != null
        ? p.valor_encerramento.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
        : "sem valor informado";

    return [
      `${i + 1}. ${cabecalho}`,
      clienteCaso ? `   ${clienteCaso}` : "",
      juizoUf ? `   ${juizoUf}` : "",
      p.resultado_encerramento ? `   Resultado: ${p.resultado_encerramento}` : "",
      `   Valor: ${valor}`,
      p.observacao_encerramento ? `   Obs.: ${p.observacao_encerramento}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  });

  const corpo = `Olá, ${saudacao()}.

Seguem os processos já revisados e prontos para encerramento:

${blocos.join("\n\n")}

Abs.,`;

  return `mailto:${destinatarios.join(",")}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
}

// Escapa vírgula, ponto e vírgula, barra invertida e quebra de linha
// conforme o RFC 5545 — sem isso o Outlook lê o campo cortado no meio.
function escaparIcs(texto: string) {
  return texto
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

// .ics é o formato aberto de convite de calendário — funciona igual no
// Outlook, Google Calendar e Apple Calendar, sem precisar de conta ou
// integração com nenhum deles.
function baixarPrazoIcs(m: MovimentacaoComProcesso) {
  if (!m.prazo) return;
  const dataEvento = m.prazo.replace(/-/g, "");
  const agora = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const numero = m.processos ? formatarCNJ(m.processos.numero_cnj) : "";
  const cliente = exibir(m.processos?.cliente) ?? "";
  const titulo = [numero, cliente].filter(Boolean).join(" — ") || "Prazo FaroLex";

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//FaroLex//Prazo//PT",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${m.id}@farolex`,
    `DTSTAMP:${agora}`,
    `DTSTART;VALUE=DATE:${dataEvento}`,
    `DTEND;VALUE=DATE:${dataEvento}`,
    `SUMMARY:${escaparIcs(titulo)}`,
    `DESCRIPTION:${escaparIcs(m.descricao)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `prazo-${dataEvento}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

function RelatorioPage() {
  const search = Route.useSearch();
  const queryClient = useQueryClient();
  const [rodando, setRodando] = useState(false);
  const [aba, setAba] = useState(search.aba ?? "novidades");
  const [periodoDe, setPeriodoDe] = useState("");
  const [periodoAte, setPeriodoAte] = useState("");
  const periodoValido = !!periodoDe && !!periodoAte && periodoDe <= periodoAte;

  const verificacao = useQuery({ queryKey: ["verificacao"], queryFn: ultimaVerificacao });
  const desde = verificacao.data?.executado_em ?? null;

  const novidades = useQuery({
    queryKey: ["novidades", desde],
    queryFn: () => listarMovimentacoesDesde(desde),
    enabled: !verificacao.isLoading,
  });

  const semana = useQuery({
    queryKey: ["semana"],
    queryFn: () => listarMovimentacoesPorData(new Date(Date.now() - 7 * 864e5).toISOString()),
  });

  const mes = useQuery({
    queryKey: ["mes"],
    queryFn: () => listarMovimentacoesPorData(new Date(Date.now() - 30 * 864e5).toISOString()),
  });

  const periodo = useQuery({
    queryKey: ["periodo", periodoDe, periodoAte],
    queryFn: () => listarMovimentacoesPorPeriodo(periodoDe, periodoAte),
    enabled: periodoValido,
  });

  // Aqui a ordem é pela data real da movimentação; created_at serve só
  // como desempate quando há mais de um andamento na mesma data.
  const ultimos = useQuery({
    queryKey: ["ultimos-andamentos"],
    queryFn: () => listarMovimentacoesPorData(null, LIMITE_ULTIMOS_ANDAMENTOS),
  });

  const pendencias = useQuery({ queryKey: ["pendencias"], queryFn: listarPendencias });

  // Relatório pré-programado: processos em fase de Encerramento, pra
  // decidir quais já podem ser baixados.
  const processos = useQuery({ queryKey: ["processos"], queryFn: listarProcessos });
  const encerramento = (processos.data ?? []).filter((p) => p.fase === "Encerramento");

  // Encerramento da Astro é um fluxo à parte, de propósito: só a pasta de
  // cobrança, sem depender da fase (as ações de cobrança não seguem a
  // mesma fase Instrutória/Recursal/Encerramento da Souza Cruz) e nunca
  // misturado com a lista acima, que é só da Souza Cruz.
  const grupos = useQuery({ queryKey: ["grupos"], queryFn: listarGrupos });
  const pastas = useQuery({ queryKey: ["pastas"], queryFn: listarPastas });
  const pastaCobrancaAstroId = useMemo(() => {
    const grupoAstro = (grupos.data ?? []).find((g) => g.nome === "Equipe Astro");
    if (!grupoAstro) return null;
    const pasta = (pastas.data ?? []).find(
      (p) => p.grupo_id === grupoAstro.id && p.nome === "Perfis MLV (acoes de cobranca)",
    );
    return pasta?.id ?? null;
  }, [grupos.data, pastas.data]);
  const encerramentoAstro = (processos.data ?? []).filter(
    (p) => pastaCobrancaAstroId && p.pasta_id === pastaCobrancaAstroId,
  );

  const [advogado, setAdvogado] = useState(search.advogado ?? "todos");
  const [urgencia, setUrgencia] = useState(search.urgencia ?? "todos");
  const [pastaSelecionada, setPastaSelecionada] = useState(search.pasta ?? "todas");
  const [soProntos, setSoProntos] = useState(false);
  const [ufEncerramento, setUfEncerramento] = useState("todos");
  const minhaSigla = useSiglaAtual();

  useEffect(() => {
    setAba(search.aba ?? "novidades");
    setAdvogado(search.advogado ?? "todos");
    setUrgencia(search.urgencia ?? "todos");
    setPastaSelecionada(search.pasta ?? "todas");
  }, [search.aba, search.advogado, search.urgencia, search.pasta]);

  const advogados = useMemo(() => {
    const todosItens = [
      ...(novidades.data ?? []),
      ...(semana.data ?? []),
      ...(mes.data ?? []),
      ...(periodo.data ?? []),
      ...(ultimos.data ?? []),
      ...(pendencias.data ?? []),
    ];
    const valores = [
      ...new Set([
        ...todosItens.map((m) => m.processos?.responsavel).filter(Boolean),
        ...OUTROS_ADVOGADOS_CONHECIDOS,
      ] as string[]),
    ];
    return {
      temMeus: !!minhaSigla,
      outros: valores.filter((v) => !ehResponsavelDaSigla(v, minhaSigla)).sort(),
    };
  }, [novidades.data, semana.data, mes.data, periodo.data, ultimos.data, pendencias.data, minhaSigla]);

  const pastasOrdenadas = useMemo(
    () => [...(pastas.data ?? [])].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    [pastas.data],
  );

  const filtrarPorAdvogado = (itens: MovimentacaoComProcesso[]) =>
    advogado === "todos"
      ? itens
      : itens.filter((m) =>
          advogado === "eu"
            ? ehResponsavelDaSigla(m.processos?.responsavel, minhaSigla)
            : m.processos?.responsavel === advogado,
        );

  const filtrarPorPasta = (itens: MovimentacaoComProcesso[]) =>
    pastaSelecionada === "todas"
      ? itens
      : itens.filter((m) => m.processos?.pasta_id === pastaSelecionada);

  const aplicarFiltrosRelatorio = (itens: MovimentacaoComProcesso[]) =>
    filtrarPorPasta(filtrarPorAdvogado(itens));

  const novidadesSemImportacao = (novidades.data ?? []).filter((m) => m.fonte !== "planilha");
  const novidadesFiltradas = aplicarFiltrosRelatorio(novidadesSemImportacao);
  const semanaFiltrada = aplicarFiltrosRelatorio(semana.data ?? []);
  const mesFiltrado = aplicarFiltrosRelatorio(mes.data ?? []);
  const periodoFiltrado = aplicarFiltrosRelatorio(periodo.data ?? []);
  const ultimosFiltrados = aplicarFiltrosRelatorio(ultimos.data ?? []);

  const hojeISO = new Date().toISOString().slice(0, 10);
  const emUmDia = new Date();
  emUmDia.setDate(emUmDia.getDate() + 1);
  const emUmDiaISO = emUmDia.toISOString().slice(0, 10);
  const emSeteDias = new Date();
  emSeteDias.setDate(emSeteDias.getDate() + 7);
  const emSeteDiasISO = emSeteDias.toISOString().slice(0, 10);

  const pendenciasFiltradas = aplicarFiltrosRelatorio(pendencias.data ?? []).filter((m) => {
    if (urgencia === "todos") return true;
    if (!m.prazo) return false;
    if (urgencia === "vencidos") return m.prazo < hojeISO;
    if (urgencia === "1dia") return m.prazo >= hojeISO && m.prazo <= emUmDiaISO;
    return m.prazo >= hojeISO && m.prazo <= emSeteDiasISO;
  });

  const encerramentoPorAdvogado =
    advogado === "todos"
      ? encerramento
      : encerramento.filter((p) =>
          advogado === "eu"
            ? ehResponsavelDaSigla(p.responsavel, minhaSigla)
            : p.responsavel === advogado,
        );

  const ufsEncerramento = useMemo(
    () => [...new Set(encerramento.map((p) => p.uf).filter(Boolean))].sort() as string[],
    [encerramento],
  );

  const encerramentoFiltrado = (
    ufEncerramento === "todos"
      ? encerramentoPorAdvogado
      : encerramentoPorAdvogado.filter((p) => p.uf === ufEncerramento)
  );

  const encerramentoProntos = encerramentoFiltrado.filter((p) => p.pronto_para_encerrar);
  const encerramentoExibido = soProntos ? encerramentoProntos : encerramentoFiltrado;

  const encerramentoAstroPorAdvogado = (
    advogado === "todos"
      ? encerramentoAstro
      : encerramentoAstro.filter((p) =>
          advogado === "eu"
            ? ehResponsavelDaSigla(p.responsavel, minhaSigla)
            : p.responsavel === advogado,
        )
  );
  const encerramentoAstroProntos = encerramentoAstroPorAdvogado.filter(
    (p) => p.pronto_para_encerrar,
  );
  const encerramentoAstroExibido = soProntos
    ? encerramentoAstroProntos
    : encerramentoAstroPorAdvogado;

  const itensDaAba =
    aba === "semana"
      ? semanaFiltrada
      : aba === "mes"
        ? mesFiltrado
        : aba === "periodo"
          ? periodoFiltrado
          : aba === "ultimos"
          ? ultimosFiltrados
          : aba === "pendencias"
            ? pendenciasFiltradas
            : aba === "encerramento" || aba === "encerramento-astro" || aba === "baixas"
              ? []
              : novidadesFiltradas;

  const [emails, setEmails] = useState("");

  const tituloDaAba =
    aba === "periodo" && periodoValido
      ? `Andamentos de ${new Date(`${periodoDe}T12:00:00`).toLocaleDateString("pt-BR")} a ${new Date(`${periodoAte}T12:00:00`).toLocaleDateString("pt-BR")}`
      : TITULO_POR_ABA[aba]!;
  const nomeArquivoDaAba =
    aba === "periodo" && periodoValido
      ? `andamentos-${periodoDe}-a-${periodoAte}`
      : NOME_ARQUIVO_POR_ABA[aba]!;
  const referenciaRelatorio =
    pastaSelecionada === "todas"
      ? "Todas as pastas"
      : exibir(pastasOrdenadas.find((p) => p.id === pastaSelecionada)?.nome) ??
        "Pasta selecionada";
  const itensDestacadosDaAba = itensDaAba.filter((m) => m.destacar_email);
  const conteudoEmailDaAba =
    itensDestacadosDaAba.length > 0
      ? montarConteudoEmailAndamentos(
          itensDestacadosDaAba,
          tituloDaAba,
          referenciaRelatorio,
          processos.data ?? [],
        )
      : null;

  const abrirEmail = async () => {
    const destinatarios = emails
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);
    if (destinatarios.length === 0) {
      toast.error("Informe pelo menos um e-mail.");
      return;
    }

    if (aba === "encerramento" || aba === "encerramento-astro") {
      const prontos = aba === "encerramento" ? encerramentoProntos : encerramentoAstroProntos;
      if (prontos.length === 0) {
        toast.error("Nenhum processo marcado como pronto para encerrar ainda.");
        return;
      }
      window.location.href = montarMailtoEncerramento(destinatarios, prontos);
      return;
    }

    if (itensDestacadosDaAba.length === 0) {
      toast.warning("Nenhum andamento foi marcado como ‘Destacar no e-mail’.", {
        duration: 6000,
      });
      return;
    }

    window.location.href = montarMailto(
      destinatarios,
      itensDestacadosDaAba,
      tituloDaAba,
      referenciaRelatorio,
      processos.data ?? [],
    );
  };

  const copiarEmail = async () => {
    if (!conteudoEmailDaAba) {
      toast.warning("Nenhum andamento foi marcado como ‘Destacar no e-mail’.");
      return;
    }

    try {
      await copiarEmailFormatado(conteudoEmailDaAba);
      toast.success("E-mail formatado copiado. É só colar no Outlook.");
    } catch {
      toast.error("Não consegui copiar o e-mail formatado.");
    }
  };

  const exportarRelatorio = async () => {
    try {
      await exportarAndamentosExcel(itensDaAba, nomeArquivoDaAba);
    } catch {
      toast.error("Não consegui gerar o Excel.");
      return;
    }

    if (!conteudoEmailDaAba) {
      toast.warning(
        "Excel baixado com todos os andamentos. Não havia itens destacados, então o Word do e-mail não foi gerado.",
        { duration: 6500 },
      );
      return;
    }

    baixarWordEmail(conteudoEmailDaAba, nomeArquivoDaAba);
    toast.success("Relatório baixado: Excel completo + Word com o texto do e-mail.");
  };

  const rodar = async () => {
    setRodando(true);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("verificacoes").insert({
      tipo: "manual",
      periodo_inicio: desde,
      total_movimentacoes: novidadesSemImportacao.length,
      executado_por: userData.user?.id ?? null,
    });
    setRodando(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Verificação registrada. O contador de novidades foi zerado.");
    await queryClient.invalidateQueries();
  };

  const ehAbaEncerramento = aba === "encerramento" || aba === "encerramento-astro";
  const ehModoEncerramentos = ehAbaEncerramento || aba === "baixas";

  const abasEncerramento: Array<{ chave: string; rotulo: string }> = [
    { chave: "encerramento", rotulo: "Souza Cruz" },
    { chave: "encerramento-astro", rotulo: "Astro" },
    { chave: "baixas", rotulo: "Baixas no cliente" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold">
            {aba === "pendencias"
              ? "Prazos"
              : ehModoEncerramentos
                ? "Encerramentos"
                : "Relatórios"}
          </h1>
          <p className="text-muted-foreground">
            {desde
              ? `Última verificação em ${new Date(desde).toLocaleString("pt-BR")}.`
              : "Nenhuma verificação registrada ainda."}
          </p>
        </div>
        <div className={`flex flex-wrap gap-2 ${aba === "baixas" ? "hidden" : ""}`}>
          {advogados.temMeus || advogados.outros.length > 0 ? (
            <Select value={advogado} onValueChange={setAdvogado}>
              <SelectTrigger className="w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os advogados</SelectItem>
                {advogados.temMeus ? <SelectItem value="eu">{minhaSigla} (meus)</SelectItem> : null}
                {advogados.outros.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          {!ehAbaEncerramento && pastasOrdenadas.length > 0 ? (
            <Select value={pastaSelecionada} onValueChange={setPastaSelecionada}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as pastas</SelectItem>
                {pastasOrdenadas.map((pasta) => (
                  <SelectItem key={pasta.id} value={pasta.id}>
                    {exibir(pasta.nome) ?? pasta.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          {aba === "pendencias" ? (
            <Select value={urgencia} onValueChange={setUrgencia}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os prazos</SelectItem>
                <SelectItem value="1dia">Vencendo em 1 dia</SelectItem>
                <SelectItem value="7dias">Vencendo em 7 dias</SelectItem>
                <SelectItem value="vencidos">Vencidos</SelectItem>
              </SelectContent>
            </Select>
          ) : null}
          {aba === "encerramento" && ufsEncerramento.length > 1 ? (
            <Select value={ufEncerramento} onValueChange={setUfEncerramento}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os estados</SelectItem>
                {ufsEncerramento.map((uf) => (
                  <SelectItem key={uf} value={uf}>
                    {uf}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          {aba === "encerramento" || aba === "encerramento-astro" ? (
            <label className="flex items-center gap-2 rounded-md border border-input px-3 text-sm">
              <Checkbox checked={soProntos} onCheckedChange={(v) => setSoProntos(v === true)} />
              Só os prontos para encerrar
            </label>
          ) : null}
          {!ehAbaEncerramento && aba !== "pendencias" ? (
            <Button
              variant={aba === "periodo" ? "default" : "outline"}
              onClick={() => setAba(aba === "periodo" ? "novidades" : "periodo")}
            >
              <CalendarRange className="size-4" />
              {aba === "periodo" ? "Fechar período" : "Relatório por período"}
            </Button>
          ) : null}
          <Button
            variant="outline"
            disabled={
              aba === "encerramento"
                ? encerramentoExibido.length === 0
                : aba === "encerramento-astro"
                  ? encerramentoAstroExibido.length === 0
                  : itensDaAba.length === 0
            }
            onClick={() => {
              if (aba === "encerramento") {
                void exportarProcessosExcel(encerramentoExibido, "processos-encerramento").catch(
                  () => toast.error("Não consegui gerar o Excel."),
                );
                return;
              }
              if (aba === "encerramento-astro") {
                void exportarProcessosExcel(
                  encerramentoAstroExibido,
                  "processos-encerramento-astro",
                ).catch(() => toast.error("Não consegui gerar o Excel."));
                return;
              }
              void exportarRelatorio();
            }}
          >
            <Download className="size-4" /> {ehAbaEncerramento ? "Exportar Excel" : "Exportar relatório"}
          </Button>
          <Button onClick={rodar} disabled={rodando}>
            <Play className="size-4" /> {rodando ? "Registrando..." : "Marcar como verificado"}
          </Button>
        </div>
      </div>

      {ehModoEncerramentos ? (
        <div className="flex flex-wrap gap-2 border-b pb-2">
          {abasEncerramento.map((item) => (
            <Button
              key={item.chave}
              variant={aba === item.chave ? "default" : "outline"}
              size="sm"
              onClick={() => setAba(item.chave)}
            >
              {item.rotulo}
            </Button>
          ))}
        </div>
      ) : null}

      {aba === "baixas" ? (
        <BaixasCliente />
      ) : aba === "pendencias" ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-serif text-xl font-semibold">
              Prazos ({pendenciasFiltradas.length})
            </h2>
            <Link
              to="/relatorio"
              search={{ aba: "novidades", advogado, pasta: pastaSelecionada }}
              className="text-sm text-primary underline-offset-4 hover:underline"
            >
              Ver relatório de andamentos
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Novo prazo:</span>
            <NovoPrazoDialog
              tipo="Prazo"
              processos={processos.data ?? []}
              trigger={
                <Button variant="outline" size="sm">
                  Prazo
                </Button>
              }
            />
            <NovoPrazoDialog
              tipo="Audiência"
              processos={processos.data ?? []}
              trigger={
                <Button variant="outline" size="sm">
                  Audiência
                </Button>
              }
            />
            <NovoPrazoDialog
              tipo="Julgamento"
              processos={processos.data ?? []}
              trigger={
                <Button variant="outline" size="sm">
                  Julgamento
                </Button>
              }
            />
            <NovoPrazoDialog
              tipo="Providência interna"
              processos={processos.data ?? []}
              trigger={
                <Button variant="outline" size="sm">
                  Providência interna
                </Button>
              }
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="text"
              placeholder="e-mail@escritorio.com.br, outro@escritorio.com.br"
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              className="max-w-sm"
            />
            <Button
              variant="outline"
              disabled={!conteudoEmailDaAba}
              onClick={() => void copiarEmail()}
            >
              <Copy className="size-4" /> Copiar e-mail formatado
            </Button>
            <Button
              variant="outline"
              disabled={itensDaAba.length === 0}
              onClick={() => void abrirEmail()}
            >
              <Mail className="size-4" /> Abrir e-mail
            </Button>
          </div>

          <Lista itens={pendenciasFiltradas} vazio="Nenhuma providência em aberto." destaque />
        </>
      ) : aba === "encerramento" ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-serif text-xl font-semibold">
              Encerramento Souza Cruz ({encerramentoExibido.length})
            </h2>
            <Link
              to="/relatorio"
              search={{ aba: "novidades", advogado }}
              className="text-sm text-primary underline-offset-4 hover:underline"
            >
              Ver relatório de andamentos
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="text"
              placeholder="e-mail@escritorio.com.br, outro@escritorio.com.br"
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              className="max-w-sm"
            />
            <Button
              variant="outline"
              disabled={encerramentoProntos.length === 0}
              onClick={() => void abrirEmail()}
            >
              <Mail className="size-4" />
              Mandar prontos pra Eliane ({encerramentoProntos.length})
            </Button>
          </div>

          <ListaProcessos
            processos={encerramentoExibido}
            vazio="Nenhum processo em fase de Encerramento."
          />
        </>
      ) : aba === "encerramento-astro" ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-serif text-xl font-semibold">
              Encerramento Astro ({encerramentoAstroExibido.length})
            </h2>
            <Link
              to="/relatorio"
              search={{ aba: "novidades", advogado }}
              className="text-sm text-primary underline-offset-4 hover:underline"
            >
              Ver relatório de andamentos
            </Link>
          </div>
          <p className="text-sm text-muted-foreground">
            Só a pasta de cobrança da Equipe Astro — não mistura com o Encerramento da Souza Cruz.
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="text"
              placeholder="e-mail@escritorio.com.br, outro@escritorio.com.br"
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              className="max-w-sm"
            />
            <Button
              variant="outline"
              disabled={encerramentoAstroProntos.length === 0}
              onClick={() => void abrirEmail()}
            >
              <Mail className="size-4" />
              Mandar prontos ({encerramentoAstroProntos.length})
            </Button>
          </div>

          <ListaProcessos
            processos={encerramentoAstroExibido}
            vazio="Nenhum processo na pasta de cobrança da Astro."
            descricaoEncerramento="Preenche o que precisa pra dar baixa nesse processo de cobrança."
            mostrarDecisoesNoLd={false}
          />
        </>
      ) : (
        <>
          <Card>
            <CardContent className="flex flex-wrap items-center gap-3 py-4">
              <span className="text-sm font-medium text-muted-foreground">Atalhos:</span>
              <Link
                to="/relatorio"
                search={{ aba: "pendencias", advogado, pasta: pastaSelecionada }}
                className="inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
              >
                Ver prazos
              </Link>
              <Link
                to="/relatorio"
                search={{ aba: "encerramento", advogado }}
                className="inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
              >
                Ver Encerramento Souza Cruz
              </Link>
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="text"
              placeholder="e-mail@escritorio.com.br, outro@escritorio.com.br"
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              className="max-w-sm"
            />
            <Button
              variant="outline"
              disabled={!conteudoEmailDaAba}
              onClick={() => void copiarEmail()}
            >
              <Copy className="size-4" /> Copiar e-mail formatado
            </Button>
            <Button
              variant="outline"
              disabled={itensDaAba.length === 0}
              onClick={() => void abrirEmail()}
            >
              <Mail className="size-4" /> Abrir e-mail
            </Button>
          </div>

          {aba === "periodo" ? (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 font-serif text-lg">
                    <CalendarRange className="size-5" /> Relatório por período
                  </CardTitle>
                  <CardDescription>
                    Escolha o intervalo pela data real do andamento. Os filtros de advogado e pasta continuam valendo.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap items-end gap-4">
                  <label className="space-y-1.5 text-sm">
                    <span className="font-medium">De</span>
                    <Input
                      type="date"
                      value={periodoDe}
                      onChange={(e) => setPeriodoDe(e.target.value)}
                      className="w-44"
                    />
                  </label>
                  <label className="space-y-1.5 text-sm">
                    <span className="font-medium">Até</span>
                    <Input
                      type="date"
                      value={periodoAte}
                      onChange={(e) => setPeriodoAte(e.target.value)}
                      className="w-44"
                    />
                  </label>
                  {periodoDe && periodoAte && periodoDe > periodoAte ? (
                    <span className="pb-2 text-sm text-destructive">
                      A data inicial deve ser anterior ou igual à final.
                    </span>
                  ) : periodoValido ? (
                    <span className="pb-2 text-sm text-muted-foreground">
                      {periodoFiltrado.length} andamento(s) em {agruparAndamentosPorProcesso(periodoFiltrado).length} processo(s) no período.
                    </span>
                  ) : null}
                </CardContent>
              </Card>
              <ListaAndamentosConsolidada
                itens={periodoFiltrado}
                vazio={
                  periodoValido
                    ? "Nenhuma movimentação encontrada nesse período."
                    : "Escolha as datas inicial e final para gerar o relatório."
                }
              />
            </div>
          ) : (
            <Tabs value={aba} onValueChange={setAba}>
              <TabsList>
                <TabsTrigger value="novidades">Novidades ({novidadesFiltradas.length})</TabsTrigger>
                <TabsTrigger value="semana">Semana ({semanaFiltrada.length})</TabsTrigger>
                <TabsTrigger value="mes">Mês ({mesFiltrado.length})</TabsTrigger>
                <TabsTrigger value="ultimos">
                  Últimos andamentos ({ultimosFiltrados.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="novidades" className="mt-4">
                <ListaAndamentosConsolidada itens={novidadesFiltradas} vazio="Nada novo desde a última verificação." />
              </TabsContent>
              <TabsContent value="semana" className="mt-4">
                <ListaAndamentosConsolidada itens={semanaFiltrada} vazio="Nenhuma movimentação nos últimos 7 dias." />
              </TabsContent>
              <TabsContent value="mes" className="mt-4">
                <ListaAndamentosConsolidada itens={mesFiltrado} vazio="Nenhuma movimentação nos últimos 30 dias." />
              </TabsContent>
              <TabsContent value="ultimos" className="mt-4">
                <ListaAndamentosConsolidada itens={ultimosFiltrados} vazio="Nenhum andamento registrado ainda." />
              </TabsContent>
            </Tabs>
          )}
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">Envio automático por e-mail</CardTitle>
          <CardDescription>
            O resumo diário/semanal por e-mail é o próximo passo — precisa de um serviço de e-mail
            configurado. Por enquanto, o relatório fica disponível aqui sob demanda.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

function validarMovimentacao(id: string, queryClient: ReturnType<typeof useQueryClient>) {
  return (async () => {
    const quem = await siglaOuEmailAtual();
    const { error } = await supabaseSolto
      .from("movimentacoes")
      .update({ validado: true, validado_por: quem, validado_em: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await queryClient.invalidateQueries();
  })();
}

function ListaAndamentosConsolidada({
  itens,
  vazio,
}: {
  itens: MovimentacaoComProcesso[];
  vazio: string;
}) {
  const queryClient = useQueryClient();
  const grupos = agruparAndamentosPorProcesso(itens);

  if (itens.length === 0)
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">{vazio}</CardContent>
      </Card>
    );

  return (
    <ol className="space-y-3">
      {grupos.map((grupo) => {
        const p = grupo.processo;
        const temNaoValidado = grupo.itens.some((m) => !m.validado);
        return (
          <li
            key={grupo.chave}
            className={`overflow-hidden rounded-lg border ${temNaoValidado ? "border-amber-500/50 bg-amber-50/30" : "border-border bg-card"}`}
          >
            <div className="flex flex-wrap items-center gap-2 border-b bg-muted/20 px-4 py-3 text-sm">
              {p ? (
                <Link
                  to="/processos/$id"
                  params={{ id: p.id }}
                  className="font-mono text-xs underline-offset-4 hover:underline"
                >
                  {formatarCNJ(p.numero_cnj)}
                </Link>
              ) : null}
              <span className="font-medium">{exibir(p?.cliente)}</span>
              {p?.parte_contraria ? (
                <span className="text-muted-foreground">— {p.parte_contraria}</span>
              ) : p?.autor || p?.reu ? (
                <span className="text-muted-foreground">
                  {p.autor ?? "—"}{p.reu ? ` x ${p.reu}` : ""}
                </span>
              ) : null}
              {clienteCasoDoProcesso(p) ? (
                <Badge variant="outline">Cliente/Caso {clienteCasoDoProcesso(p)}</Badge>
              ) : null}
              <Badge variant="secondary">{grupo.itens.length} andamento(s)</Badge>
            </div>

            <div className="divide-y">
              {grupo.itens.map((m) => (
                <div key={m.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {formatarDataCurta(m.data_movimentacao)}
                    </span>
                    {m.tipo ? <Badge variant="outline">{m.tipo}</Badge> : null}
                    {m.destacar_email ? <Badge>Destacar no e-mail</Badge> : null}
                    {!m.validado ? <Badge variant="secondary">Sugerido — não validado</Badge> : null}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{m.descricao}</p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    {m.observacao ? (
                      <p className="text-xs text-muted-foreground">Obs.: {m.observacao}</p>
                    ) : <span />}
                    {!m.validado ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void validarMovimentacao(m.id, queryClient)}
                      >
                        <CheckCircle2 className="size-3.5" /> Marcar como validado
                      </Button>
                    ) : m.validado_por ? (
                      <p className="text-xs text-muted-foreground">
                        Validado por {m.validado_por}
                        {m.validado_em ? ` em ${new Date(m.validado_em).toLocaleDateString("pt-BR")}` : ""}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function Lista({
  itens,
  vazio,
  destaque,
}: {
  itens: MovimentacaoComProcesso[];
  vazio: string;
  destaque?: boolean;
}) {
  const queryClient = useQueryClient();

  if (itens.length === 0)
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">{vazio}</CardContent>
      </Card>
    );

  return (
    <ol className="space-y-3">
      {itens.map((m) => (
        <li
          key={m.id}
          className={`rounded-lg border p-4 ${m.validado ? "border-border bg-card" : "border-amber-500/50 bg-amber-50/50"}`}
        >
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {m.processos ? (
              <Link
                to="/processos/$id"
                params={{ id: m.processos.id }}
                className="font-mono text-xs underline-offset-4 hover:underline"
              >
                {formatarCNJ(m.processos.numero_cnj)}
              </Link>
            ) : null}
            <span className="font-medium">{exibir(m.processos?.cliente)}</span>
            {m.processos?.autor || m.processos?.reu ? (
              <span className="text-muted-foreground">
                {m.processos.autor ?? "—"}
                {m.processos.reu ? ` x ${m.processos.reu}` : ""}
              </span>
            ) : m.processos?.parte_contraria ? (
              <span className="text-muted-foreground">x {m.processos.parte_contraria}</span>
            ) : null}
            {m.tipo ? <Badge variant="outline">{m.tipo}</Badge> : null}
            {m.destacar_email ? <Badge>Destacar no e-mail</Badge> : null}
            {!m.validado ? <Badge variant="secondary">Sugerido — não validado</Badge> : null}
            {destaque && m.prazo ? (
              <>
                <Badge variant="destructive">
                  <AlertTriangle className="size-3" />
                  Prazo {new Date(`${m.prazo}T12:00:00`).toLocaleDateString("pt-BR")}
                </Badge>
                <button
                  type="button"
                  title="Exportar prazo para o calendário (Outlook, Google, Apple)"
                  className="inline-flex items-center gap-1 text-xs text-primary underline-offset-4 hover:underline"
                  onClick={() => baixarPrazoIcs(m)}
                >
                  <CalendarPlus className="size-3.5" /> Exportar
                </button>
              </>
            ) : null}
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm">{m.descricao}</p>
          <div className="mt-1 flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {new Date(`${m.data_movimentacao}T12:00:00`).toLocaleDateString("pt-BR")}
            </p>
            {!m.validado ? (
              <Button type="button" size="sm" variant="outline" onClick={() => void validarMovimentacao(m.id, queryClient)}>
                <CheckCircle2 className="size-3.5" /> Marcar como validado
              </Button>
            ) : m.validado_por ? (
              <p className="text-xs text-muted-foreground">
                Validado por {m.validado_por}
                {m.validado_em ? ` em ${new Date(m.validado_em).toLocaleDateString("pt-BR")}` : ""}
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

function ListaProcessos({
  processos,
  vazio,
  descricaoEncerramento,
  mostrarDecisoesNoLd = true,
}: {
  processos: Processo[];
  vazio: string;
  descricaoEncerramento?: string;
  mostrarDecisoesNoLd?: boolean;
}) {
  if (processos.length === 0)
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">{vazio}</CardContent>
      </Card>
    );

  return (
    <ol className="space-y-3">
      {processos.map((p) => (
        <li key={p.id} className="rounded-lg border border-border bg-card p-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Link
              to="/processos/$id"
              params={{ id: p.id }}
              className="font-mono text-xs underline-offset-4 hover:underline"
            >
              {formatarCNJ(p.numero_cnj)}
            </Link>
            <span className="font-medium">{exibir(p.cliente)}</span>
            {p.comarca || p.uf ? (
              <span className="text-muted-foreground">
                {[p.comarca, p.uf].filter(Boolean).join(" / ")}
              </span>
            ) : null}
            {p.responsavel ? <Badge variant="outline">{p.responsavel}</Badge> : null}
            {p.socio ? <Badge variant="outline">sócio {p.socio}</Badge> : null}
            {p.fase ? <Badge variant="secondary">{p.fase}</Badge> : null}
            {mostrarDecisoesNoLd && p.decisoes_no_ld ? (
              <Badge variant="outline">Decisões no LD</Badge>
            ) : null}
            <span className="ml-auto flex items-center gap-3">
              {p.valor_encerramento != null ? (
                <span className="text-base font-semibold text-foreground">
                  {p.valor_encerramento.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </span>
              ) : null}
              <EncerramentoDialog
                processo={p}
                descricao={descricaoEncerramento}
                mostrarDecisoesNoLd={mostrarDecisoesNoLd}
              />
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
}
