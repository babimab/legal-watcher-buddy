import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabaseSolto } from "@/lib/supabase-solto";
import { type Processo } from "@/lib/processos";

const PENDENCIA_COM_OPCOES = ["Juridico interno", "Contadores", "Outro"] as const;

// Registra o motivo de a baixa no sistema do cliente ainda não ter sido
// possível (ex.: falta tarefa das contadoras ou do jurídico interno) --
// mesmas opções já usadas no fluxo de cobrança da Astro, por
// consistência. Não confirma a baixa; só documenta a pendência.
export function PendenciaBaixaDialog({ processo }: { processo: Processo }) {
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const queryClient = useQueryClient();

  const salvar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const pendenciaComRaw = String(form.get("pendencia_com") ?? "");
    setSalvando(true);
    const { error } = await supabaseSolto
      .from("processos")
      .update({
        baixa_cliente_pendencia_com: pendenciaComRaw === "nenhuma" ? null : pendenciaComRaw || null,
        baixa_cliente_pendencia_descricao:
          String(form.get("pendencia_descricao") ?? "").trim() || null,
      })
      .eq("id", processo.id);
    setSalvando(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Pendência registrada.");
    await queryClient.invalidateQueries({ queryKey: ["processos"] });
    setAberto(false);
  };

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          {processo.baixa_cliente_pendencia_com
            ? "Pendência: " + processo.baixa_cliente_pendencia_com
            : "Relatar pendência"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-serif">Pendência da baixa no cliente</DialogTitle>
          <DialogDescription>
            Registra por que ainda não deu pra dar baixa no sistema do cliente — fica visível pra
            quem for continuar.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={salvar} className="space-y-4">
          <div className="space-y-2">
            <Label>Pendência com</Label>
            <Select
              name="pendencia_com"
              defaultValue={processo.baixa_cliente_pendencia_com ?? "nenhuma"}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pendência com" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nenhuma">Nenhuma</SelectItem>
                {PENDENCIA_COM_OPCOES.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pendencia_descricao">Descrição</Label>
            <Textarea
              id="pendencia_descricao"
              name="pendencia_descricao"
              rows={3}
              defaultValue={processo.baixa_cliente_pendencia_descricao ?? ""}
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
