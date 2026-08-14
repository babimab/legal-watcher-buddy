import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CalendarClock, ExternalLink, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ProcessoDialog } from "@/components/ProcessoDialog";
import { MovimentacaoDialog } from "@/components/MovimentacaoDialog";
import { supabase } from "@/integrations/supabase/client";
import { buscarProcesso, listarMovimentacoes, formatarCNJ } from "@/lib/processos";
import { linkTribunal } from "@/lib/tribunais";
import { AcessosProcesso } from "@/components/AcessosProcesso";
import { ExcluirProcessoDialog } from "@/components/ExcluirProcessoDialog";

export const Route = createFileRoute("/_authenticated/processos/$id")({
  head: () => ({
    meta: [
      { title: "Detalhe do processo | Radar Processual" },
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

function ProcessoDetalhe() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();

  const processo = useQuery({ queryKey: ["processo", id], queryFn: () => buscarProcesso(id) });
  const movs = useQuery({
    queryKey: ["movimentacoes", id],
    queryFn: () => listarMovimentacoes(id),
  });

  const alternarConcluida = async (movId: string, concluida: boolean) => {
    const { error } = await supabase
      .from("movimentacoes")
      .update({ concluida })
      .eq("id", movId);
    if (error) {
      toast.error(error.message);
      return;
    }
    await queryClient.invalidateQueries();
  };

  if (processo.isLoading) return <p className="text-muted-foreground">Carregando...</p>;
  if (processo.error || !processo.data)
    return <p className="text-muted-foreground">Processo não encontrado.</p>;

  const p = processo.data;
  const link = linkTribunal(p);

  return (
    <div className="space-y-6">
      <Link to="/processos" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <ArrowLeft className="size-4" /> Voltar para a carteira
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-sm text-muted-foreground">{formatarCNJ(p.numero_cnj)}</p>
          <h1 className="font-serif text-3xl font-semibold">{p.cliente}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge>{p.status}</Badge>
            {p.tribunal ? <Badge variant="outline">{p.tribunal}</Badge> : null}
            {p.fase ? <Badge variant="secondary">{p.fase}</Badge> : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <a href={link.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-4" /> {link.rotulo}
            </a>
          </Button>

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
          <ExcluirProcessoDialog
            processoId={p.id}
            numeroCnj={p.numero_cnj}
            cliente={p.cliente}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">Dados do processo</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Dado rotulo="Autor" valor={p.autor} />
          <Dado rotulo="Réu" valor={p.reu} />
          <Dado rotulo="Carteira" valor={p.carteira} />
          <Dado rotulo="Nº do caso" valor={p.numero_interno} />
          <Dado rotulo="Número antigo" valor={p.numero_antigo} />
          <Dado rotulo="Sistema" valor={p.sistema} />
          <Dado rotulo="Vara" valor={p.vara} />
          <Dado rotulo="Comarca" valor={[p.comarca, p.uf].filter(Boolean).join(" / ") || null} />
          <Dado rotulo="Classe / Assunto" valor={p.classe} />
          <Dado rotulo="Responsável" valor={p.responsavel} />

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



      <div>
        <h2 className="mb-3 font-serif text-xl font-semibold">Movimentações</h2>
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
              <li key={m.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium">
                    {new Date(`${m.data_movimentacao}T12:00:00`).toLocaleDateString("pt-BR")}
                  </span>
                  {m.tipo ? <Badge variant="outline">{m.tipo}</Badge> : null}
                  {m.exige_acao ? (
                    <Badge variant={m.concluida ? "secondary" : "destructive"}>
                      <CalendarClock className="size-3" />
                      {m.prazo
                        ? `Prazo ${new Date(`${m.prazo}T12:00:00`).toLocaleDateString("pt-BR")}`
                        : "Exige providência"}
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm">{m.descricao}</p>
                {m.observacao ? (
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                    Obs.: {m.observacao}
                  </p>
                ) : null}

                {m.exige_acao ? (
                  <label className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                    <Checkbox
                      checked={m.concluida}
                      onCheckedChange={(v) => alternarConcluida(m.id, v === true)}
                    />
                    Providência concluída
                  </label>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </div>
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
