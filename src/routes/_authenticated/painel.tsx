import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileWarning,
  Plus,
  ShieldCheck,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { AtalhosPastasPainel } from "@/components/AtalhosPastasPainel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  listarNaoValidados,
  listarPendencias,
  listarProcessos,
  exibir,
  ehResponsavelDaSigla,
  useSiglaAtual,
  useCargoAtual,
  type MovimentacaoComProcesso,
  type Processo,
} from "@/lib/processos";
import { criarPasta, listarGrupos, listarPastas, removerPasta } from "@/lib/grupos";
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
  const ehEstagiaria = useCargoAtual() === "Estagiário";
  const queryClient = useQueryClient();
  const processosQuery = useQuery({ queryKey: ["processos"], queryFn: listarProcessos });
  const pendenciasQuery = useQuery({ queryKey: ["pendencias"], queryFn: listarPendencias });
  const naoValidadosQuery = useQuery({ queryKey: ["nao-validados"], queryFn: listarNaoValidados });
  const pastasQuery = useQuery({ queryKey: ["pastas"], queryFn: listarPastas });
  const gruposQuery = useQuery({ queryKey: ["grupos"], queryFn: listarGrupos });

  const pastaPorId = useMemo(
    () => new Map((pastasQuery.data ?? []).map((p) => [p.id, p])),
    [pastasQuery.data],
  );

  const grupoAtual = (gruposQuery.data ?? []).find((g) => g.nome === search.grupo) ?? null;
  const titulo = grupoAtual?.nome ?? null;

  const pertenceAoGrupo = (pastaId: string | null | undefined) => {
    if (!grupoAtual) return true;
    if (!pastaId) return false;
    return pastaPorId.get(pastaId)?.grupo_id === grupoAtual.id;
  };

  const processos = {
    data: (processosQuery.data ?? []).filter(
      (p) => pertenceAoGrupo(p.pasta_id) && p.status === "ativo",
    ),
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

  const meusPrazosVencidos = useMemo(
    () => prazosVencidos.filter((m) => ehResponsavelDaSigla(m.processos?.responsavel, minhaSigla)),
    [prazosVencidos, minhaSigla],
  );
  const meusPrazosProximos = useMemo(
    () => prazosProximos.filter((m) => ehResponsavelDaSigla(m.processos?.responsavel, minhaSigla)),
    [prazosProximos, minhaSigla],
  );
  const meusNaoValidados = useMemo(
    () => (naoValidados.data ?? []).filter((m) => ehResponsavelDaSigla(m.processos?.responsavel, minhaSigla)),
    [naoValidados.data, minhaSigla],
  );

  const itensMesa = useMemo(() => {
    const itens: Array<{
      chave: string;
      tipo: "vencido" | "prazo" | "validar";
      titulo: string;
      detalhe: string;
      processoId?: string;
    }> = [];

    for (const m of meusPrazosVencidos.slice(0, 3)) {
      itens.push({
        chave: `vencido-${m.id}`,
        tipo: "vencido",
        titulo: m.processos?.parte_contraria || m.processos?.autor || exibir(m.processos?.cliente) || "Processo",
        detalhe: `${m.prazo ? new Date(`${m.prazo}T12:00:00`).toLocaleDateString("pt-BR") : "Prazo vencido"} — ${m.descricao}`,
        processoId: m.processos?.id,
      });
    }

    for (const m of meusPrazosProximos.slice(0, 3)) {
      itens.push({
        chave: `prazo-${m.id}`,
        tipo: "prazo",
        titulo: m.processos?.parte_contraria || m.processos?.autor || exibir(m.processos?.cliente) || "Processo",
        detalhe: `${m.prazo ? new Date(`${m.prazo}T12:00:00`).toLocaleDateString("pt-BR") : "Próximo prazo"} — ${m.descricao}`,
        processoId: m.processos?.id,
      });
    }

    for (const m of meusNaoValidados.slice(0, 3)) {
      itens.push({
        chave: `validar-${m.id}`,
        tipo: "validar",
        titulo: m.processos?.parte_contraria || m.processos?.autor || exibir(m.processos?.cliente) || "Processo",
        detalhe: `Validar andamento — ${m.descricao}`,
        processoId: m.processos?.id,
      });
    }

    return itens.slice(0, 7);
  }, [meusPrazosVencidos, meusPrazosProximos, meusNaoValidados]);

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

  const porPasta = useMemo(() => {
    if (!grupoAtual) return [];
    const contagem = new Map<string, { nome: string; itens: Processo[] }>();

    for (const pasta of pastasQuery.data ?? []) {
      if (pasta.grupo_id !== grupoAtual.id) continue;
      contagem.set(pasta.id, { nome: exibir(pasta.nome), itens: [] });
    }

    for (const p of processos.data) {
      const pasta = p.pasta_id ? pastaPorId.get(p.pasta_id) : undefined;
      const chave = pasta?.id ?? "sem-pasta";
      const nome = pasta ? exibir(pasta.nome) : "Sem pasta";
      const atual = contagem.get(chave);
      if (atual) atual.itens.push(p);
      else contagem.set(chave, { nome, itens: [p] });
    }

    return [...contagem.entries()].sort(([chaveA, a], [chaveB, b]) => {
      if (chaveA === "sem-pasta") return 1;
      if (chaveB === "sem-pasta") return -1;
      if (a.itens.length !== b.itens.length) return b.itens.length - a.itens.length;
      return a.nome.localeCompare(b.nome, "pt-BR");
    });
  }, [grupoAtual, processos.data, pastaPorId, pastasQuery.data]);

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

  const [novaPastaNome, setNovaPastaNome] = useState("");
  const [criandoPasta, setCriandoPasta] = useState(false);

  const criarPastaNoGrupo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grupoAtual || !novaPastaNome.trim()) return;
    setCriandoPasta(true);
    try {
      await criarPasta(grupoAtual.id, novaPastaNome.trim());
      setNovaPastaNome("");
      toast.success("Pasta criada.");
      await queryClient.invalidateQueries({ queryKey: ["pastas"] });
    } catch (e2) {
      toast.error(e2 instanceof Error ? e2.message : "Não consegui criar a pasta.");
    } finally {
      setCriandoPasta(false);
    }
  };

  const excluirPasta = async (pastaId: string, nome: string) => {
    try {
      await removerPasta(pastaId);
      toast.success(`Pasta "${nome}" excluída. Os processos dela ficam sem pasta.`);
      await queryClient.invalidateQueries({ queryKey: ["pastas"] });
      await queryClient.invalidateQueries({ queryKey: ["processos"] });
    } catch (e2) {
      toast.error(e2 instanceof Error ? e2.message : "Não consegui excluir a pasta.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-semibold">{titulo ?? "Painel"}</h1>
          <p className="text-muted-foreground">
            {titulo ? "Resumo dessa equipe" : "Sua mesa de trabalho"} — {meusProcessos.length}{" "}
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

      {!titulo ? (
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/30 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="font-serif text-xl">Minha mesa</CardTitle>
                <CardDescription>O que pede sua atenção agora.</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link to="/relatorio" search={{ aba: "pendencias", advogado: "eu" }}>Ver meus prazos</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link to="/processos" search={{ advogado: "eu" }}>Meus processos</Link>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {itensMesa.length === 0 ? (
              <div className="flex items-center gap-2 px-5 py-6 text-sm text-muted-foreground">
                <CheckCircle2 className="size-4 text-primary" /> Nada urgente na sua mesa agora.
              </div>
            ) : (
              <div className="divide-y">
                {itensMesa.map((item) => {
                  const conteudo = (
                    <div className="flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-muted/40">
                      {item.tipo === "vencido" ? (
                        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
                      ) : item.tipo === "prazo" ? (
                        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
                      ) : (
                        <FileWarning className="mt-0.5 size-4 shrink-0 text-amber-500" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{item.titulo}</p>
                          <Badge variant={item.tipo === "vencido" ? "destructive" : "outline"}>
                            {item.tipo === "vencido" ? "Prazo vencido" : item.tipo === "prazo" ? "Próximo prazo" : "Validar andamento"}
                          </Badge>
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.detalhe}</p>
                      </div>
                    </div>
                  );

                  return item.processoId ? (
                    <Link key={item.chave} to="/processos/$id" params={{ id: item.processoId }} className="block">
                      {conteudo}
                    </Link>
                  ) : (
                    <div key={item.chave}>{conteudo}</div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {!titulo ? <AtalhosPastasPainel /> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link to="/relatorio" search={{ aba: "pendencias", urgencia: "vencidos" }} className="block">
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
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-serif text-xl font-semibold">Pastas</h2>
            <form onSubmit={criarPastaNoGrupo} className="flex gap-2">
              <Input
                placeholder="Nova pasta (ex.: BDR)"
                value={novaPastaNome}
                onChange={(e) => setNovaPastaNome(e.target.value)}
                className="h-9 w-48"
              />
              <Button type="submit" variant="outline" size="sm" disabled={criandoPasta || !novaPastaNome.trim()}>
                <Plus className="size-4" /> Adicionar
              </Button>
            </form>
          </div>
          {porPasta.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                Nenhum processo cadastrado ainda.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {porPasta.map(([chave, { nome, itens }]) => (
                <Card key={chave} className="relative">
                  {chave !== "sem-pasta" ? (
                    <button
                      type="button"
                      aria-label={`Excluir pasta ${nome}`}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-destructive"
                      onClick={() => excluirPasta(chave, nome)}
                    >
                      <X className="size-4" />
                    </button>
                  ) : null}
                  <CardContent className="flex h-full flex-col justify-between gap-4 py-5">
                    <div>
                      <p className="pr-6 font-serif text-lg font-semibold">{nome}</p>
                      <p className="text-sm text-muted-foreground">{itens.length} processo{itens.length === 1 ? "" : "s"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {chave !== "sem-pasta" ? (
                        <Button asChild variant="outline" size="sm" className="flex-1">
                          <Link to="/processos" search={{ pasta: chave }}>Ver processos</Link>
                        </Button>
                      ) : (
                        <span className="flex-1" />
                      )}
                      <Button type="button" variant="outline" size="sm" disabled={exportandoPasta === chave || itens.length === 0} onClick={() => exportarPasta(chave, nome, itens)}>
                        <Download className="size-4" /> Exportar
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
                  <Link to="/processos" search={{ fase }} className="underline-offset-4 hover:underline">{exibir(fase)}</Link>
                  <Badge variant="outline">{qtd}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-lg">Valor em causa por carteira</CardTitle>
            <CardDescription>Soma do valor da causa dos processos com valor informado.</CardDescription>
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
          <CheckCircle2 className="size-4 text-primary" /> Tudo em dia: sem prazo vencido nem andamento pendente de validação.
        </p>
      ) : null}

      {ehEstagiaria ? null : (
        <Link to="/qualidade-dados" className="flex items-center gap-2 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
          <ShieldCheck className="size-4" /> Qualidade dos dados
        </Link>
      )}
    </div>
  );
}
