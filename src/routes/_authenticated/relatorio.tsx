import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Download, Play } from "lucide-react";
import * as XLSX from "xlsx";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import {
  formatarCNJ,
  listarMovimentacoesDesde,
  listarPendencias,
  ultimaVerificacao,
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

function exportarNovidadesExcel(itens: MovimentacaoComProcesso[]) {
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
  XLSX.utils.book_append_sheet(livro, planilha, "Novos andamentos");
  XLSX.writeFile(livro, `novos-andamentos-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function RelatorioPage() {
  const queryClient = useQueryClient();
  const [rodando, setRodando] = useState(false);

  const verificacao = useQuery({ queryKey: ["verificacao"], queryFn: ultimaVerificacao });
  const desde = verificacao.data?.executado_em ?? null;

  const novidades = useQuery({
    queryKey: ["novidades", desde],
    queryFn: () => listarMovimentacoesDesde(desde),
    enabled: !verificacao.isLoading,
  });

  const semana = useQuery({
    queryKey: ["semana"],
    queryFn: () =>
      listarMovimentacoesDesde(new Date(Date.now() - 7 * 864e5).toISOString()),
  });

  const pendencias = useQuery({ queryKey: ["pendencias"], queryFn: listarPendencias });

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
          <Button
            variant="outline"
            disabled={(novidades.data ?? []).length === 0}
            onClick={() => exportarNovidadesExcel(novidades.data ?? [])}
          >
            <Download className="size-4" /> Exportar Excel
          </Button>
          <Button onClick={rodar} disabled={rodando}>
            <Play className="size-4" /> {rodando ? "Registrando..." : "Marcar como verificado"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="novidades">
        <TabsList>
          <TabsTrigger value="novidades">
            Novidades ({novidades.data?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="semana">Semana ({semana.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="pendencias">
            Prazos ({pendencias.data?.length ?? 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="novidades" className="mt-4">
          <Lista itens={novidades.data ?? []} vazio="Nada novo desde a última verificação." />
        </TabsContent>
        <TabsContent value="semana" className="mt-4">
          <Lista itens={semana.data ?? []} vazio="Nenhuma movimentação nos últimos 7 dias." />
        </TabsContent>
        <TabsContent value="pendencias" className="mt-4">
          <Lista itens={pendencias.data ?? []} vazio="Nenhuma providência em aberto." destaque />
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
