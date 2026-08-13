import { useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { TIPOS_MOVIMENTACAO } from "@/lib/processos";

export function MovimentacaoDialog({
  processoId,
  trigger,
}: {
  processoId: string;
  trigger: ReactNode;
}) {
  const [aberto, setAberto] = useState(false);
  const [exigeAcao, setExigeAcao] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const queryClient = useQueryClient();

  const salvar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setSalvando(true);
    const { data: userData } = await supabase.auth.getUser();
    const prazo = String(form.get("prazo") ?? "");

    const { error } = await supabase.from("movimentacoes").insert({
      processo_id: processoId,
      data_movimentacao: String(form.get("data_movimentacao") ?? ""),
      descricao: String(form.get("descricao") ?? "").trim(),
      tipo: String(form.get("tipo") ?? "") || null,
      exige_acao: exigeAcao,
      prazo: prazo || null,
      created_by: userData.user?.id ?? null,
    });

    if (!error) {
      await supabase
        .from("processos")
        .update({ ultima_verificacao_em: new Date().toISOString() })
        .eq("id", processoId);
    }
    setSalvando(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Movimentação registrada.");
    await queryClient.invalidateQueries();
    setExigeAcao(false);
    setAberto(false);
  };

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-serif">Nova movimentação</DialogTitle>
          <DialogDescription>
            Ela entra no próximo relatório de novidades da equipe.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={salvar} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="data_movimentacao">Data</Label>
              <Input
                id="data_movimentacao"
                name="data_movimentacao"
                type="date"
                required
                defaultValue={new Date().toISOString().slice(0, 10)}
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select name="tipo" defaultValue="Despacho">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_MOVIMENTACAO.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea id="descricao" name="descricao" rows={4} required />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="exige_acao"
              checked={exigeAcao}
              onCheckedChange={(v) => setExigeAcao(v === true)}
            />
            <Label htmlFor="exige_acao">Exige providência minha</Label>
          </div>
          {exigeAcao ? (
            <div className="space-y-2">
              <Label htmlFor="prazo">Prazo</Label>
              <Input id="prazo" name="prazo" type="date" />
            </div>
          ) : null}
          <DialogFooter>
            <Button type="submit" disabled={salvando}>
              {salvando ? "Salvando..." : "Registrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
