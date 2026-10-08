import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Download, FileDown, Pencil, ScrollText, Settings, Trash2, Upload } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  dataPorExtenso,
  lerPlanilhaSubstabelecimento,
  type ClienteSubstabelecimento,
  type ItemSubstabelecimento,
} from "@/lib/substabelecimento";
import {
  lerPlanilhaCartaPreposicao,
  lerPrepostos,
  serializarPrepostos,
  type ItemCartaPreposicao,
} from "@/lib/carta-preposicao";
import {
  atualizarClienteSubstabelecimento,
  baixarCartaPreposicaoModeloCliente,
  baixarProcuracaoCliente,
  baixarSubstabelecimentoModeloCliente,
  criarClienteSubstabelecimento,
  enviarAssinaturaCliente,
  enviarCartaPreposicaoModeloCliente,
  enviarProcuracaoCliente,
  enviarSubstabelecimentoModeloCliente,
  excluirClienteSubstabelecimento,
  listarClientesSubstabelecimento,
  removerAssinaturaCliente,
  removerCartaPreposicaoModeloCliente,
  removerProcuracaoCliente,
  removerSubstabelecimentoModeloCliente,
} from "@/lib/clientes-substabelecimento";
import {
  gerarEBaixarPdfSubstabelecimento,
  gerarPdfSubstabelecimentos,
} from "@/lib/pdf-substabelecimento";
import {
  gerarEBaixarPdfCartaPreposicao,
  gerarPdfCartasPreposicao,
} from "@/lib/pdf-carta-preposicao";
import { baixarBlob } from "@/lib/pdf-base";

export const Route = createFileRoute("/_authenticated/docs-representacao")({
  head: () => ({
    meta: [
      { title: "Docs de Representação | FaroLex" },
      {
        name: "description",
        content:
          "Gera substabelecimentos e cartas de preposição no timbrado do escritório a partir de uma planilha.",
      },
    ],
  }),
  component: DocsRepresentacaoPage,
});

const TAMANHO_MAX = 20 * 1024 * 1024;
const EXTENSOES = [".xlsx", ".xls", ".xlsm"];

function DocsRepresentacaoPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 font-serif text-2xl font-semibold text-foreground">
          <ScrollText className="size-6" /> Docs de Representação
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Substabelecimentos e cartas de preposição gerados no timbrado do escritório a partir de
          uma planilha.
        </p>
      </div>

      <Tabs defaultValue="substabelecimento">
        <TabsList>
          <TabsTrigger value="substabelecimento">Substabelecimento</TabsTrigger>
          <TabsTrigger value="preposicao">Carta de Preposição</TabsTrigger>
        </TabsList>
        <TabsContent value="substabelecimento" className="space-y-6 pt-4">
          <AbaSubstabelecimento />
        </TabsContent>
        <TabsContent value="preposicao" className="space-y-6 pt-4">
          <AbaCartaPreposicao />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AbaSubstabelecimento() {
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const clientesQuery = useQuery({
    queryKey: ["clientes-substabelecimento"],
    queryFn: listarClientesSubstabelecimento,
  });
  const clientes = clientesQuery.data ?? [];
  const [clienteId, setClienteId] = useState("");
  const [itens, setItens] = useState<ItemSubstabelecimento[]>([]);
  const [nomeArquivo, setNomeArquivo] = useState<string | null>(null);
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());
  const [lendo, setLendo] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [gerandoIdx, setGerandoIdx] = useState<number | null>(null);
  const [editando, setEditando] = useState<ItemSubstabelecimento | null>(null);
  const [apagando, setApagando] = useState<ItemSubstabelecimento | null>(null);
  const [gerenciando, setGerenciando] = useState(false);

  useEffect(() => {
    if (!clienteId && clientesQuery.data && clientesQuery.data.length > 0) {
      setClienteId(clientesQuery.data[0]!.id);
    }
  }, [clientesQuery.data, clienteId]);

  const cliente = clientes.find((c) => c.id === clienteId) ?? null;
  const recarregarClientes = () =>
    queryClient.invalidateQueries({ queryKey: ["clientes-substabelecimento"] });

  const ler = async (arquivo: File) => {
    const nome = arquivo.name.toLowerCase();
    if (!EXTENSOES.some((ext) => nome.endsWith(ext))) {
      toast.error("Formato não suportado. Envie um arquivo .xlsx, .xls ou .xlsm.");
      return;
    }
    if (arquivo.size > TAMANHO_MAX) {
      toast.error("Arquivo muito grande (máximo 20 MB).");
      return;
    }
    setLendo(true);
    try {
      const lidos = lerPlanilhaSubstabelecimento(await arquivo.arrayBuffer());
      if (lidos.length === 0) {
        toast.error("Não encontrei nenhuma linha com processo nessa planilha.");
        return;
      }
      setItens(lidos);
      setNomeArquivo(arquivo.name);
      setSelecionados(new Set(lidos.map((n) => n.idx)));
      toast.success(`${lidos.length} documento(s) montado(s).`);
    } catch (e) {
      console.error("Erro ao ler planilha de substabelecimento:", e);
      const detalhe = e instanceof Error ? e.message : String(e);
      toast.error(`Não consegui ler o arquivo: ${detalhe}`);
    } finally {
      setLendo(false);
    }
  };

  const alternarSelecao = (idx: number) => {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(idx)) novo.delete(idx);
      else novo.add(idx);
      return novo;
    });
  };

  const marcarTodos = (marcar: boolean) => {
    setSelecionados(marcar ? new Set(itens.map((n) => n.idx)) : new Set());
  };

  const salvarEdicao = (item: ItemSubstabelecimento) => {
    setItens((atual) => atual.map((n) => (n.idx === item.idx ? item : n)));
    setEditando(null);
    toast.success("Documento atualizado.");
  };

  const apagar = () => {
    if (!apagando) return;
    setItens((atual) => atual.filter((n) => n.idx !== apagando.idx));
    setSelecionados((atual) => {
      const novo = new Set(atual);
      novo.delete(apagando.idx);
      return novo;
    });
    setApagando(null);
    toast.success("Documento removido da lista.");
  };

  const baixarUm = async (item: ItemSubstabelecimento) => {
    if (!cliente) return;
    setGerandoIdx(item.idx);
    try {
      await gerarEBaixarPdfSubstabelecimento(cliente, item);
    } catch {
      toast.error("Não consegui gerar esse documento.");
    } finally {
      setGerandoIdx(null);
    }
  };

  const gerarSelecionados = async () => {
    if (!cliente) return;
    const escolhidos = itens.filter((n) => selecionados.has(n.idx));
    if (escolhidos.length === 0) {
      toast.error("Selecione pelo menos um documento.");
      return;
    }
    setGerando(true);
    try {
      const blob = await gerarPdfSubstabelecimentos(cliente, escolhidos);
      baixarBlob(
        blob,
        `substabelecimentos-${cliente.id}-${new Date().toISOString().slice(0, 10)}.pdf`,
      );
      toast.success(`${escolhidos.length} documento(s) gerado(s) num PDF só.`);
    } catch {
      toast.error("Não consegui gerar os documentos.");
    } finally {
      setGerando(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">Cliente e arquivo</CardTitle>
          <CardDescription>Formatos aceitos: .xlsx, .xls e .xlsm (até 20 MB).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={clienteId} onValueChange={setClienteId}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder={clientesQuery.isLoading ? "Carregando..." : "Cliente"} />
              </SelectTrigger>
              <SelectContent>
                {clientes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {cliente?.assinaturaCaminho ? (
              <Badge variant="outline">
                Assinatura cadastrada: {cliente.assinanteNome ?? "sem nome informado"}
              </Badge>
            ) : (
              <Badge variant="secondary">Sem assinatura cadastrada — sai em branco</Badge>
            )}
            <Button type="button" variant="ghost" size="sm" onClick={() => setGerenciando(true)}>
              <Settings className="size-4" /> Clientes e assinaturas
            </Button>
          </div>
          {!clientesQuery.isLoading && clientes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum cliente cadastrado ainda. Clique em "Clientes e assinaturas" pra cadastrar o
              primeiro.
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.xlsm"
              disabled={lendo}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void ler(f);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => inputRef.current?.click()}
              disabled={lendo}
            >
              <Upload className="size-4" />
              {lendo ? "Lendo..." : "Subir planilha"}
            </Button>
            <Button
              type="button"
              onClick={() => void gerarSelecionados()}
              disabled={gerando || itens.length === 0 || !cliente}
            >
              <FileDown className="size-4" />
              {gerando ? "Gerando..." : "Gerar documentos"}
            </Button>
            {nomeArquivo ? (
              <span className="text-sm text-muted-foreground">{nomeArquivo}</span>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {itens.length > 0 ? (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="font-serif text-lg">
                  {itens.length} documento{itens.length === 1 ? "" : "s"}
                </CardTitle>
                <CardDescription>{selecionados.size} selecionado(s)</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => marcarTodos(true)}>
                  Marcar todos
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => marcarTodos(false)}
                >
                  Desmarcar todos
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                    <th className="p-2"></th>
                    <th className="p-2">Processo</th>
                    <th className="p-2">Autor</th>
                    <th className="p-2">Juízo</th>
                    <th className="p-2">Reserva</th>
                    <th className="p-2">Data</th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {itens.map((item) => (
                    <tr key={item.idx} className="border-b border-border/60">
                      <td className="p-2">
                        <Checkbox
                          checked={selecionados.has(item.idx)}
                          onCheckedChange={() => alternarSelecao(item.idx)}
                        />
                      </td>
                      <td className="p-2 font-mono text-xs">{item.processo ?? "—"}</td>
                      <td className="p-2">{item.autor ?? "—"}</td>
                      <td className="p-2">{item.juizo ?? "—"}</td>
                      <td className="p-2">{item.comReserva ? "Com reserva" : "Sem reserva"}</td>
                      <td className="p-2">
                        {item.cidade}, {dataPorExtenso(item.data)}
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Editar documento ${item.processo ?? item.idx + 1}`}
                            onClick={() => setEditando(item)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Apagar documento ${item.processo ?? item.idx + 1}`}
                            onClick={() => setApagando(item)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Baixar documento ${item.processo ?? item.idx + 1}`}
                            onClick={() => void baixarUm(item)}
                            disabled={gerandoIdx === item.idx || !cliente}
                          >
                            <Download className="size-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {itens.length > 0 ? (
        <Button
          type="button"
          onClick={() => void gerarSelecionados()}
          disabled={gerando || !cliente}
          className="fixed bottom-6 right-6 z-40 shadow-lg"
          size="lg"
        >
          <FileDown className="size-4" />
          {gerando ? "Gerando..." : `Gerar documentos (${selecionados.size})`}
        </Button>
      ) : null}

      <Dialog open={editando != null} onOpenChange={(aberto) => !aberto && setEditando(null)}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          {editando ? (
            <EditorItem
              item={editando}
              onSalvar={salvarEdicao}
              onCancelar={() => setEditando(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={apagando != null} onOpenChange={(aberto) => !aberto && setApagando(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar esse documento?</AlertDialogTitle>
            <AlertDialogDescription>
              O documento do processo {apagando?.processo ?? `#${(apagando?.idx ?? 0) + 1}`} sai da
              lista (não mexe em nada do sistema, só tira ele daqui antes de gerar).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={apagar}>Apagar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <GerenciarClientesDialog
        open={gerenciando}
        onOpenChange={setGerenciando}
        clientes={clientes}
        onChanged={recarregarClientes}
      />
    </div>
  );
}

function AbaCartaPreposicao() {
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const clientesQuery = useQuery({
    queryKey: ["clientes-substabelecimento"],
    queryFn: listarClientesSubstabelecimento,
  });
  const clientes = clientesQuery.data ?? [];
  const [clienteId, setClienteId] = useState("");
  const [itens, setItens] = useState<ItemCartaPreposicao[]>([]);
  const [nomeArquivo, setNomeArquivo] = useState<string | null>(null);
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());
  const [lendo, setLendo] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [gerandoIdx, setGerandoIdx] = useState<number | null>(null);
  const [editando, setEditando] = useState<ItemCartaPreposicao | null>(null);
  const [apagando, setApagando] = useState<ItemCartaPreposicao | null>(null);
  const [gerenciando, setGerenciando] = useState(false);

  useEffect(() => {
    if (!clienteId && clientesQuery.data && clientesQuery.data.length > 0) {
      setClienteId(clientesQuery.data[0]!.id);
    }
  }, [clientesQuery.data, clienteId]);

  const cliente = clientes.find((c) => c.id === clienteId) ?? null;
  const recarregarClientes = () =>
    queryClient.invalidateQueries({ queryKey: ["clientes-substabelecimento"] });

  const ler = async (arquivo: File) => {
    const nome = arquivo.name.toLowerCase();
    if (!EXTENSOES.some((ext) => nome.endsWith(ext))) {
      toast.error("Formato não suportado. Envie um arquivo .xlsx, .xls ou .xlsm.");
      return;
    }
    if (arquivo.size > TAMANHO_MAX) {
      toast.error("Arquivo muito grande (máximo 20 MB).");
      return;
    }
    setLendo(true);
    try {
      const lidos = lerPlanilhaCartaPreposicao(await arquivo.arrayBuffer());
      if (lidos.length === 0) {
        toast.error("Não encontrei nenhuma linha com processo nessa planilha.");
        return;
      }
      setItens(lidos);
      setNomeArquivo(arquivo.name);
      setSelecionados(new Set(lidos.map((n) => n.idx)));
      toast.success(`${lidos.length} documento(s) montado(s).`);
    } catch (e) {
      console.error("Erro ao ler planilha de carta de preposição:", e);
      const detalhe = e instanceof Error ? e.message : String(e);
      toast.error(`Não consegui ler o arquivo: ${detalhe}`);
    } finally {
      setLendo(false);
    }
  };

  const alternarSelecao = (idx: number) => {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(idx)) novo.delete(idx);
      else novo.add(idx);
      return novo;
    });
  };

  const marcarTodos = (marcar: boolean) => {
    setSelecionados(marcar ? new Set(itens.map((n) => n.idx)) : new Set());
  };

  const salvarEdicao = (item: ItemCartaPreposicao) => {
    setItens((atual) => atual.map((n) => (n.idx === item.idx ? item : n)));
    setEditando(null);
    toast.success("Documento atualizado.");
  };

  const apagar = () => {
    if (!apagando) return;
    setItens((atual) => atual.filter((n) => n.idx !== apagando.idx));
    setSelecionados((atual) => {
      const novo = new Set(atual);
      novo.delete(apagando.idx);
      return novo;
    });
    setApagando(null);
    toast.success("Documento removido da lista.");
  };

  const baixarUm = async (item: ItemCartaPreposicao) => {
    if (!cliente) return;
    setGerandoIdx(item.idx);
    try {
      await gerarEBaixarPdfCartaPreposicao(cliente, item);
    } catch {
      toast.error("Não consegui gerar esse documento.");
    } finally {
      setGerandoIdx(null);
    }
  };

  const gerarSelecionados = async () => {
    if (!cliente) return;
    const escolhidos = itens.filter((n) => selecionados.has(n.idx));
    if (escolhidos.length === 0) {
      toast.error("Selecione pelo menos um documento.");
      return;
    }
    setGerando(true);
    try {
      const blob = await gerarPdfCartasPreposicao(cliente, escolhidos);
      baixarBlob(
        blob,
        `cartas-preposicao-${cliente.id}-${new Date().toISOString().slice(0, 10)}.pdf`,
      );
      toast.success(`${escolhidos.length} documento(s) gerado(s) num PDF só.`);
    } catch {
      toast.error("Não consegui gerar os documentos.");
    } finally {
      setGerando(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">Cliente e arquivo</CardTitle>
          <CardDescription>
            Formatos aceitos: .xlsx, .xls e .xlsm (até 20 MB). Coluna "Prepostos": um preposto por
            linha dentro da célula, no formato "Nome - CPF".
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={clienteId} onValueChange={setClienteId}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder={clientesQuery.isLoading ? "Carregando..." : "Cliente"} />
              </SelectTrigger>
              <SelectContent>
                {clientes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {cliente?.assinaturaCaminho ? (
              <Badge variant="outline">
                Assinatura cadastrada: {cliente.assinanteNome ?? "sem nome informado"}
              </Badge>
            ) : (
              <Badge variant="secondary">Sem assinatura cadastrada — sai em branco</Badge>
            )}
            <Button type="button" variant="ghost" size="sm" onClick={() => setGerenciando(true)}>
              <Settings className="size-4" /> Clientes e assinaturas
            </Button>
          </div>
          {!clientesQuery.isLoading && clientes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum cliente cadastrado ainda. Clique em "Clientes e assinaturas" pra cadastrar o
              primeiro.
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.xlsm"
              disabled={lendo}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void ler(f);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => inputRef.current?.click()}
              disabled={lendo}
            >
              <Upload className="size-4" />
              {lendo ? "Lendo..." : "Subir planilha"}
            </Button>
            <Button
              type="button"
              onClick={() => void gerarSelecionados()}
              disabled={gerando || itens.length === 0 || !cliente}
            >
              <FileDown className="size-4" />
              {gerando ? "Gerando..." : "Gerar documentos"}
            </Button>
            {nomeArquivo ? (
              <span className="text-sm text-muted-foreground">{nomeArquivo}</span>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {itens.length > 0 ? (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="font-serif text-lg">
                  {itens.length} documento{itens.length === 1 ? "" : "s"}
                </CardTitle>
                <CardDescription>{selecionados.size} selecionado(s)</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => marcarTodos(true)}>
                  Marcar todos
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => marcarTodos(false)}
                >
                  Desmarcar todos
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                    <th className="p-2"></th>
                    <th className="p-2">Processo</th>
                    <th className="p-2">Polo ativo</th>
                    <th className="p-2">Juízo</th>
                    <th className="p-2">Prepostos</th>
                    <th className="p-2">Data</th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {itens.map((item) => (
                    <tr key={item.idx} className="border-b border-border/60">
                      <td className="p-2">
                        <Checkbox
                          checked={selecionados.has(item.idx)}
                          onCheckedChange={() => alternarSelecao(item.idx)}
                        />
                      </td>
                      <td className="p-2 font-mono text-xs">{item.processo ?? "—"}</td>
                      <td className="p-2">{item.poloAtivo ?? "—"}</td>
                      <td className="p-2">{item.juizo ?? "—"}</td>
                      <td className="p-2">
                        {item.prepostos.length === 0
                          ? "—"
                          : `${item.prepostos.length} preposto${item.prepostos.length === 1 ? "" : "s"}`}
                      </td>
                      <td className="p-2">
                        {item.cidade}, {dataPorExtenso(item.data)}
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Editar documento ${item.processo ?? item.idx + 1}`}
                            onClick={() => setEditando(item)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Apagar documento ${item.processo ?? item.idx + 1}`}
                            onClick={() => setApagando(item)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Baixar documento ${item.processo ?? item.idx + 1}`}
                            onClick={() => void baixarUm(item)}
                            disabled={gerandoIdx === item.idx || !cliente}
                          >
                            <Download className="size-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {itens.length > 0 ? (
        <Button
          type="button"
          onClick={() => void gerarSelecionados()}
          disabled={gerando || !cliente}
          className="fixed bottom-6 right-6 z-40 shadow-lg"
          size="lg"
        >
          <FileDown className="size-4" />
          {gerando ? "Gerando..." : `Gerar documentos (${selecionados.size})`}
        </Button>
      ) : null}

      <Dialog open={editando != null} onOpenChange={(aberto) => !aberto && setEditando(null)}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          {editando ? (
            <EditorItemPreposicao
              item={editando}
              onSalvar={salvarEdicao}
              onCancelar={() => setEditando(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={apagando != null} onOpenChange={(aberto) => !aberto && setApagando(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar esse documento?</AlertDialogTitle>
            <AlertDialogDescription>
              O documento do processo {apagando?.processo ?? `#${(apagando?.idx ?? 0) + 1}`} sai da
              lista (não mexe em nada do sistema, só tira ele daqui antes de gerar).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={apagar}>Apagar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <GerenciarClientesDialog
        open={gerenciando}
        onOpenChange={setGerenciando}
        clientes={clientes}
        onChanged={recarregarClientes}
      />
    </div>
  );
}

function EditorItemPreposicao({
  item,
  onSalvar,
  onCancelar,
}: {
  item: ItemCartaPreposicao;
  onSalvar: (item: ItemCartaPreposicao) => void;
  onCancelar: () => void;
}) {
  const [form, setForm] = useState<ItemCartaPreposicao>(item);
  const [prepostosTexto, setPrepostosTexto] = useState(() => serializarPrepostos(item.prepostos));

  const campoTexto = (rotulo: string, chave: "processo" | "poloAtivo" | "juizo" | "cidade") => (
    <div className="space-y-1">
      <Label htmlFor={`preposicao-${chave}`}>{rotulo}</Label>
      <Input
        id={`preposicao-${chave}`}
        value={form[chave] ?? ""}
        onChange={(e) => setForm((atual) => ({ ...atual, [chave]: e.target.value || null }))}
      />
    </div>
  );

  const salvar = () => {
    onSalvar({ ...form, prepostos: lerPrepostos(prepostosTexto) });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Editar documento</DialogTitle>
        <DialogDescription>
          Ajusta os dados antes de gerar. Isso não altera a planilha original.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-3">
        {campoTexto("Processo", "processo")}
        {campoTexto("Polo ativo", "poloAtivo")}
        {campoTexto("Juízo", "juizo")}
        <div className="space-y-1">
          <Label htmlFor="preposicao-prepostos">Prepostos (um por linha, "Nome - CPF")</Label>
          <Textarea
            id="preposicao-prepostos"
            rows={4}
            value={prepostosTexto}
            onChange={(e) => setPrepostosTexto(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {campoTexto("Cidade", "cidade")}
          <div className="space-y-1">
            <Label htmlFor="preposicao-data">Data</Label>
            <Input
              id="preposicao-data"
              type="date"
              value={form.data}
              onChange={(e) => setForm((atual) => ({ ...atual, data: e.target.value }))}
            />
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="button" onClick={salvar}>
          Salvar
        </Button>
      </DialogFooter>
    </>
  );
}

function GerenciarClientesDialog({
  open,
  onOpenChange,
  clientes,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clientes: ClienteSubstabelecimento[];
  onChanged: () => void;
}) {
  const [novoNome, setNovoNome] = useState("");
  const [novoTexto, setNovoTexto] = useState("");
  const [criando, setCriando] = useState(false);
  const [editando, setEditando] = useState<ClienteSubstabelecimento | null>(null);
  const [assinaturaDe, setAssinaturaDe] = useState<ClienteSubstabelecimento | null>(null);
  const [procuracaoDe, setProcuracaoDe] = useState<ClienteSubstabelecimento | null>(null);
  const [cartaModeloDe, setCartaModeloDe] = useState<ClienteSubstabelecimento | null>(null);
  const [substabModeloDe, setSubstabModeloDe] = useState<ClienteSubstabelecimento | null>(null);
  const [excluindo, setExcluindo] = useState<ClienteSubstabelecimento | null>(null);

  const criar = async () => {
    if (!novoNome.trim() || !novoTexto.trim()) {
      toast.error("Preencha o nome e o texto do outorgante.");
      return;
    }
    setCriando(true);
    try {
      await criarClienteSubstabelecimento(novoNome.trim(), novoTexto.trim());
      toast.success("Cliente cadastrado.");
      setNovoNome("");
      setNovoTexto("");
      onChanged();
    } catch (e) {
      console.error("Erro ao cadastrar cliente de substabelecimento:", e);
      toast.error("Não consegui cadastrar esse cliente.");
    } finally {
      setCriando(false);
    }
  };

  const excluir = async () => {
    if (!excluindo) return;
    try {
      await excluirClienteSubstabelecimento(excluindo);
      toast.success("Cliente removido.");
      onChanged();
    } catch (e) {
      console.error("Erro ao excluir cliente de substabelecimento:", e);
      toast.error("Não consegui remover esse cliente.");
    } finally {
      setExcluindo(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Clientes e assinaturas</DialogTitle>
            <DialogDescription>
              Cadastre o cliente e, se quiser, suba a imagem da assinatura (PNG ou JPG) — ela fica
              guardada de forma privada e só é usada nos documentos desse cliente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2 rounded-md border border-border p-3">
              <p className="text-sm font-medium">Novo cliente</p>
              <Input
                placeholder="Nome (ex.: KLM)"
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
              />
              <Input
                placeholder="Como aparece no texto (ex.: KLM – Cia Real Holandesa de Aviação)"
                value={novoTexto}
                onChange={(e) => setNovoTexto(e.target.value)}
              />
              <Button type="button" size="sm" onClick={() => void criar()} disabled={criando}>
                {criando ? "Cadastrando..." : "Cadastrar cliente"}
              </Button>
            </div>

            <div className="space-y-2">
              {clientes.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum cliente cadastrado ainda.</p>
              ) : (
                clientes.map((c) => (
                  <div
                    key={c.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{c.nome}</p>
                      <p className="truncate text-xs text-muted-foreground">{c.textoOutorgante}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {c.assinaturaCaminho ? (
                          <Badge variant="outline">
                            Assinatura: {c.assinanteNome ?? "cadastrada"}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Sem assinatura</Badge>
                        )}
                        {c.procuracaoCaminho ? (
                          <Badge variant="outline">Procuração cadastrada</Badge>
                        ) : (
                          <Badge variant="secondary">Sem procuração</Badge>
                        )}
                        {c.cartaPreposicaoCaminho ? (
                          <Badge variant="outline">Modelo de carta cadastrado</Badge>
                        ) : (
                          <Badge variant="secondary">Sem modelo de carta</Badge>
                        )}
                        {c.substabelecimentoModeloCaminho ? (
                          <Badge variant="outline">Modelo de substabelecimento cadastrado</Badge>
                        ) : (
                          <Badge variant="secondary">Sem modelo de substabelecimento</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setEditando(c)}
                      >
                        Editar
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setAssinaturaDe(c)}
                      >
                        Assinatura
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setProcuracaoDe(c)}
                      >
                        Procuração
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCartaModeloDe(c)}
                      >
                        Carta de Preposição
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSubstabModeloDe(c)}
                      >
                        Substabelecimento
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Excluir cliente ${c.nome}`}
                        onClick={() => setExcluindo(c)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editando != null} onOpenChange={(v) => !v && setEditando(null)}>
        <DialogContent className="max-w-md">
          {editando ? (
            <EditorCliente
              cliente={editando}
              onSalvar={() => {
                setEditando(null);
                onChanged();
              }}
              onCancelar={() => setEditando(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={assinaturaDe != null} onOpenChange={(v) => !v && setAssinaturaDe(null)}>
        <DialogContent className="max-w-md">
          {assinaturaDe ? (
            <EditorAssinatura
              cliente={assinaturaDe}
              onSalvar={() => {
                setAssinaturaDe(null);
                onChanged();
              }}
              onCancelar={() => setAssinaturaDe(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={procuracaoDe != null} onOpenChange={(v) => !v && setProcuracaoDe(null)}>
        <DialogContent className="max-w-md">
          {procuracaoDe ? (
            <EditorPdfCliente
              titulo={`Procuração de ${procuracaoDe.nome}`}
              descricao="Guarda só a versão atual — subir um novo arquivo substitui o anterior."
              caminhoAtual={procuracaoDe.procuracaoCaminho}
              nomeArquivoAtual={procuracaoDe.procuracaoNomeArquivo}
              onEnviar={(arquivo) => enviarProcuracaoCliente(procuracaoDe, arquivo)}
              onRemover={() => removerProcuracaoCliente(procuracaoDe)}
              onBaixar={() => baixarProcuracaoCliente(procuracaoDe)}
              onSalvar={() => {
                setProcuracaoDe(null);
                onChanged();
              }}
              onCancelar={() => setProcuracaoDe(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={cartaModeloDe != null} onOpenChange={(v) => !v && setCartaModeloDe(null)}>
        <DialogContent className="max-w-md">
          {cartaModeloDe ? (
            <EditorPdfCliente
              titulo={`Carta de Preposição (modelo) de ${cartaModeloDe.nome}`}
              descricao="PDF já pronto, pra quando não precisar passar pela planilha. Guarda só a versão atual — subir um novo arquivo substitui o anterior."
              caminhoAtual={cartaModeloDe.cartaPreposicaoCaminho}
              nomeArquivoAtual={cartaModeloDe.cartaPreposicaoNomeArquivo}
              onEnviar={(arquivo) => enviarCartaPreposicaoModeloCliente(cartaModeloDe, arquivo)}
              onRemover={() => removerCartaPreposicaoModeloCliente(cartaModeloDe)}
              onBaixar={() => baixarCartaPreposicaoModeloCliente(cartaModeloDe)}
              onSalvar={() => {
                setCartaModeloDe(null);
                onChanged();
              }}
              onCancelar={() => setCartaModeloDe(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={substabModeloDe != null} onOpenChange={(v) => !v && setSubstabModeloDe(null)}>
        <DialogContent className="max-w-md">
          {substabModeloDe ? (
            <EditorPdfCliente
              titulo={`Substabelecimento (modelo) de ${substabModeloDe.nome}`}
              descricao="PDF já pronto, pra cliente com texto/rol de advogados próprio, diferente da cláusula padrão do gerador. Guarda só a versão atual — subir um novo arquivo substitui o anterior."
              caminhoAtual={substabModeloDe.substabelecimentoModeloCaminho}
              nomeArquivoAtual={substabModeloDe.substabelecimentoModeloNomeArquivo}
              onEnviar={(arquivo) => enviarSubstabelecimentoModeloCliente(substabModeloDe, arquivo)}
              onRemover={() => removerSubstabelecimentoModeloCliente(substabModeloDe)}
              onBaixar={() => baixarSubstabelecimentoModeloCliente(substabModeloDe)}
              onSalvar={() => {
                setSubstabModeloDe(null);
                onChanged();
              }}
              onCancelar={() => setSubstabModeloDe(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={excluindo != null} onOpenChange={(v) => !v && setExcluindo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {excluindo?.nome}?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso apaga o cadastro e os arquivos desse cliente (assinatura, procuração e modelos de
              carta/substabelecimento, se tiver). Não afeta documentos já baixados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void excluir()}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function EditorCliente({
  cliente,
  onSalvar,
  onCancelar,
}: {
  cliente: ClienteSubstabelecimento;
  onSalvar: () => void;
  onCancelar: () => void;
}) {
  const [nome, setNome] = useState(cliente.nome);
  const [texto, setTexto] = useState(cliente.textoOutorgante);
  const [salvando, setSalvando] = useState(false);

  const salvar = async () => {
    if (!nome.trim() || !texto.trim()) {
      toast.error("Preencha o nome e o texto do outorgante.");
      return;
    }
    setSalvando(true);
    try {
      await atualizarClienteSubstabelecimento(cliente.id, {
        nome: nome.trim(),
        textoOutorgante: texto.trim(),
      });
      toast.success("Cliente atualizado.");
      onSalvar();
    } catch (e) {
      console.error("Erro ao atualizar cliente de substabelecimento:", e);
      toast.error("Não consegui salvar.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Editar cliente</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="cliente-nome">Nome</Label>
          <Input id="cliente-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cliente-texto">Como aparece no texto</Label>
          <Input id="cliente-texto" value={texto} onChange={(e) => setTexto(e.target.value)} />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="button" onClick={() => void salvar()} disabled={salvando}>
          {salvando ? "Salvando..." : "Salvar"}
        </Button>
      </DialogFooter>
    </>
  );
}

function EditorAssinatura({
  cliente,
  onSalvar,
  onCancelar,
}: {
  cliente: ClienteSubstabelecimento;
  onSalvar: () => void;
  onCancelar: () => void;
}) {
  const [assinanteNome, setAssinanteNome] = useState(cliente.assinanteNome ?? "");
  const [assinanteOab, setAssinanteOab] = useState(cliente.assinanteOab ?? "");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [removendo, setRemovendo] = useState(false);

  const enviar = async () => {
    if (!arquivo) {
      toast.error("Escolha uma imagem (PNG ou JPG).");
      return;
    }
    setEnviando(true);
    try {
      await enviarAssinaturaCliente(cliente, arquivo, assinanteNome.trim(), assinanteOab.trim());
      toast.success("Assinatura salva.");
      onSalvar();
    } catch (e) {
      const detalhe = e instanceof Error ? e.message : String(e);
      toast.error(`Não consegui salvar a assinatura: ${detalhe}`);
    } finally {
      setEnviando(false);
    }
  };

  const remover = async () => {
    setRemovendo(true);
    try {
      await removerAssinaturaCliente(cliente);
      toast.success("Assinatura removida.");
      onSalvar();
    } catch (e) {
      console.error("Erro ao remover assinatura:", e);
      toast.error("Não consegui remover a assinatura.");
    } finally {
      setRemovendo(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Assinatura de {cliente.nome}</DialogTitle>
        <DialogDescription>
          Envie um recorte com a assinatura (pode já incluir nome e OAB impressos, como no modelo).
          Fica guardada de forma privada.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="assinatura-arquivo">Imagem (PNG ou JPG)</Label>
          <Input
            id="assinatura-arquivo"
            type="file"
            accept="image/png,image/jpeg"
            onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="assinatura-nome">Nome de quem assina</Label>
            <Input
              id="assinatura-nome"
              value={assinanteNome}
              onChange={(e) => setAssinanteNome(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="assinatura-oab">OAB</Label>
            <Input
              id="assinatura-oab"
              value={assinanteOab}
              onChange={(e) => setAssinanteOab(e.target.value)}
            />
          </div>
        </div>
        {cliente.assinaturaCaminho ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void remover()}
            disabled={removendo}
          >
            {removendo ? "Removendo..." : "Remover assinatura atual"}
          </Button>
        ) : null}
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="button" onClick={() => void enviar()} disabled={enviando}>
          {enviando ? "Enviando..." : "Salvar assinatura"}
        </Button>
      </DialogFooter>
    </>
  );
}

// Editor genérico pra "um PDF só, só a versão atual" vinculado a um
// cliente -- usado tanto pra procuração quanto pro modelo de carta de
// preposição (mesmo comportamento, só muda o texto e as funções).
function EditorPdfCliente({
  titulo,
  descricao,
  caminhoAtual,
  nomeArquivoAtual,
  onEnviar,
  onRemover,
  onBaixar,
  onSalvar,
  onCancelar,
}: {
  titulo: string;
  descricao: string;
  caminhoAtual: string | null;
  nomeArquivoAtual: string | null;
  onEnviar: (arquivo: File) => Promise<void>;
  onRemover: () => Promise<void>;
  onBaixar: () => Promise<void>;
  onSalvar: () => void;
  onCancelar: () => void;
}) {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [removendo, setRemovendo] = useState(false);
  const [baixando, setBaixando] = useState(false);

  const enviar = async () => {
    if (!arquivo) {
      toast.error("Escolha um arquivo PDF.");
      return;
    }
    setEnviando(true);
    try {
      await onEnviar(arquivo);
      toast.success("Arquivo salvo.");
      onSalvar();
    } catch (e) {
      const detalhe = e instanceof Error ? e.message : String(e);
      toast.error(`Não consegui salvar o arquivo: ${detalhe}`);
    } finally {
      setEnviando(false);
    }
  };

  const remover = async () => {
    setRemovendo(true);
    try {
      await onRemover();
      toast.success("Arquivo removido.");
      onSalvar();
    } catch (e) {
      console.error("Erro ao remover arquivo do cliente:", e);
      toast.error("Não consegui remover o arquivo.");
    } finally {
      setRemovendo(false);
    }
  };

  const baixar = async () => {
    setBaixando(true);
    try {
      await onBaixar();
    } catch (e) {
      console.error("Erro ao baixar arquivo do cliente:", e);
      toast.error("Não consegui abrir o arquivo.");
    } finally {
      setBaixando(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{titulo}</DialogTitle>
        <DialogDescription>{descricao}</DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        {caminhoAtual ? (
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-border p-2 text-sm">
            <span className="min-w-0 flex-1 truncate">{nomeArquivoAtual ?? "arquivo.pdf"}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void baixar()}
              disabled={baixando}
            >
              {baixando ? "Abrindo..." : "Baixar"}
            </Button>
          </div>
        ) : null}
        <div className="space-y-1">
          <Label htmlFor="pdf-cliente-arquivo">
            {caminhoAtual ? "Substituir por outro PDF" : "Arquivo PDF"}
          </Label>
          <Input
            id="pdf-cliente-arquivo"
            type="file"
            accept="application/pdf"
            onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
          />
        </div>
        {caminhoAtual ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void remover()}
            disabled={removendo}
          >
            {removendo ? "Removendo..." : "Remover arquivo atual"}
          </Button>
        ) : null}
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="button" onClick={() => void enviar()} disabled={enviando}>
          {enviando ? "Enviando..." : "Salvar"}
        </Button>
      </DialogFooter>
    </>
  );
}

function EditorItem({
  item,
  onSalvar,
  onCancelar,
}: {
  item: ItemSubstabelecimento;
  onSalvar: (item: ItemSubstabelecimento) => void;
  onCancelar: () => void;
}) {
  const [form, setForm] = useState<ItemSubstabelecimento>(item);

  const campoTexto = (rotulo: string, chave: "processo" | "autor" | "juizo" | "cidade") => (
    <div className="space-y-1">
      <Label htmlFor={`substab-${chave}`}>{rotulo}</Label>
      <Input
        id={`substab-${chave}`}
        value={form[chave] ?? ""}
        onChange={(e) => setForm((atual) => ({ ...atual, [chave]: e.target.value || null }))}
      />
    </div>
  );

  return (
    <>
      <DialogHeader>
        <DialogTitle>Editar documento</DialogTitle>
        <DialogDescription>
          Ajusta os dados antes de gerar. Isso não altera a planilha original.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-3">
        {campoTexto("Processo", "processo")}
        {campoTexto("Autor", "autor")}
        {campoTexto("Juízo", "juizo")}
        <div className="grid grid-cols-2 gap-3">
          {campoTexto("Cidade", "cidade")}
          <div className="space-y-1">
            <Label htmlFor="substab-data">Data</Label>
            <Input
              id="substab-data"
              type="date"
              value={form.data}
              onChange={(e) => setForm((atual) => ({ ...atual, data: e.target.value }))}
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="substab-reserva">Reserva de poderes</Label>
          <Select
            value={form.comReserva ? "com" : "sem"}
            onValueChange={(v) => setForm((atual) => ({ ...atual, comReserva: v === "com" }))}
          >
            <SelectTrigger id="substab-reserva">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="com">Com reserva</SelectItem>
              <SelectItem value="sem">Sem reserva</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="button" onClick={() => onSalvar(form)}>
          Salvar
        </Button>
      </DialogFooter>
    </>
  );
}
