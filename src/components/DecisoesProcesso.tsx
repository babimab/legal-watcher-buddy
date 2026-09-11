import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Calculator, Gavel, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  atualizarDecisaoProcesso,
  criarDecisaoProcesso,
  excluirDecisaoProcesso,
  listarDecisoesProcesso,
  type DecisaoProcesso,
} from "@/lib/decisoes";
import { RESULTADOS_PROCESSO } from "@/lib/processos";

// Seção "Decisões" -- espelha os campos que o LegalDesk já usa (Juiz,
// Houve decisão?, Data da decisão, Decisão, Detalhamento) pra um dia
// alimentar o LD de volta sem traduzir nada. De propósito não tem nenhum
// campo de cálculo aqui (valor/índice/juros ficam só descritos em texto
// no Detalhamento) -- o atalho pra calculadora fica fora desta seção, só
// levando o processo já selecionado.
export function DecisoesProcesso({ processoId }: { processoId: string }) {
  const queryClient = useQueryClient();
  const decisoes = useQuery({
    queryKey: ["decisoes-processo", processoId],
    queryFn: () => listarDecisoesProcesso(processoId),
  });

  const excluir = useMutation({
    mutationFn: (id: string) => excluirDecisaoProcesso(id),
    onSuccess: async () => {
      toast.success("Decisão excluída.");
      await queryClient.invalidateQueries({ queryKey: ["decisoes-processo", processoId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const lista = decisoes.data ?? [];

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 font-serif text-lg">
              <Gavel className="size-4" /> Decisões
            </CardTitle>
            <CardDescription>
              Mesmos campos do LegalDesk (Juiz, Houve decisão, Data, Decisão, Detalhamento).
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link to="/calculos" search={{ processo: processoId }}>
                <Calculator className="size-4" /> Ver/criar cálculo deste processo
              </Link>
            </Button>
            <DecisaoDialog
              processoId={processoId}
              trigger={
                <Button size="sm">
                  <Plus className="size-4" /> Nova decisão
                </Button>
              }
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {decisoes.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : lista.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma decisão registrada ainda.</p>
        ) : (
          <ul className="space-y-3">
            {lista.map((d) => (
              <li key={d.id} className="rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {d.data_decisao ? (
                    <span className="font-medium">
                      {new Date(`${d.data_decisao}T12:00:00`).toLocaleDateString("pt-BR")}
                    </span>
                  ) : null}
                  {!d.houve_decisao ? (
                    <Badge variant="outline">Sem decisão nesta verificação</Badge>
                  ) : null}
                  {d.decisao ? <Badge>{d.decisao}</Badge> : null}
                  {d.juiz ? (
                    <span className="text-muted-foreground">Juiz/Relator: {d.juiz}</span>
                  ) : null}
                  <span className="ml-auto flex items-center gap-1">
                    <DecisaoDialog
                      processoId={processoId}
                      decisao={d}
                      trigger={
                        <Button variant="ghost" size="icon" aria-label="Editar decisão">
                          <Pencil className="size-4" />
                        </Button>
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Excluir decisão"
                      onClick={() => {
                        if (window.confirm("Excluir esta decisão?")) excluir.mutate(d.id);
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </span>
                </div>
                {d.detalhamento ? (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                    {d.detalhamento}
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

function DecisaoDialog({
  processoId,
  decisao,
  trigger,
}: {
  processoId: string;
  decisao?: DecisaoProcesso;
  trigger: React.ReactNode;
}) {
  const queryClient = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [houveDecisao, setHouveDecisao] = useState(decisao?.houve_decisao ?? true);
  const [salvando, setSalvando] = useState(false);

  const salvar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const decisaoRaw = String(form.get("decisao") ?? "");
    const input = {
      juiz: String(form.get("juiz") ?? "").trim() || null,
      houveDecisao,
      dataDecisao: houveDecisao ? String(form.get("data_decisao") ?? "").trim() || null : null,
      decisao: houveDecisao && decisaoRaw !== "nenhuma" ? decisaoRaw : null,
      detalhamento: houveDecisao ? String(form.get("detalhamento") ?? "").trim() || null : null,
    };
    setSalvando(true);
    try {
      if (decisao) {
        await atualizarDecisaoProcesso(decisao.id, input);
        toast.success("Decisão atualizada.");
      } else {
        await criarDecisaoProcesso({ processoId, ...input });
        toast.success("Decisão registrada.");
      }
      await queryClient.invalidateQueries({ queryKey: ["decisoes-processo", processoId] });
      setAberto(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não consegui salvar a decisão.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-serif">
            {decisao ? "Editar decisão" : "Nova decisão"}
          </DialogTitle>
          <DialogDescription>
            Mesmos campos do LegalDesk — preenchimento manual, sem cálculo aqui.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={salvar} className="space-y-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="houve_decisao"
              checked={houveDecisao}
              onCheckedChange={(v) => setHouveDecisao(v === true)}
            />
            <Label htmlFor="houve_decisao">Houve decisão?</Label>
          </div>
          <div className="space-y-2">
            <Label htmlFor="juiz">Juiz / Relator</Label>
            <Input id="juiz" name="juiz" defaultValue={decisao?.juiz ?? ""} />
          </div>
          {houveDecisao ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="data_decisao">Data da decisão</Label>
                <Input
                  id="data_decisao"
                  name="data_decisao"
                  type="date"
                  defaultValue={decisao?.data_decisao ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label>Decisão</Label>
                <Select name="decisao" defaultValue={decisao?.decisao ?? "nenhuma"}>
                  <SelectTrigger>
                    <SelectValue placeholder="Decisão" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nenhuma">Não informada</SelectItem>
                    {RESULTADOS_PROCESSO.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="detalhamento">Detalhamento da decisão</Label>
                <Textarea
                  id="detalhamento"
                  name="detalhamento"
                  rows={5}
                  defaultValue={decisao?.detalhamento ?? ""}
                />
              </div>
            </>
          ) : null}
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
