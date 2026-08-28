import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ProcessoDialog } from "@/components/ProcessoDialog";
import { MovimentacaoDialog } from "@/components/MovimentacaoDialog";
import { supabase } from "@/integrations/supabase/client";
import { supabaseSolto } from "@/lib/supabase-solto";
import {
  buscarProcesso,
  listarDesdobramentos,
  listarMovimentacoes,
  formatarCNJ,
  exibir,
  movimentacaoRelevante,
  normalizarNome,
  variantCriticidade,
  siglaOuEmailAtual,
  usePodeExcluirProcesso,
} from "@/lib/processos";
import { linkTribunal } from "@/lib/tribunais";
import { consultarProcessoJudit, type ResultadoConsultaJudit } from "@/lib/judit";
import { AcessosProcesso } from "@/components/AcessosProcesso";
import { DocumentosProcesso } from "@/components/DocumentosProcesso";
import { ComunicacoesDecisao } from "@/components/ComunicacoesDecisao";
import { RelacionadosProcesso } from "@/components/RelacionadosProcesso";
import { HistoricoProcesso } from "@/components/HistoricoProcesso";
import { ExcluirProcessoDialog } from "@/components/ExcluirProcessoDialog";
import { VincularDesdobramentoDialog } from "@/components/VincularDesdobramentoDialog";
import { EditarLinkTribunalDialog } from "@/components/EditarLinkTribunalDialog";

export const Route = createFileRoute("/_authenticated/processos/$id")({
  head: () => ({
    meta: [
      { title: "Detalhe do processo | FaroLex" },
      {
        name: "description",
        content: "Dados do processo e histórico de movimentações registradas pela equipe.",
      },
      { property: "og:title", content: "Detalhe do processo" },
      {
        property: "og:description",
        content: "Dados do processo e histórico de movimentações registradas pela equipe.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProcessoDetalhe,
});

function ehNossoCliente(nome: string | null | undefined): boolean {
  const normalizado = normalizarNome(nome ?? "");
  return (
    normalizado.includes("souza cruz") ||
    normalizado.includes("astromaritima") ||
    normalizado.includes("astro navegacao") ||
    normalizado.includes("merck")
  );
}

function formatarNomeParte(nome: string): string {
  const conectores = new Set(["da", "de", "do", "das", "dos", "e"]);
  return nome
    .trim()
    .toLocaleLowerCase("pt-BR")
    .split(/\s+/)
    .map((palavra, indice) => {
      if (indice > 0 && conectores.has(palavra)) return palavra;
      return palavra.replace(/(^|[-'’])\p{L}/gu, (trecho) => trecho.toLocaleUpperCase("pt-BR"));
    })
    .join(" ");
}

function ProcessoDetalhe() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const router = useRouter();

  const processo = useQuery({ queryKey: ["processo", id], queryFn: () => buscarProcesso(id) });
  const souPodeExcluir = usePodeExcluirProcesso(processo.data?.responsavel ?? null);
  const [consultandoJudit, setConsultandoJudit] = useState(false);
  const [resultadoJudit, setResultadoJudit] = useState<ResultadoConsultaJudit | null>(null);
  const movs = useQuery({
    queryKey: ["movimentacoes", id],
    queryFn: () => listarMovimentacoes(id),
  });
  const desdobramentos = useQuery({
    queryKey: ["desdobramentos", id],
    queryFn: () => listarDesdobramentos(id),
  });
  const processoPai = useQuery({
    queryKey: ["processo", processo.data?.processo_pai_id],
    queryFn: () => buscarProcesso(processo.data!.processo_pai_id!),
    enabled: !!processo.data?.processo_pai_id,
  });

  const alternarConcluida = async (movId: string, concluida: boolean) => {
    const { error } = await supabase.from("movimentacoes").update({ concluida }).eq("id", movId);
    if (error) {
      toast.error(error.message);
      return;
    }
    await queryClient.invalidateQueries();
  };

  const validarMovimentacao = async (movId: string) => {
    const quem = await siglaOuEmailAtual();
    const { error } = await supabaseSolto
      .from("movimentacoes")
      .update({ validado: true, validado_por: quem, validado_em: new Date().toISOString() })
      .eq("id", movId);
    if (error) {
      toast.error(error.message);
      return;
    }
    await queryClient.invalidateQueries();
  };

  const excluirMovimentacao = async (movId: string) => {
    if (!window.confirm("Excluir esta movimentação? Essa ação não poderá ser desfeita.")) return;
    const { error } = await supabaseSolto.from("movimentacoes").delete().eq("id", movId);
    if (error) {
      toast.error(error.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["movimentacoes", id] });
  };

  const [validandoTodos, setValidandoTodos] = useState(false);
  const [excluindoTodos, setExcluindoTodos] = useState(false);

  const validarTodasPendentes = async () => {
    setValidandoTodos(true);
    try {
      const quem = await siglaOuEmailAtual();
      const { error } = await supabaseSolto
        .from("movimentacoes")
        .update({ validado: true, validado_por: quem, validado_em: new Date().toISOString() })
        .eq("processo_id", id)
        .eq("validado", false);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Movimentações sugeridas marcadas como validadas.");
      await queryClient.invalidateQueries({ queryKey: ["movimentacoes", id] });
    } finally {
      setValidandoTodos(false);
    }
  };

  const excluirTodasPendentes = async () => {
    if (
      !window.confirm(
        "Excluir todas as movimentações sugeridas (ainda não validadas) deste processo? Essa ação não poderá ser desfeita.",
      )
    )
      return;
    setExcluindoTodos(true);
    try {
      const { error } = await supabaseSolto
        .from("movimentacoes")
        .delete()
        .eq("processo_id", id)
        .eq("validado", false);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Movimentações sugeridas excluídas.");
      await queryClient.invalidateQueries({ queryKey: ["movimentacoes", id] });
    } finally {
      setExcluindoTodos(false);
    }
  };

  if (processo.isLoading) return <p className="text-muted-foreground">Carregando...</p>;
  if (processo.error || !processo.data)
    return <p className="text-muted-foreground">Processo não encontrado.</p>;

  const p = processo.data;
  const autorEhCliente = ehNossoCliente(p.autor);
  const reuEhCliente = ehNossoCliente(p.reu);
  const clienteReconhecido = ehNossoCliente(p.cliente);
  const nomePrincipal =
    (autorEhCliente && p.reu ? p.reu : null) ||
    (reuEhCliente && p.autor ? p.autor : null) ||
    (clienteReconhecido && p.autor && !ehNossoCliente(p.autor) ? p.autor : null) ||
    (clienteReconhecido && p.reu && !ehNossoCliente(p.reu) ? p.reu : null) ||
    p.parte_contraria ||
    p.autor ||
    p.reu ||
    p.cliente;
  const linkAuto = linkTribunal(p);
  const link = p.link_tribunal_manual
    ? { url: p.link_tribunal_manual, rotulo: "Abrir processo (link manual)" }
    : linkAuto;

  const testarJudit = async () => {
    setConsultandoJudit(true);
    setResultadoJudit(null);
    try {
      const resultado = await consultarProcessoJudit(p.id);
      setResultadoJudit(resultado);
      if ((resultado.inseridas ?? 0) > 0) {
        toast.success(`${resultado.inseridas} andamento(s) novo(s) importado(s) da Judit.`);
        await queryClient.invalidateQueries({ queryKey: ["movimentacoes", id] });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não consegui consultar a Judit.");
    } finally {
      setConsultandoJudit(false);
    }
  };

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => router.history.back()}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Voltar
      </button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-sm text-muted-foreground">{formatarCNJ(p.numero_cnj)}</p>
          <h1 className="font-serif text-2xl font-semibold">
            {formatarNomeParte(exibir(nomePrincipal) ?? nomePrincipal)}
          </h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge>{p.status}</Badge>
            {p.tribunal ? <Badge variant="outline">{p.tribunal}</Badge> : null}
            {p.fase ? <Badge variant="secondary">{p.fase}</Badge> : null}
            {p.criticidade ? (
              <Badge variant={variantCriticidade(p.criticidade)}>Criticidade {p.criticidade}</Badge>
            ) : null}
            {p.tipo_desdobramento ? (
              <Badge variant="secondary">{exibir(p.tipo_desdobramento)}</Badge>
            ) : null}
          </div>
          {p.processo_pai_id && processoPai.data ? (
            <Link
              to="/processos/$id"
              params={{ id: p.processo_pai_id }}
              className="mt-2 inline-block text-sm text-muted-foreground underline-offset-4 hover:underline"
            >
              Desdobramento do processo {formatarCNJ(processoPai.data.numero_cnj)}
            </Link>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <a href={link.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-4" /> {link.rotulo}
            </a>
          </Button>
          <EditarLinkTribunalDialog processoId={p.id} linkAtual={p.link_tribunal_manual} />

          <ProcessoDialog
            processo={p}
            trigger={
              <Button variant="outline">
                <Pencil className="size-4" /> Editar
              </Button>
            }
          />
          <MovimentacaoDialog
            processoId={p.id}
            trigger={
              <Button>
                <Plus className="size-4" /> Movimentação
              </Button>
            }
          />
          <Button
            variant="outline"
            disabled={consultandoJudit}
            onClick={() => void testarJudit()}
            title="Consulta a Judit e importa andamentos novos como pendentes de revisão"
          >
            <Search className="size-4" /> {consultandoJudit ? "Consultando..." : "Judit"}
          </Button>
          {souPodeExcluir ? (
            <ExcluirProcessoDialog processoId={p.id} numeroCnj={p.numero_cnj} cliente={p.cliente} />
          ) : null}
        </div>
      </div>

      {resultadoJudit ? (
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-lg">Resultado da Judit</CardTitle>
          </CardHeader>
          <CardContent>
            {resultadoJudit.aviso ? (
              <p className="mb-3 text-sm text-muted-foreground">{resultadoJudit.aviso}</p>
            ) : null}
            {resultadoJudit.status === "completed" && !resultadoJudit.aviso ? (
              <p className="mb-3 text-sm text-muted-foreground">
                {resultadoJudit.processados} andamento(s) processado(s) —{" "}
                <strong>{resultadoJudit.inseridas} novo(s)</strong> gravado(s) nas movimentações,{" "}
                {resultadoJudit.duplicadas} já existente(s).
              </p>
            ) : null}
            {resultadoJudit.resumoIa ? (
              <div className="mb-3 rounded-md border border-border bg-secondary/40 p-3">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Resumo da Judit
                </p>
                <p className="whitespace-pre-wrap text-sm">{resultadoJudit.resumoIa}</p>
              </div>
            ) : null}
            <pre className="max-h-96 overflow-auto rounded-md bg-muted p-3 text-xs">
              {JSON.stringify(resultadoJudit, null, 2)}
            </pre>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">Dados do processo</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Dado rotulo="Autor" valor={p.autor} />
          <Dado rotulo="Réu" valor={p.reu} />
          <Dado rotulo="Número do cliente" valor={p.numero_cliente} />
          <Dado rotulo="Carteira" valor={p.carteira} />
          <Dado rotulo="Nº do caso" valor={p.numero_interno} />
          <Dado rotulo="Número antigo" valor={p.numero_antigo} />
          <Dado rotulo="Sistema" valor={p.sistema} />
          <Dado rotulo="Vara" valor={p.vara} />
          <Dado rotulo="Comarca" valor={[p.comarca, p.uf].filter(Boolean).join(" / ") || null} />
          <Dado rotulo="Classe / Assunto" valor={p.classe} />
          <Dado rotulo="Responsável" valor={p.responsavel} />
          <Dado rotulo="Sócio" valor={p.socio} />
          <Dado rotulo="Coordenador" valor={p.coordenador} />

          <Dado
            rotulo="Valor da causa"
            valor={
              p.valor_causa != null
                ? p.valor_causa.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                : null
            }
          />
          <Dado
            rotulo="Última verificação"
            valor={
              p.ultima_verificacao_em
                ? new Date(p.ultima_verificacao_em).toLocaleString("pt-BR")
                : null
            }
          />
          <Dado rotulo="Fonte dos dados" valor={p.fonte} />
          <div className="sm:col-span-3">
            <Dado rotulo="Observações" valor={p.observacoes} />
          </div>
        </CardContent>
      </Card>

      <AcessosProcesso processoId={p.id} />

      <DocumentosProcesso processoId={p.id} />

      <ComunicacoesDecisao processoId={p.id} />

      <RelacionadosProcesso processoId={p.id} />

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-serif text-xl font-semibold">Desdobramentos</h2>
          <div className="flex flex-wrap gap-2">
            <VincularDesdobramentoDialog paiId={p.id} paiPossivelmenteFilhoDe={p.processo_pai_id} />
            <ProcessoDialog
              paiId={p.id}
              iniciais={{
                cliente: p.cliente,
                parte_contraria: p.parte_contraria,
                tribunal: p.tribunal,
                vara: p.vara,
                comarca: p.comarca,
                uf: p.uf,
                responsavel: p.responsavel,
                pasta_id: p.pasta_id,
              }}
              trigger={
                <Button variant="outline" size="sm">
                  <Plus className="size-4" /> Novo desdobramento
                </Button>
              }
            />
          </div>
        </div>
        {desdobramentos.isLoading ? (
          <p className="text-muted-foreground">Carregando...</p>
        ) : (desdobramentos.data ?? []).length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Nenhum recurso, cumprimento de sentença ou outro desdobramento vinculado.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {(desdobramentos.data ?? []).map((d) => (
              <Link
                key={d.id}
                to="/processos/$id"
                params={{ id: d.id }}
                className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm">{formatarCNJ(d.numero_cnj)}</span>
                  <Badge variant={d.status === "ativo" ? "default" : "secondary"}>{d.status}</Badge>
                  {d.tipo_desdobramento ? (
                    <Badge variant="outline">{exibir(d.tipo_desdobramento)}</Badge>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-serif text-xl font-semibold">Movimentações</h2>
          {(movs.data ?? []).some((m) => !m.validado) ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={validandoTodos || excluindoTodos}
                onClick={() => void validarTodasPendentes()}
              >
                <CheckCircle2 className="size-3.5" />
                {validandoTodos ? "Validando..." : "Marcar todas como validadas"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="text-destructive hover:text-destructive"
                disabled={validandoTodos || excluindoTodos}
                onClick={() => void excluirTodasPendentes()}
              >
                <Trash2 className="size-3.5" />
                {excluindoTodos ? "Excluindo..." : "Excluir todas as sugeridas"}
              </Button>
            </div>
          ) : null}
        </div>
        {movs.isLoading ? (
          <p className="text-muted-foreground">Carregando...</p>
        ) : (movs.data ?? []).length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Nenhuma movimentação registrada ainda.
            </CardContent>
          </Card>
        ) : (
          <ol className="space-y-3">
            {(movs.data ?? []).map((m) => (
              <li
                key={m.id}
                className={`rounded-lg border p-4 ${m.validado ? "border-border bg-card" : "border-amber-500/50 bg-amber-50/50"}`}
              >
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium">
                    {new Date(`${m.data_movimentacao}T12:00:00`).toLocaleDateString("pt-BR")}
                  </span>
                  {m.tipo ? <Badge variant="outline">{m.tipo}</Badge> : null}
                  {!m.validado ? <Badge variant="secondary">Sugerido — não validado</Badge> : null}
                  {movimentacaoRelevante(m.descricao) ? (
                    <Badge className="gap-1">
                      <Star className="size-3" /> Importante
                    </Badge>
                  ) : null}
                  {m.exige_acao ? (
                    <Badge variant={m.concluida ? "secondary" : "destructive"}>
                      <CalendarClock className="size-3" />
                      {m.prazo
                        ? `Prazo ${new Date(`${m.prazo}T12:00:00`).toLocaleDateString("pt-BR")}`
                        : "Exige providência"}
                    </Badge>
                  ) : null}
                  <MovimentacaoDialog
                    processoId={p.id}
                    movimentacao={m}
                    trigger={
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Editar movimentação"
                        className="ml-auto size-7"
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                    }
                  />
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm">{m.descricao}</p>
                {m.observacao ? (
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                    Obs.: {m.observacao}
                  </p>
                ) : null}

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  {m.exige_acao ? (
                    <label className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Checkbox
                        checked={m.concluida}
                        onCheckedChange={(v) => alternarConcluida(m.id, v === true)}
                      />
                      Providência concluída
                    </label>
                  ) : (
                    <span />
                  )}
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => void excluirMovimentacao(m.id)}
                    >
                      <Trash2 className="size-3.5" /> Excluir
                    </Button>
                    {!m.validado ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => validarMovimentacao(m.id)}
                      >
                        <CheckCircle2 className="size-3.5" /> Marcar como validado
                      </Button>
                    ) : m.validado_por ? (
                      <p className="text-xs text-muted-foreground">
                        Validado por {m.validado_por}
                        {m.validado_em
                          ? ` em ${new Date(m.validado_em).toLocaleDateString("pt-BR")}`
                          : ""}
                      </p>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      <HistoricoProcesso processoId={p.id} />
    </div>
  );
}

function Dado({ rotulo, valor }: { rotulo: string; valor: string | null }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{rotulo}</p>
      <p className="text-sm">{valor || "—"}</p>
    </div>
  );
}
