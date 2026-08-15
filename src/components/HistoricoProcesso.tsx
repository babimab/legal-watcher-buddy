import { useQuery } from "@tanstack/react-query";
import { History } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listarHistorico, ROTULO_CAMPO_HISTORICO, formatarValorHistorico } from "@/lib/historico";

export function HistoricoProcesso({ processoId }: { processoId: string }) {
  const historico = useQuery({
    queryKey: ["historico", processoId],
    queryFn: () => listarHistorico(processoId),
  });

  const lista = historico.data ?? [];
  if (!historico.isLoading && lista.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-serif text-lg">
          <History className="size-4" /> Histórico de alterações
        </CardTitle>
        <CardDescription>
          Mudanças de responsável, fase, criticidade e outros campos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {historico.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {lista.map((h) => (
              <li key={h.id} className="text-muted-foreground">
                <span className="font-medium text-foreground">{h.alterado_por ?? "Alguém"}</span>{" "}
                mudou{" "}
                <span className="font-medium text-foreground">
                  {ROTULO_CAMPO_HISTORICO[h.campo] ?? h.campo}
                </span>{" "}
                de <span className="italic">{formatarValorHistorico(h.campo, h.valor_antigo)}</span>{" "}
                para{" "}
                <span className="italic text-foreground">
                  {formatarValorHistorico(h.campo, h.valor_novo)}
                </span>{" "}
                em {new Date(h.alterado_em).toLocaleString("pt-BR")}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
