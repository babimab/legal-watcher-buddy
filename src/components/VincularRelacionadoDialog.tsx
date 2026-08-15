import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { listarProcessos, formatarCNJ } from "@/lib/processos";
import { vincularRelacionado } from "@/lib/relacionados";

const LIMITE_RESULTADOS = 15;

export function VincularRelacionadoDialog({
  processoId,
  jaVinculadosIds,
}: {
  processoId: string;
  jaVinculadosIds: string[];
}) {
  const queryClient = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const [observacao, setObservacao] = useState("");

  const processos = useQuery({
    queryKey: ["processos"],
    queryFn: listarProcessos,
    enabled: aberto,
  });

  const resultados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return [];
    return (processos.data ?? [])
      .filter((p) => p.id !== processoId && !jaVinculadosIds.includes(p.id))
      .filter((p) =>
        [p.numero_cnj, p.numero_interno, p.cliente, p.autor, p.reu]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(termo)),
      )
      .slice(0, LIMITE_RESULTADOS);
  }, [processos.data, busca, processoId, jaVinculadosIds]);

  const selecionado = (processos.data ?? []).find((p) => p.id === selecionadoId) ?? null;

  const vincular = useMutation({
    mutationFn: async () => {
      if (!selecionadoId) throw new Error("Escolha um processo.");
      await vincularRelacionado(processoId, selecionadoId, observacao.trim() || null);
    },
    onSuccess: async () => {
      toast.success("Processos vinculados.");
      setAberto(false);
      setBusca("");
      setSelecionadoId(null);
      setObservacao("");
      await queryClient.invalidateQueries({ queryKey: ["relacionados", processoId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog
      open={aberto}
      onOpenChange={(v) => {
        setAberto(v);
        if (!v) {
          setBusca("");
          setSelecionadoId(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Link2 className="size-4" /> Relacionar processo
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif">Relacionar a outro processo</DialogTitle>
          <DialogDescription>
            Busque um processo diferente (mesma causa, clientes diferentes etc.) pra deixar os dois
            linkados, sem virar um desdobramento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="busca-relacionar">Buscar processo</Label>
            <Input
              id="busca-relacionar"
              placeholder="Número, cliente, autor ou réu..."
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value);
                setSelecionadoId(null);
              }}
            />
          </div>

          {busca.trim() ? (
            resultados.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum processo encontrado.</p>
            ) : (
              <ul className="max-h-56 divide-y divide-border overflow-y-auto rounded-md border border-border">
                {resultados.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => setSelecionadoId(p.id)}
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-accent ${
                        selecionadoId === p.id ? "bg-accent" : ""
                      }`}
                    >
                      <span className="font-mono text-xs">{formatarCNJ(p.numero_cnj)}</span>
                      <span className="block text-muted-foreground">
                        {p.autor ?? p.cliente}
                        {p.reu ? ` x ${p.reu}` : ""}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )
          ) : null}

          {selecionado ? (
            <div className="space-y-2 rounded-md border border-border bg-muted/40 p-3">
              <p className="text-sm">
                Relacionar com{" "}
                <span className="font-mono text-xs">{formatarCNJ(selecionado.numero_cnj)}</span>.
              </p>
              <div className="space-y-1">
                <Label htmlFor="observacao-relacionar" className="text-xs text-muted-foreground">
                  Observação (opcional)
                </Label>
                <Input
                  id="observacao-relacionar"
                  placeholder="Ex.: mesma causa, cliente diferente"
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                />
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button onClick={() => vincular.mutate()} disabled={!selecionadoId || vincular.isPending}>
            Relacionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
