import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Phone, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  criarAcompanhamento,
  excluirAcompanhamento,
  listarAcompanhamentos,
} from "@/lib/acompanhamentos";
import { ESTAGIARIOS_CONHECIDOS } from "@/lib/processos";

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

// Seção "Acompanhamento administrativo" -- registro das ligações
// semanais que as estagiárias precisam fazer nesses processos (não têm
// andamento pelo sistema do tribunal). Só aparece em processos da
// carteira "Administrativos" (ver AdministrativosPainel em relatorio.tsx
// pro painel que junta todos e mostra quem está atrasado).
export function AcompanhamentoAdministrativoProcesso({ processoId }: { processoId: string }) {
  const queryClient = useQueryClient();
  const acompanhamentos = useQuery({
    queryKey: ["acompanhamentos-administrativos", processoId],
    queryFn: () => listarAcompanhamentos(processoId),
  });

  const excluir = useMutation({
    mutationFn: (id: string) => excluirAcompanhamento(id),
    onSuccess: async () => {
      toast.success("Registro excluído.");
      await queryClient.invalidateQueries({
        queryKey: ["acompanhamentos-administrativos", processoId],
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const lista = acompanhamentos.data ?? [];

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 font-serif text-lg">
              <Phone className="size-4" /> Acompanhamento administrativo
            </CardTitle>
            <CardDescription>
              Ligações de checagem semanal -- esse processo não tem andamento pelo sistema do
              tribunal.
            </CardDescription>
          </div>
          <NovoAcompanhamentoDialog
            processoId={processoId}
            trigger={
              <Button size="sm">
                <Plus className="size-4" /> Registrar ligação
              </Button>
            }
          />
        </div>
      </CardHeader>
      <CardContent>
        {acompanhamentos.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : lista.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma ligação registrada ainda.</p>
        ) : (
          <ul className="space-y-3">
            {lista.map((a) => (
              <li key={a.id} className="rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium">
                    {new Date(`${a.data_ligacao}T12:00:00`).toLocaleDateString("pt-BR")}
                  </span>
                  {a.estagiario ? <Badge variant="outline">{a.estagiario}</Badge> : null}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-auto"
                    aria-label="Excluir registro"
                    onClick={() => {
                      if (window.confirm("Excluir este registro de ligação?")) excluir.mutate(a.id);
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                {a.o_que_fez ? <p className="mt-2 text-sm">{a.o_que_fez}</p> : null}
                {a.proximo_passo ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Próximo passo: {a.proximo_passo}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function NovoAcompanhamentoDialog({
  processoId,
  trigger,
}: {
  processoId: string;
  trigger: React.ReactNode;
}) {
  const queryClient = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const salvar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setSalvando(true);
    try {
      await criarAcompanhamento({
        processoId,
        dataLigacao: String(form.get("data_ligacao") ?? "").trim() || hoje(),
        estagiario: String(form.get("estagiario") ?? "").trim() || null,
        oQueFez: String(form.get("o_que_fez") ?? "").trim() || null,
        proximoPasso: String(form.get("proximo_passo") ?? "").trim() || null,
      });
      toast.success("Ligação registrada.");
      await queryClient.invalidateQueries({
        queryKey: ["acompanhamentos-administrativos", processoId],
      });
      await queryClient.invalidateQueries({ queryKey: ["painel-administrativos"] });
      setAberto(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não consegui salvar.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-serif">Registrar ligação</DialogTitle>
          <DialogDescription>Checagem semanal deste processo administrativo.</DialogDescription>
        </DialogHeader>
        <form onSubmit={salvar} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="data_ligacao">Data da ligação</Label>
              <Input id="data_ligacao" name="data_ligacao" type="date" defaultValue={hoje()} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="estagiario">Quem ligou</Label>
              <Input id="estagiario" name="estagiario" list="estagiarios-acompanhamento" />
              <datalist id="estagiarios-acompanhamento">
                {ESTAGIARIOS_CONHECIDOS.map((e) => (
                  <option key={e} value={e} />
                ))}
              </datalist>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="o_que_fez">O que fez / descobriu</Label>
            <Textarea id="o_que_fez" name="o_que_fez" rows={3} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="proximo_passo">Próximo passo (se tiver)</Label>
            <Input id="proximo_passo" name="proximo_passo" />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
