import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { PlayCircle, RadioTower } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatarCNJ, listarProcessos, normalizarNome } from "@/lib/processos";
import { listarPastas } from "@/lib/grupos";
import {
  alternarMonitoramentoJudit,
  rodarMonitoramentoJudit,
  type ResultadoMonitoramentoJudit,
} from "@/lib/judit";

export const Route = createFileRoute("/_authenticated/monitoramento")({
  head: () => ({
    meta: [
      { title: "Monitoramento | FaroLex" },
      {
        name: "description",
        content:
          "Marque quais processos entram no acompanhamento automático via Judit — a cada 7 dias, sozinho, sem precisar clicar no botão manual.",
      },
    ],
  }),
  component: MonitoramentoPage,
});

function MonitoramentoPage() {
  const queryClient = useQueryClient();
  const processos = useQuery({ queryKey: ["processos"], queryFn: listarProcessos });
  const pastas = useQuery({ queryKey: ["pastas"], queryFn: listarPastas });
  const [busca, setBusca] = useState("");
  const [pastaId, setPastaId] = useState("todas");
  const [advogado, setAdvogado] = useState("todos");
  const [clienteFiltro, setClienteFiltro] = useState("todos");
  const [rodando, setRodando] = useState(false);
  const [alternando, setAlternando] = useState<Set<string>>(new Set());
  const [resultado, setResultado] = useState<ResultadoMonitoramentoJudit | null>(null);

  const monitorados = (processos.data ?? []).filter((p) => p.judit_monitoramento);

  const advogados = useMemo(
    () =>
      [
        ...new Set((processos.data ?? []).map((p) => p.responsavel).filter(Boolean)),
      ].sort() as string[],
    [processos.data],
  );
  const clientes = useMemo(
    () =>
      [...new Set((processos.data ?? []).map((p) => p.cliente).filter(Boolean))].sort() as string[],
    [processos.data],
  );

  const filtrados = useMemo(() => {
    const termo = normalizarNome(busca.trim());
    const lista = processos.data ?? [];
    return lista.filter((p) => {
      const casaBusca =
        !termo ||
        normalizarNome(p.numero_cnj).includes(termo) ||
        normalizarNome(p.cliente).includes(termo);
      const casaPasta =
        pastaId === "todas" || (pastaId === "nenhuma" ? !p.pasta_id : p.pasta_id === pastaId);
      const casaAdvogado =
        advogado === "todos"
          ? true
          : advogado === "nenhum"
            ? !p.responsavel
            : p.responsavel === advogado;
      const casaCliente = clienteFiltro === "todos" || p.cliente === clienteFiltro;
      return casaBusca && casaPasta && casaAdvogado && casaCliente;
    });
  }, [processos.data, busca, pastaId, advogado, clienteFiltro]);

  const alternar = async (processoId: string, ativo: boolean) => {
    setAlternando((atual) => new Set(atual).add(processoId));
    try {
      await alternarMonitoramentoJudit(processoId, ativo);
      await queryClient.invalidateQueries({ queryKey: ["processos"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não consegui atualizar o monitoramento.");
    } finally {
      setAlternando((atual) => {
        const novo = new Set(atual);
        novo.delete(processoId);
        return novo;
      });
    }
  };

  const rodarAgora = async () => {
    setRodando(true);
    setResultado(null);
    try {
      const dados = await rodarMonitoramentoJudit();
      setResultado(dados);
      const totalGravado = (dados.colhidos ?? []).reduce(
        (soma, item) => soma + (item.inseridas ?? 0),
        0,
      );
      toast.success(
        `${(dados.colhidos ?? []).length} consulta(s) colhida(s) (${totalGravado} andamento(s) novo(s)), ${
          (dados.criados ?? []).length
        } consulta(s) nova(s) criada(s).`,
      );
      await queryClient.invalidateQueries({ queryKey: ["processos"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não consegui rodar o monitoramento.");
    } finally {
      setRodando(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold">Monitoramento</h1>
        <p className="text-sm text-muted-foreground">
          Marque abaixo quais processos entram no acompanhamento automático via Judit. Um processo
          marcado é consultado sozinho a cada 7 dias (mesmo custo de rodar o botão "Judit" manual
          uma vez por semana) e os andamentos novos entram na fila de revisão, junto com os que já
          são importados manualmente. O botão "Judit" no card do processo continua funcionando do
          mesmo jeito, pra consultar na hora quando quiser.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">Rodar agora</CardTitle>
          <CardDescription>
            {monitorados.length} processo(s) marcado(s) pro monitoramento automático. Normalmente
            isso roda sozinho (ver agendamento configurado no Lovable Cloud) — esse botão serve pra
            testar ou forçar uma rodada agora.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            type="button"
            variant="outline"
            disabled={rodando}
            onClick={() => void rodarAgora()}
          >
            <PlayCircle className="size-4" /> {rodando ? "Rodando..." : "Rodar agora"}
          </Button>
          {resultado ? (
            <pre className="max-h-72 overflow-auto rounded-md bg-muted p-3 text-xs">
              {JSON.stringify(resultado, null, 2)}
            </pre>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">Processos</CardTitle>
          <CardDescription>Busque por número CNJ ou cliente, ou filtre abaixo.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Buscar por CNJ ou cliente..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <Select value={pastaId} onValueChange={setPastaId}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Pasta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as pastas</SelectItem>
                <SelectItem value="nenhuma">Sem pasta</SelectItem>
                {(pastas.data ?? []).map((pa) => (
                  <SelectItem key={pa.id} value={pa.id}>
                    {pa.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={advogado} onValueChange={setAdvogado}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Advogado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os advogados</SelectItem>
                <SelectItem value="nenhum">Sem responsável</SelectItem>
                {advogados.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={clienteFiltro} onValueChange={setClienteFiltro}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os clientes</SelectItem>
                {clientes.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {processos.isLoading ? (
            <p className="text-muted-foreground">Carregando...</p>
          ) : filtrados.length === 0 ? (
            <p className="text-muted-foreground">Nenhum processo encontrado.</p>
          ) : (
            <ol className="space-y-2">
              {filtrados.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3"
                >
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={p.judit_monitoramento}
                      disabled={alternando.has(p.id)}
                      onCheckedChange={(v) => void alternar(p.id, v === true)}
                    />
                    Monitorar
                  </label>
                  <Link
                    to="/processos/$id"
                    params={{ id: p.id }}
                    className="font-mono text-sm hover:underline"
                  >
                    {formatarCNJ(p.numero_cnj)}
                  </Link>
                  <span className="text-sm text-muted-foreground">{p.cliente}</span>
                  <div className="ml-auto flex items-center gap-2">
                    {p.judit_request_pendente ? (
                      <Badge variant="secondary">
                        <RadioTower className="size-3" /> consulta em andamento
                      </Badge>
                    ) : p.judit_monitorado_em ? (
                      <span className="text-xs text-muted-foreground">
                        Último check: {new Date(p.judit_monitorado_em).toLocaleDateString("pt-BR")}
                      </span>
                    ) : p.judit_monitoramento ? (
                      <span className="text-xs text-muted-foreground">Ainda não rodou</span>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
