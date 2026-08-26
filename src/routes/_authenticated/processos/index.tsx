import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { toast } from "sonner";
import { Download, Plus, Search, X } from "lucide-react";

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
  ordenarProcessos,
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
  variantCriticidade,
  atualizarCorProcesso,
  CORES_OPCOES,
  CORES_CLASSES,
  CORES_BORDA_CLASSES,
  CORES_FUNDO_CLASSES,
  type Processo,
} from "@/lib/processos";
import { listarGrupos, listarPastas, type Pasta } from "@/lib/grupos";
import { exportarProcessosExcel, exportarProcessosPorAssuntoExcel } from "@/lib/excel";

// Todos os filtros da listagem vivem na URL — assim, ao abrir um processo
// e voltar pelo histórico do navegador, a lista reaparece exatamente com
// os mesmos filtros (antes, UF/sistema/busca etc. se perdiam no estado
// local do componente).
type ProcessosSearch = {
  grupo?: string;
  pasta?: string;
  advogado?: string;
  socio?: string;
  fase?: string;
  cliente?: string;
  q?: string;
  status?: string;
  desdobramento?: string;
  carteira?: string;
  uf?: string;
  sistema?: string;
};

const CHAVES_FILTRO = [
  "grupo",
  "pasta",
  "advogado",
  "socio",
  "fase",
  "cliente",
  "q",
  "status",
  "desdobramento",
  "carteira",
  "uf",
  "sistema",
] as const;

export const Route = createFileRoute("/_authenticated/processos/")({
  validateSearch: (search: Record<string, unknown>): ProcessosSearch => {
    const limpo: ProcessosSearch = {};
    for (const chave of CHAVES_FILTRO) {
      const valor = search[chave];
      if (typeof valor === "string" && valor !== "") limpo[chave] = valor;
    }
    return limpo;
  },
  head: () => ({
    meta: [
      { title: "Processos | FaroLex" },
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
  const navigate = Route.useNavigate();

  const combinar = (
    anterior: ProcessosSearch,
    patch: Partial<Record<keyof ProcessosSearch, string | undefined>>,
  ): ProcessosSearch => {
    const proximo: ProcessosSearch = { ...anterior };
    for (const [chave, valor] of Object.entries(patch)) {
      if (valor === undefined) delete proximo[chave as keyof ProcessosSearch];
      else proximo[chave as keyof ProcessosSearch] = valor;
    }
    return proximo;
  };

  const definir = (chave: keyof ProcessosSearch, valor: string, padrao: string) => {
    void navigate({
      search: (anterior: ProcessosSearch) =>
        combinar(anterior, { [chave]: valor === padrao ? undefined : valor }),
      replace: true,
    });
  };

  const busca = search.q ?? "";
  const setBusca = (v: string) => definir("q", v, "");
  const status = search.status ?? "ativo";
  const setStatus = (v: string) => definir("status", v, "ativo");
  const desdobramento = search.desdobramento ?? "ocultar";
  const setDesdobramento = (v: string) => definir("desdobramento", v, "ocultar");
  const fase = search.fase ?? "todas";
  const setFase = (v: string) => definir("fase", v, "todas");
  const cliente = search.cliente ?? "todos";
  const setCliente = (v: string) => definir("cliente", v, "todos");
  const carteira = search.carteira ?? "todas";
  const setCarteira = (v: string) => definir("carteira", v, "todas");
  const uf = search.uf ?? "todas";
  const setUf = (v: string) => definir("uf", v, "todas");
  const sistema = search.sistema ?? "todos";
  const setSistema = (v: string) => definir("sistema", v, "todos");
  const grupoId = search.grupo ?? "todos";
  const pastaId = search.pasta ?? "todas";
  const setPastaId = (v: string) => definir("pasta", v, "todas");
  const advogado = search.advogado ?? "todos";
  const setAdvogado = (v: string) => definir("advogado", v, "todos");
  const socio = search.socio ?? "todos";
  const setSocio = (v: string) => definir("socio", v, "todos");
  const somenteMeus = search.advogado === "eu";
  const minhaSigla = useSiglaAtual();

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
    const filtrados = (data ?? []).filter((p) => {
      const casaStatus = status === "todos" || p.status === status;
      const casaDesdobramento = desdobramento === "todos" || !p.processo_pai_id;
      const casaFase = fase === "todas" || (fase === "nenhuma" ? !p.fase : p.fase === fase);
      const casaCliente =
        cliente === "todos" ||
        categoriaCliente(p.cliente, p.numero_cliente, p.carteira) === cliente;
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
      const semEspaco = (v: string | null | undefined) =>
        (v ?? "").replace(/\s+/g, "").toLowerCase();
      const termoSemEspaco = termo.replace(/\s+/g, "");
      const interno = semEspaco(p.numero_interno);
      const numCliente = semEspaco(p.numero_cliente);
      const casaClienteCaso = (() => {
        if (!termoSemEspaco) return false;
        if (termoSemEspaco.includes("/")) {
          const [tc, ti] = termoSemEspaco.split("/");
          if (`${numCliente}/${interno}`.includes(termoSemEspaco)) return true;
          return (!tc || numCliente.includes(tc)) && (!ti || interno.includes(ti));
        }
        return interno.includes(termoSemEspaco) || numCliente.includes(termoSemEspaco);
      })();
      const casaBusca =
        !termo ||
        casaClienteCaso ||
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
        casaDesdobramento &&
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

    // Os filtros continuam literais (ex.: UF=SC traz apenas SC). Depois deles,
    // a ordem é refeita pelo número do caso para manter casos iguais juntos.
    return ordenarProcessos(filtrados);
  }, [
    data,
    busca,
    status,
    desdobramento,
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

  const gruposPorCliente = useMemo(() => {
    if (!somenteMeus || cliente !== "todos") return null;
    const porCategoria = new Map<string, typeof lista>(CATEGORIAS_CLIENTE.map((c) => [c, []]));
    for (const p of lista) {
      porCategoria.get(categoriaCliente(p.cliente, p.numero_cliente, p.carteira))!.push(p);
    }
    return [...porCategoria.entries()];
  }, [somenteMeus, cliente, lista]);

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
          <Button
            variant="outline"
            disabled={lista.length === 0}
            onClick={() => {
              void exportarProcessosPorAssuntoExcel(lista).catch(() =>
                toast.error("Não consegui gerar o Excel."),
              );
            }}
            title="Exporta com uma aba separada por assunto/cliente (Souza Cruz, Merck, PRC, Astro, Outros), em vez de tudo numa aba só"
          >
            <Download className="size-4" /> Exportar por assunto
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
            placeholder="Buscar por CNJ, cliente, parte ou Cliente/Caso (ex. 4608/2482)..."
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
        <Select value={desdobramento} onValueChange={setDesdobramento}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ocultar">Sem desdobramentos vinculados</SelectItem>
            <SelectItem value="todos">Mostrar desdobramentos vinculados</SelectItem>
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
              void navigate({
                search: (anterior: ProcessosSearch) =>
                  combinar(anterior, {
                    grupo: v === "todos" ? undefined : v,
                    pasta: undefined,
                  }),
                replace: true,
              });
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
      ) : gruposPorCliente ? (
        <div className="space-y-4">
          {gruposPorCliente.map(([categoria, itens]) => (
            <details key={categoria} className="group" open={itens.length > 0}>
              <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 font-serif text-lg font-semibold transition-colors hover:border-primary">
                <span className="text-muted-foreground transition-transform group-open:rotate-90">
                  ▸
                </span>
                {categoria}
                <Badge variant="secondary">{itens.length}</Badge>
              </summary>
              <div className="mt-3 space-y-3 pl-2">
                {itens.length === 0 ? (
                  <p className="px-2 text-sm text-muted-foreground">
                    Nenhum processo seu de {categoria} no momento.
                  </p>
                ) : (
                  agruparPorCarteira(itens).map(([carteiraNome, subItens]) => (
                    <details key={carteiraNome} className="group/carteira" open>
                      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm font-medium transition-colors hover:border-primary">
                        <span className="text-muted-foreground transition-transform group-open/carteira:rotate-90">
                          ▸
                        </span>
                        {carteiraNome}
                        <Badge variant="secondary">{subItens.length}</Badge>
                      </summary>
                      <div className="mt-2 grid gap-3 pl-4">
                        {subItens.map((p) => (
                          <ProcessoCard
                            key={p.id}
                            p={p}
                            pastaPorId={pastaPorId}
                            ultimaMovimentacao={ultimasMovimentacoes.data?.get(p.id)}
                          />
                        ))}
                      </div>
                    </details>
                  ))
                )}
              </div>
            </details>
          ))}
        </div>
      ) : (
        <div className="grid gap-3">
          {lista.map((p) => (
            <ProcessoCard
              key={p.id}
              p={p}
              pastaPorId={pastaPorId}
              ultimaMovimentacao={ultimasMovimentacoes.data?.get(p.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function agruparPorCarteira(itens: Processo[]): [string, Processo[]][] {
  const porCarteira = new Map<string, Processo[]>();
  for (const p of itens) {
    const chave = p.carteira ?? "Sem carteira";
    if (!porCarteira.has(chave)) porCarteira.set(chave, []);
    porCarteira.get(chave)!.push(p);
  }
  return [...porCarteira.entries()].sort(([a], [b]) => {
    if (a === "Sem carteira") return 1;
    if (b === "Sem carteira") return -1;
    return a.localeCompare(b, "pt-BR");
  });
}

function ProcessoCard({
  p,
  pastaPorId,
  ultimaMovimentacao,
}: {
  p: Processo;
  pastaPorId: Map<string, Pasta>;
  ultimaMovimentacao: { data_movimentacao: string; descricao: string } | undefined;
}) {
  const queryClient = useQueryClient();
  const mudarCor = useMutation({
    mutationFn: (cor: string | null) => atualizarCorProcesso(p.id, cor),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["processos"] });
    },
    onError: () => toast.error("Não consegui marcar a cor."),
  });

  const corAtual = p.cor as (typeof CORES_OPCOES)[number] | null;

  return (
    <Link
      to="/processos/$id"
      params={{ id: p.id }}
      className={`block rounded-lg border border-border p-4 transition-colors hover:border-primary ${
        corAtual
          ? `border-l-4 ${CORES_BORDA_CLASSES[corAtual]} ${CORES_FUNDO_CLASSES[corAtual]}`
          : "bg-card"
      }`}
    >
      <div className="mb-2 flex items-center gap-1.5">
        {CORES_OPCOES.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`Marcar ${c}`}
            title={c}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              mudarCor.mutate(corAtual === c ? null : c);
            }}
            className={`size-3.5 rounded-full ${CORES_CLASSES[c]} ${
              corAtual === c
                ? "ring-2 ring-offset-1 ring-foreground/60"
                : "opacity-40 hover:opacity-100"
            }`}
          />
        ))}
        {corAtual ? (
          <button
            type="button"
            aria-label="Tirar cor"
            title="Tirar cor"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              mudarCor.mutate(null);
            }}
            className="ml-0.5 text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        ) : null}
      </div>
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
        {p.coordenador ? <Badge variant="outline">coord. {p.coordenador}</Badge> : null}
        {p.fase ? <Badge variant="outline">{p.fase}</Badge> : null}
        {p.criticidade ? (
          <Badge variant={variantCriticidade(p.criticidade)}>{p.criticidade}</Badge>
        ) : null}
        {p.numero_interno || p.numero_cliente ? (
          <span className="text-xs text-muted-foreground">
            {p.numero_cliente && p.numero_interno
              ? `Cliente/Caso: ${p.numero_cliente}/${p.numero_interno}`
              : p.numero_interno
                ? `Caso: ${p.numero_interno}`
                : `Nº cliente: ${p.numero_cliente}`}
          </span>
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
      {ultimaMovimentacao ? (
        <p className="mt-2 line-clamp-1 text-sm">
          <span className="text-muted-foreground">
            {new Date(`${ultimaMovimentacao.data_movimentacao}T12:00:00`).toLocaleDateString(
              "pt-BR",
            )}
            {" — "}
          </span>
          {ultimaMovimentacao.descricao}
        </p>
      ) : null}
    </Link>
  );
}
