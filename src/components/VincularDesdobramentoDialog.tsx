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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { listarProcessos, formatarCNJ, TIPOS_DESDOBRAMENTO } from "@/lib/processos";

const LIMITE_RESULTADOS = 15;

export function VincularDesdobramentoDialog({
  paiId,
  paiPossivelmenteFilhoDe,
}: {
  paiId: string;
  paiPossivelmenteFilhoDe?: string | null;
}) {
  const queryClient = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const [tipo, setTipo] = useState<string>(TIPOS_DESDOBRAMENTO[0]);

  const processos = useQuery({
    queryKey: ["processos"],
    queryFn: listarProcessos,
    enabled: aberto,
  });

  const resultados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return [];
    return (processos.data ?? [])
      .filter((p) => p.id !== paiId && p.id !== paiPossivelmenteFilhoDe)
      .filter((p) =>
        [p.numero_cnj, p.numero_interno, p.cliente, p.autor, p.reu]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(termo)),
      )
      .slice(0, LIMITE_RESULTADOS);
  }, [processos.data, busca, paiId, paiPossivelmenteFilhoDe]);

  const selecionado = (processos.data ?? []).find((p) => p.id === selecionadoId) ?? null;

  const vincular = useMutation({
    mutationFn: async () => {
      if (!selecionadoId) throw new Error("Escolha um processo.");
      const { error } = await supabase
        .from("processos")
        .update({ processo_pai_id: paiId, tipo_desdobramento: tipo })
        .eq("id", selecionadoId);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Processo vinculado como desdobramento.");
      setAberto(false);
      setBusca("");
      setSelecionadoId(null);
      setTipo(TIPOS_DESDOBRAMENTO[0]);
      await queryClient.invalidateQueries();
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
          <Link2 className="size-4" /> Vincular existente
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif">Vincular processo já existente</DialogTitle>
          <DialogDescription>
            Busque um processo já cadastrado e marque-o como recurso, cumprimento de sentença ou
            outro desdobramento deste processo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="busca-vincular">Buscar processo</Label>
            <Input
              id="busca-vincular"
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
                Vincular{" "}
                <span className="font-mono text-xs">{formatarCNJ(selecionado.numero_cnj)}</span>{" "}
                como desdobramento deste processo.
                {selecionado.processo_pai_id ? (
                  <span className="block text-xs text-destructive">
                    Atenção: esse processo já é desdobramento de outro — o vínculo anterior será
                    substituído.
                  </span>
                ) : null}
              </p>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Tipo de desdobramento</Label>
                <Select value={tipo} onValueChange={setTipo}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_DESDOBRAMENTO.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button onClick={() => vincular.mutate()} disabled={!selecionadoId || vincular.isPending}>
            Vincular
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
