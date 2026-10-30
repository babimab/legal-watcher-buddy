import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  Check,
  Download,
  FileDown,
  FileText,
  Files,
  FolderOpen,
  Mail,
  MapPin,
  Pencil,
  ScrollText,
  Settings,
  Trash2,
  Upload,
} from "lucide-react";
import JSZip from "jszip";

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
import { cn } from "@/lib/utils";
import {
  dataPorExtenso,
  encontrarClientePorNome,
  clienteAdHoc,
  lerPlanilhaSubstabelecimento,
  normalizar,
  ufDoItem,
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
  gerarPdfsSubstabelecimentosSeparados,
} from "@/lib/pdf-substabelecimento";
import {
  gerarPdfProcuracaoPreenchida,
  nomeArquivoProcuracaoPreenchida,
} from "@/lib/pdf-procuracao-substabelecimento";
import {
  gerarEBaixarPdfCartaPreposicao,
  gerarPdfCartasPreposicao,
  gerarPdfsCartasPreposicaoSeparadas,
} from "@/lib/pdf-carta-preposicao";
import {
  gerarEBaixarPdfSubstabelecimentoCorrespondente,
  gerarPdfSubstabelecimentosCorrespondente,
  gerarPdfsSubstabelecimentosCorrespondenteSeparados,
} from "@/lib/pdf-substabelecimento-correspondente";
import {
  atualizarModeloCorrespondente,
  baixarPdfReferenciaModeloCorrespondente,
  criarModeloCorrespondente,
  enviarAssinaturaModeloCorrespondente,
  enviarPdfReferenciaModeloCorrespondente,
  excluirModeloCorrespondente,
  listarModelosCorrespondente,
  removerAssinaturaModeloCorrespondente,
  removerPdfReferenciaModeloCorrespondente,
  type ModeloCorrespondente,
} from "@/lib/modelos-correspondente";
import {
  gerarEBaixarPdfCartaPreposicaoCorrespondente,
  gerarPdfCartasPreposicaoCorrespondente,
  gerarPdfsCartasPreposicaoCorrespondenteSeparadas,
} from "@/lib/pdf-carta-preposicao-correspondente";
import {
  atualizarModeloCartaPreposicaoCorrespondente,
  baixarPdfReferenciaModeloCartaPreposicaoCorrespondente,
  criarModeloCartaPreposicaoCorrespondente,
  enviarAssinaturaModeloCartaPreposicaoCorrespondente,
  enviarPdfReferenciaModeloCartaPreposicaoCorrespondente,
  excluirModeloCartaPreposicaoCorrespondente,
  listarModelosCartaPreposicaoCorrespondente,
  removerAssinaturaModeloCartaPreposicaoCorrespondente,
  removerPdfReferenciaModeloCartaPreposicaoCorrespondente,
  type ModeloCartaPreposicaoCorrespondente,
} from "@/lib/modelos-carta-preposicao-correspondente";
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

// Erro do Supabase não é uma instância de Error de verdade (é um objeto
// simples { message, code, details, hint }), então "e instanceof Error"
// falha pra ele e "String(e)" vira "[object Object]" -- inútil pra
// mostrar na tela. Pega a mensagem de qualquer formato razoável antes
// de desistir e usar String(e).
function mensagemErro(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object" && "message" in e) {
    const msg = (e as { message: unknown }).message;
    if (typeof msg === "string" && msg) return msg;
  }
  return String(e);
}

type TipoDocRepresentacao =
  | "substabelecimento"
  | "substabelecimentoCorrespondente"
  | "preposicao"
  | "preposicaoCorrespondente";

function CartaoTipoDoc({
  selecionado,
  icone,
  titulo,
  descricao,
  onClick,
}: {
  selecionado: boolean;
  icone: ReactNode;
  titulo: string;
  descricao: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selecionado}
      onClick={onClick}
      className={cn(
        "flex min-w-[260px] flex-1 flex-col gap-3 rounded-xl border p-5 text-left transition-colors",
        selecionado ? "border-primary bg-accent" : "border-border bg-card hover:bg-accent/50",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex size-11 items-center justify-center rounded-lg bg-accent text-primary">
          {icone}
        </div>
        {selecionado ? (
          <div className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Check className="size-3" />
          </div>
        ) : null}
      </div>
      <div>
        <h2 className="font-serif text-base font-semibold text-foreground">{titulo}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">{descricao}</p>
      </div>
    </button>
  );
}

function DocsRepresentacaoPage() {
  const [aba, setAba] = useState<TipoDocRepresentacao>("substabelecimento");

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

      <div className="flex flex-wrap gap-4">
        <CartaoTipoDoc
          selecionado={aba === "substabelecimento"}
          icone={<FileText className="size-5" />}
          titulo="Substabelecimento para Advogados BCW"
          descricao="Gera o documento de substabelecimento a partir de uma planilha, casando cada linha com a companhia certa."
          onClick={() => setAba("substabelecimento")}
        />
        <CartaoTipoDoc
          selecionado={aba === "substabelecimentoCorrespondente"}
          icone={<MapPin className="size-5" />}
          titulo="Substabelecimento para o Correspondente Local"
          descricao="A BCW substabelece pra lista de correspondentes de um estado, em vez de pros sócios do escritório."
          onClick={() => setAba("substabelecimentoCorrespondente")}
        />
        <CartaoTipoDoc
          selecionado={aba === "preposicao"}
          icone={<Mail className="size-5" />}
          titulo="Carta de Preposição"
          descricao="Gera a carta de preposto a partir de uma planilha, também casada por companhia aérea."
          onClick={() => setAba("preposicao")}
        />
        <CartaoTipoDoc
          selecionado={aba === "preposicaoCorrespondente"}
          icone={<MapPin className="size-5" />}
          titulo="Carta de Preposição para o Correspondente Local"
          descricao="Credencia a lista de prepostos de um estado, em vez de nomear prepostos um a um."
          onClick={() => setAba("preposicaoCorrespondente")}
        />
      </div>

      {aba === "substabelecimento" ? <AbaSubstabelecimento /> : null}
      {aba === "substabelecimentoCorrespondente" ? <AbaSubstabelecimentoCorrespondente /> : null}
      {aba === "preposicao" ? <AbaCartaPreposicao /> : null}
      {aba === "preposicaoCorrespondente" ? <AbaCartaPreposicaoCorrespondente /> : null}
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
  const [gerandoZip, setGerandoZip] = useState(false);
  const [gerandoIdx, setGerandoIdx] = useState<number | null>(null);
  const [cadastrandoIdx, setCadastrandoIdx] = useState<number | null>(null);
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

  // Cadastra de verdade a companhia detectada na linha (mesmo nome que
  // já apareceu casando "ad hoc" -- ver clienteAdHoc em
  // substabelecimento.ts), sem precisar digitar de novo em "Clientes e
  // assinaturas". Só falta subir a assinatura depois, por lá mesmo.
  const cadastrarCliente = async (item: ItemSubstabelecimento) => {
    if (!item.ciaAereaTexto) return;
    setCadastrandoIdx(item.idx);
    try {
      await criarClienteSubstabelecimento(item.ciaAereaTexto, item.ciaAereaTexto);
      recarregarClientes();
      toast.success(
        `"${item.ciaAereaTexto}" cadastrado. Falta só subir a assinatura em "Clientes e assinaturas".`,
      );
    } catch (e) {
      console.error("Erro ao cadastrar cliente:", e);
      toast.error(
        `Não consegui cadastrar: ${mensagemErro(e)}`,
      );
    } finally {
      setCadastrandoIdx(null);
    }
  };

  // Planilha com várias cias aéreas misturadas (cada linha é de uma
  // companhia diferente, ex.: TAP, KLM, Aerolineas Argentinas...) --
  // tenta casar a coluna "Cia aérea" de cada linha com o cadastro. Sem
  // casar mas com o texto da planilha disponível, usa esse texto direto
  // como outorgante (documento sai certo, só sem assinatura -- essa só
  // cadastrando a companhia de verdade). Só cai no cliente escolhido no
  // seletor acima quando a linha nem tem texto de "Cia aérea".
  const clienteDoItem = (item: ItemSubstabelecimento): ClienteSubstabelecimento | null => {
    const casado = encontrarClientePorNome(clientes, item.ciaAereaTexto);
    if (casado) return casado;
    if (item.ciaAereaTexto) return clienteAdHoc(item.ciaAereaTexto);
    return cliente;
  };

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
      const detalhe = mensagemErro(e);
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
    const clienteItem = clienteDoItem(item);
    if (!clienteItem) {
      toast.error(
        'Sem cliente pra esse documento (não casou com "Cia aérea" e nenhum cliente está selecionado no topo).',
      );
      return;
    }
    setGerandoIdx(item.idx);
    try {
      await gerarEBaixarPdfSubstabelecimento(clienteItem, item);
    } catch (e) {
      console.error("Erro ao gerar substabelecimento:", e);
      toast.error(
        `Não consegui gerar esse documento: ${mensagemErro(e)}`,
      );
    } finally {
      setGerandoIdx(null);
    }
  };

  // Em vez de travar o lote inteiro (planilha com dezenas de linhas,
  // cia por cia sendo cadastrada aos poucos), pula só quem não tem
  // cliente e gera o resto -- avisando quantos ficaram de fora, pra ela
  // saber que precisa voltar e cadastrar/corrigir essas linhas. Usado
  // tanto pro PDF único quanto pros separados.
  const paresSelecionadosComCliente = () => {
    const escolhidos = itens.filter((n) => selecionados.has(n.idx));
    const pares = escolhidos.map((item) => ({ cliente: clienteDoItem(item), item }));
    const comCliente = pares.filter(
      (p): p is { cliente: ClienteSubstabelecimento; item: ItemSubstabelecimento } => !!p.cliente,
    );
    return { total: escolhidos.length, comCliente, semCliente: pares.length - comCliente.length };
  };

  const gerarSelecionados = async () => {
    const { total, comCliente, semCliente } = paresSelecionadosComCliente();
    if (total === 0) {
      toast.error("Selecione pelo menos um documento.");
      return;
    }
    if (comCliente.length === 0) {
      toast.error(
        'Nenhum dos documentos selecionados tem cliente definido (não casou com "Cia aérea" e nenhum cliente está selecionado no topo).',
      );
      return;
    }
    setGerando(true);
    try {
      const blob = await gerarPdfSubstabelecimentos(comCliente);
      baixarBlob(blob, `substabelecimentos-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success(
        semCliente > 0
          ? `${comCliente.length} documento(s) gerado(s) num PDF só. ${semCliente} ficaram de fora por falta de cliente -- cadastre a companhia e gere de novo só essas.`
          : `${comCliente.length} documento(s) gerado(s) num PDF só.`,
      );
    } catch (e) {
      console.error("Erro ao gerar substabelecimentos:", e);
      toast.error(
        `Não consegui gerar os documentos: ${mensagemErro(e)}`,
      );
    } finally {
      setGerando(false);
    }
  };

  const gerarSelecionadosSeparados = async () => {
    const { total, comCliente, semCliente } = paresSelecionadosComCliente();
    if (total === 0) {
      toast.error("Selecione pelo menos um documento.");
      return;
    }
    if (comCliente.length === 0) {
      toast.error(
        'Nenhum dos documentos selecionados tem cliente definido (não casou com "Cia aérea" e nenhum cliente está selecionado no topo).',
      );
      return;
    }
    setGerandoZip(true);
    try {
      const documentos = await gerarPdfsSubstabelecimentosSeparados(comCliente);
      const zip = new JSZip();
      documentos.forEach(({ nomeArquivo, blob }) => zip.file(nomeArquivo, blob));
      const conteudo = await zip.generateAsync({ type: "blob" });
      baixarBlob(conteudo, `substabelecimentos-${new Date().toISOString().slice(0, 10)}.zip`);
      toast.success(
        semCliente > 0
          ? `${comCliente.length} documento(s) gerado(s) em arquivos separados. ${semCliente} ficaram de fora por falta de cliente -- cadastre a companhia e gere de novo só essas.`
          : `${comCliente.length} documento(s) gerado(s) em arquivos separados.`,
      );
    } catch (e) {
      console.error("Erro ao gerar substabelecimentos separados:", e);
      toast.error(
        `Não consegui gerar os documentos: ${mensagemErro(e)}`,
      );
    } finally {
      setGerandoZip(false);
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
              disabled={gerando || itens.length === 0}
            >
              <FileDown className="size-4" />
              {gerando ? "Gerando..." : "Gerar num PDF só"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void gerarSelecionadosSeparados()}
              disabled={gerandoZip || itens.length === 0}
            >
              <Files className="size-4" />
              {gerandoZip ? "Gerando..." : "Gerar separados (.zip)"}
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
                    <th className="p-2">Cliente</th>
                    <th className="p-2">Processo</th>
                    <th className="p-2">Autor</th>
                    <th className="p-2">Juízo</th>
                    <th className="p-2">Reserva</th>
                    <th className="p-2">Data</th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {itens.map((item) => {
                    const casado = encontrarClientePorNome(clientes, item.ciaAereaTexto);
                    const clienteItem = clienteDoItem(item);
                    const semCadastro = !casado && !!item.ciaAereaTexto;
                    return (
                    <tr key={item.idx} className="border-b border-border/60">
                      <td className="p-2">
                        <Checkbox
                          checked={selecionados.has(item.idx)}
                          onCheckedChange={() => alternarSelecao(item.idx)}
                        />
                      </td>
                      <td className="p-2">
                        {clienteItem ? (
                          <span className="flex items-center gap-1.5">
                            {clienteItem.nome}
                            {semCadastro ? (
                              <>
                                <Badge variant="secondary" className="text-xs">
                                  sem assinatura cadastrada
                                </Badge>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-6 px-1.5 text-xs"
                                  onClick={() => void cadastrarCliente(item)}
                                  disabled={cadastrandoIdx === item.idx}
                                >
                                  {cadastrandoIdx === item.idx ? "Cadastrando..." : "Cadastrar"}
                                </Button>
                              </>
                            ) : null}
                          </span>
                        ) : (
                          <Badge variant="destructive" className="text-xs">
                            sem cliente
                          </Badge>
                        )}
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
                            disabled={gerandoIdx === item.idx || !clienteItem}
                          >
                            <Download className="size-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
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
          disabled={gerando}
          className="fixed bottom-6 right-6 z-40 shadow-lg"
          size="lg"
        >
          <FileDown className="size-4" />
          {gerando ? "Gerando..." : `Gerar num PDF só (${selecionados.size})`}
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

function AbaSubstabelecimentoCorrespondente() {
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const clientesQuery = useQuery({
    queryKey: ["clientes-substabelecimento"],
    queryFn: listarClientesSubstabelecimento,
  });
  const clientes = clientesQuery.data ?? [];
  const modelosQuery = useQuery({
    queryKey: ["modelos-substabelecimento-correspondente"],
    queryFn: listarModelosCorrespondente,
  });
  const modelos = modelosQuery.data ?? [];
  const [modeloId, setModeloId] = useState("");
  const [itens, setItens] = useState<ItemSubstabelecimento[]>([]);
  const [nomeArquivo, setNomeArquivo] = useState<string | null>(null);
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());
  const [lendo, setLendo] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [gerandoZip, setGerandoZip] = useState(false);
  const [gerandoIdx, setGerandoIdx] = useState<number | null>(null);
  const [editando, setEditando] = useState<ItemSubstabelecimento | null>(null);
  const [apagando, setApagando] = useState<ItemSubstabelecimento | null>(null);
  const [gerenciando, setGerenciando] = useState(false);

  useEffect(() => {
    if (!modeloId && modelosQuery.data && modelosQuery.data.length > 0) {
      setModeloId(modelosQuery.data[0]!.id);
    }
  }, [modelosQuery.data, modeloId]);

  const modelo = modelos.find((m) => m.id === modeloId) ?? null;
  const recarregarModelos = () =>
    queryClient.invalidateQueries({ queryKey: ["modelos-substabelecimento-correspondente"] });

  // Aqui não tem seletor manual de cliente pra cair como reserva -- o
  // outorgante (a companhia aérea) sempre precisa vir da planilha,
  // porque é ela quem concedeu os poderes originalmente; quem recebe é
  // o modelo de correspondente escolhido acima (fixo pro lote inteiro).
  const clienteDoItem = (item: ItemSubstabelecimento): ClienteSubstabelecimento | null => {
    const casado = encontrarClientePorNome(clientes, item.ciaAereaTexto);
    if (casado) return casado;
    return item.ciaAereaTexto ? clienteAdHoc(item.ciaAereaTexto) : null;
  };

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
      const detalhe = mensagemErro(e);
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
    const clienteItem = clienteDoItem(item);
    if (!modelo) {
      toast.error("Escolha o estado do correspondente primeiro.");
      return;
    }
    if (!clienteItem) {
      toast.error('Sem companhia pra esse documento (não casou com "Cia aérea" da planilha).');
      return;
    }
    setGerandoIdx(item.idx);
    try {
      await gerarEBaixarPdfSubstabelecimentoCorrespondente(modelo, clienteItem, item);
    } catch (e) {
      console.error("Erro ao gerar substabelecimento de correspondente:", e);
      toast.error(
        `Não consegui gerar esse documento: ${mensagemErro(e)}`,
      );
    } finally {
      setGerandoIdx(null);
    }
  };

  const paresSelecionadosComCliente = () => {
    const escolhidos = itens.filter((n) => selecionados.has(n.idx));
    const pares = escolhidos.map((item) => ({ cliente: clienteDoItem(item), item }));
    const comCliente = pares.filter(
      (p): p is { cliente: ClienteSubstabelecimento; item: ItemSubstabelecimento } => !!p.cliente,
    );
    return { total: escolhidos.length, comCliente, semCliente: pares.length - comCliente.length };
  };

  const gerarSelecionados = async () => {
    if (!modelo) {
      toast.error("Escolha o estado do correspondente primeiro.");
      return;
    }
    const { total, comCliente, semCliente } = paresSelecionadosComCliente();
    if (total === 0) {
      toast.error("Selecione pelo menos um documento.");
      return;
    }
    if (comCliente.length === 0) {
      toast.error('Nenhum dos documentos selecionados tem companhia definida (não casou com "Cia aérea").');
      return;
    }
    setGerando(true);
    try {
      const blob = await gerarPdfSubstabelecimentosCorrespondente(modelo, comCliente);
      baixarBlob(
        blob,
        `substabelecimentos-correspondente-${modelo.id}-${new Date().toISOString().slice(0, 10)}.pdf`,
      );
      toast.success(
        semCliente > 0
          ? `${comCliente.length} documento(s) gerado(s) num PDF só. ${semCliente} ficaram de fora por falta de companhia -- confira a coluna "Cia aérea" dessas linhas.`
          : `${comCliente.length} documento(s) gerado(s) num PDF só.`,
      );
    } catch (e) {
      console.error("Erro ao gerar substabelecimentos de correspondente:", e);
      toast.error(
        `Não consegui gerar os documentos: ${mensagemErro(e)}`,
      );
    } finally {
      setGerando(false);
    }
  };

  const gerarSelecionadosSeparados = async () => {
    if (!modelo) {
      toast.error("Escolha o estado do correspondente primeiro.");
      return;
    }
    const { total, comCliente, semCliente } = paresSelecionadosComCliente();
    if (total === 0) {
      toast.error("Selecione pelo menos um documento.");
      return;
    }
    if (comCliente.length === 0) {
      toast.error('Nenhum dos documentos selecionados tem companhia definida (não casou com "Cia aérea").');
      return;
    }
    setGerandoZip(true);
    try {
      const documentos = await gerarPdfsSubstabelecimentosCorrespondenteSeparados(modelo, comCliente);
      const zip = new JSZip();
      documentos.forEach(({ nomeArquivo, blob }) => zip.file(nomeArquivo, blob));
      const conteudo = await zip.generateAsync({ type: "blob" });
      baixarBlob(
        conteudo,
        `substabelecimentos-correspondente-${modelo.id}-${new Date().toISOString().slice(0, 10)}.zip`,
      );
      toast.success(
        semCliente > 0
          ? `${comCliente.length} documento(s) gerado(s) em arquivos separados. ${semCliente} ficaram de fora por falta de companhia.`
          : `${comCliente.length} documento(s) gerado(s) em arquivos separados.`,
      );
    } catch (e) {
      console.error("Erro ao gerar substabelecimentos de correspondente separados:", e);
      toast.error(
        `Não consegui gerar os documentos: ${mensagemErro(e)}`,
      );
    } finally {
      setGerandoZip(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">Estado e arquivo</CardTitle>
          <CardDescription>
            Formatos aceitos: .xlsx, .xls e .xlsm (até 20 MB). A companhia aérea continua vindo da
            coluna "Cia aérea" da planilha, só pro nome no texto -- a assinatura sai sempre a do
            estado escolhido acima, igual em todas as linhas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={modeloId} onValueChange={setModeloId}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder={modelosQuery.isLoading ? "Carregando..." : "Estado"} />
              </SelectTrigger>
              <SelectContent>
                {modelos.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.estado}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {modelo?.assinaturaCaminho ? (
              <Badge variant="outline">
                Assinatura cadastrada: {modelo.assinanteNome ?? "sem nome informado"}
              </Badge>
            ) : (
              <Badge variant="secondary">Sem assinatura cadastrada — sai em branco</Badge>
            )}
            <Button type="button" variant="ghost" size="sm" onClick={() => setGerenciando(true)}>
              <Settings className="size-4" /> Modelos de correspondente
            </Button>
          </div>
          {!modelosQuery.isLoading && modelos.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum estado cadastrado ainda. Clique em "Modelos de correspondente" pra cadastrar o
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
              disabled={gerando || itens.length === 0 || !modelo}
            >
              <FileDown className="size-4" />
              {gerando ? "Gerando..." : "Gerar num PDF só"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void gerarSelecionadosSeparados()}
              disabled={gerandoZip || itens.length === 0 || !modelo}
            >
              <Files className="size-4" />
              {gerandoZip ? "Gerando..." : "Gerar separados (.zip)"}
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
                    <th className="p-2">Companhia</th>
                    <th className="p-2">Processo</th>
                    <th className="p-2">Reserva</th>
                    <th className="p-2">Data</th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {itens.map((item) => {
                    const clienteItem = clienteDoItem(item);
                    return (
                    <tr key={item.idx} className="border-b border-border/60">
                      <td className="p-2">
                        <Checkbox
                          checked={selecionados.has(item.idx)}
                          onCheckedChange={() => alternarSelecao(item.idx)}
                        />
                      </td>
                      <td className="p-2">
                        {clienteItem ? (
                          clienteItem.nome
                        ) : (
                          <Badge variant="destructive" className="text-xs">
                            sem companhia
                          </Badge>
                        )}
                      </td>
                      <td className="p-2 font-mono text-xs">{item.processo ?? "—"}</td>
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
                            disabled={gerandoIdx === item.idx || !clienteItem || !modelo}
                          >
                            <Download className="size-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
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
          disabled={gerando || !modelo}
          className="fixed bottom-6 right-6 z-40 shadow-lg"
          size="lg"
        >
          <FileDown className="size-4" />
          {gerando ? "Gerando..." : `Gerar num PDF só (${selecionados.size})`}
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

      <GerenciarModelosCorrespondenteDialog
        open={gerenciando}
        onOpenChange={setGerenciando}
        modelos={modelos}
        onChanged={recarregarModelos}
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
  const [gerandoZip, setGerandoZip] = useState(false);
  const [gerandoIdx, setGerandoIdx] = useState<number | null>(null);
  const [cadastrandoIdx, setCadastrandoIdx] = useState<number | null>(null);
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

  // Mesmo padrão do Substabelecimento: casa a coluna "Cia aérea" de cada
  // linha com o cadastro; sem casar mas com o texto da planilha
  // disponível, usa esse texto direto como outorgante (ver clienteAdHoc
  // em substabelecimento.ts). Só cai no cliente escolhido no seletor
  // acima quando a linha nem tem texto de "Cia aérea".
  const clienteDoItem = (item: ItemCartaPreposicao): ClienteSubstabelecimento | null => {
    const casado = encontrarClientePorNome(clientes, item.ciaAereaTexto);
    if (casado) return casado;
    if (item.ciaAereaTexto) return clienteAdHoc(item.ciaAereaTexto);
    return cliente;
  };

  const cadastrarCliente = async (item: ItemCartaPreposicao) => {
    if (!item.ciaAereaTexto) return;
    setCadastrandoIdx(item.idx);
    try {
      await criarClienteSubstabelecimento(item.ciaAereaTexto, item.ciaAereaTexto);
      recarregarClientes();
      toast.success(
        `"${item.ciaAereaTexto}" cadastrado. Falta só subir a assinatura em "Clientes e assinaturas".`,
      );
    } catch (e) {
      console.error("Erro ao cadastrar cliente:", e);
      toast.error(
        `Não consegui cadastrar: ${mensagemErro(e)}`,
      );
    } finally {
      setCadastrandoIdx(null);
    }
  };

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
      const detalhe = mensagemErro(e);
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
    const clienteItem = clienteDoItem(item);
    if (!clienteItem) {
      toast.error(
        'Sem cliente pra esse documento (não casou com "Cia aérea" e nenhum cliente está selecionado no topo).',
      );
      return;
    }
    setGerandoIdx(item.idx);
    try {
      await gerarEBaixarPdfCartaPreposicao(clienteItem, item);
    } catch (e) {
      console.error("Erro ao gerar carta de preposição:", e);
      toast.error(
        `Não consegui gerar esse documento: ${mensagemErro(e)}`,
      );
    } finally {
      setGerandoIdx(null);
    }
  };

  // Mesmo padrão do Substabelecimento: pula só quem não tem cliente e
  // gera o resto, em vez de travar o lote inteiro.
  const paresSelecionadosComCliente = () => {
    const escolhidos = itens.filter((n) => selecionados.has(n.idx));
    const pares = escolhidos.map((item) => ({ cliente: clienteDoItem(item), item }));
    const comCliente = pares.filter(
      (p): p is { cliente: ClienteSubstabelecimento; item: ItemCartaPreposicao } => !!p.cliente,
    );
    return { total: escolhidos.length, comCliente, semCliente: pares.length - comCliente.length };
  };

  const gerarSelecionados = async () => {
    const { total, comCliente, semCliente } = paresSelecionadosComCliente();
    if (total === 0) {
      toast.error("Selecione pelo menos um documento.");
      return;
    }
    if (comCliente.length === 0) {
      toast.error(
        'Nenhum dos documentos selecionados tem cliente definido (não casou com "Cia aérea" e nenhum cliente está selecionado no topo).',
      );
      return;
    }
    setGerando(true);
    try {
      const blob = await gerarPdfCartasPreposicao(comCliente);
      baixarBlob(blob, `cartas-preposicao-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success(
        semCliente > 0
          ? `${comCliente.length} documento(s) gerado(s) num PDF só. ${semCliente} ficaram de fora por falta de cliente -- cadastre a companhia e gere de novo só essas.`
          : `${comCliente.length} documento(s) gerado(s) num PDF só.`,
      );
    } catch (e) {
      console.error("Erro ao gerar cartas de preposição:", e);
      toast.error(
        `Não consegui gerar os documentos: ${mensagemErro(e)}`,
      );
    } finally {
      setGerando(false);
    }
  };

  const gerarSelecionadosSeparados = async () => {
    const { total, comCliente, semCliente } = paresSelecionadosComCliente();
    if (total === 0) {
      toast.error("Selecione pelo menos um documento.");
      return;
    }
    if (comCliente.length === 0) {
      toast.error(
        'Nenhum dos documentos selecionados tem cliente definido (não casou com "Cia aérea" e nenhum cliente está selecionado no topo).',
      );
      return;
    }
    setGerandoZip(true);
    try {
      const documentos = await gerarPdfsCartasPreposicaoSeparadas(comCliente);
      const zip = new JSZip();
      documentos.forEach(({ nomeArquivo, blob }) => zip.file(nomeArquivo, blob));
      const conteudo = await zip.generateAsync({ type: "blob" });
      baixarBlob(conteudo, `cartas-preposicao-${new Date().toISOString().slice(0, 10)}.zip`);
      toast.success(
        semCliente > 0
          ? `${comCliente.length} documento(s) gerado(s) em arquivos separados. ${semCliente} ficaram de fora por falta de cliente -- cadastre a companhia e gere de novo só essas.`
          : `${comCliente.length} documento(s) gerado(s) em arquivos separados.`,
      );
    } catch (e) {
      console.error("Erro ao gerar cartas de preposição separadas:", e);
      toast.error(
        `Não consegui gerar os documentos: ${mensagemErro(e)}`,
      );
    } finally {
      setGerandoZip(false);
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
              disabled={gerando || itens.length === 0}
            >
              <FileDown className="size-4" />
              {gerando ? "Gerando..." : "Gerar num PDF só"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void gerarSelecionadosSeparados()}
              disabled={gerandoZip || itens.length === 0}
            >
              <Files className="size-4" />
              {gerandoZip ? "Gerando..." : "Gerar separados (.zip)"}
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
                    <th className="p-2">Cliente</th>
                    <th className="p-2">Processo</th>
                    <th className="p-2">Polo ativo</th>
                    <th className="p-2">Juízo</th>
                    <th className="p-2">Prepostos</th>
                    <th className="p-2">Data</th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {itens.map((item) => {
                    const casado = encontrarClientePorNome(clientes, item.ciaAereaTexto);
                    const clienteItem = clienteDoItem(item);
                    const semCadastro = !casado && !!item.ciaAereaTexto;
                    return (
                    <tr key={item.idx} className="border-b border-border/60">
                      <td className="p-2">
                        <Checkbox
                          checked={selecionados.has(item.idx)}
                          onCheckedChange={() => alternarSelecao(item.idx)}
                        />
                      </td>
                      <td className="p-2">
                        {clienteItem ? (
                          <span className="flex items-center gap-1.5">
                            {clienteItem.nome}
                            {semCadastro ? (
                              <>
                                <Badge variant="secondary" className="text-xs">
                                  sem assinatura cadastrada
                                </Badge>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-6 px-1.5 text-xs"
                                  onClick={() => void cadastrarCliente(item)}
                                  disabled={cadastrandoIdx === item.idx}
                                >
                                  {cadastrandoIdx === item.idx ? "Cadastrando..." : "Cadastrar"}
                                </Button>
                              </>
                            ) : null}
                          </span>
                        ) : (
                          <Badge variant="destructive" className="text-xs">
                            sem cliente
                          </Badge>
                        )}
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
                            disabled={gerandoIdx === item.idx || !clienteItem}
                          >
                            <Download className="size-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
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
          disabled={gerando}
          className="fixed bottom-6 right-6 z-40 shadow-lg"
          size="lg"
        >
          <FileDown className="size-4" />
          {gerando ? "Gerando..." : `Gerar num PDF só (${selecionados.size})`}
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

function AbaCartaPreposicaoCorrespondente() {
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const clientesQuery = useQuery({
    queryKey: ["clientes-substabelecimento"],
    queryFn: listarClientesSubstabelecimento,
  });
  const clientes = clientesQuery.data ?? [];
  const modelosQuery = useQuery({
    queryKey: ["modelos-carta-preposicao-correspondente"],
    queryFn: listarModelosCartaPreposicaoCorrespondente,
  });
  const modelos = modelosQuery.data ?? [];
  const [modeloId, setModeloId] = useState("");
  const [itens, setItens] = useState<ItemCartaPreposicao[]>([]);
  const [nomeArquivo, setNomeArquivo] = useState<string | null>(null);
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());
  const [lendo, setLendo] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [gerandoZip, setGerandoZip] = useState(false);
  const [gerandoIdx, setGerandoIdx] = useState<number | null>(null);
  const [editando, setEditando] = useState<ItemCartaPreposicao | null>(null);
  const [apagando, setApagando] = useState<ItemCartaPreposicao | null>(null);
  const [gerenciando, setGerenciando] = useState(false);

  useEffect(() => {
    if (!modeloId && modelosQuery.data && modelosQuery.data.length > 0) {
      setModeloId(modelosQuery.data[0]!.id);
    }
  }, [modelosQuery.data, modeloId]);

  const modelo = modelos.find((m) => m.id === modeloId) ?? null;
  const recarregarModelos = () =>
    queryClient.invalidateQueries({ queryKey: ["modelos-carta-preposicao-correspondente"] });

  // Mesmo padrão do Substabelecimento pra Correspondente: o outorgante
  // (a companhia aérea) sempre vem da planilha, quem recebe é o estado
  // escolhido acima (fixo pro lote inteiro).
  const clienteDoItem = (item: ItemCartaPreposicao): ClienteSubstabelecimento | null => {
    const casado = encontrarClientePorNome(clientes, item.ciaAereaTexto);
    if (casado) return casado;
    return item.ciaAereaTexto ? clienteAdHoc(item.ciaAereaTexto) : null;
  };

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
      const detalhe = mensagemErro(e);
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
    const clienteItem = clienteDoItem(item);
    if (!modelo) {
      toast.error("Escolha o estado do correspondente primeiro.");
      return;
    }
    if (!clienteItem) {
      toast.error('Sem companhia pra esse documento (não casou com "Cia aérea" da planilha).');
      return;
    }
    setGerandoIdx(item.idx);
    try {
      await gerarEBaixarPdfCartaPreposicaoCorrespondente(modelo, clienteItem, item);
    } catch (e) {
      console.error("Erro ao gerar carta de preposição de correspondente:", e);
      toast.error(
        `Não consegui gerar esse documento: ${mensagemErro(e)}`,
      );
    } finally {
      setGerandoIdx(null);
    }
  };

  const paresSelecionadosComCliente = () => {
    const escolhidos = itens.filter((n) => selecionados.has(n.idx));
    const pares = escolhidos.map((item) => ({ cliente: clienteDoItem(item), item }));
    const comCliente = pares.filter(
      (p): p is { cliente: ClienteSubstabelecimento; item: ItemCartaPreposicao } => !!p.cliente,
    );
    return { total: escolhidos.length, comCliente, semCliente: pares.length - comCliente.length };
  };

  const gerarSelecionados = async () => {
    if (!modelo) {
      toast.error("Escolha o estado do correspondente primeiro.");
      return;
    }
    const { total, comCliente, semCliente } = paresSelecionadosComCliente();
    if (total === 0) {
      toast.error("Selecione pelo menos um documento.");
      return;
    }
    if (comCliente.length === 0) {
      toast.error('Nenhum dos documentos selecionados tem companhia definida (não casou com "Cia aérea").');
      return;
    }
    setGerando(true);
    try {
      const blob = await gerarPdfCartasPreposicaoCorrespondente(modelo, comCliente);
      baixarBlob(
        blob,
        `carta-preposicao-correspondente-${modelo.id}-${new Date().toISOString().slice(0, 10)}.pdf`,
      );
      toast.success(
        semCliente > 0
          ? `${comCliente.length} documento(s) gerado(s) num PDF só. ${semCliente} ficaram de fora por falta de companhia -- confira a coluna "Cia aérea" dessas linhas.`
          : `${comCliente.length} documento(s) gerado(s) num PDF só.`,
      );
    } catch (e) {
      console.error("Erro ao gerar cartas de preposição de correspondente:", e);
      toast.error(
        `Não consegui gerar os documentos: ${mensagemErro(e)}`,
      );
    } finally {
      setGerando(false);
    }
  };

  const gerarSelecionadosSeparados = async () => {
    if (!modelo) {
      toast.error("Escolha o estado do correspondente primeiro.");
      return;
    }
    const { total, comCliente, semCliente } = paresSelecionadosComCliente();
    if (total === 0) {
      toast.error("Selecione pelo menos um documento.");
      return;
    }
    if (comCliente.length === 0) {
      toast.error('Nenhum dos documentos selecionados tem companhia definida (não casou com "Cia aérea").');
      return;
    }
    setGerandoZip(true);
    try {
      const documentos = await gerarPdfsCartasPreposicaoCorrespondenteSeparadas(modelo, comCliente);
      const zip = new JSZip();
      documentos.forEach(({ nomeArquivo, blob }) => zip.file(nomeArquivo, blob));
      const conteudo = await zip.generateAsync({ type: "blob" });
      baixarBlob(
        conteudo,
        `carta-preposicao-correspondente-${modelo.id}-${new Date().toISOString().slice(0, 10)}.zip`,
      );
      toast.success(
        semCliente > 0
          ? `${comCliente.length} documento(s) gerado(s) em arquivos separados. ${semCliente} ficaram de fora por falta de companhia.`
          : `${comCliente.length} documento(s) gerado(s) em arquivos separados.`,
      );
    } catch (e) {
      console.error("Erro ao gerar cartas de preposição de correspondente separadas:", e);
      toast.error(
        `Não consegui gerar os documentos: ${mensagemErro(e)}`,
      );
    } finally {
      setGerandoZip(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">Estado e arquivo</CardTitle>
          <CardDescription>
            Formatos aceitos: .xlsx, .xls e .xlsm (até 20 MB). A companhia aérea continua vindo da
            coluna "Cia aérea"/"Polo Passivo" da planilha, só pro nome no texto -- a assinatura sai
            sempre a do estado escolhido acima, igual em todas as linhas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={modeloId} onValueChange={setModeloId}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder={modelosQuery.isLoading ? "Carregando..." : "Estado"} />
              </SelectTrigger>
              <SelectContent>
                {modelos.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.estado}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {modelo?.assinaturaCaminho ? (
              <Badge variant="outline">
                Assinatura cadastrada: {modelo.assinanteNome ?? "sem nome informado"}
              </Badge>
            ) : (
              <Badge variant="secondary">Sem assinatura cadastrada — sai em branco</Badge>
            )}
            <Button type="button" variant="ghost" size="sm" onClick={() => setGerenciando(true)}>
              <Settings className="size-4" /> Modelos de correspondente
            </Button>
          </div>
          {!modelosQuery.isLoading && modelos.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum estado cadastrado ainda. Clique em "Modelos de correspondente" pra cadastrar o
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
              disabled={gerando || itens.length === 0 || !modelo}
            >
              <FileDown className="size-4" />
              {gerando ? "Gerando..." : "Gerar num PDF só"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void gerarSelecionadosSeparados()}
              disabled={gerandoZip || itens.length === 0 || !modelo}
            >
              <Files className="size-4" />
              {gerandoZip ? "Gerando..." : "Gerar separados (.zip)"}
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
                    <th className="p-2">Companhia</th>
                    <th className="p-2">Processo</th>
                    <th className="p-2">Polo ativo</th>
                    <th className="p-2">Juízo</th>
                    <th className="p-2">Data</th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {itens.map((item) => {
                    const clienteItem = clienteDoItem(item);
                    return (
                    <tr key={item.idx} className="border-b border-border/60">
                      <td className="p-2">
                        <Checkbox
                          checked={selecionados.has(item.idx)}
                          onCheckedChange={() => alternarSelecao(item.idx)}
                        />
                      </td>
                      <td className="p-2">
                        {clienteItem ? (
                          clienteItem.nome
                        ) : (
                          <Badge variant="destructive" className="text-xs">
                            sem companhia
                          </Badge>
                        )}
                      </td>
                      <td className="p-2 font-mono text-xs">{item.processo ?? "—"}</td>
                      <td className="p-2">{item.poloAtivo ?? "—"}</td>
                      <td className="p-2">{item.juizo ?? "—"}</td>
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
                            disabled={gerandoIdx === item.idx || !clienteItem || !modelo}
                          >
                            <Download className="size-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
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
          disabled={gerando || !modelo}
          className="fixed bottom-6 right-6 z-40 shadow-lg"
          size="lg"
        >
          <FileDown className="size-4" />
          {gerando ? "Gerando..." : `Gerar num PDF só (${selecionados.size})`}
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

      <GerenciarModelosCartaPreposicaoCorrespondenteDialog
        open={gerenciando}
        onOpenChange={setGerenciando}
        modelos={modelos}
        onChanged={recarregarModelos}
      />
    </div>
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

function GerenciarModelosCorrespondenteDialog({
  open,
  onOpenChange,
  modelos,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  modelos: ModeloCorrespondente[];
  onChanged: () => void;
}) {
  const [novoEstado, setNovoEstado] = useState("");
  const [novaLista, setNovaLista] = useState("");
  const [criando, setCriando] = useState(false);
  const [editando, setEditando] = useState<ModeloCorrespondente | null>(null);
  const [assinaturaDe, setAssinaturaDe] = useState<ModeloCorrespondente | null>(null);
  const [pdfDe, setPdfDe] = useState<ModeloCorrespondente | null>(null);
  const [pastaDe, setPastaDe] = useState<ModeloCorrespondente | null>(null);
  const [excluindo, setExcluindo] = useState<ModeloCorrespondente | null>(null);

  const criar = async () => {
    if (!novoEstado.trim() || !novaLista.trim()) {
      toast.error("Preencha o estado e a lista de advogados.");
      return;
    }
    setCriando(true);
    try {
      await criarModeloCorrespondente(novoEstado.trim(), novaLista.trim());
      toast.success("Estado cadastrado.");
      setNovoEstado("");
      setNovaLista("");
      onChanged();
    } catch (e) {
      console.error("Erro ao cadastrar modelo de correspondente:", e);
      const detalhe = mensagemErro(e);
      toast.error(`Não consegui cadastrar esse estado: ${detalhe}`);
    } finally {
      setCriando(false);
    }
  };

  const excluir = async () => {
    if (!excluindo) return;
    try {
      await excluirModeloCorrespondente(excluindo);
      toast.success("Estado removido.");
      onChanged();
    } catch (e) {
      console.error("Erro ao excluir modelo de correspondente:", e);
      const detalhe = mensagemErro(e);
      toast.error(`Não consegui remover esse estado: ${detalhe}`);
    } finally {
      setExcluindo(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modelos de correspondente</DialogTitle>
            <DialogDescription>
              Um cadastro por estado: a lista de advogados correspondentes (cole o texto pronto do
              PDF/Word que já existe) e quem assina pela BCW.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2 rounded-md border border-border p-3">
              <p className="text-sm font-medium">Novo estado</p>
              <Input
                placeholder="Estado (ex.: RJ)"
                value={novoEstado}
                onChange={(e) => setNovoEstado(e.target.value)}
              />
              <Textarea
                placeholder="Cole aqui a lista de advogados (nome + OAB de cada um, igual já está no PDF/Word)"
                value={novaLista}
                onChange={(e) => setNovaLista(e.target.value)}
                className="min-h-32"
              />
              <Button type="button" size="sm" onClick={() => void criar()} disabled={criando}>
                {criando ? "Cadastrando..." : "Cadastrar estado"}
              </Button>
            </div>

            <div className="space-y-2">
              {modelos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum estado cadastrado ainda.</p>
              ) : (
                modelos.map((m) => (
                  <div
                    key={m.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{m.estado}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {m.listaAdvogados.length} caractere{m.listaAdvogados.length === 1 ? "" : "s"} na
                        lista de advogados
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {m.assinaturaCaminho ? (
                          <Badge variant="outline">
                            Assinatura: {m.assinanteNome ?? "cadastrada"}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Sem assinatura</Badge>
                        )}
                        {m.modeloPdfCaminho ? (
                          <Badge variant="outline">PDF de referência cadastrado</Badge>
                        ) : (
                          <Badge variant="secondary">Sem PDF de referência</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setEditando(m)}
                      >
                        Editar
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setAssinaturaDe(m)}
                      >
                        Assinatura
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => setPdfDe(m)}>
                        PDF de referência
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setPastaDe(m)}
                        disabled={!m.modeloPdfCaminho}
                        title={
                          m.modeloPdfCaminho ? undefined : "Cadastre o PDF de referência primeiro"
                        }
                      >
                        <FolderOpen className="size-4" />
                        Pasta
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Excluir estado ${m.estado}`}
                        onClick={() => setExcluindo(m)}
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
            <EditorModeloCorrespondente
              modelo={editando}
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
            <EditorAssinaturaModeloCorrespondente
              modelo={assinaturaDe}
              onSalvar={() => {
                setAssinaturaDe(null);
                onChanged();
              }}
              onCancelar={() => setAssinaturaDe(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={pdfDe != null} onOpenChange={(v) => !v && setPdfDe(null)}>
        <DialogContent className="max-w-md">
          {pdfDe ? (
            <EditorPdfCliente
              titulo={`PDF de referência de ${pdfDe.estado}`}
              descricao="Guarda só a versão atual. Esse PDF não vira a Carta/Substabelecimento gerado dinamicamente pela lista de advogados -- mas, se for o caso de um documento já assinado (ex.: Procuração + Substabelecimento da AF/KLM), é esse arquivo que o botão 'Pasta' lê e preenche."
              caminhoAtual={pdfDe.modeloPdfCaminho}
              nomeArquivoAtual={pdfDe.modeloPdfNomeArquivo}
              onEnviar={(arquivo) => enviarPdfReferenciaModeloCorrespondente(pdfDe, arquivo)}
              onRemover={() => removerPdfReferenciaModeloCorrespondente(pdfDe)}
              onBaixar={() => baixarPdfReferenciaModeloCorrespondente(pdfDe)}
              onSalvar={() => {
                setPdfDe(null);
                onChanged();
              }}
              onCancelar={() => setPdfDe(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={excluindo != null} onOpenChange={(v) => !v && setExcluindo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {excluindo?.estado}?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso apaga o cadastro desse estado (lista de advogados, assinatura e PDF de
              referência, se tiver). Não afeta documentos já baixados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void excluir()}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={pastaDe != null} onOpenChange={(v) => !v && setPastaDe(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          {pastaDe ? <PastaModeloCorrespondenteDialog modelo={pastaDe} /> : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

// "Pasta" de um estado de correspondente local -- pedido da BDR/Joanice:
// quando o PDF de referência já é um documento real já assinado (ex.:
// Procuração + Substabelecimento da AF/KLM pro correspondente local,
// mesmos advogados desse estado), em vez de gerar do zero (como o botão
// "Gerar" da aba Substabelecimento Correspondente faz), aqui a planilha
// sobe inteira e cada linha gera o PDF de referência já preenchido (só
// as 3 linhas em branco da página 2: processo, autor/polo ativo e
// juízo) -- ver pdf-procuracao-substabelecimento.ts. A planilha real
// (ex.: "Novas - 8075") mistura processos de vários estados e de várias
// companhias aéreas na mesma aba, então filtra por dois critérios: a UF
// do processo (bate com o "estado" desse cadastro) e, opcionalmente, o
// cliente (companhia aérea) escolhido no seletor -- já que o mesmo
// estado pode servir a mais de uma companhia, mas o PDF de referência
// aqui cadastrado é de uma companhia só.
function PastaModeloCorrespondenteDialog({ modelo }: { modelo: ModeloCorrespondente }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [lendo, setLendo] = useState(false);
  const [itens, setItens] = useState<ItemSubstabelecimento[]>([]);
  const [clientes, setClientes] = useState<ClienteSubstabelecimento[]>([]);
  const [clienteId, setClienteId] = useState<string>("todos");
  const [gerandoIdx, setGerandoIdx] = useState<number | null>(null);
  const [gerandoZip, setGerandoZip] = useState(false);

  useEffect(() => {
    listarClientesSubstabelecimento()
      .then(setClientes)
      .catch((e) => console.error("Erro ao listar clientes na pasta do correspondente:", e));
  }, []);

  const estadoNormalizado = normalizar(modelo.estado);
  const itensDoEstado = itens.filter((item) => {
    const uf = ufDoItem(item);
    return uf != null && estadoNormalizado.includes(normalizar(uf));
  });

  const clienteEscolhido = clientes.find((c) => c.id === clienteId) ?? null;
  const itensFiltrados = clienteEscolhido
    ? itensDoEstado.filter(
        (item) => encontrarClientePorNome([clienteEscolhido], item.ciaAereaTexto) != null,
      )
    : itensDoEstado;

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
      setItens(lidos);
      const doEstado = lidos.filter((item) => {
        const uf = ufDoItem(item);
        return uf != null && estadoNormalizado.includes(normalizar(uf));
      });
      if (doEstado.length === 0) {
        toast.warning(`Nenhuma linha da planilha bateu com o estado "${modelo.estado}".`);
      } else {
        toast.success(`${doEstado.length} processo(s) de "${modelo.estado}" encontrado(s).`);
      }
    } catch (e) {
      console.error("Erro ao ler planilha na pasta do correspondente:", e);
      toast.error(`Não consegui ler a planilha: ${mensagemErro(e)}`);
    } finally {
      setLendo(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const baixarUm = async (item: ItemSubstabelecimento) => {
    setGerandoIdx(item.idx);
    try {
      const blob = await gerarPdfProcuracaoPreenchida(modelo, item);
      baixarBlob(blob, nomeArquivoProcuracaoPreenchida(modelo, item));
    } catch (e) {
      console.error("Erro ao gerar procuração preenchida:", e);
      toast.error(`Não consegui gerar esse documento: ${mensagemErro(e)}`);
    } finally {
      setGerandoIdx(null);
    }
  };

  const baixarTodas = async () => {
    if (itensFiltrados.length === 0) {
      toast.error("Nenhum processo pra gerar.");
      return;
    }
    setGerandoZip(true);
    try {
      const zip = new JSZip();
      let falhas = 0;
      for (const item of itensFiltrados) {
        try {
          const blob = await gerarPdfProcuracaoPreenchida(modelo, item);
          zip.file(nomeArquivoProcuracaoPreenchida(modelo, item), blob);
        } catch (e) {
          console.error("Erro ao gerar procuração preenchida (lote):", e);
          falhas++;
        }
      }
      if (falhas === itensFiltrados.length) {
        toast.error("Não consegui gerar nenhum documento.");
        return;
      }
      const conteudo = await zip.generateAsync({ type: "blob" });
      baixarBlob(conteudo, `procuracoes-${modelo.id}-${new Date().toISOString().slice(0, 10)}.zip`);
      toast.success(
        falhas > 0
          ? `${itensFiltrados.length - falhas} documento(s) gerado(s). ${falhas} falharam.`
          : `${itensFiltrados.length} documento(s) gerado(s) em arquivos separados.`,
      );
    } finally {
      setGerandoZip(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <FolderOpen className="size-5" /> Pasta — {modelo.estado}
        </DialogTitle>
        <DialogDescription>
          Suba a planilha com os processos (mesmo formato da aba Substabelecimento) pra gerar a
          Procuração + Substabelecimento já preenchida (página 2) de cada um, usando o PDF de
          referência cadastrado nesse estado.
        </DialogDescription>
      </DialogHeader>

      {!modelo.modeloPdfCaminho ? (
        <p className="rounded-md border border-amber-400 bg-amber-50 p-3 text-sm text-amber-800">
          Esse estado ainda não tem o PDF de referência cadastrado — suba primeiro pelo botão "PDF
          de referência", na lista de estados, antes de gerar documentos aqui.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.xlsm"
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
        <Select value={clienteId} onValueChange={setClienteId}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Filtrar por cliente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os clientes</SelectItem>
            {clientes.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          onClick={() => void baixarTodas()}
          disabled={gerandoZip || itensFiltrados.length === 0 || !modelo.modeloPdfCaminho}
        >
          <Files className="size-4" />
          {gerandoZip ? "Gerando..." : "Gerar todas (.zip)"}
        </Button>
      </div>

      {itens.length > 0 ? (
        <div className="space-y-2">
          {itensFiltrados.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma linha bateu com o estado "{modelo.estado}"
              {clienteEscolhido ? ` e o cliente "${clienteEscolhido.nome}"` : ""}.
            </p>
          ) : (
            itensFiltrados.map((item) => (
              <div
                key={item.idx}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium">{item.processo ?? "—"}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.autor ?? "—"} · {item.juizo ?? "—"}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void baixarUm(item)}
                  disabled={gerandoIdx === item.idx || !modelo.modeloPdfCaminho}
                >
                  <FileDown className="size-4" />
                  {gerandoIdx === item.idx ? "Gerando..." : "Baixar"}
                </Button>
              </div>
            ))
          )}
        </div>
      ) : null}
    </>
  );
}

function EditorModeloCorrespondente({
  modelo,
  onSalvar,
  onCancelar,
}: {
  modelo: ModeloCorrespondente;
  onSalvar: () => void;
  onCancelar: () => void;
}) {
  const [estado, setEstado] = useState(modelo.estado);
  const [lista, setLista] = useState(modelo.listaAdvogados);
  const [salvando, setSalvando] = useState(false);

  const salvar = async () => {
    if (!estado.trim() || !lista.trim()) {
      toast.error("Preencha o estado e a lista de advogados.");
      return;
    }
    setSalvando(true);
    try {
      await atualizarModeloCorrespondente(modelo.id, {
        estado: estado.trim(),
        listaAdvogados: lista.trim(),
      });
      toast.success("Estado atualizado.");
      onSalvar();
    } catch (e) {
      console.error("Erro ao atualizar modelo de correspondente:", e);
      const detalhe = mensagemErro(e);
      toast.error(`Não consegui salvar: ${detalhe}`);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Editar estado</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="modelo-estado">Estado</Label>
          <Input id="modelo-estado" value={estado} onChange={(e) => setEstado(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="modelo-lista">Lista de advogados</Label>
          <Textarea
            id="modelo-lista"
            value={lista}
            onChange={(e) => setLista(e.target.value)}
            className="min-h-40"
          />
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

function EditorAssinaturaModeloCorrespondente({
  modelo,
  onSalvar,
  onCancelar,
}: {
  modelo: ModeloCorrespondente;
  onSalvar: () => void;
  onCancelar: () => void;
}) {
  const [assinanteNome, setAssinanteNome] = useState(modelo.assinanteNome ?? "");
  const [assinanteOab, setAssinanteOab] = useState(modelo.assinanteOab ?? "");
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
      await enviarAssinaturaModeloCorrespondente(
        modelo,
        arquivo,
        assinanteNome.trim(),
        assinanteOab.trim(),
      );
      toast.success("Assinatura salva.");
      onSalvar();
    } catch (e) {
      const detalhe = mensagemErro(e);
      toast.error(`Não consegui salvar a assinatura: ${detalhe}`);
    } finally {
      setEnviando(false);
    }
  };

  const remover = async () => {
    setRemovendo(true);
    try {
      await removerAssinaturaModeloCorrespondente(modelo);
      toast.success("Assinatura removida.");
      onSalvar();
    } catch (e) {
      console.error("Erro ao remover assinatura do modelo de correspondente:", e);
      const detalhe = mensagemErro(e);
      toast.error(`Não consegui remover a assinatura: ${detalhe}`);
    } finally {
      setRemovendo(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Assinatura de {modelo.estado}</DialogTitle>
        <DialogDescription>
          Envie um recorte com a assinatura de quem assina pela BCW (pode já incluir nome e OAB
          impressos). Fica guardada de forma privada.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="modelo-assinatura-arquivo">Imagem (PNG ou JPG)</Label>
          <Input
            id="modelo-assinatura-arquivo"
            type="file"
            accept="image/png,image/jpeg"
            onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="modelo-assinatura-nome">Nome de quem assina</Label>
            <Input
              id="modelo-assinatura-nome"
              value={assinanteNome}
              onChange={(e) => setAssinanteNome(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="modelo-assinatura-oab">OAB</Label>
            <Input
              id="modelo-assinatura-oab"
              value={assinanteOab}
              onChange={(e) => setAssinanteOab(e.target.value)}
            />
          </div>
        </div>
        {modelo.assinaturaCaminho ? (
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
          {enviando ? "Salvando..." : "Salvar"}
        </Button>
      </DialogFooter>
    </>
  );
}

function GerenciarModelosCartaPreposicaoCorrespondenteDialog({
  open,
  onOpenChange,
  modelos,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  modelos: ModeloCartaPreposicaoCorrespondente[];
  onChanged: () => void;
}) {
  const [novoEstado, setNovoEstado] = useState("");
  const [novaLista, setNovaLista] = useState("");
  const [criando, setCriando] = useState(false);
  const [editando, setEditando] = useState<ModeloCartaPreposicaoCorrespondente | null>(null);
  const [assinaturaDe, setAssinaturaDe] = useState<ModeloCartaPreposicaoCorrespondente | null>(null);
  const [pdfDe, setPdfDe] = useState<ModeloCartaPreposicaoCorrespondente | null>(null);
  const [excluindo, setExcluindo] = useState<ModeloCartaPreposicaoCorrespondente | null>(null);

  const criar = async () => {
    if (!novoEstado.trim() || !novaLista.trim()) {
      toast.error("Preencha o estado e a lista de prepostos.");
      return;
    }
    setCriando(true);
    try {
      await criarModeloCartaPreposicaoCorrespondente(novoEstado.trim(), novaLista.trim());
      toast.success("Estado cadastrado.");
      setNovoEstado("");
      setNovaLista("");
      onChanged();
    } catch (e) {
      console.error("Erro ao cadastrar modelo de carta de preposição de correspondente:", e);
      const detalhe = mensagemErro(e);
      toast.error(`Não consegui cadastrar esse estado: ${detalhe}`);
    } finally {
      setCriando(false);
    }
  };

  const excluir = async () => {
    if (!excluindo) return;
    try {
      await excluirModeloCartaPreposicaoCorrespondente(excluindo);
      toast.success("Estado removido.");
      onChanged();
    } catch (e) {
      console.error("Erro ao excluir modelo de carta de preposição de correspondente:", e);
      const detalhe = mensagemErro(e);
      toast.error(`Não consegui remover esse estado: ${detalhe}`);
    } finally {
      setExcluindo(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modelos de correspondente</DialogTitle>
            <DialogDescription>
              Um cadastro por estado: a lista de prepostos (cole o texto pronto do PDF/Word que já
              existe) e quem assina pela BCW.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2 rounded-md border border-border p-3">
              <p className="text-sm font-medium">Novo estado</p>
              <Input
                placeholder="Estado (ex.: RJ)"
                value={novoEstado}
                onChange={(e) => setNovoEstado(e.target.value)}
              />
              <Textarea
                placeholder="Cole aqui a lista de prepostos (nome + CPF de cada um, igual já está no PDF/Word)"
                value={novaLista}
                onChange={(e) => setNovaLista(e.target.value)}
                className="min-h-32"
              />
              <Button type="button" size="sm" onClick={() => void criar()} disabled={criando}>
                {criando ? "Cadastrando..." : "Cadastrar estado"}
              </Button>
            </div>

            <div className="space-y-2">
              {modelos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum estado cadastrado ainda.</p>
              ) : (
                modelos.map((m) => (
                  <div
                    key={m.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{m.estado}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {m.listaPrepostos.length} caractere{m.listaPrepostos.length === 1 ? "" : "s"} na
                        lista de prepostos
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {m.assinaturaCaminho ? (
                          <Badge variant="outline">
                            Assinatura: {m.assinanteNome ?? "cadastrada"}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Sem assinatura</Badge>
                        )}
                        {m.modeloPdfCaminho ? (
                          <Badge variant="outline">PDF de referência cadastrado</Badge>
                        ) : (
                          <Badge variant="secondary">Sem PDF de referência</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setEditando(m)}
                      >
                        Editar
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setAssinaturaDe(m)}
                      >
                        Assinatura
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => setPdfDe(m)}>
                        PDF de referência
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Excluir estado ${m.estado}`}
                        onClick={() => setExcluindo(m)}
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
            <EditorModeloCartaPreposicaoCorrespondente
              modelo={editando}
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
            <EditorAssinaturaModeloCartaPreposicaoCorrespondente
              modelo={assinaturaDe}
              onSalvar={() => {
                setAssinaturaDe(null);
                onChanged();
              }}
              onCancelar={() => setAssinaturaDe(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={pdfDe != null} onOpenChange={(v) => !v && setPdfDe(null)}>
        <DialogContent className="max-w-md">
          {pdfDe ? (
            <EditorPdfCliente
              titulo={`PDF de referência de ${pdfDe.estado}`}
              descricao="Só pra consulta/backup -- o documento gerado não lê esse arquivo, usa o texto colado na lista de prepostos. Guarda só a versão atual."
              caminhoAtual={pdfDe.modeloPdfCaminho}
              nomeArquivoAtual={pdfDe.modeloPdfNomeArquivo}
              onEnviar={(arquivo) => enviarPdfReferenciaModeloCartaPreposicaoCorrespondente(pdfDe, arquivo)}
              onRemover={() => removerPdfReferenciaModeloCartaPreposicaoCorrespondente(pdfDe)}
              onBaixar={() => baixarPdfReferenciaModeloCartaPreposicaoCorrespondente(pdfDe)}
              onSalvar={() => {
                setPdfDe(null);
                onChanged();
              }}
              onCancelar={() => setPdfDe(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={excluindo != null} onOpenChange={(v) => !v && setExcluindo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {excluindo?.estado}?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso apaga o cadastro desse estado (lista de prepostos, assinatura e PDF de
              referência, se tiver). Não afeta documentos já baixados.
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

function EditorModeloCartaPreposicaoCorrespondente({
  modelo,
  onSalvar,
  onCancelar,
}: {
  modelo: ModeloCartaPreposicaoCorrespondente;
  onSalvar: () => void;
  onCancelar: () => void;
}) {
  const [estado, setEstado] = useState(modelo.estado);
  const [lista, setLista] = useState(modelo.listaPrepostos);
  const [salvando, setSalvando] = useState(false);

  const salvar = async () => {
    if (!estado.trim() || !lista.trim()) {
      toast.error("Preencha o estado e a lista de prepostos.");
      return;
    }
    setSalvando(true);
    try {
      await atualizarModeloCartaPreposicaoCorrespondente(modelo.id, {
        estado: estado.trim(),
        listaPrepostos: lista.trim(),
      });
      toast.success("Estado atualizado.");
      onSalvar();
    } catch (e) {
      console.error("Erro ao atualizar modelo de carta de preposição de correspondente:", e);
      const detalhe = mensagemErro(e);
      toast.error(`Não consegui salvar: ${detalhe}`);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Editar estado</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="modelo-carta-estado">Estado</Label>
          <Input id="modelo-carta-estado" value={estado} onChange={(e) => setEstado(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="modelo-carta-lista">Lista de prepostos</Label>
          <Textarea
            id="modelo-carta-lista"
            value={lista}
            onChange={(e) => setLista(e.target.value)}
            className="min-h-40"
          />
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

function EditorAssinaturaModeloCartaPreposicaoCorrespondente({
  modelo,
  onSalvar,
  onCancelar,
}: {
  modelo: ModeloCartaPreposicaoCorrespondente;
  onSalvar: () => void;
  onCancelar: () => void;
}) {
  const [assinanteNome, setAssinanteNome] = useState(modelo.assinanteNome ?? "");
  const [assinanteOab, setAssinanteOab] = useState(modelo.assinanteOab ?? "");
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
      await enviarAssinaturaModeloCartaPreposicaoCorrespondente(
        modelo,
        arquivo,
        assinanteNome.trim(),
        assinanteOab.trim(),
      );
      toast.success("Assinatura salva.");
      onSalvar();
    } catch (e) {
      const detalhe = mensagemErro(e);
      toast.error(`Não consegui salvar a assinatura: ${detalhe}`);
    } finally {
      setEnviando(false);
    }
  };

  const remover = async () => {
    setRemovendo(true);
    try {
      await removerAssinaturaModeloCartaPreposicaoCorrespondente(modelo);
      toast.success("Assinatura removida.");
      onSalvar();
    } catch (e) {
      console.error("Erro ao remover assinatura do modelo de carta de preposição de correspondente:", e);
      const detalhe = mensagemErro(e);
      toast.error(`Não consegui remover a assinatura: ${detalhe}`);
    } finally {
      setRemovendo(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Assinatura de {modelo.estado}</DialogTitle>
        <DialogDescription>
          Envie um recorte com a assinatura de quem assina pela BCW (pode já incluir nome e OAB
          impressos). Fica guardada de forma privada.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="modelo-carta-assinatura-arquivo">Imagem (PNG ou JPG)</Label>
          <Input
            id="modelo-carta-assinatura-arquivo"
            type="file"
            accept="image/png,image/jpeg"
            onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="modelo-carta-assinatura-nome">Nome de quem assina</Label>
            <Input
              id="modelo-carta-assinatura-nome"
              value={assinanteNome}
              onChange={(e) => setAssinanteNome(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="modelo-carta-assinatura-oab">OAB</Label>
            <Input
              id="modelo-carta-assinatura-oab"
              value={assinanteOab}
              onChange={(e) => setAssinanteOab(e.target.value)}
            />
          </div>
        </div>
        {modelo.assinaturaCaminho ? (
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
          {enviando ? "Salvando..." : "Salvar"}
        </Button>
      </DialogFooter>
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
      const detalhe = mensagemErro(e);
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
      const detalhe = mensagemErro(e);
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
