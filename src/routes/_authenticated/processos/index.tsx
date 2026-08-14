import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProcessoDialog } from "@/components/ProcessoDialog";
import { listarProcessos, formatarCNJ, STATUS_OPCOES } from "@/lib/processos";

export const Route = createFileRoute("/_authenticated/processos/")({
  head: () => ({
    meta: [
      { title: "Processos | Radar Processual" },
      {
        name: "description",
        content: "Carteira de processos judiciais do escritório com busca, status e responsável.",
      },
      { property: "og:title", content: "Carteira de processos" },
      {
        property: "og:description",
        content: "Carteira de processos judiciais do escritório com busca, status e responsável.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProcessosPage,
});

function ProcessosPage() {
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("todos");

  const { data, isLoading } = useQuery({
    queryKey: ["processos"],
    queryFn: listarProcessos,
  });

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (data ?? []).filter((p) => {
      const casaStatus = status === "todos" || p.status === status;
      const casaBusca =
        !termo ||
        [p.numero_cnj, p.cliente, p.parte_contraria, p.tribunal, p.responsavel]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(termo));
      return casaStatus && casaBusca;
    });
  }, [data, busca, status]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold">Processos</h1>
          <p className="text-muted-foreground">
            Carteira compartilhada do escritório — {data?.length ?? 0} cadastrados.
          </p>
        </div>
        <ProcessoDialog
          trigger={
            <Button>
              <Plus className="size-4" /> Novo processo
            </Button>
          }
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-64 flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por número, cliente, parte, tribunal..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {STATUS_OPCOES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : lista.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhum processo encontrado. Cadastre o primeiro ou importe sua planilha.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {lista.map((p) => (
            <Link
              key={p.id}
              to="/processos/$id"
              params={{ id: p.id }}
              className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary"
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-sm">{formatarCNJ(p.numero_cnj)}</span>
                <Badge variant={p.status === "ativo" ? "default" : "secondary"}>{p.status}</Badge>
                {p.monitorar ? <Badge variant="outline">monitorado</Badge> : null}
              </div>
              <p className="mt-1 font-serif text-lg">{p.cliente}</p>
              <p className="text-sm text-muted-foreground">
                {[p.parte_contraria && `x ${p.parte_contraria}`, p.tribunal, p.vara, p.comarca]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
