import { createFileRoute, redirect } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Download, FileDown, Pencil, Receipt, Trash2, Upload, X } from "lucide-react";

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
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  formatarMoeda,
  lerPlanilhaFatura,
  SIGLAS_PERMITIDAS_FATURA,
  type ItemFatura,
  type NotaFatura,
} from "@/lib/fatura";
import { gerarEBaixarPdfNota, gerarPdfNotas } from "@/lib/pdf-fatura";
import { baixarBlob } from "@/lib/pdf-base";
import { carregarUsuarioAtual, siglaDoEmail } from "@/lib/processos";

export const Route = createFileRoute("/_authenticated/fatura")({
  // Dado confidencial de fatura de cliente -- só essas siglas podem
  // entrar, mesmo digitando a URL direto (esconder o item do menu em
  // route.tsx não bastaria sozinho).
  beforeLoad: async () => {
    const usuario = await carregarUsuarioAtual();
    const sigla = (usuario.sigla || siglaDoEmail(usuario.email) || "").toUpperCase();
    if (!SIGLAS_PERMITIDAS_FATURA.includes(sigla)) {
      throw redirect({ to: "/painel" });
    }
  },
  head: () => ({
    meta: [
      { title: "Fatura | FaroLex" },
      {
        name: "description",
        content:
          "Envie a planilha de faturamento por ato de um cliente (ex.: resseguradora de companhia aérea) e gere a Nota de Honorários em PDF, no timbrado do escritório, pra cada caso.",
      },
    ],
  }),
  component: FaturaPage,
});

const TAMANHO_MAX = 20 * 1024 * 1024;
const EXTENSOES = [".xlsx", ".xls", ".xlsm"];

function FaturaPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [notas, setNotas] = useState<NotaFatura[]>([]);
  const [nomeArquivo, setNomeArquivo] = useState<string | null>(null);
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());
  const [lendo, setLendo] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [gerandoIdx, setGerandoIdx] = useState<number | null>(null);
  const [editando, setEditando] = useState<NotaFatura | null>(null);
  const [apagando, setApagando] = useState<NotaFatura | null>(null);

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
      const lidas = lerPlanilhaFatura(await arquivo.arrayBuffer());
      if (lidas.length === 0) {
        toast.error(
          "Não encontrei nenhuma aba de Honorários, Preposição ou Outras Despesas nesse arquivo.",
        );
        return;
      }
      setNotas(lidas);
      setNomeArquivo(arquivo.name);
      setSelecionados(new Set(lidas.map((n) => n.idx)));
      toast.success(`${lidas.length} nota(s) de honorários montada(s).`);
    } catch (e) {
      console.error("Erro ao ler planilha de fatura:", e);
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
    setSelecionados(marcar ? new Set(notas.map((n) => n.idx)) : new Set());
  };

  const salvarEdicao = (nota: NotaFatura) => {
    setNotas((atual) => atual.map((n) => (n.idx === nota.idx ? nota : n)));
    setEditando(null);
    toast.success("Nota atualizada.");
  };

  const apagar = () => {
    if (!apagando) return;
    setNotas((atual) => atual.filter((n) => n.idx !== apagando.idx));
    setSelecionados((atual) => {
      const novo = new Set(atual);
      novo.delete(apagando.idx);
      return novo;
    });
    setApagando(null);
    toast.success("Nota removida da lista.");
  };

  const baixarUma = async (nota: NotaFatura) => {
    setGerandoIdx(nota.idx);
    try {
      await gerarEBaixarPdfNota(nota);
    } catch {
      toast.error("Não consegui gerar essa nota.");
    } finally {
      setGerandoIdx(null);
    }
  };

  const gerarSelecionadas = async () => {
    const escolhidas = notas.filter((n) => selecionados.has(n.idx));
    if (escolhidas.length === 0) {
      toast.error("Selecione pelo menos uma nota.");
      return;
    }
    setGerando(true);
    try {
      const blob = await gerarPdfNotas(escolhidas);
      baixarBlob(blob, `notas-honorarios-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success(`${escolhidas.length} nota(s) gerada(s) num PDF só.`);
    } catch {
      toast.error("Não consegui gerar as notas.");
    } finally {
      setGerando(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 font-serif text-2xl font-semibold text-foreground">
          <Receipt className="size-6" /> Fatura
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pra clientes que pagam por ato (ex.: resseguradora de companhia aérea). Envie a planilha
          com as abas de Honorários, Preposição e/ou Outras Despesas — quando o mesmo Caso Interno
          aparece em mais de uma aba, vira uma Nota de Honorários só, com os valores somados.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">Arquivo</CardTitle>
          <CardDescription>Formatos aceitos: .xlsx, .xls e .xlsm (até 20 MB).</CardDescription>
        </CardHeader>
        <CardContent>
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
              onClick={() => void gerarSelecionadas()}
              disabled={gerando || notas.length === 0}
            >
              <FileDown className="size-4" />
              {gerando ? "Gerando..." : "Gerar Fatura"}
            </Button>
            {nomeArquivo ? (
              <span className="text-sm text-muted-foreground">{nomeArquivo}</span>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {notas.length > 0 ? (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="font-serif text-lg">
                  {notas.length} nota{notas.length === 1 ? "" : "s"} de honorários
                </CardTitle>
                <CardDescription>{selecionados.size} selecionada(s)</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => marcarTodos(true)}>
                  Marcar todas
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => marcarTodos(false)}
                >
                  Desmarcar todas
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
                    <th className="p-2">Caso Interno</th>
                    <th className="p-2">Reclamante</th>
                    <th className="p-2">Réu</th>
                    <th className="p-2">Processo</th>
                    <th className="p-2">Itens</th>
                    <th className="p-2 text-right">Valor total</th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {notas.map((nota) => (
                    <tr key={nota.idx} className="border-b border-border/60">
                      <td className="p-2">
                        <Checkbox
                          checked={selecionados.has(nota.idx)}
                          onCheckedChange={() => alternarSelecao(nota.idx)}
                        />
                      </td>
                      <td className="p-2">{nota.casoInterno ?? "—"}</td>
                      <td className="p-2">{nota.autor ?? "—"}</td>
                      <td className="p-2">{nota.reu ?? "—"}</td>
                      <td className="p-2 font-mono text-xs">{nota.processo ?? "—"}</td>
                      <td className="p-2">
                        <div className="flex flex-wrap gap-1">
                          {nota.itens.map((item, i) => (
                            <Badge key={i} variant="outline">
                              {item.tipo}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="p-2 text-right">
                        {formatarMoeda(nota.valorTotal, nota.moeda)}
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Editar nota do caso ${nota.casoInterno ?? nota.idx + 1}`}
                            onClick={() => setEditando(nota)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Apagar nota do caso ${nota.casoInterno ?? nota.idx + 1}`}
                            onClick={() => setApagando(nota)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Baixar nota do caso ${nota.casoInterno ?? nota.idx + 1}`}
                            onClick={() => void baixarUma(nota)}
                            disabled={gerandoIdx === nota.idx}
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

      {notas.length > 0 ? (
        <Button
          type="button"
          onClick={() => void gerarSelecionadas()}
          disabled={gerando}
          className="fixed bottom-6 right-6 z-40 shadow-lg"
          size="lg"
        >
          <FileDown className="size-4" />
          {gerando ? "Gerando..." : `Gerar Fatura (${selecionados.size})`}
        </Button>
      ) : null}

      <Dialog open={editando != null} onOpenChange={(aberto) => !aberto && setEditando(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          {editando ? (
            <EditorNota
              nota={editando}
              onSalvar={salvarEdicao}
              onCancelar={() => setEditando(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={apagando != null} onOpenChange={(aberto) => !aberto && setApagando(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar essa nota?</AlertDialogTitle>
            <AlertDialogDescription>
              A nota do caso {apagando?.casoInterno ?? `#${(apagando?.idx ?? 0) + 1}`} sai da lista
              (não mexe em nada do sistema, só tira ela daqui antes de gerar a fatura).
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

function EditorNota({
  nota,
  onSalvar,
  onCancelar,
}: {
  nota: NotaFatura;
  onSalvar: (nota: NotaFatura) => void;
  onCancelar: () => void;
}) {
  const [form, setForm] = useState<NotaFatura>(nota);

  const campo = (rotulo: string, chave: keyof NotaFatura) => (
    <div className="space-y-1">
      <Label htmlFor={`fatura-${chave}`}>{rotulo}</Label>
      <Input
        id={`fatura-${chave}`}
        value={(form[chave] as string | null) ?? ""}
        onChange={(e) =>
          setForm((atual) => ({
            ...atual,
            [chave]: e.target.value || null,
            // Editou o Juízo à mão -- descarta a quebra vara/comarca
            // calculada da planilha, que não bate mais com o texto novo.
            ...(chave === "juizo" ? { juizoVara: null, juizoComarcaUf: null } : null),
          }))
        }
      />
    </div>
  );

  const atualizarItem = (i: number, parcial: Partial<ItemFatura>) => {
    setForm((atual) => {
      const itens = atual.itens.map((item, j) => (j === i ? { ...item, ...parcial } : item));
      return { ...atual, itens, valorTotal: itens.reduce((s, it) => s + it.valor, 0) };
    });
  };

  const removerItem = (i: number) => {
    setForm((atual) => {
      const itens = atual.itens.filter((_, j) => j !== i);
      return { ...atual, itens, valorTotal: itens.reduce((s, it) => s + it.valor, 0) };
    });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Editar nota</DialogTitle>
        <DialogDescription>
          Ajusta os dados antes de gerar a fatura. Isso não altera a planilha original.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-3 sm:grid-cols-2">
        {campo("Caso Interno", "casoInterno")}
        {campo("Reclamante", "autor")}
        {campo("Réu", "reu")}
        {campo("Processo", "processo")}
        {campo("Juízo", "juizo")}
        {campo("Ref. B&S", "bsRef")}
        {campo("Correspondente", "correspondente")}
        {campo("Período de referência", "invoicePeriodo")}
        <div className="space-y-1">
          <Label htmlFor="fatura-invoiceData">Emissão</Label>
          <Input
            id="fatura-invoiceData"
            type="date"
            value={form.invoiceData ?? ""}
            onChange={(e) =>
              setForm((atual) => ({ ...atual, invoiceData: e.target.value || null }))
            }
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="fatura-moeda">Moeda</Label>
          <Input
            id="fatura-moeda"
            value={form.moeda}
            onChange={(e) =>
              setForm((atual) => ({ ...atual, moeda: e.target.value.toUpperCase() }))
            }
          />
        </div>
      </div>

      <div className="space-y-3">
        <Label>Itens da descrição</Label>
        {form.itens.map((item, i) => (
          <div key={i} className="space-y-2 rounded-md border border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <Badge variant="outline">{item.tipo}</Badge>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.01"
                  className="w-32"
                  value={item.valor}
                  onChange={(e) => atualizarItem(i, { valor: Number(e.target.value) || 0 })}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Remover item"
                  onClick={() => removerItem(i)}
                >
                  <X className="size-4" />
                </Button>
              </div>
            </div>
            <Textarea
              value={item.paragrafo}
              onChange={(e) => atualizarItem(i, { paragrafo: e.target.value })}
              rows={2}
            />
          </div>
        ))}
        {form.itens.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sem itens -- essa nota não vai gerar descrição nenhuma.
          </p>
        ) : null}
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
