import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { CalendarPlus, CheckCircle2, ExternalLink, Inbox, MailCheck, MailX } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  concluirTriagem,
  criarPrazoNaTriagem,
  definirDestaqueCaixa,
  listarCaixaEntrada,
  type ItemCaixaEntrada,
} from "@/lib/caixa-entrada";
import { exibir, formatarCNJ } from "@/lib/processos";

type OrigemFiltro = "todas" | "publicacoes" | "citacoes";

export const Route = createFileRoute("/_authenticated/caixa-entrada")({
  head: () => ({
    meta: [
      { title: "Caixa de entrada | FaroLex" },
      {
        name: "description",
        content: "Triagem de publicações e citações recebidas pela equipe.",
      },
    ],
  }),
  component: CaixaEntradaPage,
});

function normalizar(valor: string | null | undefined) {
  return (valor ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, "");
}

function parteAdversa(item: ItemCaixaEntrada) {
  const p = item.processos;
  return p?.parte_contraria || p?.autor || p?.reu || "—";
}

function rotuloOrigem(fonte: string) {
  return fonte === "citacoes" ? "Citação" : "Publicação";
}

function CaixaEntradaPage() {
  const queryClient = useQueryClient();
  const itens = useQuery({ queryKey: ["caixa-entrada"], queryFn: listarCaixaEntrada });
  const [origem, setOrigem] = useState<OrigemFiltro>("todas");
  const [busca, setBusca] = useState("");
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [processando, setProcessando] = useState(false);

  const todos = itens.data ?? [];
  const contadores = {
    todas: todos.length,
    publicacoes: todos.filter((i) => i.fonte === "publicacoes").length,
    citacoes: todos.filter((i) => i.fonte === "citacoes").length,
  };

  const filtrados = useMemo(() => {
    const termo = normalizar(busca);
    return todos.filter((item) => {
      if (origem !== "todas" && item.fonte !== origem) return false;
      if (!termo) return true;
      const p = item.processos;
      const clienteCaso = `${p?.numero_cliente ?? ""}/${p?.numero_interno ?? ""}`;
      return [
        p?.numero_cnj,
        p?.cliente,
        p?.parte_contraria,
        p?.autor,
        p?.reu,
        p?.numero_cliente,
        p?.numero_interno,
        clienteCaso,
        item.descricao,
      ].some((v) => normalizar(v).includes(termo));
    });
  }, [todos, origem, busca]);

  const idsVisiveis = filtrados.map((i) => i.id);
  const todosVisiveisSelecionados = idsVisiveis.length > 0 && idsVisiveis.every((id) => selecionados.has(id));

  const alternar = (id: string) => {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  };

  const selecionarVisiveis = (marcar: boolean) => {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      for (const id of idsVisiveis) {
        if (marcar) novo.add(id);
        else novo.delete(id);
      }
      return novo;
    });
  };

  const atualizar = async () => {
    await queryClient.invalidateQueries({ queryKey: ["caixa-entrada"] });
    await queryClient.invalidateQueries({ queryKey: ["nao-validados"] });
    await queryClient.invalidateQueries({ queryKey: ["pendencias"] });
    setSelecionados(new Set());
  };

  const concluirSelecionados = async () => {
    const ids = [...selecionados];
    if (!ids.length) return;
    setProcessando(true);
    try {
      await concluirTriagem(ids);
      toast.success(`${ids.length} item(ns) concluído(s).`);
      await atualizar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não consegui concluir a triagem.");
    } finally {
      setProcessando(false);
    }
  };

  const destacarSelecionados = async () => {
    const ids = [...selecionados];
    if (!ids.length) return;
    setProcessando(true);
    try {
      await definirDestaqueCaixa(ids, true);
      toast.success(`${ids.length} item(ns) destacado(s) para o cliente.`);
      await atualizar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não consegui destacar os itens.");
    } finally {
      setProcessando(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold">Caixa de entrada</h1>
        <p className="text-muted-foreground">
          Publicações e citações que chegaram ao FaroLex e ainda precisam de triagem.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant={origem === "todas" ? "default" : "outline"} size="sm" onClick={() => setOrigem("todas")}>Todas ({contadores.todas})</Button>
        <Button variant={origem === "publicacoes" ? "default" : "outline"} size="sm" onClick={() => setOrigem("publicacoes")}>Publicações ({contadores.publicacoes})</Button>
        <Button variant={origem === "citacoes" ? "default" : "outline"} size="sm" onClick={() => setOrigem("citacoes")}>Citações ({contadores.citacoes})</Button>
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar CNJ, parte, cliente ou Cliente/Caso"
          className="ml-auto min-w-64 max-w-md"
        />
      </div>

      {filtrados.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/20 px-3 py-2 text-sm">
          <Checkbox
            checked={todosVisiveisSelecionados}
            onCheckedChange={(v) => selecionarVisiveis(v === true)}
          />
          <span>{selecionados.size} selecionado(s)</span>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={!selecionados.size || processando} onClick={() => void destacarSelecionados()}>
              <MailCheck className="size-4" /> Destacar selecionadas
            </Button>
            <Button size="sm" disabled={!selecionados.size || processando} onClick={() => void concluirSelecionados()}>
              <CheckCircle2 className="size-4" /> Concluir selecionadas
            </Button>
          </div>
        </div>
      ) : null}

      {itens.isLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : filtrados.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
            <Inbox className="size-8" />
            <p>Nenhum item pendente de triagem.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtrados.map((item) => (
            <ItemTriagem
              key={item.id}
              item={item}
              selecionado={selecionados.has(item.id)}
              onAlternar={() => alternar(item.id)}
              onAtualizar={atualizar}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ItemTriagem({
  item,
  selecionado,
  onAlternar,
  onAtualizar,
}: {
  item: ItemCaixaEntrada;
  selecionado: boolean;
  onAlternar: () => void;
  onAtualizar: () => Promise<void>;
}) {
  const p = item.processos;
  const [salvando, setSalvando] = useState(false);
  const clienteCaso = p?.numero_cliente && p?.numero_interno
    ? `${p.numero_cliente}/${p.numero_interno}`
    : p?.numero_interno || p?.numero_cliente || null;

  const concluir = async () => {
    setSalvando(true);
    try {
      await concluirTriagem([item.id]);
      toast.success("Triagem concluída.");
      await onAtualizar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não consegui concluir a triagem.");
    } finally {
      setSalvando(false);
    }
  };

  const alternarDestaque = async () => {
    setSalvando(true);
    try {
      await definirDestaqueCaixa([item.id], !item.destacar_email);
      toast.success(item.destacar_email ? "Destaque removido." : "Destacado para o cliente.");
      await onAtualizar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não consegui atualizar o destaque.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <Checkbox checked={selecionado} onCheckedChange={onAlternar} className="mt-1" />
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={item.fonte === "citacoes" ? "default" : "secondary"}>{rotuloOrigem(item.fonte)}</Badge>
                  {item.destacar_email ? <Badge variant="outline">Destacado para cliente</Badge> : null}
                  <span className="text-xs text-muted-foreground">
                    {new Date(`${item.data_movimentacao}T12:00:00`).toLocaleDateString("pt-BR")}
                  </span>
                </div>
                <p className="mt-2 font-serif text-lg font-semibold">{parteAdversa(item)}</p>
                <p className="text-sm text-muted-foreground">
                  {p ? formatarCNJ(p.numero_cnj) : "Processo não localizado"}
                  {p?.cliente ? ` · ${exibir(p.cliente)}` : ""}
                  {clienteCaso ? ` · Cliente/Caso: ${clienteCaso}` : ""}
                  {p?.responsavel ? ` · Resp.: ${p.responsavel}` : ""}
                </p>
              </div>
            </div>

            <p className="whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-sm leading-relaxed">{item.descricao}</p>

            <div className="flex flex-wrap gap-2">
              {p ? (
                <Button asChild size="sm" variant="outline">
                  <Link to="/processos/$id" params={{ id: p.id }}>
                    <ExternalLink className="size-4" /> Abrir processo
                  </Link>
                </Button>
              ) : null}
              <PrazoTriagemDialog item={item} onAtualizar={onAtualizar} />
              <Button size="sm" variant="outline" disabled={salvando} onClick={() => void alternarDestaque()}>
                {item.destacar_email ? <MailX className="size-4" /> : <MailCheck className="size-4" />}
                {item.destacar_email ? "Remover destaque" : "Destacar para cliente"}
              </Button>
              <Button size="sm" disabled={salvando} onClick={() => void concluir()}>
                <CheckCircle2 className="size-4" /> Concluir triagem
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PrazoTriagemDialog({ item, onAtualizar }: { item: ItemCaixaEntrada; onAtualizar: () => Promise<void> }) {
  const [aberto, setAberto] = useState(false);
  const [prazo, setPrazo] = useState("");
  const [salvando, setSalvando] = useState(false);

  const salvar = async () => {
    if (!prazo) {
      toast.error("Informe a data do prazo.");
      return;
    }
    setSalvando(true);
    try {
      await criarPrazoNaTriagem(item.id, prazo);
      toast.success("Prazo criado e triagem concluída.");
      setAberto(false);
      setPrazo("");
      await onAtualizar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não consegui criar o prazo.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setAberto(true)}>
        <CalendarPlus className="size-4" /> Criar prazo
      </Button>
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar prazo</DialogTitle>
            <DialogDescription>
              O prazo será vinculado a esta {rotuloOrigem(item.fonte).toLowerCase()} e a triagem será concluída.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor={`prazo-${item.id}`}>Data do prazo</Label>
            <Input id={`prazo-${item.id}`} type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAberto(false)}>Cancelar</Button>
            <Button disabled={salvando || !prazo} onClick={() => void salvar()}>Salvar prazo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
