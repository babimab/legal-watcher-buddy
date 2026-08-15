import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { AlertTriangle, CheckCircle2, FileWarning, Wallet } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  listarNaoValidados,
  listarPendencias,
  listarProcessos,
  exibir,
  ehResponsavelDaSigla,
  useSiglaAtual,
  categoriaCliente,
  type MovimentacaoComProcesso,
} from "@/lib/processos";

type PainelSearch = { cliente?: string };

export const Route = createFileRoute("/_authenticated/painel")({
  validateSearch: (search: Record<string, unknown>): PainelSearch => ({
    ...(typeof search["cliente"] === "string" ? { cliente: search["cliente"] } : {}),
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

  const categorias = search.cliente ? search.cliente.split(",") : null;
  const titulo = categorias ? categorias.join(" / ") : null;

  const filtrarPorCliente = <T extends { cliente?: string | null }>(itens: T[]) =>
    categorias ? itens.filter((i) => categorias.includes(categoriaCliente(i.cliente))) : itens;

  const processos = { data: filtrarPorCliente(processosQuery.data ?? []) };
  const pendencias = {
    data: categorias
      ? (pendenciasQuery.data ?? []).filter((m: MovimentacaoComProcesso) =>
          categorias.includes(categoriaCliente(m.processos?.cliente)),
        )
      : (pendenciasQuery.data ?? []),
  };
  const naoValidados = {
    data: categorias
      ? (naoValidadosQuery.data ?? []).filter((m: MovimentacaoComProcesso) =>
          categorias.includes(categoriaCliente(m.processos?.cliente)),
        )
      : (naoValidadosQuery.data ?? []),
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold">Painel{titulo ? ` — ${titulo}` : ""}</h1>
        <p className="text-muted-foreground">
          {titulo ? `Resumo da carteira ${titulo}` : "Resumo do escritório"} —{" "}
          {meusProcessos.length} processo(s) seus, {processos.data?.length ?? 0} no total.
        </p>
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
