import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Pause, Phone, Play } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { NovoAcompanhamentoDialog } from "@/components/AcompanhamentoAdministrativoProcesso";
import {
  DIAS_PARA_ATRASO,
  listarPainelAdministrativos,
  pausarLigacaoAdministrativa,
  retomarLigacaoAdministrativa,
} from "@/lib/acompanhamentos";
import { exibir, formatarCNJ, normalizarNome } from "@/lib/processos";

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

  const todos = useMemo(() => painel.data ?? [], [painel.data]);

  const [advogado, setAdvogado] = useState("todos");
  const [estagiario, setEstagiario] = useState("todos");
  const [cliente, setCliente] = useState("todos");
  const [busca, setBusca] = useState("");

  const advogados = useMemo(
    () => [...new Set(todos.map((i) => i.processo.responsavel).filter(Boolean) as string[])].sort(),
    [todos],
  );
  const estagiarios = useMemo(
    () => [...new Set(todos.map((i) => i.processo.estagiario).filter(Boolean) as string[])].sort(),
    [todos],
  );
  const clientes = useMemo(
    () => [...new Set(todos.map((i) => i.processo.cliente).filter(Boolean))].sort(),
    [todos],
  );

  const buscaNorm = normalizarNome(busca);
  const itens = useMemo(
    () =>
      todos.filter((i) => {
        if (advogado !== "todos" && i.processo.responsavel !== advogado) return false;
        if (estagiario !== "todos" && i.processo.estagiario !== estagiario) return false;
        if (cliente !== "todos" && i.processo.cliente !== cliente) return false;
        if (!buscaNorm) return true;
        const p = i.processo;
        const alvo = [
          p.numero_cnj,
          formatarCNJ(p.numero_cnj),
          p.autor,
          p.reu,
          p.cliente,
          p.numero_cliente,
        ]
          .filter(Boolean)
          .map((v) => normalizarNome(String(v)))
          .join(" | ");
        return alvo.includes(buscaNorm);
      }),
    [todos, advogado, estagiario, cliente, buscaNorm],
  );
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

      <div className="flex flex-wrap gap-3">
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nº do processo, parte adversa ou cliente/caso"
          className="w-full sm:w-80"
        />
        {advogados.length > 0 ? (
          <Select value={advogado} onValueChange={setAdvogado}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os advogados</SelectItem>
              {advogados.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        {estagiarios.length > 0 ? (
          <Select value={estagiario} onValueChange={setEstagiario}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas as estagiárias</SelectItem>
              {estagiarios.map((e) => (
                <SelectItem key={e} value={e}>
                  {e}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        {clientes.length > 0 ? (
          <Select value={cliente} onValueChange={setCliente}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os clientes</SelectItem>
              {clientes.map((c) => (
                <SelectItem key={c} value={c}>
                  {exibir(c)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
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
                    processo.administrativo_pausado
                      ? "border-muted-foreground/30 bg-muted/30"
                      : atrasado
                        ? "border-destructive/40 bg-destructive/5"
                        : "border-border"
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
                      <div className="mt-1 flex flex-wrap gap-1">
                        {processo.responsavel ? (
                          <Badge variant="outline">{processo.responsavel}</Badge>
                        ) : null}
                        {processo.estagiario ? (
                          <Badge variant="outline">estag. {processo.estagiario}</Badge>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      {processo.administrativo_pausado ? (
                        <Badge variant="secondary">Pausado</Badge>
                      ) : ultimoCheckIn ? (
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
                      <div className="flex items-center gap-2">
                        {processo.administrativo_pausado ? (
                          <RetomarLigacaoButton processoId={processo.id} />
                        ) : (
                          <>
                            <PausarLigacaoDialog processoId={processo.id} />
                            <NovoAcompanhamentoDialog
                              processoId={processo.id}
                              trigger={
                                <button className="text-xs font-medium text-primary hover:underline">
                                  Registrar ligação
                                </button>
                              }
                            />
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  {processo.administrativo_pausado ? (
                    <p className="mt-2 text-sm">
                      {processo.administrativo_pausado_motivo ?? "Sem motivo registrado."}
                      <span className="block text-xs text-muted-foreground">
                        Pausado por {processo.administrativo_pausado_por ?? "—"}
                        {processo.administrativo_pausado_em
                          ? ` em ${new Date(processo.administrativo_pausado_em).toLocaleDateString("pt-BR")}`
                          : ""}
                      </span>
                    </p>
                  ) : (
                    <>
                      {ultimoCheckIn?.o_que_fez ? (
                        <p className="mt-2 text-sm">{ultimoCheckIn.o_que_fez}</p>
                      ) : null}
                      {ultimoCheckIn?.proximo_passo ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Próximo passo: {ultimoCheckIn.proximo_passo}
                        </p>
                      ) : null}
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PausarLigacaoDialog({ processoId }: { processoId: string }) {
  const queryClient = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [salvando, setSalvando] = useState(false);

  const pausar = async () => {
    if (!motivo.trim()) {
      toast.error("Conta rapidinho por que não precisa ligar agora.");
      return;
    }
    setSalvando(true);
    try {
      await pausarLigacaoAdministrativa(processoId, motivo.trim());
      toast.success("Ligação pausada.");
      await queryClient.invalidateQueries({ queryKey: ["painel-administrativos"] });
      setAberto(false);
      setMotivo("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não consegui pausar.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:underline">
          <Pause className="size-3" /> Pausar ligação
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-serif">Pausar ligação semanal</DialogTitle>
          <DialogDescription>
            Esse processo some da contagem de atrasados até alguém retomar a ligação.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          placeholder="Por que não precisa ligar agora?"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          rows={3}
        />
        <DialogFooter>
          <Button onClick={() => void pausar()} disabled={salvando}>
            {salvando ? "Salvando..." : "Pausar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RetomarLigacaoButton({ processoId }: { processoId: string }) {
  const queryClient = useQueryClient();
  const [retomando, setRetomando] = useState(false);

  const retomar = async () => {
    setRetomando(true);
    try {
      await retomarLigacaoAdministrativa(processoId);
      toast.success("Ligação retomada — volta a contar atrasado normalmente.");
      await queryClient.invalidateQueries({ queryKey: ["painel-administrativos"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não consegui retomar.");
    } finally {
      setRetomando(false);
    }
  };

  return (
    <button
      className="flex items-center gap-1 text-xs font-medium text-primary hover:underline disabled:opacity-50"
      onClick={() => void retomar()}
      disabled={retomando}
    >
      <Play className="size-3" /> {retomando ? "Retomando..." : "Retomar ligação"}
    </button>
  );
}
