import { useQueryClient } from "@tanstack/react-query";
import { Check, ChevronsUpDown } from "lucide-react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { formatarCNJ, exibir, type Processo } from "@/lib/processos";

export function NovoPrazoDialog({
  tipo,
  processos,
  trigger,
}: {
  tipo: string;
  processos: Processo[];
  trigger: ReactNode;
}) {
  const [aberto, setAberto] = useState(false);
  const [comboAberto, setComboAberto] = useState(false);
  const [processoId, setProcessoId] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const queryClient = useQueryClient();

  const processoSelecionado = processos.find((p) => p.id === processoId) ?? null;

  const salvar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!processoId) {
      toast.error("Selecione o processo.");
      return;
    }
    const form = new FormData(e.currentTarget);
    setSalvando(true);
    const { data: userData } = await supabase.auth.getUser();

    const { error } = await supabase.from("movimentacoes").insert({
      processo_id: processoId,
      data_movimentacao: new Date().toISOString().slice(0, 10),
      descricao: String(form.get("descricao") ?? "").trim(),
      tipo,
      exige_acao: true,
      prazo: String(form.get("prazo") ?? "") || null,
      created_by: userData.user?.id ?? null,
    });
    setSalvando(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Prazo cadastrado.");
    await queryClient.invalidateQueries();
    setProcessoId(null);
    setAberto(false);
  };

  return (
    <Dialog
      open={aberto}
      onOpenChange={(v) => {
        setAberto(v);
        if (!v) setProcessoId(null);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-serif">Novo prazo — {tipo}</DialogTitle>
          <DialogDescription>Aparece na aba Prazos e no relatório por e-mail.</DialogDescription>
        </DialogHeader>
        <form onSubmit={salvar} className="space-y-4">
          <div className="space-y-2">
            <Label>Processo</Label>
            <Popover open={comboAberto} onOpenChange={setComboAberto}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={comboAberto}
                  className="w-full justify-between font-normal"
                >
                  <span className="truncate">
                    {processoSelecionado
                      ? `${formatarCNJ(processoSelecionado.numero_cnj)} — ${exibir(processoSelecionado.cliente)}`
                      : "Buscar por número ou cliente..."}
                  </span>
                  <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-(--radix-popover-trigger-width) p-0">
                <Command>
                  <CommandInput placeholder="Buscar processo..." />
                  <CommandList>
                    <CommandEmpty>Nenhum processo encontrado.</CommandEmpty>
                    <CommandGroup>
                      {processos.map((p) => (
                        <CommandItem
                          key={p.id}
                          value={`${p.numero_cnj} ${p.cliente} ${p.parte_contraria ?? ""}`}
                          onSelect={() => {
                            setProcessoId(p.id);
                            setComboAberto(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 size-4",
                              processoId === p.id ? "opacity-100" : "opacity-0",
                            )}
                          />
                          {formatarCNJ(p.numero_cnj)} — {exibir(p.cliente)}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea id="descricao" name="descricao" rows={3} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prazo">Prazo</Label>
            <Input id="prazo" name="prazo" type="date" required />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={salvando}>
              {salvando ? "Salvando..." : "Cadastrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
