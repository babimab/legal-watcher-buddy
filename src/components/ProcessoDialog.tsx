import { useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
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
import { STATUS_OPCOES, type Processo } from "@/lib/processos";

type Props = { processo?: Processo; trigger: ReactNode };

export function ProcessoDialog({ processo, trigger }: Props) {
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const queryClient = useQueryClient();

  const salvar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const valor = String(form.get("valor_causa") ?? "").replace(/\./g, "").replace(",", ".");
    const payload = {
      numero_cnj: String(form.get("numero_cnj") ?? "").trim(),
      cliente: String(form.get("cliente") ?? "").trim(),
      parte_contraria: String(form.get("parte_contraria") ?? "").trim() || null,
      tribunal: String(form.get("tribunal") ?? "").trim() || null,
      vara: String(form.get("vara") ?? "").trim() || null,
      comarca: String(form.get("comarca") ?? "").trim() || null,
      classe: String(form.get("classe") ?? "").trim() || null,
      fase: String(form.get("fase") ?? "").trim() || null,
      responsavel: String(form.get("responsavel") ?? "").trim() || null,
      status: String(form.get("status") ?? "ativo"),
      valor_causa: valor ? Number(valor) : null,
      observacoes: String(form.get("observacoes") ?? "").trim() || null,
    };

    setSalvando(true);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = processo
      ? await supabase.from("processos").update(payload).eq("id", processo.id)
      : await supabase
          .from("processos")
          .insert({ ...payload, created_by: userData.user?.id ?? null });
    setSalvando(false);

    if (error) {
      toast.error(
        error.code === "23505" ? "Já existe um processo com esse número." : error.message,
      );
      return;
    }
    toast.success(processo ? "Processo atualizado." : "Processo cadastrado.");
    await queryClient.invalidateQueries();
    setAberto(false);
  };

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-serif">
            {processo ? "Editar processo" : "Novo processo"}
          </DialogTitle>
          <DialogDescription>
            Os dados ficam visíveis para toda a equipe do escritório.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={salvar} className="grid gap-4 sm:grid-cols-2">
          <Campo
            label="Número CNJ"
            name="numero_cnj"
            required
            defaultValue={processo?.numero_cnj}
            placeholder="0000000-00.0000.0.00.0000"
          />
          <Campo label="Cliente" name="cliente" required defaultValue={processo?.cliente} />
          <Campo
            label="Parte contrária"
            name="parte_contraria"
            defaultValue={processo?.parte_contraria ?? ""}
          />
          <Campo label="Tribunal" name="tribunal" defaultValue={processo?.tribunal ?? ""} />
          <Campo label="Vara" name="vara" defaultValue={processo?.vara ?? ""} />
          <Campo label="Comarca" name="comarca" defaultValue={processo?.comarca ?? ""} />
          <Campo label="Classe / Assunto" name="classe" defaultValue={processo?.classe ?? ""} />
          <Campo label="Fase" name="fase" defaultValue={processo?.fase ?? ""} />
          <Campo
            label="Advogado responsável"
            name="responsavel"
            defaultValue={processo?.responsavel ?? ""}
          />
          <Campo
            label="Valor da causa"
            name="valor_causa"
            defaultValue={processo?.valor_causa != null ? String(processo.valor_causa) : ""}
            placeholder="15000.00"
          />
          <div className="space-y-2">
            <Label>Status</Label>
            <Select name="status" defaultValue={processo?.status ?? "ativo"}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPCOES.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              name="observacoes"
              rows={3}
              defaultValue={processo?.observacoes ?? ""}
            />
          </div>
          <DialogFooter className="sm:col-span-2">
            <Button type="submit" disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Campo({
  label,
  name,
  defaultValue,
  required,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string | undefined;
  required?: boolean | undefined;
  placeholder?: string | undefined;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
      />
    </div>
  );
}
