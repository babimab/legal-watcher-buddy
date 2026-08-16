import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, FileWarning, Users, Wallet } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  listarNaoValidados,
  listarPendencias,
  listarProcessos,
  exibir,
  ehResponsavelDaSigla,
  useSiglaAtual,
  type MovimentacaoComProcesso,
  type Processo,
} from "@/lib/processos";
import { listarGrupos, listarPastas } from "@/lib/grupos";
import { exportarProcessosExcel } from "@/lib/excel";

type PainelSearch = { grupo?: string };

export const Route = createFileRoute("/_authenticated/painel")({
  validateSearch: (search: Record<string, unknown>): PainelSearch => ({
    ...(typeof search["grupo"] === "string" ? { grupo: search["grupo"] } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Painel | FaroLex" },
      {
        name: "description",
        content: "Resumo do escritório: processos por fase, prazos e andamentos pendentes.",
      },
    ],
  }),
  component: PainelPage,
});

function formatarValor(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function PainelPage() {
  const search = Route.useSearch();
  const minhaSigla = useSiglaAtual();
  const processosQuery = useQuery({ queryKey: ["processos"], queryFn: listarProcessos });
  const pendenciasQuery = useQuery({ queryKey: ["pendencias"], queryFn: listarPendencias });
  const naoValidadosQuery = useQuery({ queryKey: ["nao-validados"], queryFn: listarNaoValidados });
  const pastasQuery = useQuery({ queryKey: ["pastas"], queryFn: listarPastas });
  const gruposQuery = useQuery({ queryKey: ["grupos"], queryFn: listarGrupos });

  const pastaPorId = useMemo(
    () => new Map((pastasQuery.data ?? []).map((p) => [p.id, p])),
    [pastasQuery.data],
  );

  // O painel é por grupo (Equipe Souza Cruz, Equipe Astro), não por texto
  // de cliente — um processo de Merck que fica na pasta do JGV dentro da
  // Equipe Souza Cruz é contado ali, do jeito que é na planilha real dele.
  const grupoAtual = (gruposQuery.data ?? []).find((g) => g.nome === search.grupo) ?? null;
  const titulo = grupoAtual?.nome ?? null;

  const pertenceAoGrupo = (pastaId: string | null | undefined) => {
    if (!grupoAtual) return true;
    if (!pastaId) return false;
    return pastaPorId.get(pastaId)?.grupo_id === grupoAtual.id;
  };

  const processos = {
    data: (processosQuery.data ?? []).filter((p) => pertenceAoGrupo(p.pasta_id)),
  };
  const pendencias = {
    data: (pendenciasQuery.data ?? []).filter((m: MovimentacaoComProcesso) =>
      pertenceAoGrupo(m.processos?.pasta_id),
    ),
  };
  const naoValidados = {
    data: (naoValidadosQuery.data ?? []).filter((m: MovimentacaoComProcesso) =>
      pertenceAoGrupo(m.processos?.pasta_id),
    ),
  };

  const meusProcessos = useMemo(
    () => processos.data.filter((p) => ehResponsavelDaSigla(p.responsavel, minhaSigla)),
    [processos.data, minhaSigla],
  );

  const hojeISO = new Date().toISOString().slice(0, 10);
  const emSeteDias = new Date();
  emSeteDias.setDate(emSeteDias.getDate() + 7);
  const emSeteDiasISO = emSeteDias.toISOString().slice(0, 10);

  const prazosVencidos = (pendencias.data ?? []).filter((m) => m.prazo && m.prazo < hojeISO);
  const prazosProximos = (pendencias.data ?? []).filter(
    (m) => m.prazo && m.prazo >= hojeISO && m.prazo <= emSeteDiasISO,
  );

  const porFase = useMemo(() => {
    const contagem = new Map<string, number>();
    for (const p of processos.data ?? []) {
      const chave = p.fase || "Sem fase definida";
      contagem.set(chave, (contagem.get(chave) ?? 0) + 1);
    }
    return [...contagem.entries()].sort((a, b) => b[1] - a[1]);
  }, [processos.data]);

  const valorPorCarteira = useMemo(() => {
    const somas = new Map<string, number>();
    for (const p of processos.data ?? []) {
      if (p.valor_causa == null) continue;
      const chave = p.carteira || "Sem carteira";
      somas.set(chave, (somas.get(chave) ?? 0) + p.valor_causa);
    }
    return [...somas.entries()].sort((a, b) => b[1] - a[1]);
  }, [processos.data]);

  const valorTotal = valorPorCarteira.reduce((soma, [, v]) => soma + v, 0);

  // Só faz sentido nos painéis de equipe (Souza Cruz, Astro) — é onde as
  // pastas representam o advogado responsável por aquele bloco de processos.
  const porPasta = useMemo(() => {
    if (!grupoAtual) return [];
    const contagem = new Map<string, { nome: string; itens: Processo[] }>();
    for (const p of processos.data) {
      const pasta = p.pasta_id ? pastaPorId.get(p.pasta_id) : undefined;
      const chave = pasta?.id ?? "sem-pasta";
      const nome = pasta ? exibir(pasta.nome) : "Sem pasta";
      const atual = contagem.get(chave);
      if (atual) atual.itens.push(p);
      else contagem.set(chave, { nome, itens: [p] });
    }
    return [...contagem.entries()].sort(([, a], [, b]) => b.itens.length - a.itens.length);
  }, [grupoAtual, processos.data, pastaPorId]);

  const [exportandoPasta, setExportandoPasta] = useState<string | null>(null);

  const exportarPasta = async (chave: string, nome: string, itens: Processo[]) => {
    setExportandoPasta(chave);
    try {
      await exportarProcessosExcel(itens, `processos-${nome}`);
    } catch {
      toast.error("Não consegui gerar a planilha.");
    } finally {
      setExportandoPasta(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-semibold">{titulo ?? "Painel"}</h1>
          <p className="text-muted-foreground">
            {titulo ? "Resumo dessa equipe" : "Resumo do escritório"} — {meusProcessos.length}{" "}
            processo(s) seus, {processos.data?.length ?? 0} no total.
          </p>
        </div>
        {titulo ? (
          <Button asChild variant="outline" size="sm">
            <Link to="/grupos">
              <Users className="size-4" /> Gerenciar equipe
            </Link>
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          to="/relatorio"
          search={{ aba: "pendencias", urgencia: "vencidos" }}
          className="block"
        >
          <Card className="transition-colors hover:border-destructive/50">
            <CardContent className="flex items-center gap-3 py-5">
              <AlertTriangle className="size-8 text-destructive" />
              <div>
                <p className="text-2xl font-semibold">{prazosVencidos.length}</p>
                <p className="text-xs text-muted-foreground">Prazos vencidos</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/relatorio" search={{ aba: "pendencias" }} className="block">
          <Card className="transition-colors hover:border-primary/50">
            <CardContent className="flex items-center gap-3 py-5">
              <AlertTriangle className="size-8 text-amber-500" />
              <div>
                <p className="text-2xl font-semibold">{prazosProximos.length}</p>
                <p className="text-xs text-muted-foreground">Prazos nos próximos 7 dias</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/relatorio" search={{ aba: "novidades" }} className="block">
          <Card className="transition-colors hover:border-primary/50">
            <CardContent className="flex items-center gap-3 py-5">
              <FileWarning className="size-8 text-amber-500" />
              <div>
                <p className="text-2xl font-semibold">{naoValidados.data?.length ?? 0}</p>
                <p className="text-xs text-muted-foreground">Andamentos não validados</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Card>
          <CardContent className="flex items-center gap-3 py-5">
            <Wallet className="size-8 text-primary" />
            <div>
              <p className="text-2xl font-semibold">{formatarValor(valorTotal)}</p>
              <p className="text-xs text-muted-foreground">Valor total em causa</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {grupoAtual ? (
        <div>
          <h2 className="mb-3 font-serif text-xl font-semibold">Pastas</h2>
          {porPasta.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                Nenhum processo cadastrado ainda.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {porPasta.map(([chave, { nome, itens }]) => (
                <Card key={chave}>
                  <CardContent className="flex h-full flex-col justify-between gap-4 py-5">
                    <div>
                      <p className="font-serif text-lg font-semibold">{nome}</p>
                      <p className="text-sm text-muted-foreground">
                        {itens.length} processo{itens.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {chave !== "sem-pasta" ? (
                        <Button asChild variant="outline" size="sm" className="flex-1">
                          <Link to="/processos" search={{ pasta: chave }}>
                            Ver processos
                          </Link>
                        </Button>
                      ) : (
                        <span className="flex-1" />
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={exportandoPasta === chave}
                        onClick={() => exportarPasta(chave, nome, itens)}
                      >
                        <Download className="size-4" />
                        Exportar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-lg">Processos por fase</CardTitle>
            <CardDescription>{processos.data?.length ?? 0} processo(s) no total.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {porFase.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum processo cadastrado ainda.</p>
            ) : (
              porFase.map(([fase, qtd]) => (
                <div key={fase} className="flex items-center justify-between text-sm">
                  <Link
                    to="/processos"
                    search={{ fase }}
                    className="underline-offset-4 hover:underline"
                  >
                    {exibir(fase)}
                  </Link>
                  <Badge variant="outline">{qtd}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-lg">Valor em causa por carteira</CardTitle>
            <CardDescription>
              Soma do valor da causa dos processos com valor informado.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {valorPorCarteira.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum processo com valor informado.</p>
            ) : (
              valorPorCarteira.map(([carteira, valor]) => (
                <div key={carteira} className="flex items-center justify-between text-sm">
                  <span>{exibir(carteira)}</span>
                  <span className="font-medium">{formatarValor(valor)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {naoValidados.data && naoValidados.data.length === 0 && prazosVencidos.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="size-4 text-primary" /> Tudo em dia: sem prazo vencido nem
          andamento pendente de validação.
        </p>
      ) : null}
    </div>
  );
}
