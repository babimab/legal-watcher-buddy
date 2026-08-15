import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { type Processo } from "@/lib/processos";

export function EncerramentoDialog({ processo }: { processo: Processo }) {
  const [aberto, setAberto] = useState(false);
  const [pronto, setPronto] = useState(processo.pronto_para_encerrar);
  const [salvando, setSalvando] = useState(false);
  const queryClient = useQueryClient();

  const salvar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const valorRaw = String(form.get("valor_encerramento") ?? "")
      .replace(/\./g, "")
      .replace(",", ".");
    setSalvando(true);
    const { error } = await supabase
      .from("processos")
      .update({
        pronto_para_encerrar: pronto,
        valor_encerramento: valorRaw ? Number(valorRaw) : null,
        observacao_encerramento: String(form.get("observacao_encerramento") ?? "").trim() || null,
      })
      .eq("id", processo.id);
    setSalvando(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Dados de encerramento salvos.");
    await queryClient.invalidateQueries();
    setAberto(false);
  };

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant={processo.pronto_para_encerrar ? "default" : "outline"}
          size="sm"
        >
          {processo.pronto_para_encerrar ? "Pronto pra encerrar" : "Encerramento"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-serif">Dados de encerramento</DialogTitle>
          <DialogDescription>
            Preenche o que a Eliane precisa pra dar baixa nesse processo.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={salvar} className="space-y-4">
          <div className="flex items-center gap-2">
            <Checkbox id="pronto" checked={pronto} onCheckedChange={(v) => setPronto(v === true)} />
            <Label htmlFor="pronto">Pronto para encerrar</Label>
          </div>
          <div className="space-y-2">
            <Label htmlFor="valor_encerramento">Valor</Label>
            <Input
              id="valor_encerramento"
              name="valor_encerramento"
              placeholder="0,00"
              defaultValue={
                processo.valor_encerramento != null
                  ? processo.valor_encerramento.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                    })
                  : ""
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="observacao_encerramento">Observação</Label>
            <Textarea
              id="observacao_encerramento"
              name="observacao_encerramento"
              rows={3}
              defaultValue={processo.observacao_encerramento ?? ""}
            />
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
