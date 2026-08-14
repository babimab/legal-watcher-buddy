import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatarCNJ } from "@/lib/processos";

export function ExcluirProcessoDialog({
  processoId,
  numeroCnj,
  cliente,
}: {
  processoId: string;
  numeroCnj: string;
  cliente: string;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  const excluir = async () => {
    setExcluindo(true);
    const { error } = await supabase.from("processos").delete().eq("id", processoId);
    setExcluindo(false);
    if (error) {
      toast.error(
        error.message.includes("policy")
          ? "Você não tem permissão para excluir este processo."
          : error.message,
      );
      return;
    }
    setAberto(false);
    toast.success("Processo excluído.");
    await queryClient.invalidateQueries();
    navigate({ to: "/processos" });
  };

  return (
    <AlertDialog open={aberto} onOpenChange={setAberto}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" className="text-destructive hover:text-destructive">
          <Trash2 className="size-4" /> Excluir
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir este processo?</AlertDialogTitle>
          <AlertDialogDescription>
            {cliente} — {formatarCNJ(numeroCnj)}. Todas as movimentações e os acessos
            compartilhados deste processo também serão apagados. Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={excluindo}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={excluindo}
            onClick={(e) => {
              e.preventDefault();
              void excluir();
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {excluindo ? "Excluindo..." : "Excluir processo"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
