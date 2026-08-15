import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Network, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { VincularRelacionadoDialog } from "@/components/VincularRelacionadoDialog";
import { formatarCNJ, exibir } from "@/lib/processos";
import { desvincularRelacionado, listarRelacionados } from "@/lib/relacionados";

export function RelacionadosProcesso({ processoId }: { processoId: string }) {
  const queryClient = useQueryClient();

  const relacionados = useQuery({
    queryKey: ["relacionados", processoId],
    queryFn: () => listarRelacionados(processoId),
  });

  const remover = useMutation({
    mutationFn: (relacionadoId: string) => desvincularRelacionado(processoId, relacionadoId),
    onSuccess: async () => {
      toast.success("Vínculo removido.");
      await queryClient.invalidateQueries({ queryKey: ["relacionados", processoId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const lista = relacionados.data ?? [];

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 font-serif text-lg">
              <Network className="size-4" /> Processos relacionados
            </CardTitle>
            <CardDescription>
              Processos diferentes ligados a este (mesma causa, clientes diferentes etc.).
            </CardDescription>
          </div>
          <VincularRelacionadoDialog
            processoId={processoId}
            jaVinculadosIds={lista.map((r) => r.processo.id)}
          />
        </div>
      </CardHeader>
      <CardContent>
        {relacionados.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : lista.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum processo relacionado ainda.</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {lista.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <Link
                  to="/processos/$id"
                  params={{ id: r.processo.id }}
                  className="min-w-0 hover:underline"
                >
                  <span className="font-mono text-xs">{formatarCNJ(r.processo.numero_cnj)}</span>
                  <span className="ml-2 text-sm">{exibir(r.processo.cliente)}</span>
                  {r.observacao ? (
                    <span className="ml-2 text-xs text-muted-foreground">— {r.observacao}</span>
                  ) : null}
                  {r.processo.status ? (
                    <Badge variant="outline" className="ml-2">
                      {r.processo.status}
                    </Badge>
                  ) : null}
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Remover vínculo"
                  onClick={() => remover.mutate(r.processo.id)}
                >
                  <X className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
