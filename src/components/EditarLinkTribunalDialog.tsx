import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
import { atualizarLinkTribunalManual } from "@/lib/processos";

export function EditarLinkTribunalDialog({
  processoId,
  linkAtual,
}: {
  processoId: string;
  linkAtual: string | null;
}) {
  const queryClient = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [link, setLink] = useState(linkAtual ?? "");
  const [salvando, setSalvando] = useState(false);

  const salvar = async (valor: string | null) => {
    setSalvando(true);
    try {
      await atualizarLinkTribunalManual(processoId, valor);
      await queryClient.invalidateQueries({ queryKey: ["processo", processoId] });
      toast.success(valor ? "Link do tribunal atualizado." : "Voltou a usar o link automático.");
      setAberto(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não consegui salvar o link.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog
      open={aberto}
      onOpenChange={(v) => {
        setAberto(v);
        if (v) setLink(linkAtual ?? "");
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          aria-label="Editar link do tribunal"
          title="Editar link do tribunal"
        >
          <Link2 className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-serif">Link do tribunal</DialogTitle>
          <DialogDescription>
            Se o link automático não funcionar pra esse processo, cola aqui o link certo (da
            consulta pública do tribunal, por exemplo) — ele passa a valer no lugar do automático.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            void salvar(link.trim() || null);
          }}
        >
          <Label htmlFor="link-tribunal">Link</Label>
          <Input
            id="link-tribunal"
            type="url"
            placeholder="https://..."
            value={link}
            onChange={(e) => setLink(e.target.value)}
          />
          <DialogFooter className="mt-4">
            {linkAtual ? (
              <Button
                type="button"
                variant="outline"
                disabled={salvando}
                onClick={() => void salvar(null)}
              >
                Usar link automático
              </Button>
            ) : null}
            <Button type="submit" disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
