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

const RESULTADOS_PROCESSO = [
  "Improcedente",
  "Procedente",
  "Parcialmente procedente",
  "Extinção por prescrição/decadência",
  "Extinção sem resolução do mérito",
  "Extinção por desistência",
  "Extinção por perda superveniente do objeto",
  "Sentença homologatória de acordo",
  "Arquivamento administrativo/processual",
  "Outro",
] as const;

type ProcessoComResultado = Processo & { resultado_encerramento?: string | null };

export function EncerramentoDialog({
  processo,
  descricao = "Preenche o que a Eliane precisa pra dar baixa nesse processo.",
  mostrarDecisoesNoLd = true,
}: {
  processo: Processo;
  descricao?: string | undefined;
  mostrarDecisoesNoLd?: boolean;
}) {
  const processoComResultado = processo as ProcessoComResultado;
  const [aberto, setAberto] = useState(false);
  const [pronto, setPronto] = useState(processo.pronto_para_encerrar);
  const [decisoesNoLd, setDecisoesNoLd] = useState(processo.decisoes_no_ld);
  const [salvando, setSalvando] = useState(false);
  const queryClient = useQueryClient();

  const salvar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const valorRaw = String(form.get("valor_encerramento") ?? "")
      .replace(/\./g, "")
      .replace(",", ".");
    const resultadoRaw = String(form.get("resultado_encerramento") ?? "");
    setSalvando(true);
    const { error } = await supabaseSolto
      .from("processos")
      .update({
        pronto_para_encerrar: pronto,
        decisoes_no_ld: decisoesNoLd,
        valor_encerramento: valorRaw ? Number(valorRaw) : null,
        resultado_encerramento: resultadoRaw === "nao-informado" ? null : resultadoRaw || null,
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
          <DialogDescription>{descricao}</DialogDescription>
        </DialogHeader>
        <form onSubmit={salvar} className="space-y-4">
          <div className="flex items-center gap-2">
            <Checkbox id="pronto" checked={pronto} onCheckedChange={(v) => setPronto(v === true)} />
            <Label htmlFor="pronto">Pronto para encerrar</Label>
          </div>
          {mostrarDecisoesNoLd ? (
            <div className="flex items-center gap-2">
              <Checkbox
                id="decisoes_no_ld"
                checked={decisoesNoLd}
                onCheckedChange={(v) => setDecisoesNoLd(v === true)}
              />
              <Label htmlFor="decisoes_no_ld">Preenchida Decisões no LD</Label>
            </div>
          ) : null}
          <div className="space-y-2">
            <Label>Resultado do processo</Label>
            <Select
              name="resultado_encerramento"
              defaultValue={processoComResultado.resultado_encerramento ?? "nao-informado"}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o resultado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nao-informado">Não informado</SelectItem>
                {RESULTADOS_PROCESSO.map((resultado) => (
                  <SelectItem key={resultado} value={resultado}>
                    {resultado}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
