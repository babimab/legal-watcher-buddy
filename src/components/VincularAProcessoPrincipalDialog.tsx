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
import { listarProcessos, formatarCNJ, TIPOS_DESDOBRAMENTO, exibir } from "@/lib/processos";

const LIMITE_RESULTADOS = 15;

// Caminho inverso do VincularDesdobramentoDialog: lá você está no
// processo-pai e busca o filho; aqui você está no processo que
// descobriu que É o desdobramento (inclusive direto no card da
// lista) e busca o principal. Útil pra arrumar desdobramento antigo
// que ficou solto como processo independente.
export function VincularAProcessoPrincipalDialog({
  filhoId,
  filhoJaTemPai,
  tamanho = "sm",
}: {
  filhoId: string;
  filhoJaTemPai?: string | null;
  tamanho?: "sm" | "icon";
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
    return (
      (processos.data ?? [])
        .filter((p) => p.id !== filhoId)
        // Não deixa escolher como "principal" um processo que já é
        // desdobramento de outro -- mantém só um nível de vínculo, que é
        // o que o resto do sistema espera (encerramento em cascata,
        // número de caso herdado).
        .filter((p) => !p.processo_pai_id)
        .filter((p) =>
          [p.numero_cnj, p.numero_interno, p.cliente, p.autor, p.reu]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(termo)),
        )
        .slice(0, LIMITE_RESULTADOS)
    );
  }, [processos.data, busca, filhoId]);

  const selecionado = (processos.data ?? []).find((p) => p.id === selecionadoId) ?? null;

  const vincular = useMutation({
    mutationFn: async () => {
      if (!selecionadoId) throw new Error("Escolha o processo principal.");
      const { error } = await supabase
        .from("processos")
        .update({ processo_pai_id: selecionadoId, tipo_desdobramento: tipo })
        .eq("id", filhoId);
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
      {tamanho === "icon" ? (
        // Sem DialogTrigger aqui de propósito: o botão fica dentro do Link
        // que envolve o card inteiro (ver ProcessoCard), e preventDefault
        // faria o Radix pular a abertura (ele só chama o próprio handler se
        // o evento não tiver sido "defaultPrevented"). Abrindo via
        // setAberto direto, controla os dois ao mesmo tempo sem conflito.
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Vincular a um processo principal"
          title="Vincular a um processo principal"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setAberto(true);
          }}
        >
          <Link2 className="size-4" />
        </Button>
      ) : (
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            <Link2 className="size-4" /> Vincular a um processo
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif">Vincular a um processo principal</DialogTitle>
          <DialogDescription>
            Busque o processo principal e marque este aqui como recurso, cumprimento de sentença ou
            outro desdobramento dele.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor={`busca-vincular-pai-${filhoId}`}>Buscar processo principal</Label>
            <Input
              id={`busca-vincular-pai-${filhoId}`}
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
              <p className="text-sm text-muted-foreground">
                Nenhum processo encontrado (processos que já são desdobramento de outro não aparecem
                aqui).
              </p>
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
                Vincular este processo como desdobramento de{" "}
                <span className="font-mono text-xs">{formatarCNJ(selecionado.numero_cnj)}</span>.
                {filhoJaTemPai ? (
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
                        {exibir(t)}
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
