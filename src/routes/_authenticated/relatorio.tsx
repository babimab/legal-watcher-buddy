import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Download, Mail, Play } from "lucide-react";
import ExcelJS from "exceljs";

import { Button } from "@/components/ui/button";
import { NovoPrazoDialog } from "@/components/NovoPrazoDialog";
import { EncerramentoDialog } from "@/components/EncerramentoDialog";
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
import {
  formatarCNJ,
  listarMovimentacoesDesde,
  listarPendencias,
  listarProcessos,
  ultimaVerificacao,
  ehResponsavelDaSigla,
  useSiglaAtual,
  OUTROS_ADVOGADOS_CONHECIDOS,
  exibir,
  type MovimentacaoComProcesso,
  type Processo,
} from "@/lib/processos";
import {
  estilizarCabecalho,
  centralizarLinhas,
  finalizarPlanilha,
  baixarPlanilha,
  exportarProcessosExcel,
} from "@/lib/excel";

type RelatorioSearch = { aba?: string; advogado?: string; urgencia?: string };

export const Route = createFileRoute("/_authenticated/relatorio")({
  validateSearch: (search: Record<string, unknown>): RelatorioSearch => ({
    ...(typeof search["aba"] === "string" ? { aba: search["aba"] } : {}),
    ...(typeof search["advogado"] === "string" ? { advogado: search["advogado"] } : {}),
    ...(typeof search["urgencia"] === "string" ? { urgencia: search["urgencia"] } : {}),
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

const COLUNAS_TEXTO_LIVRE = new Set(["descricao", "observacao"]);

async function exportarAndamentosExcel(itens: MovimentacaoComProcesso[], nomeArquivo: string) {
  const workbook = new ExcelJS.Workbook();
  const planilha = workbook.addWorksheet("Andamentos");

  planilha.columns = [
    { header: "Número CNJ", key: "numero_cnj", width: 22 },
    { header: "Cliente", key: "cliente", width: 26 },
    { header: "Autor", key: "autor", width: 26 },
    { header: "Réu", key: "reu", width: 26 },
    { header: "Parte contrária", key: "parte_contraria", width: 26 },
    { header: "Comarca", key: "comarca", width: 22 },
    { header: "Juízo", key: "vara", width: 26 },
    { header: "UF", key: "uf", width: 10 },
    { header: "Responsável", key: "responsavel", width: 14 },
    { header: "Sócio", key: "socio", width: 10 },
    { header: "Tipo", key: "tipo", width: 14 },
    { header: "Data", key: "data", width: 12 },
    { header: "Descrição", key: "descricao", width: 60 },
    { header: "Observação", key: "observacao", width: 40 },
  ];

  for (const m of itens) {
    planilha.addRow({
      numero_cnj: m.processos ? formatarCNJ(m.processos.numero_cnj) : "",
      cliente: exibir(m.processos?.cliente) ?? "",
      autor: m.processos?.autor ?? "",
      reu: m.processos?.reu ?? "",
      parte_contraria: m.processos?.parte_contraria ?? "",
      comarca: m.processos?.comarca ?? "",
      vara: m.processos?.vara ?? "",
      uf: m.processos?.uf ?? "",
      responsavel: m.processos?.responsavel ?? "",
      socio: m.processos?.socio ?? "",
      tipo: m.tipo ?? "",
      data: new Date(`${m.data_movimentacao}T12:00:00`),
      descricao: m.descricao,
      observacao: m.observacao ?? "",
    });
  }

  estilizarCabecalho(planilha);
  centralizarLinhas(planilha, COLUNAS_TEXTO_LIVRE);
  planilha.getColumn("data").numFmt = "dd/mm/yyyy";
  finalizarPlanilha(planilha);

  await baixarPlanilha(workbook, nomeArquivo);
}

const LIMITE_ULTIMOS_ANDAMENTOS = 50;

const NOME_ARQUIVO_POR_ABA: Record<string, string> = {
  novidades: "novidades",
  semana: "andamentos-da-semana",
  mes: "andamentos-do-mes",
  ultimos: "ultimos-andamentos",
  pendencias: "prazos-pendentes",
};

const TITULO_POR_ABA: Record<string, string> = {
  novidades: "Novidades desde a última verificação",
  semana: "Andamentos da última semana",
  mes: "Andamentos do último mês",
  ultimos: `Últimos ${LIMITE_ULTIMOS_ANDAMENTOS} andamentos`,
  pendencias: "Prazos pendentes",
};

const MAX_ITENS_NO_EMAIL = 30;

function saudacao() {
  const hora = new Date().getHours();
  if (hora < 12) return "bom dia";
  if (hora < 18) return "boa tarde";
  return "boa noite";
}

// Formato em blocos (não em colunas alinhadas com espaços): a maioria dos
// clientes de e-mail exibe o corpo em fonte proporcional, então colunas
// "alinhadas" com padEnd ficam tortas na prática — daí o "tosco".
function blocoAndamento(
  indice: number,
  processo: string,
  cliente: string,
  data: string,
  andamento: string,
) {
  const cabecalho = cliente ? `${processo} — ${cliente}` : processo;
  return `${indice}. ${cabecalho} (${data})\n${andamento}`;
}

function montarMailto(destinatarios: string[], itens: MovimentacaoComProcesso[], titulo: string) {
  const assunto = `FaroLex — ${titulo}`;
  const cortado = itens.length > MAX_ITENS_NO_EMAIL;
  const visiveis = itens.slice(0, MAX_ITENS_NO_EMAIL);

  const blocos = visiveis.map((m, i) => {
    const numero = m.processos ? formatarCNJ(m.processos.numero_cnj) : "—";
    const cliente = exibir(m.processos?.cliente) ?? "";
    const data = new Date(`${m.data_movimentacao}T12:00:00`).toLocaleDateString("pt-BR");
    return blocoAndamento(i + 1, numero, cliente, data, m.descricao);
  });
  const linhaCortado = cortado
    ? `\n\n... e mais ${itens.length - MAX_ITENS_NO_EMAIL} andamento(s). A lista completa está na planilha em anexo.`
    : "";

  const corpo = `Olá, ${saudacao()}.

Seguem os andamentos novos — ${titulo}. A planilha completa foi baixada agora e é só arrastar pra cá antes de enviar.

${blocos.join("\n\n")}${linhaCortado}

Abs.,`;

  return `mailto:${destinatarios.join(",")}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
}

function montarMailtoEncerramento(destinatarios: string[], processos: Processo[]) {
  const assunto = "FaroLex — Processos prontos para encerrar";

  const blocos = processos.map((p, i) => {
    const numero = formatarCNJ(p.numero_cnj);
    const cliente = exibir(p.cliente) ?? "";
    const valor =
      p.valor_encerramento != null
        ? p.valor_encerramento.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
        : "sem valor informado";
    const observacao = p.observacao_encerramento ? `\n   Obs.: ${p.observacao_encerramento}` : "";
    return `${i + 1}. ${numero} — ${cliente}\n   Valor: ${valor}${observacao}`;
  });

  const corpo = `Olá, ${saudacao()}.

Seguem os processos já revisados e prontos para encerramento:

${blocos.join("\n\n")}

Abs.,`;

  return `mailto:${destinatarios.join(",")}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
}

function RelatorioPage() {
  const search = Route.useSearch();
  const queryClient = useQueryClient();
  const [rodando, setRodando] = useState(false);
  const [aba, setAba] = useState(search.aba ?? "novidades");

  const verificacao = useQuery({ queryKey: ["verificacao"], queryFn: ultimaVerificacao });
  const desde = verificacao.data?.executado_em ?? null;

  const novidades = useQuery({
    queryKey: ["novidades", desde],
    queryFn: () => listarMovimentacoesDesde(desde),
    enabled: !verificacao.isLoading,
  });

  const semana = useQuery({
    queryKey: ["semana"],
    queryFn: () => listarMovimentacoesDesde(new Date(Date.now() - 7 * 864e5).toISOString()),
  });

  const mes = useQuery({
    queryKey: ["mes"],
    queryFn: () => listarMovimentacoesDesde(new Date(Date.now() - 30 * 864e5).toISOString()),
  });

  // Sempre os últimos andamentos registrados, sem depender de verificação
  // nem de janela de dias — pra poder consultar a qualquer momento mesmo
  // depois de zerar as novidades.
  const ultimos = useQuery({
    queryKey: ["ultimos-andamentos"],
    queryFn: () => listarMovimentacoesDesde(null, LIMITE_ULTIMOS_ANDAMENTOS),
  });

  const pendencias = useQuery({ queryKey: ["pendencias"], queryFn: listarPendencias });

  // Relatório pré-programado: processos em fase de Encerramento, pra
  // decidir quais já podem ser baixados.
  const processos = useQuery({ queryKey: ["processos"], queryFn: listarProcessos });
  const encerramento = (processos.data ?? []).filter((p) => p.fase === "Encerramento");

  const [advogado, setAdvogado] = useState(search.advogado ?? "todos");
  const [urgencia, setUrgencia] = useState(search.urgencia ?? "todos");
  const [soProntos, setSoProntos] = useState(false);
  const minhaSigla = useSiglaAtual();

  // O componente não remonta ao trocar de aba/filtro via link (ex.: atalho
  // "Meus prazos" no menu) — sem isso, o estado local ficava desatualizado.
  useEffect(() => {
    setAba(search.aba ?? "novidades");
    setAdvogado(search.advogado ?? "todos");
    setUrgencia(search.urgencia ?? "todos");
  }, [search.aba, search.advogado, search.urgencia]);

  const advogados = useMemo(() => {
    const todosItens = [
      ...(novidades.data ?? []),
      ...(semana.data ?? []),
      ...(mes.data ?? []),
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
  }, [novidades.data, semana.data, mes.data, ultimos.data, pendencias.data, minhaSigla]);

  const filtrarPorAdvogado = (itens: MovimentacaoComProcesso[]) =>
    advogado === "todos"
      ? itens
      : itens.filter((m) =>
          advogado === "eu"
            ? ehResponsavelDaSigla(m.processos?.responsavel, minhaSigla)
            : m.processos?.responsavel === advogado,
        );

  const novidadesFiltradas = filtrarPorAdvogado(novidades.data ?? []);
  const semanaFiltrada = filtrarPorAdvogado(semana.data ?? []);
  const mesFiltrado = filtrarPorAdvogado(mes.data ?? []);
  const ultimosFiltrados = filtrarPorAdvogado(ultimos.data ?? []);

  const hojeISO = new Date().toISOString().slice(0, 10);
  const emUmDia = new Date();
  emUmDia.setDate(emUmDia.getDate() + 1);
  const emUmDiaISO = emUmDia.toISOString().slice(0, 10);
  const emSeteDias = new Date();
  emSeteDias.setDate(emSeteDias.getDate() + 7);
  const emSeteDiasISO = emSeteDias.toISOString().slice(0, 10);

  const pendenciasFiltradas = filtrarPorAdvogado(pendencias.data ?? []).filter((m) => {
    if (urgencia === "todos") return true;
    if (!m.prazo) return false;
    if (urgencia === "vencidos") return m.prazo < hojeISO;
    if (urgencia === "1dia") return m.prazo >= hojeISO && m.prazo <= emUmDiaISO;
    return m.prazo >= hojeISO && m.prazo <= emSeteDiasISO;
  });

  const encerramentoFiltrado =
    advogado === "todos"
      ? encerramento
      : encerramento.filter((p) =>
          advogado === "eu"
            ? ehResponsavelDaSigla(p.responsavel, minhaSigla)
            : p.responsavel === advogado,
        );

  const encerramentoProntos = encerramentoFiltrado.filter((p) => p.pronto_para_encerrar);
  const encerramentoExibido = soProntos ? encerramentoProntos : encerramentoFiltrado;

  const itensDaAba =
    aba === "semana"
      ? semanaFiltrada
      : aba === "mes"
        ? mesFiltrado
        : aba === "ultimos"
          ? ultimosFiltrados
          : aba === "pendencias"
            ? pendenciasFiltradas
            : aba === "encerramento"
              ? []
              : novidadesFiltradas;

  const [emails, setEmails] = useState("");

  const abrirEmail = async () => {
    const destinatarios = emails
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);
    if (destinatarios.length === 0) {
      toast.error("Informe pelo menos um e-mail.");
      return;
    }

    if (aba === "encerramento") {
      if (encerramentoProntos.length === 0) {
        toast.error("Nenhum processo marcado como pronto para encerrar ainda.");
        return;
      }
      window.location.href = montarMailtoEncerramento(destinatarios, encerramentoProntos);
      return;
    }

    // Link mailto não consegue anexar arquivo sozinho — baixa a planilha
    // junto e avisa pra arrastar ela pro e-mail que vai abrir.
    await exportarAndamentosExcel(itensDaAba, NOME_ARQUIVO_POR_ABA[aba]!).catch(() => {
      toast.error("Não consegui gerar a planilha, mas vou abrir o e-mail mesmo assim.");
    });
    toast.success("Planilha baixada — arraste o arquivo pro e-mail que vai abrir para anexar.", {
      duration: 6000,
    });
    window.location.href = montarMailto(destinatarios, itensDaAba, TITULO_POR_ABA[aba]!);
  };

  const rodar = async () => {
    setRodando(true);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("verificacoes").insert({
      tipo: "manual",
      periodo_inicio: desde,
      total_movimentacoes: novidades.data?.length ?? 0,
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold">
            {aba === "pendencias"
              ? "Prazos"
              : aba === "encerramento"
                ? "Encerramento"
                : "Relatórios"}
          </h1>
          <p className="text-muted-foreground">
            {desde
              ? `Última verificação em ${new Date(desde).toLocaleString("pt-BR")}.`
              : "Nenhuma verificação registrada ainda."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
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
          {aba === "encerramento" ? (
            <label className="flex items-center gap-2 rounded-md border border-input px-3 text-sm">
              <Checkbox checked={soProntos} onCheckedChange={(v) => setSoProntos(v === true)} />
              Só os prontos para encerrar
            </label>
          ) : null}
          <Button
            variant="outline"
            disabled={
              aba === "encerramento" ? encerramentoExibido.length === 0 : itensDaAba.length === 0
            }
            onClick={() => {
              if (aba === "encerramento") {
                void exportarProcessosExcel(encerramentoExibido, "processos-encerramento").catch(
                  () => toast.error("Não consegui gerar o Excel."),
                );
                return;
              }
              void exportarAndamentosExcel(itensDaAba, NOME_ARQUIVO_POR_ABA[aba]!).catch(() =>
                toast.error("Não consegui gerar o Excel."),
              );
            }}
          >
            <Download className="size-4" /> Exportar Excel
          </Button>
          <Button onClick={rodar} disabled={rodando}>
            <Play className="size-4" /> {rodando ? "Registrando..." : "Marcar como verificado"}
          </Button>
        </div>
      </div>

      {aba === "pendencias" ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-serif text-xl font-semibold">
              Prazos ({pendenciasFiltradas.length})
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
              disabled={itensDaAba.length === 0}
              onClick={() => void abrirEmail()}
            >
              <Mail className="size-4" /> Enviar por e-mail
            </Button>
          </div>

          <Lista itens={pendenciasFiltradas} vazio="Nenhuma providência em aberto." destaque />
        </>
      ) : aba === "encerramento" ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-serif text-xl font-semibold">
              Encerramento ({encerramentoExibido.length})
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
      ) : (
        <>
          <Card>
            <CardContent className="flex flex-wrap items-center gap-3 py-4">
              <span className="text-sm font-medium text-muted-foreground">Atalhos:</span>
              <Link
                to="/relatorio"
                search={{ aba: "pendencias", advogado }}
                className="inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
              >
                Ver prazos
              </Link>
              <Link
                to="/relatorio"
                search={{ aba: "encerramento", advogado }}
                className="inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
              >
                Ver Encerramento
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
              disabled={itensDaAba.length === 0}
              onClick={() => void abrirEmail()}
            >
              <Mail className="size-4" /> Enviar por e-mail
            </Button>
          </div>

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
              <Lista itens={novidadesFiltradas} vazio="Nada novo desde a última verificação." />
            </TabsContent>
            <TabsContent value="semana" className="mt-4">
              <Lista itens={semanaFiltrada} vazio="Nenhuma movimentação nos últimos 7 dias." />
            </TabsContent>
            <TabsContent value="mes" className="mt-4">
              <Lista itens={mesFiltrado} vazio="Nenhuma movimentação nos últimos 30 dias." />
            </TabsContent>
            <TabsContent value="ultimos" className="mt-4">
              <Lista itens={ultimosFiltrados} vazio="Nenhum andamento registrado ainda." />
            </TabsContent>
          </Tabs>
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

function Lista({
  itens,
  vazio,
  destaque,
}: {
  itens: MovimentacaoComProcesso[];
  vazio: string;
  destaque?: boolean;
}) {
  if (itens.length === 0)
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">{vazio}</CardContent>
      </Card>
    );

  return (
    <ol className="space-y-3">
      {itens.map((m) => (
        <li key={m.id} className="rounded-lg border border-border bg-card p-4">
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
            {destaque && m.prazo ? (
              <Badge variant="destructive">
                <AlertTriangle className="size-3" />
                Prazo {new Date(`${m.prazo}T12:00:00`).toLocaleDateString("pt-BR")}
              </Badge>
            ) : null}
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm">{m.descricao}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {new Date(`${m.data_movimentacao}T12:00:00`).toLocaleDateString("pt-BR")}
          </p>
        </li>
      ))}
    </ol>
  );
}

function ListaProcessos({ processos, vazio }: { processos: Processo[]; vazio: string }) {
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
            <span className="ml-auto flex items-center gap-3">
              {p.valor_encerramento != null ? (
                <span className="text-base font-semibold text-foreground">
                  {p.valor_encerramento.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </span>
              ) : null}
              <EncerramentoDialog processo={p} />
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
}
