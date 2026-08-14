import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Download, Mail, Play } from "lucide-react";
import * as XLSX from "xlsx";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  ultimaVerificacao,
  ehMeuApelido,
  OUTROS_ADVOGADOS_CONHECIDOS,
  type MovimentacaoComProcesso,
} from "@/lib/processos";

export const Route = createFileRoute("/_authenticated/relatorio")({
  head: () => ({
    meta: [
      { title: "Relatório de novos andamentos | Radar Processual" },
      {
        name: "description",
        content:
          "Resumo das movimentações registradas desde a última verificação e prazos pendentes.",
      },
      { property: "og:title", content: "Relatório de novos andamentos" },
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

function exportarAndamentosExcel(itens: MovimentacaoComProcesso[], nomeArquivo: string) {
  const linhas = itens.map((m) => ({
    "Número CNJ": m.processos ? formatarCNJ(m.processos.numero_cnj) : "",
    Cliente: m.processos?.cliente ?? "",
    Autor: m.processos?.autor ?? "",
    Réu: m.processos?.reu ?? "",
    "Parte contrária": m.processos?.parte_contraria ?? "",
    Tipo: m.tipo ?? "",
    Data: m.data_movimentacao,
    Descrição: m.descricao,
    Observação: m.observacao ?? "",
  }));
  const planilha = XLSX.utils.json_to_sheet(linhas);
  const livro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(livro, planilha, "Andamentos");
  XLSX.writeFile(livro, `${nomeArquivo}-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

const NOME_ARQUIVO_POR_ABA: Record<string, string> = {
  novidades: "novidades",
  semana: "andamentos-da-semana",
  pendencias: "prazos-pendentes",
};

const TITULO_POR_ABA: Record<string, string> = {
  novidades: "Novidades desde a última verificação",
  semana: "Andamentos da última semana",
  pendencias: "Prazos pendentes",
};

const MAX_ITENS_NO_EMAIL = 30;
const COL_PROCESSO = 27;
const COL_CLIENTE = 22;
const COL_DATA = 12;

function saudacao() {
  const hora = new Date().getHours();
  if (hora < 12) return "bom dia";
  if (hora < 18) return "boa tarde";
  return "boa noite";
}

function linhaTabela(processo: string, cliente: string, data: string, andamento: string) {
  return (
    processo.padEnd(COL_PROCESSO) + cliente.padEnd(COL_CLIENTE) + data.padEnd(COL_DATA) + andamento
  );
}

function montarMailto(destinatarios: string[], itens: MovimentacaoComProcesso[], titulo: string) {
  const assunto = `Radar Processual — ${titulo}`;
  const cortado = itens.length > MAX_ITENS_NO_EMAIL;
  const visiveis = itens.slice(0, MAX_ITENS_NO_EMAIL);

  const cabecalho = linhaTabela("Processo", "Cliente", "Data", "Andamento");
  const separador = "-".repeat(COL_PROCESSO + COL_CLIENTE + COL_DATA + 20);
  const linhas = visiveis.map((m) => {
    const numero = m.processos ? formatarCNJ(m.processos.numero_cnj) : "—";
    const cliente = (m.processos?.cliente ?? "").slice(0, COL_CLIENTE - 2);
    const data = new Date(`${m.data_movimentacao}T12:00:00`).toLocaleDateString("pt-BR");
    return linhaTabela(numero, cliente, data, m.descricao);
  });
  const linhaCortado = cortado
    ? `\n... e mais ${itens.length - MAX_ITENS_NO_EMAIL} andamento(s). Veja a lista completa em "Exportar Excel".`
    : "";

  const corpo = `Olá, ${saudacao()}.

Seguem os andamentos novos — ${titulo}:

${cabecalho}
${separador}
${linhas.join("\n")}
${linhaCortado}

Abs.,`;

  return `mailto:${destinatarios.join(",")}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
}

function RelatorioPage() {
  const queryClient = useQueryClient();
  const [rodando, setRodando] = useState(false);
  const [aba, setAba] = useState("novidades");

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

  const pendencias = useQuery({ queryKey: ["pendencias"], queryFn: listarPendencias });

  const [advogado, setAdvogado] = useState("todos");

  const advogados = useMemo(() => {
    const todosItens = [
      ...(novidades.data ?? []),
      ...(semana.data ?? []),
      ...(pendencias.data ?? []),
    ];
    const valores = [
      ...new Set([
        ...todosItens.map((m) => m.processos?.responsavel).filter(Boolean),
        ...OUTROS_ADVOGADOS_CONHECIDOS,
      ] as string[]),
    ];
    return {
      temMeus: valores.some((v) => ehMeuApelido(v)),
      outros: valores.filter((v) => !ehMeuApelido(v)).sort(),
    };
  }, [novidades.data, semana.data, pendencias.data]);

  const filtrarPorAdvogado = (itens: MovimentacaoComProcesso[]) =>
    advogado === "todos"
      ? itens
      : itens.filter((m) =>
          advogado === "eu"
            ? ehMeuApelido(m.processos?.responsavel)
            : m.processos?.responsavel === advogado,
        );

  const novidadesFiltradas = filtrarPorAdvogado(novidades.data ?? []);
  const semanaFiltrada = filtrarPorAdvogado(semana.data ?? []);
  const pendenciasFiltradas = filtrarPorAdvogado(pendencias.data ?? []);

  const itensDaAba =
    aba === "semana"
      ? semanaFiltrada
      : aba === "pendencias"
        ? pendenciasFiltradas
        : novidadesFiltradas;

  const [emails, setEmails] = useState("");

  const abrirEmail = () => {
    const destinatarios = emails
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);
    if (destinatarios.length === 0) {
      toast.error("Informe pelo menos um e-mail.");
      return;
    }
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
          <h1 className="font-serif text-3xl font-semibold">Relatório de novos andamentos</h1>
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
                {advogados.temMeus ? (
                  <SelectItem value="eu">BDR / Bárbara (meus)</SelectItem>
                ) : null}
                {advogados.outros.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          <Button
            variant="outline"
            disabled={itensDaAba.length === 0}
            onClick={() => exportarAndamentosExcel(itensDaAba, NOME_ARQUIVO_POR_ABA[aba]!)}
          >
            <Download className="size-4" /> Exportar Excel
          </Button>
          <Button onClick={rodar} disabled={rodando}>
            <Play className="size-4" /> {rodando ? "Registrando..." : "Marcar como verificado"}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="text"
          placeholder="e-mail@escritorio.com.br, outro@escritorio.com.br"
          value={emails}
          onChange={(e) => setEmails(e.target.value)}
          className="max-w-sm"
        />
        <Button variant="outline" disabled={itensDaAba.length === 0} onClick={abrirEmail}>
          <Mail className="size-4" /> Enviar por e-mail
        </Button>
      </div>

      <Tabs value={aba} onValueChange={setAba}>
        <TabsList>
          <TabsTrigger value="novidades">Novidades ({novidadesFiltradas.length})</TabsTrigger>
          <TabsTrigger value="semana">Semana ({semanaFiltrada.length})</TabsTrigger>
          <TabsTrigger value="pendencias">Prazos ({pendenciasFiltradas.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="novidades" className="mt-4">
          <Lista itens={novidadesFiltradas} vazio="Nada novo desde a última verificação." />
        </TabsContent>
        <TabsContent value="semana" className="mt-4">
          <Lista itens={semanaFiltrada} vazio="Nenhuma movimentação nos últimos 7 dias." />
        </TabsContent>
        <TabsContent value="pendencias" className="mt-4">
          <Lista itens={pendenciasFiltradas} vazio="Nenhuma providência em aberto." destaque />
        </TabsContent>
      </Tabs>

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
            <span className="font-medium">{m.processos?.cliente}</span>
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
