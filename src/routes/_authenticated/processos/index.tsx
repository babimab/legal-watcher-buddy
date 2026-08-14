import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProcessoDialog } from "@/components/ProcessoDialog";
import {
  listarProcessos,
  listarUltimasMovimentacoes,
  formatarCNJ,
  STATUS_OPCOES,
  ehMeuApelido,
  OUTROS_ADVOGADOS_CONHECIDOS,
  SOCIOS_CONHECIDOS,
} from "@/lib/processos";
import { listarGrupos, listarPastas } from "@/lib/grupos";

type ProcessosSearch = { grupo?: string; pasta?: string; advogado?: string };

export const Route = createFileRoute("/_authenticated/processos/")({
  validateSearch: (search: Record<string, unknown>): ProcessosSearch => ({
    ...(typeof search["grupo"] === "string" ? { grupo: search["grupo"] } : {}),
    ...(typeof search["pasta"] === "string" ? { pasta: search["pasta"] } : {}),
    ...(typeof search["advogado"] === "string" ? { advogado: search["advogado"] } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Processos | Radar Processual" },
      {
        name: "description",
        content: "Carteira de processos judiciais do escritório com busca, status e responsável.",
      },
      { property: "og:title", content: "Processos" },
      {
        property: "og:description",
        content: "Carteira de processos judiciais do escritório com busca, status e responsável.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProcessosPage,
});

function ProcessosPage() {
  const search = Route.useSearch();
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("todos");
  const [carteira, setCarteira] = useState("todas");
  const [uf, setUf] = useState("todas");
  const [sistema, setSistema] = useState("todos");
  const [grupoId, setGrupoId] = useState(search.grupo ?? "todos");
  const [pastaId, setPastaId] = useState(search.pasta ?? "todas");
  const [advogado, setAdvogado] = useState(search.advogado ?? "todos");
  const [socio, setSocio] = useState("todos");
  const somenteMeus = search.advogado === "eu";

  const { data, isLoading } = useQuery({
    queryKey: ["processos"],
    queryFn: listarProcessos,
  });

  const ultimasMovimentacoes = useQuery({
    queryKey: ["ultimas-movimentacoes"],
    queryFn: listarUltimasMovimentacoes,
  });

  const grupos = useQuery({ queryKey: ["grupos"], queryFn: listarGrupos });
  const pastas = useQuery({ queryKey: ["pastas"], queryFn: listarPastas });
  const pastaPorId = useMemo(
    () => new Map((pastas.data ?? []).map((p) => [p.id, p])),
    [pastas.data],
  );
  const pastasDoGrupoSelecionado = useMemo(
    () => (pastas.data ?? []).filter((p) => grupoId === "todos" || p.grupo_id === grupoId),
    [pastas.data, grupoId],
  );

  const carteiras = useMemo(
    () => [...new Set((data ?? []).map((p) => p.carteira).filter(Boolean) as string[])].sort(),
    [data],
  );

  const ufs = useMemo(
    () => [...new Set((data ?? []).map((p) => p.uf).filter(Boolean) as string[])].sort(),
    [data],
  );

  const sistemas = useMemo(
    () => [...new Set((data ?? []).map((p) => p.sistema).filter(Boolean) as string[])].sort(),
    [data],
  );

  const advogados = useMemo(() => {
    const valores = [
      ...new Set([
        ...(data ?? []).map((p) => p.responsavel).filter(Boolean),
        ...OUTROS_ADVOGADOS_CONHECIDOS,
      ] as string[]),
    ];
    return {
      temMeus: valores.some((v) => ehMeuApelido(v)),
      outros: valores.filter((v) => !ehMeuApelido(v)).sort(),
    };
  }, [data]);

  const socios = useMemo(
    () =>
      [
        ...new Set([
          ...(data ?? []).map((p) => p.socio).filter(Boolean),
          ...SOCIOS_CONHECIDOS,
        ] as string[]),
      ].sort(),
    [data],
  );

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (data ?? []).filter((p) => {
      const casaStatus = status === "todos" || p.status === status;
      const casaCarteira = carteira === "todas" || p.carteira === carteira;
      const casaUf = uf === "todas" || p.uf === uf;
      const casaSistema = sistema === "todos" || p.sistema === sistema;
      const pastaDoProcesso = p.pasta_id ? pastaPorId.get(p.pasta_id) : undefined;
      const casaGrupo = grupoId === "todos" || pastaDoProcesso?.grupo_id === grupoId;
      const casaPasta = pastaId === "todas" || p.pasta_id === pastaId;
      const casaAdvogado =
        advogado === "todos" ||
        (advogado === "eu" ? ehMeuApelido(p.responsavel) : p.responsavel === advogado);
      const casaSocio = socio === "todos" || p.socio === socio;
      const casaBusca =
        !termo ||
        [
          p.numero_cnj,
          p.numero_interno,
          p.numero_antigo,
          p.cliente,
          p.autor,
          p.reu,
          p.parte_contraria,
          p.tribunal,
          p.comarca,
          p.responsavel,
        ]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(termo));
      return (
        casaStatus &&
        casaCarteira &&
        casaUf &&
        casaSistema &&
        casaGrupo &&
        casaPasta &&
        casaAdvogado &&
        casaSocio &&
        casaBusca
      );
    });
  }, [data, busca, status, carteira, uf, sistema, grupoId, pastaId, advogado, socio, pastaPorId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold">
            {somenteMeus ? "Meus processos" : "Processos"}
          </h1>
          <p className="text-muted-foreground">
            {somenteMeus
              ? "Só os processos seus (BDR / Bárbara)."
              : `Carteira compartilhada do escritório — ${data?.length ?? 0} cadastrados.`}
          </p>
        </div>
        <ProcessoDialog
          trigger={
            <Button>
              <Plus className="size-4" /> Novo processo
            </Button>
          }
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-64 flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por número, cliente, parte, tribunal..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {STATUS_OPCOES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {carteiras.length > 0 ? (
          <Select value={carteira} onValueChange={setCarteira}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as carteiras</SelectItem>
              {carteiras.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        {ufs.length > 0 ? (
          <Select value={uf} onValueChange={setUf}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todos os estados</SelectItem>
              {ufs.map((u) => (
                <SelectItem key={u} value={u}>
                  {u}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        {sistemas.length > 0 ? (
          <Select value={sistema} onValueChange={setSistema}>
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os sistemas</SelectItem>
              {sistemas.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        {advogados.temMeus || advogados.outros.length > 0 ? (
          <Select value={advogado} onValueChange={setAdvogado}>
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os advogados</SelectItem>
              {advogados.temMeus ? <SelectItem value="eu">BDR / Bárbara (meus)</SelectItem> : null}
              {advogados.outros.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        {socios.length > 0 ? (
          <Select value={socio} onValueChange={setSocio}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os sócios</SelectItem>
              {socios.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        {(grupos.data ?? []).length > 0 ? (
          <Select
            value={grupoId}
            onValueChange={(v) => {
              setGrupoId(v);
              setPastaId("todas");
            }}
          >
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os grupos</SelectItem>
              {(grupos.data ?? []).map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        {pastasDoGrupoSelecionado.length > 0 ? (
          <Select value={pastaId} onValueChange={setPastaId}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as pastas</SelectItem>
              {pastasDoGrupoSelecionado.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : lista.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhum processo encontrado. Cadastre o primeiro ou importe sua planilha.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {lista.map((p) => (
            <Link
              key={p.id}
              to="/processos/$id"
              params={{ id: p.id }}
              className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary"
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-sm">{formatarCNJ(p.numero_cnj)}</span>
                <Badge variant={p.status === "ativo" ? "default" : "secondary"}>{p.status}</Badge>
                {p.pasta_id && pastaPorId.get(p.pasta_id) ? (
                  <Badge variant="outline">{pastaPorId.get(p.pasta_id)!.nome}</Badge>
                ) : p.carteira ? (
                  <Badge variant="outline">{p.carteira}</Badge>
                ) : null}
                {p.tipo_desdobramento ? (
                  <Badge variant="secondary">{p.tipo_desdobramento}</Badge>
                ) : null}
                {p.numero_interno ? (
                  <span className="text-xs text-muted-foreground">caso {p.numero_interno}</span>
                ) : null}
                {p.monitorar ? <Badge variant="outline">monitorado</Badge> : null}
              </div>
              <p className="mt-1 font-serif text-lg">
                {p.autor ?? p.cliente}
                {p.reu ? <span className="text-muted-foreground"> x {p.reu}</span> : null}
              </p>
              <p className="text-sm text-muted-foreground">
                {[p.comarca, p.uf, p.vara, p.sistema].filter(Boolean).join(" · ")}
              </p>
              {ultimasMovimentacoes.data?.get(p.id) ? (
                <p className="mt-2 line-clamp-1 text-sm">
                  <span className="text-muted-foreground">
                    {new Date(
                      `${ultimasMovimentacoes.data.get(p.id)!.data_movimentacao}T12:00:00`,
                    ).toLocaleDateString("pt-BR")}
                    {" — "}
                  </span>
                  {ultimasMovimentacoes.data.get(p.id)!.descricao}
                </p>
              ) : null}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
