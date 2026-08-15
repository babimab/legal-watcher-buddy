import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Download, Plus, Search } from "lucide-react";
import ExcelJS from "exceljs";

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
  FASE_OPCOES,
  CATEGORIAS_CLIENTE,
  categoriaCliente,
  ehResponsavelDaSigla,
  useSiglaAtual,
  OUTROS_ADVOGADOS_CONHECIDOS,
  SOCIOS_CONHECIDOS,
  exibir,
  type Processo,
} from "@/lib/processos";
import { listarGrupos, listarPastas } from "@/lib/grupos";
import {
  estilizarCabecalho,
  centralizarLinhas,
  finalizarPlanilha,
  baixarPlanilha,
} from "@/lib/excel";

async function exportarProcessosExcel(processos: Processo[]) {
  const workbook = new ExcelJS.Workbook();
  const planilha = workbook.addWorksheet("Processos");

  planilha.columns = [
    { header: "Número CNJ", key: "numero_cnj", width: 22 },
    { header: "Cliente", key: "cliente", width: 26 },
    { header: "Nº do cliente", key: "numero_cliente", width: 14 },
    { header: "Comarca", key: "comarca", width: 22 },
    { header: "UF", key: "uf", width: 10 },
    { header: "Responsável", key: "responsavel", width: 14 },
    { header: "Sócio", key: "socio", width: 10 },
    { header: "Fase", key: "fase", width: 16 },
    { header: "Status", key: "status", width: 14 },
  ];

  for (const p of processos) {
    planilha.addRow({
      numero_cnj: formatarCNJ(p.numero_cnj),
      cliente: exibir(p.cliente) ?? "",
      numero_cliente: p.numero_cliente ?? "",
      comarca: p.comarca ?? "",
      uf: p.uf ?? "",
      responsavel: p.responsavel ?? "",
      socio: p.socio ?? "",
      fase: p.fase ?? "",
      status: p.status,
    });
  }

  estilizarCabecalho(planilha);
  centralizarLinhas(planilha, new Set());
  finalizarPlanilha(planilha);

  await baixarPlanilha(workbook, "processos");
}

type ProcessosSearch = {
  grupo?: string;
  pasta?: string;
  advogado?: string;
  socio?: string;
  fase?: string;
  cliente?: string;
};

export const Route = createFileRoute("/_authenticated/processos/")({
  validateSearch: (search: Record<string, unknown>): ProcessosSearch => ({
    ...(typeof search["grupo"] === "string" ? { grupo: search["grupo"] } : {}),
    ...(typeof search["pasta"] === "string" ? { pasta: search["pasta"] } : {}),
    ...(typeof search["advogado"] === "string" ? { advogado: search["advogado"] } : {}),
    ...(typeof search["socio"] === "string" ? { socio: search["socio"] } : {}),
    ...(typeof search["fase"] === "string" ? { fase: search["fase"] } : {}),
    ...(typeof search["cliente"] === "string" ? { cliente: search["cliente"] } : {}),
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
  const [fase, setFase] = useState(search.fase ?? "todas");
  const [cliente, setCliente] = useState(search.cliente ?? "todos");
  const [carteira, setCarteira] = useState("todas");
  const [uf, setUf] = useState("todas");
  const [sistema, setSistema] = useState("todos");
  const [grupoId, setGrupoId] = useState(search.grupo ?? "todos");
  const [pastaId, setPastaId] = useState(search.pasta ?? "todas");
  const [advogado, setAdvogado] = useState(search.advogado ?? "todos");
  const [socio, setSocio] = useState(search.socio ?? "todos");
  const somenteMeus = search.advogado === "eu";
  const minhaSigla = useSiglaAtual();

  // O componente não remonta ao trocar de "Processos" para "Meus
  // processos" (é a mesma rota, só muda a busca na URL) — sem isso, o
  // filtro guardado no estado local ficava desatualizado.
  useEffect(() => {
    setGrupoId(search.grupo ?? "todos");
    setPastaId(search.pasta ?? "todas");
    setAdvogado(search.advogado ?? "todos");
    setSocio(search.socio ?? "todos");
    setFase(search.fase ?? "todas");
    setCliente(search.cliente ?? "todos");
  }, [search.grupo, search.pasta, search.advogado, search.socio, search.fase, search.cliente]);

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
      temMeus: !!minhaSigla,
      outros: valores.filter((v) => !ehResponsavelDaSigla(v, minhaSigla)).sort(),
    };
  }, [data, minhaSigla]);

  const qualidade = useMemo(
    () => ({
      semPasta: (data ?? []).filter((p) => !p.pasta_id).length,
      semSocio: (data ?? []).filter((p) => !p.socio).length,
      semResponsavel: (data ?? []).filter((p) => !p.responsavel).length,
    }),
    [data],
  );

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
      const casaFase = fase === "todas" || (fase === "nenhuma" ? !p.fase : p.fase === fase);
      const casaCliente = cliente === "todos" || categoriaCliente(p.cliente) === cliente;
      const casaCarteira = carteira === "todas" || p.carteira === carteira;
      const casaUf = uf === "todas" || p.uf === uf;
      const casaSistema = sistema === "todos" || p.sistema === sistema;
      const pastaDoProcesso = p.pasta_id ? pastaPorId.get(p.pasta_id) : undefined;
      const casaGrupo = grupoId === "todos" || pastaDoProcesso?.grupo_id === grupoId;
      const casaPasta =
        pastaId === "todas" || (pastaId === "nenhuma" ? !p.pasta_id : p.pasta_id === pastaId);
      const casaAdvogado =
        advogado === "todos" ||
        (advogado === "eu"
          ? ehResponsavelDaSigla(p.responsavel, minhaSigla)
          : advogado === "nenhum"
            ? !p.responsavel
            : p.responsavel === advogado);
      const casaSocio = socio === "todos" || (socio === "nenhum" ? !p.socio : p.socio === socio);
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
        casaFase &&
        casaCliente &&
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
  }, [
    data,
    busca,
    status,
    fase,
    cliente,
    carteira,
    uf,
    sistema,
    grupoId,
    pastaId,
    advogado,
    minhaSigla,
    socio,
    pastaPorId,
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold">
            {somenteMeus ? "Meus processos" : "Processos"}
          </h1>
          <p className="text-muted-foreground">
            {somenteMeus
              ? `${lista.length} processo(s) seus${minhaSigla ? ` (${minhaSigla})` : ""}.`
              : `Carteira compartilhada do escritório — ${data?.length ?? 0} cadastrados.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={lista.length === 0}
            onClick={() => {
              void exportarProcessosExcel(lista).catch(() =>
                toast.error("Não consegui gerar o Excel."),
              );
            }}
          >
            <Download className="size-4" /> Exportar Excel
          </Button>
          <ProcessoDialog
            trigger={
              <Button>
                <Plus className="size-4" /> Novo processo
              </Button>
            }
          />
        </div>
      </div>

      {!somenteMeus &&
      (qualidade.semPasta > 0 || qualidade.semSocio > 0 || qualidade.semResponsavel > 0) ? (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-4 py-4 text-sm">
            <span className="font-medium text-muted-foreground">Qualidade dos dados:</span>
            {qualidade.semPasta > 0 ? (
              <Link
                to="/processos"
                search={{ pasta: "nenhuma" }}
                className="text-primary underline-offset-4 hover:underline"
              >
                {qualidade.semPasta} sem pasta
              </Link>
            ) : null}
            {qualidade.semResponsavel > 0 ? (
              <Link
                to="/processos"
                search={{ advogado: "nenhum" }}
                className="text-primary underline-offset-4 hover:underline"
              >
                {qualidade.semResponsavel} sem responsável
              </Link>
            ) : null}
            {qualidade.semSocio > 0 ? (
              <Link
                to="/processos"
                search={{ socio: "nenhum" }}
                className="text-primary underline-offset-4 hover:underline"
              >
                {qualidade.semSocio} sem sócio
              </Link>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

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
        <Select value={fase} onValueChange={setFase}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as fases</SelectItem>
            <SelectItem value="nenhuma">Sem fase definida</SelectItem>
            {FASE_OPCOES.map((f) => (
              <SelectItem key={f} value={f}>
                {f}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={cliente} onValueChange={setCliente}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os clientes</SelectItem>
            {CATEGORIAS_CLIENTE.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
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
        {!somenteMeus && (advogados.temMeus || advogados.outros.length > 0) ? (
          <Select value={advogado} onValueChange={setAdvogado}>
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os advogados</SelectItem>
              <SelectItem value="nenhum">Sem responsável</SelectItem>
              {advogados.temMeus ? <SelectItem value="eu">{minhaSigla} (meus)</SelectItem> : null}
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
              <SelectItem value="nenhum">Sem sócio definido</SelectItem>
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
                  {exibir(g.nome)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        {(pastas.data ?? []).length > 0 ? (
          <Select value={pastaId} onValueChange={setPastaId}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as pastas</SelectItem>
              <SelectItem value="nenhuma">Sem pasta</SelectItem>
              {pastasDoGrupoSelecionado.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {exibir(p.nome)}
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
                  <Badge variant="outline">{exibir(pastaPorId.get(p.pasta_id)!.nome)}</Badge>
                ) : p.carteira ? (
                  <Badge variant="outline">{p.carteira}</Badge>
                ) : null}
                {p.tipo_desdobramento ? (
                  <Badge variant="secondary">{exibir(p.tipo_desdobramento)}</Badge>
                ) : null}
                {p.socio ? <Badge variant="outline">sócio {p.socio}</Badge> : null}
                {p.fase ? <Badge variant="outline">{p.fase}</Badge> : null}
                {p.numero_interno ? (
                  <span className="text-xs text-muted-foreground">caso {p.numero_interno}</span>
                ) : null}
                {p.monitorar ? <Badge variant="outline">monitorado</Badge> : null}
              </div>
              <p className="mt-1 font-serif text-lg">
                {p.autor ?? exibir(p.cliente)}
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
