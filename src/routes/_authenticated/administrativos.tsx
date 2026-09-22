import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Phone } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NovoAcompanhamentoDialog } from "@/components/AcompanhamentoAdministrativoProcesso";
import { DIAS_PARA_ATRASO, listarPainelAdministrativos } from "@/lib/acompanhamentos";
import { exibir, formatarCNJ } from "@/lib/processos";

export const Route = createFileRoute("/_authenticated/administrativos")({
  head: () => ({
    meta: [
      { title: "Administrativos | FaroLex" },
      {
        name: "description",
        content:
          "Processos da carteira Administrativos, que não têm andamento pelo sistema do tribunal e precisam de ligação semanal de checagem.",
      },
    ],
  }),
  component: AdministrativosPage,
});

function AdministrativosPage() {
  const painel = useQuery({
    queryKey: ["painel-administrativos"],
    queryFn: listarPainelAdministrativos,
  });

  const itens = painel.data ?? [];
  const atrasados = itens.filter((i) => i.atrasado).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 font-serif text-2xl font-semibold text-foreground">
          <Phone className="size-6" /> Administrativos
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Processos da carteira "Administrativos" não têm andamento pelo sistema do tribunal --
          precisam de ligação semanal das estagiárias pra checar a situação. Cada ligação fica
          registrada aqui, com quem ligou e o que foi dito, pra você conferir se está em dia.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">
            {itens.length} processo{itens.length === 1 ? "" : "s"} administrativo
            {itens.length === 1 ? "" : "s"}
            {atrasados > 0 ? (
              <Badge variant="destructive" className="ml-2 align-middle">
                {atrasados} atrasado{atrasados === 1 ? "" : "s"}
              </Badge>
            ) : null}
          </CardTitle>
          <CardDescription>
            Considera atrasado quem está há {DIAS_PARA_ATRASO} dias ou mais sem ligação registrada
            (ou nunca teve nenhuma).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {painel.isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : itens.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum processo ativo com carteira "Administrativos" no momento.
            </p>
          ) : (
            <ul className="space-y-3">
              {itens.map(({ processo, ultimoCheckIn, diasSemCheckIn, atrasado }) => (
                <li
                  key={processo.id}
                  className={`rounded-lg border p-3 ${
                    atrasado ? "border-destructive/40 bg-destructive/5" : "border-border"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        to="/processos/$id"
                        params={{ id: processo.id }}
                        className="font-medium text-foreground hover:underline"
                      >
                        {formatarCNJ(processo.numero_cnj)}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {exibir(processo.cliente)}
                        {processo.numero_cliente ? ` — ${exibir(processo.numero_cliente)}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {exibir(processo.autor)} x {exibir(processo.reu)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      {ultimoCheckIn ? (
                        <div className="text-right text-sm">
                          <span className={atrasado ? "font-medium text-destructive" : ""}>
                            Última ligação:{" "}
                            {new Date(`${ultimoCheckIn.data_ligacao}T12:00:00`).toLocaleDateString(
                              "pt-BR",
                            )}
                            {diasSemCheckIn != null ? ` (há ${diasSemCheckIn}d)` : ""}
                          </span>
                          {ultimoCheckIn.estagiario ? (
                            <div>
                              <Badge variant="outline">{ultimoCheckIn.estagiario}</Badge>
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <Badge variant="destructive">Nunca ligaram</Badge>
                      )}
                      <NovoAcompanhamentoDialog
                        processoId={processo.id}
                        trigger={
                          <button className="text-xs font-medium text-primary hover:underline">
                            Registrar ligação
                          </button>
                        }
                      />
                    </div>
                  </div>
                  {ultimoCheckIn?.o_que_fez ? (
                    <p className="mt-2 text-sm">{ultimoCheckIn.o_que_fez}</p>
                  ) : null}
                  {ultimoCheckIn?.proximo_passo ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Próximo passo: {ultimoCheckIn.proximo_passo}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
