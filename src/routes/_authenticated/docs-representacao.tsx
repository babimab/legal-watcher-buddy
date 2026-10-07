import { createFileRoute, redirect } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Download, FileDown, Pencil, ScrollText, Trash2, Upload } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  buscarClienteSubstabelecimento,
  CLIENTES_SUBSTABELECIMENTO,
  dataPorExtenso,
  lerPlanilhaSubstabelecimento,
  SIGLAS_PERMITIDAS_REPRESENTACAO,
  type ClienteSubstabelecimento,
  type ItemSubstabelecimento,
} from "@/lib/substabelecimento";
import {
  gerarEBaixarPdfSubstabelecimento,
  gerarPdfSubstabelecimentos,
} from "@/lib/pdf-substabelecimento";
import { baixarBlob } from "@/lib/pdf-base";
import { carregarUsuarioAtual, siglaDoEmail } from "@/lib/processos";

export const Route = createFileRoute("/_authenticated/docs-representacao")({
  // Dado sensível (cita cliente/processo e carrega assinatura escaneada
  // de sócio) -- mesma trava de acesso da Fatura.
  beforeLoad: async () => {
    const usuario = await carregarUsuarioAtual();
    const sigla = (usuario.sigla || siglaDoEmail(usuario.email) || "").toUpperCase();
    if (!SIGLAS_PERMITIDAS_REPRESENTACAO.includes(sigla)) {
      throw redirect({ to: "/painel" });
    }
  },
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
          <TabsTrigger value="preposicao" disabled>
            Carta de Preposição (em breve)
          </TabsTrigger>
        </TabsList>
        <TabsContent value="substabelecimento" className="space-y-6 pt-4">
          <AbaSubstabelecimento />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AbaSubstabelecimento() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [clienteId, setClienteId] = useState(CLIENTES_SUBSTABELECIMENTO[0]?.id ?? "");
  const [itens, setItens] = useState<ItemSubstabelecimento[]>([]);
  const [nomeArquivo, setNomeArquivo] = useState<string | null>(null);
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());
  const [lendo, setLendo] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [gerandoIdx, setGerandoIdx] = useState<number | null>(null);
  const [editando, setEditando] = useState<ItemSubstabelecimento | null>(null);
  const [apagando, setApagando] = useState<ItemSubstabelecimento | null>(null);

  const cliente = buscarClienteSubstabelecimento(clienteId);

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
                <SelectValue placeholder="Cliente" />
              </SelectTrigger>
              <SelectContent>
                {CLIENTES_SUBSTABELECIMENTO.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {cliente?.assinante ? (
              <Badge variant="outline">Assinatura cadastrada: {cliente.assinante.nome}</Badge>
            ) : (
              <Badge variant="secondary">Sem assinatura cadastrada — sai em branco</Badge>
            )}
          </div>

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
    </div>
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
