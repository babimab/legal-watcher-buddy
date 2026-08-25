import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Clock3, History, RefreshCw, Send, ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  listarBaixasCliente,
  listarHistoricoBaixa,
  registrarCobrancaBaixa,
  registrarTentativaBaixa,
  type BaixaCliente,
  type PendenciaCom,
} from "@/lib/baixas-cliente";
import { exibir, formatarCNJ, useCargoAtual } from "@/lib/processos";

const ROTULOS_STATUS = {
  aguardando: "Aguardando baixa",
  bloqueado: "Bloqueado por tarefa pendente",
  pronto_nova_tentativa: "Pronto para nova tentativa",
  encerrado: "Encerrado no sistema do cliente",
} as const;

function formatarData(valor: string | null | undefined, comHora = false) {
  if (!valor) return "—";
  const d = new Date(valor);
  return comHora ? d.toLocaleString("pt-BR") : d.toLocaleDateString("pt-BR");
}

function parteAdversa(b: BaixaCliente) {
  const p = b.processos;
  return p?.parte_contraria || p?.autor || p?.reu || "—";
}

export function BaixasCliente() {
  const cargo = useCargoAtual();
  const [emailAtual, setEmailAtual] = useState<string | null>(null);
  useQuery({
    queryKey: ["email-atual-baixas"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      const email = data.user?.email ?? null;
      setEmailAtual(email);
      return email;
    },
    staleTime: Infinity,
  });
  const podeEditar = cargo === "Administrativo" || (emailAtual ?? "").toLowerCase() === "bdr@bcw.com.br";

  const baixas = useQuery({ queryKey: ["baixas-cliente"], queryFn: listarBaixasCliente });
  const [status, setStatus] = useState("abertas");
  const [advogado, setAdvogado] = useState("todos");
  const [cliente, setCliente] = useState("todos");
  const [busca, setBusca] = useState("");

  const todas = baixas.data ?? [];
  const contadores = {
    aguardando: todas.filter((b) => b.status === "aguardando").length,
    bloqueado: todas.filter((b) => b.status === "bloqueado").length,
    pronto: todas.filter((b) => b.status === "pronto_nova_tentativa").length,
    encerrado: todas.filter((b) => b.status === "encerrado").length,
  };

  const advogados = useMemo(
    () => [...new Set(todas.map((b) => b.processos?.responsavel).filter(Boolean) as string[])].sort(),
    [todas],
  );
  const clientes = useMemo(
    () => [...new Set(todas.map((b) => b.processos?.cliente).filter(Boolean) as string[])].sort(),
    [todas],
  );

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase().replace(/\s+/g, "");
    return todas.filter((b) => {
      const p = b.processos;
      const casaStatus =
        status === "todos" ||
        (status === "abertas" ? b.status !== "encerrado" : b.status === status);
      const casaAdvogado = advogado === "todos" || p?.responsavel === advogado;
      const casaCliente = cliente === "todos" || p?.cliente === cliente;
      const combinado = `${p?.numero_cliente ?? ""}/${p?.numero_interno ?? ""}`.toLowerCase().replace(/\s+/g, "");
      const casaBusca =
        !termo ||
        combinado.includes(termo) ||
        [p?.numero_cnj, p?.numero_cliente, p?.numero_interno, p?.cliente, p?.parte_contraria, p?.autor, p?.reu]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().replace(/\s+/g, "").includes(termo));
      return casaStatus && casaAdvogado && casaCliente && casaBusca;
    });
  }, [todas, status, advogado, cliente, busca]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-serif text-2xl font-semibold">Baixas no cliente</h2>
        <p className="text-sm text-muted-foreground">
          Controle administrativo depois do encerramento jurídico no FaroLex.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Resumo titulo="Aguardando" valor={contadores.aguardando} icone={<Clock3 className="size-4" />} />
        <Resumo titulo="Bloqueadas" valor={contadores.bloqueado} icone={<ShieldAlert className="size-4" />} />
        <Resumo titulo="Prontas para nova tentativa" valor={contadores.pronto} icone={<RefreshCw className="size-4" />} />
        <Resumo titulo="Concluídas" valor={contadores.encerrado} icone={<CheckCircle2 className="size-4" />} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar CNJ, parte ou Cliente/Caso (ex. 4608/2482)"
          className="min-w-64 flex-1"
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="abertas">Todas as pendentes</SelectItem>
            <SelectItem value="aguardando">Aguardando baixa</SelectItem>
            <SelectItem value="bloqueado">Bloqueadas</SelectItem>
            <SelectItem value="pronto_nova_tentativa">Prontas para nova tentativa</SelectItem>
            <SelectItem value="encerrado">Concluídas</SelectItem>
            <SelectItem value="todos">Todos os status</SelectItem>
          </SelectContent>
        </Select>
        {advogados.length ? (
          <Select value={advogado} onValueChange={setAdvogado}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os advogados</SelectItem>
              {advogados.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        ) : null}
        {clientes.length ? (
          <Select value={cliente} onValueChange={setCliente}>
            <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os clientes</SelectItem>
              {clientes.map((c) => <SelectItem key={c} value={c}>{exibir(c)}</SelectItem>)}
            </SelectContent>
          </Select>
        ) : null}
      </div>

      {baixas.isLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : filtradas.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Nenhuma baixa encontrada.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtradas.map((b) => <BaixaCard key={b.id} baixa={b} podeEditar={podeEditar} />)}
        </div>
      )}
    </div>
  );
}

function Resumo({ titulo, valor, icone }: { titulo: string; valor: number; icone: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between py-4">
        <div><p className="text-xs text-muted-foreground">{titulo}</p><p className="text-2xl font-semibold">{valor}</p></div>
        <span className="text-muted-foreground">{icone}</span>
      </CardContent>
    </Card>
  );
}

function BaixaCard({ baixa, podeEditar }: { baixa: BaixaCliente; podeEditar: boolean }) {
  const p = baixa.processos;
  const identificador = p?.numero_cliente && p?.numero_interno
    ? `${p.numero_cliente}/${p.numero_interno}`
    : p?.numero_interno || p?.numero_cliente || null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="font-serif text-lg">
              {p ? <Link to="/processos/$id" params={{ id: p.id }} className="hover:underline">{formatarCNJ(p.numero_cnj)} — {parteAdversa(baixa)}</Link> : "Processo"}
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {p?.cliente ? `Cliente: ${exibir(p.cliente)}` : ""}
              {identificador ? ` · Cliente/Caso: ${identificador}` : ""}
              {p?.responsavel ? ` · Adv.: ${p.responsavel}` : ""}
            </p>
          </div>
          <Badge variant={baixa.status === "bloqueado" ? "destructive" : baixa.status === "encerrado" ? "secondary" : "default"}>
            {ROTULOS_STATUS[baixa.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {baixa.status === "bloqueado" ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
            <strong>Pendência com:</strong> {baixa.pendencia_com === "Juridico interno" ? "Jurídico interno" : baixa.pendencia_com ?? "—"}
            {baixa.descricao_pendencia ? <p className="mt-1">{baixa.descricao_pendencia}</p> : null}
          </div>
        ) : null}
        <div className="grid gap-2 text-sm sm:grid-cols-3">
          <p><span className="text-muted-foreground">Última tentativa:</span> {formatarData(baixa.ultima_tentativa_em, true)}</p>
          <p><span className="text-muted-foreground">Última cobrança:</span> {formatarData(baixa.ultima_cobranca_em, true)}</p>
          <p><span className="text-muted-foreground">Próxima cobrança:</span> {baixa.proxima_cobranca ? new Date(`${baixa.proxima_cobranca}T12:00:00`).toLocaleDateString("pt-BR") : "—"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {podeEditar && baixa.status !== "encerrado" ? <TentativaDialog baixa={baixa} /> : null}
          {podeEditar && baixa.status === "bloqueado" ? <CobrancaDialog baixa={baixa} /> : null}
          {podeEditar && baixa.status !== "encerrado" ? <EncerrarDialog baixa={baixa} /> : null}
          <HistoricoDialog baixa={baixa} />
        </div>
      </CardContent>
    </Card>
  );
}

function TentativaDialog({ baixa }: { baixa: BaixaCliente }) {
  const [aberto, setAberto] = useState(false);
  const [resultado, setResultado] = useState("pendencia");
  const [pendenciaCom, setPendenciaCom] = useState<PendenciaCom>("Juridico interno");
  const [descricao, setDescricao] = useState("");
  const [proxima, setProxima] = useState("");
  const [salvando, setSalvando] = useState(false);
  const qc = useQueryClient();

  const salvar = async () => {
    if (resultado === "pendencia" && !descricao.trim()) {
      toast.error("Descreva a pendência para o administrativo conseguir acompanhar.");
      return;
    }
    setSalvando(true);
    try {
      await registrarTentativaBaixa({
        baixaId: baixa.id,
        resultado: resultado as "concluida" | "pendencia" | "nova_tentativa",
        pendenciaCom: resultado === "pendencia" ? pendenciaCom : null,
        descricao: descricao || null,
        proximaCobranca: proxima || null,
      });
      toast.success("Tentativa registrada.");
      await qc.invalidateQueries({ queryKey: ["baixas-cliente"] });
      setAberto(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não consegui registrar a tentativa.");
    } finally { setSalvando(false); }
  };

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild><Button size="sm"><Send className="size-4" /> Registrar tentativa de baixa</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Registrar tentativa de baixa</DialogTitle><DialogDescription>Atualize o andamento da baixa no sistema do cliente.</DialogDescription></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Resultado</Label><Select value={resultado} onValueChange={setResultado}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="concluida">Baixa concluída</SelectItem><SelectItem value="pendencia">Não foi possível — há pendência</SelectItem><SelectItem value="nova_tentativa">Pronto para nova tentativa</SelectItem></SelectContent></Select></div>
          {resultado === "pendencia" ? <><div className="space-y-2"><Label>Pendência com</Label><Select value={pendenciaCom} onValueChange={(v) => setPendenciaCom(v as PendenciaCom)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Juridico interno">Jurídico interno</SelectItem><SelectItem value="Contadores">Contadores</SelectItem><SelectItem value="Outro">Outro</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label>Descrição da pendência</Label><Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} /></div></> : <div className="space-y-2"><Label>Observação</Label><Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} /></div>}
          <div className="space-y-2"><Label>Próxima cobrança</Label><Input type="date" value={proxima} onChange={(e) => setProxima(e.target.value)} /></div>
        </div>
        <DialogFooter><Button onClick={() => void salvar()} disabled={salvando}>{salvando ? "Salvando..." : "Salvar"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CobrancaDialog({ baixa }: { baixa: BaixaCliente }) {
  const [aberto, setAberto] = useState(false);
  const [descricao, setDescricao] = useState("");
  const [proxima, setProxima] = useState(baixa.proxima_cobranca ?? "");
  const [salvando, setSalvando] = useState(false);
  const qc = useQueryClient();
  const salvar = async () => {
    setSalvando(true);
    try {
      await registrarCobrancaBaixa({ baixaId: baixa.id, descricao, proximaCobranca: proxima || null });
      toast.success("Cobrança registrada.");
      await qc.invalidateQueries({ queryKey: ["baixas-cliente"] });
      setAberto(false);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Não consegui registrar a cobrança."); }
    finally { setSalvando(false); }
  };
  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild><Button size="sm" variant="outline">Registrar cobrança</Button></DialogTrigger>
      <DialogContent><DialogHeader><DialogTitle>Registrar cobrança</DialogTitle><DialogDescription>Registre o follow-up feito sobre a pendência.</DialogDescription></DialogHeader><div className="space-y-4"><div className="space-y-2"><Label>Observação</Label><Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} /></div><div className="space-y-2"><Label>Próxima cobrança</Label><Input type="date" value={proxima} onChange={(e) => setProxima(e.target.value)} /></div></div><DialogFooter><Button onClick={() => void salvar()} disabled={salvando}>{salvando ? "Salvando..." : "Salvar cobrança"}</Button></DialogFooter></DialogContent>
    </Dialog>
  );
}

function EncerrarDialog({ baixa }: { baixa: BaixaCliente }) {
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const qc = useQueryClient();

  const confirmar = async () => {
    setSalvando(true);
    try {
      await registrarTentativaBaixa({
        baixaId: baixa.id,
        resultado: "concluida",
        pendenciaCom: null,
        descricao: null,
        proximaCobranca: null,
      });
      toast.success("Baixa marcada como concluída no sistema do cliente.");
      await qc.invalidateQueries({ queryKey: ["baixas-cliente"] });
      setAberto(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não consegui encerrar a baixa.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><CheckCircle2 className="size-4" /> Encerrar baixa</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Encerrar baixa</DialogTitle>
          <DialogDescription>
            A baixa será marcada como concluída no sistema do cliente. Esta ação registra o encerramento administrativo da baixa.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setAberto(false)} disabled={salvando}>Cancelar</Button>
          <Button onClick={() => void confirmar()} disabled={salvando}>{salvando ? "Encerrando..." : "Confirmar encerramento"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function HistoricoDialog({ baixa }: { baixa: BaixaCliente }) {
  const [aberto, setAberto] = useState(false);
  const historico = useQuery({ queryKey: ["historico-baixa", baixa.id], queryFn: () => listarHistoricoBaixa(baixa.id), enabled: aberto });
  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild><Button size="sm" variant="ghost"><History className="size-4" /> Histórico</Button></DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto"><DialogHeader><DialogTitle>Histórico da baixa</DialogTitle><DialogDescription>{baixa.processos ? formatarCNJ(baixa.processos.numero_cnj) : "Processo"}</DialogDescription></DialogHeader>{historico.isLoading ? <p>Carregando...</p> : (historico.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">Nenhum registro ainda.</p> : <ol className="space-y-3">{(historico.data ?? []).map((h) => <li key={h.id} className="rounded-md border p-3 text-sm"><p className="font-medium">{formatarData(h.created_at, true)} · {h.tipo}</p>{h.resultado ? <p>Resultado: {h.resultado}</p> : null}{h.pendencia_com ? <p>Pendência com: {h.pendencia_com === "Juridico interno" ? "Jurídico interno" : h.pendencia_com}</p> : null}{h.descricao ? <p>{h.descricao}</p> : null}{h.proxima_cobranca ? <p>Próxima cobrança: {new Date(`${h.proxima_cobranca}T12:00:00`).toLocaleDateString("pt-BR")}</p> : null}</li>)}</ol>}</DialogContent>
    </Dialog>
  );
}
