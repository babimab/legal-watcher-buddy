import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  digitosCNJ,
  formatarCNJ,
  fundirProcessos,
  listarProcessos,
  type Processo,
} from "@/lib/processos";

export const Route = createFileRoute("/_authenticated/duplicados")({
  head: () => ({
    meta: [
      { title: "Duplicados | Radar Processual" },
      {
        name: "description",
        content: "Encontre processos duplicados pelo número CNJ e funda-os em um só.",
      },
    ],
  }),
  component: DuplicadosPage,
});

type Grupo = { chave: string; motivo: string; itens: Processo[] };

function computarDuplicados(lista: Processo[]): Grupo[] {
  const porDigitos = new Map<string, Processo[]>();
  for (const p of lista) {
    const d = digitosCNJ(p.numero_cnj);
    if (!d) continue;
    const atual = porDigitos.get(d);
    if (atual) atual.push(p);
    else porDigitos.set(d, [p]);
  }

  const grupos = new Map<string, { motivos: Set<string>; itens: Map<string, Processo> }>();

  const addGrupo = (itens: Processo[], motivo: string) => {
    const chave = itens
      .map((p) => p.id)
      .sort()
      .join("|");
    const atual = grupos.get(chave);
    if (atual) {
      atual.motivos.add(motivo);
    } else {
      grupos.set(chave, {
        motivos: new Set([motivo]),
        itens: new Map(itens.map((p) => [p.id, p])),
      });
    }
  };

  for (const itens of porDigitos.values()) {
    if (itens.length > 1) addGrupo(itens, "Mesmo número CNJ");
  }

  for (const p of lista) {
    const d = digitosCNJ(p.numero_antigo ?? "");
    if (!d) continue;
    const outros = (porDigitos.get(d) ?? []).filter((o) => o.id !== p.id);
    if (outros.length > 0) addGrupo([p, ...outros], "Número antigo bate com outro processo");
  }

  return [...grupos.entries()]
    .map(([chave, g]) => ({
      chave,
      motivo: [...g.motivos].join(" · "),
      itens: [...g.itens.values()].sort((a, b) => a.created_at.localeCompare(b.created_at)),
    }))
    .sort((a, b) => a.chave.localeCompare(b.chave));
}

function DuplicadosPage() {
  const { data, isLoading } = useQuery({ queryKey: ["processos"], queryFn: listarProcessos });
  const grupos = useMemo(() => computarDuplicados(data ?? []), [data]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold">Processos duplicados</h1>
        <p className="text-muted-foreground">
          Cruza os processos pelo número CNJ (ignorando formatação) e pelo número antigo. Revise
          cada grupo e confirme a fusão — nada é apagado sem sua confirmação.
        </p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : grupos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhum duplicado encontrado entre os processos que você tem acesso.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {grupos.map((g) => (
            <GrupoDuplicado key={g.chave} grupo={g} />
          ))}
        </div>
      )}
    </div>
  );
}

function GrupoDuplicado({ grupo }: { grupo: Grupo }) {
  const queryClient = useQueryClient();
  const [mantidoId, setMantidoId] = useState(grupo.itens[0]!.id);
  const [fundindo, setFundindo] = useState(false);

  const fundir = useMutation({
    mutationFn: async () => {
      setFundindo(true);
      for (const p of grupo.itens) {
        if (p.id === mantidoId) continue;
        await fundirProcessos(mantidoId, p.id);
      }
    },
    onSuccess: async () => {
      setFundindo(false);
      toast.success("Processos fundidos.");
      await queryClient.invalidateQueries();
    },
    onError: (e: Error) => {
      setFundindo(false);
      toast.error(e.message);
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-serif text-lg">
          <Copy className="size-4" /> {grupo.motivo}
        </CardTitle>
        <CardDescription>
          Escolha qual processo deve permanecer. As movimentações dos outros são movidas para ele
          antes de serem removidos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <RadioGroup value={mantidoId} onValueChange={setMantidoId} className="grid gap-2">
          {grupo.itens.map((p) => (
            <label
              key={p.id}
              htmlFor={`manter-${p.id}`}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 has-[[data-state=checked]]:border-primary"
            >
              <RadioGroupItem value={p.id} id={`manter-${p.id}`} className="mt-1" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm">{formatarCNJ(p.numero_cnj)}</span>
                  <Badge variant={p.status === "ativo" ? "default" : "secondary"}>{p.status}</Badge>
                  {p.numero_antigo ? (
                    <span className="text-xs text-muted-foreground">
                      número antigo: {p.numero_antigo}
                    </span>
                  ) : null}
                </div>
                <p className="text-sm">
                  {p.autor ?? p.cliente}
                  {p.reu ? <span className="text-muted-foreground"> x {p.reu}</span> : null}
                </p>
                <p className="text-xs text-muted-foreground">
                  {[p.comarca, p.uf, p.vara].filter(Boolean).join(" · ")} · cadastrado em{" "}
                  {new Date(p.created_at).toLocaleDateString("pt-BR")}
                </p>
                <Link
                  to="/processos/$id"
                  params={{ id: p.id }}
                  className="text-xs underline-offset-4 hover:underline"
                >
                  Ver processo
                </Link>
              </div>
            </label>
          ))}
        </RadioGroup>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" disabled={fundindo}>
              {fundindo ? "Fundindo..." : `Fundir ${grupo.itens.length} processos em 1`}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Fundir estes processos?</AlertDialogTitle>
              <AlertDialogDescription>
                O processo selecionado será mantido. Os outros {grupo.itens.length - 1} serão
                apagados após terem suas movimentações movidas para o processo mantido. Esta ação
                não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={fundindo}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                disabled={fundindo}
                onClick={(e) => {
                  e.preventDefault();
                  fundir.mutate();
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {fundindo ? "Fundindo..." : "Confirmar fusão"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
