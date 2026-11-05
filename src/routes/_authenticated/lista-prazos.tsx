import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { CalendarPlus, FileDown, FileSpreadsheet, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { NovoPrazoDialog } from "@/components/NovoPrazoDialog";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { exportarListaPrazosExcel } from "@/lib/excel";
import {
  agruparPorSemana,
  alternarConcluidaAutomatico,
  atualizarPrazoManual,
  classificarImportacaoWord,
  criarPrazoManual,
  criarPrazosManuaisEmLote,
  excluirPrazoManual,
  exportarListaPrazosWord,
  filtrarItens,
  FILTROS_VAZIOS,
  importarListaPrazosWord,
  listarPrazosAutomaticos,
  listarPrazosManuais,
  montarItensUnificados,
  salvarObservacaoAutomatico,
  tituloSemanaWord as tituloSemana,
  type FiltrosListaPrazos,
  type ItemImportadoClassificado,
  type ItemListaPrazos,
} from "@/lib/lista-prazos";
import { listarProcessos } from "@/lib/processos";

export const Route = createFileRoute("/_authenticated/lista-prazos")({
  ssr: false,
  component: ListaPrazos,
});

function ListaPrazos() {
  const queryClient = useQueryClient();
  const inputWordRef = useRef<HTMLInputElement>(null);
  const [mostrarConcluidos, setMostrarConcluidos] = useState(false);
  const [filtros, setFiltros] = useState<FiltrosListaPrazos>(FILTROS_VAZIOS);
  const [exportando, setExportando] = useState<"word" | "excel" | null>(null);
  const [importando, setImportando] = useState(false);
  const [novaNotaAberta, setNovaNotaAberta] = useState(false);
  const [salvandoNota, setSalvandoNota] = useState(false);
  const [previewImportacao, setPreviewImportacao] = useState<ItemImportadoClassificado[] | null>(
    null,
  );
  const [selecionadosImportacao, setSelecionadosImportacao] = useState<Set<number>>(new Set());
  const [confirmandoImportacao, setConfirmandoImportacao] = useState(false);

  const automaticos = useQuery({
    queryKey: ["lista-prazos-automaticos"],
    queryFn: listarPrazosAutomaticos,
  });
  const manuais = useQuery({
    queryKey: ["lista-prazos-manuais"],
    queryFn: listarPrazosManuais,
  });
  const processos = useQuery({ queryKey: ["processos"], queryFn: listarProcessos });

  const carregando = automaticos.isLoading || manuais.isLoading;
  const itens = montarItensUnificados(automaticos.data ?? [], manuais.data ?? []);
  const itensFiltrados = filtrarItens(itens, filtros);
  const itensVisiveis = itensFiltrados.filter((item) => mostrarConcluidos || !item.concluida);
  const grupos = agruparPorSemana(itensVisiveis);
  const filtrosAtivos =
    !!filtros.advogado.trim() ||
    !!filtros.parteAdversa.trim() ||
    !!filtros.clienteCaso.trim() ||
    !!filtros.dataDe ||
    !!filtros.dataAte;

  const invalidar = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["lista-prazos-automaticos"] }),
      queryClient.invalidateQueries({ queryKey: ["lista-prazos-manuais"] }),
    ]);

  const alternarAutomatico = async (id: string, concluida: boolean) => {
    try {
      await alternarConcluidaAutomatico(id, concluida);
      await invalidar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não consegui atualizar o prazo.");
    }
  };

  const salvarObservacao = async (id: string, observacao: string) => {
    try {
      await salvarObservacaoAutomatico(id, observacao.trim() || null);
      await invalidar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não consegui salvar a observação.");
    }
  };

  const alternarManual = async (id: string, concluida: boolean) => {
    try {
      await atualizarPrazoManual(id, { concluida });
      await invalidar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não consegui atualizar a nota.");
    }
  };

  const editarTextoManual = async (id: string, texto: string) => {
    if (!texto.trim()) return;
    try {
      await atualizarPrazoManual(id, { texto: texto.trim() });
      await invalidar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não consegui salvar a nota.");
    }
  };

  const editarDataManual = async (id: string, data: string) => {
    try {
      await atualizarPrazoManual(id, { data_ordenacao: data || null });
      await invalidar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não consegui salvar a data.");
    }
  };

  const excluirManual = async (id: string) => {
    if (!window.confirm("Excluir esta nota da lista de prazos?")) return;
    try {
      await excluirPrazoManual(id);
      await invalidar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não consegui excluir a nota.");
    }
  };

  const criarNota = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const texto = String(form.get("texto") ?? "").trim();
    if (!texto) {
      toast.error("Escreva o texto da nota.");
      return;
    }
    setSalvandoNota(true);
    try {
      await criarPrazoManual(texto, String(form.get("data") ?? "") || null);
      await invalidar();
      toast.success("Nota adicionada.");
      setNovaNotaAberta(false);
    } catch (e2) {
      toast.error(e2 instanceof Error ? e2.message : "Não consegui salvar a nota.");
    } finally {
      setSalvandoNota(false);
    }
  };

  const baixarWord = async () => {
    setExportando("word");
    try {
      await exportarListaPrazosWord(grupos);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não consegui gerar o Word.");
    } finally {
      setExportando(null);
    }
  };

  const baixarExcel = async () => {
    setExportando("excel");
    try {
      await exportarListaPrazosExcel(grupos);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não consegui gerar a planilha.");
    } finally {
      setExportando(null);
    }
  };

  // Só lê e classifica -- não grava nada no banco ainda. A gravação só
  // acontece quando a pessoa confere a prévia e clica em "Confirmar
  // importação" (handleConfirmarImportacao).
  const importarWord = async (arquivo: File) => {
    setImportando(true);
    try {
      const itensImportados = await importarListaPrazosWord(await arquivo.arrayBuffer());
      if (itensImportados.length === 0) {
        toast.error("Não encontrei nenhuma linha no formato de prazo nesse Word.");
        return;
      }
      const classificados = classificarImportacaoWord(itensImportados, manuais.data ?? []);
      setPreviewImportacao(classificados);
      // Pré-seleciona só os novos -- duplicado (existente ou repetido no
      // arquivo) começa desmarcado, mas dá pra marcar na mão quando for
      // intencional (ex.: prazo que só parece duplicado).
      setSelecionadosImportacao(
        new Set(
          classificados
            .map((item, i) => [item, i] as const)
            .filter(([item]) => item.status === "novo")
            .map(([, i]) => i),
        ),
      );
    } catch (e) {
      toast.error(e instanceof Error ? `Não consegui importar: ${e.message}` : "Não consegui importar o Word.");
    } finally {
      setImportando(false);
      if (inputWordRef.current) inputWordRef.current.value = "";
    }
  };

  const fecharPreviewImportacao = () => {
    setPreviewImportacao(null);
    setSelecionadosImportacao(new Set());
  };

  const confirmarImportacao = async () => {
    if (!previewImportacao) return;
    const escolhidos = previewImportacao.filter((_, i) => selecionadosImportacao.has(i));
    if (escolhidos.length === 0) {
      toast.error("Marque pelo menos um item pra importar.");
      return;
    }
    setConfirmandoImportacao(true);
    try {
      await criarPrazosManuaisEmLote(
        escolhidos.map((item) => ({ texto: item.texto, dataOrdenacao: item.dataOrdenacao })),
      );
      await invalidar();
      toast.success(`${escolhidos.length} item(ns) importado(s) como notas manuais.`);
      fecharPreviewImportacao();
    } catch (e) {
      toast.error(
        e instanceof Error ? `Não consegui importar: ${e.message}` : "Não consegui importar.",
      );
    } finally {
      setConfirmandoImportacao(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold">Lista de prazos</h1>
          <CardDescription>
            Prazos já cadastrados no sistema, puxados automaticamente, mais notas livres (ex.:
            avisos de férias) — no mesmo formato compacto de sempre.
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Dialog open={novaNotaAberta} onOpenChange={setNovaNotaAberta}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <CalendarPlus className="size-4" /> Nova nota
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-serif">Nova nota</DialogTitle>
                <DialogDescription>
                  Texto livre, sem processo ligado — ex.: "Férias BBS: 15/10 a 29/10". A data é só
                  pra encaixar a nota no lugar certo da lista.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={criarNota} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="texto">Texto</Label>
                  <Textarea id="texto" name="texto" rows={3} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="data">Data (opcional)</Label>
                  <Input id="data" name="data" type="date" />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={salvandoNota}>
                    {salvandoNota ? "Salvando..." : "Adicionar"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          <Button
            variant="outline"
            size="sm"
            onClick={baixarExcel}
            disabled={exportando !== null || itensVisiveis.length === 0}
          >
            <FileSpreadsheet className="size-4" />
            {exportando === "excel" ? "Gerando..." : "Baixar planilha"}
          </Button>
          <Button
            size="sm"
            onClick={baixarWord}
            disabled={exportando !== null || itensVisiveis.length === 0}
          >
            <FileDown className="size-4" />
            {exportando === "word" ? "Gerando..." : "Baixar Word"}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">Novo prazo:</span>
        <NovoPrazoDialog
          tipo="Prazo"
          processos={processos.data ?? []}
          trigger={
            <Button variant="outline" size="sm">
              Prazo
            </Button>
          }
        />
        <NovoPrazoDialog
          tipo="Audiência"
          processos={processos.data ?? []}
          trigger={
            <Button variant="outline" size="sm">
              Audiência
            </Button>
          }
        />
        <NovoPrazoDialog
          tipo="Julgamento"
          processos={processos.data ?? []}
          trigger={
            <Button variant="outline" size="sm">
              Julgamento
            </Button>
          }
        />
        <NovoPrazoDialog
          tipo="Acompanhamento"
          processos={processos.data ?? []}
          trigger={
            <Button variant="outline" size="sm">
              Acompanhamento
            </Button>
          }
        />
        <input
          ref={inputWordRef}
          type="file"
          accept=".doc,.docx"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && importarWord(e.target.files[0])}
        />
        <Button
          variant="outline"
          size="sm"
          className="ml-auto"
          onClick={() => inputWordRef.current?.click()}
          disabled={importando}
        >
          <Upload className="size-4" />
          {importando ? "Importando..." : "Importar Word (início)"}
        </Button>
      </div>

      {previewImportacao ? (
        <PreviewImportacaoDialog
          itens={previewImportacao}
          selecionados={selecionadosImportacao}
          onAlternar={(i) =>
            setSelecionadosImportacao((atual) => {
              const novo = new Set(atual);
              if (novo.has(i)) novo.delete(i);
              else novo.add(i);
              return novo;
            })
          }
          confirmando={confirmandoImportacao}
          onConfirmar={() => void confirmarImportacao()}
          onCancelar={fecharPreviewImportacao}
        />
      ) : null}

      <Card>
        <CardContent className="grid gap-3 py-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1">
            <Label htmlFor="filtro-advogado" className="text-xs text-muted-foreground">
              Advogado
            </Label>
            <Input
              id="filtro-advogado"
              placeholder="Ex.: BDR"
              value={filtros.advogado}
              onChange={(e) => setFiltros((f) => ({ ...f, advogado: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="filtro-parte" className="text-xs text-muted-foreground">
              Parte adversa
            </Label>
            <Input
              id="filtro-parte"
              placeholder="Nome da parte"
              value={filtros.parteAdversa}
              onChange={(e) => setFiltros((f) => ({ ...f, parteAdversa: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="filtro-caso" className="text-xs text-muted-foreground">
              Nº cliente/caso
            </Label>
            <Input
              id="filtro-caso"
              placeholder="Ex.: 4608/4450"
              value={filtros.clienteCaso}
              onChange={(e) => setFiltros((f) => ({ ...f, clienteCaso: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="filtro-data-de" className="text-xs text-muted-foreground">
              De
            </Label>
            <Input
              id="filtro-data-de"
              type="date"
              value={filtros.dataDe ?? ""}
              onChange={(e) => setFiltros((f) => ({ ...f, dataDe: e.target.value || null }))}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="filtro-data-ate" className="text-xs text-muted-foreground">
              Até
            </Label>
            <Input
              id="filtro-data-ate"
              type="date"
              value={filtros.dataAte ?? ""}
              onChange={(e) => setFiltros((f) => ({ ...f, dataAte: e.target.value || null }))}
            />
          </div>
          {filtrosAtivos ? (
            <div className="flex items-end sm:col-span-2 lg:col-span-5">
              <Button variant="ghost" size="sm" onClick={() => setFiltros(FILTROS_VAZIOS)}>
                Limpar filtros
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Checkbox
          id="mostrar-concluidos"
          checked={mostrarConcluidos}
          onCheckedChange={(v) => setMostrarConcluidos(v === true)}
        />
        <Label htmlFor="mostrar-concluidos" className="cursor-pointer font-normal">
          Mostrar notas concluídas
        </Label>
      </div>

      {carregando ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : itensVisiveis.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {filtrosAtivos
              ? "Nenhum item bate com esses filtros."
              : "Nenhum prazo pendente nem nota cadastrada."}
          </CardContent>
        </Card>
      ) : (
        grupos.map((grupo) => (
          <Card key={grupo.inicioSemana}>
            <CardHeader className="pb-2">
              <CardTitle className="font-serif text-base">{tituloSemana(grupo.inicioSemana)}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {grupo.itens.map((item) => (
                <ItemLinha
                  key={item.chave}
                  item={item}
                  onAlternarAutomatico={alternarAutomatico}
                  onSalvarObservacao={salvarObservacao}
                  onAlternarManual={alternarManual}
                  onEditarTextoManual={editarTextoManual}
                  onEditarDataManual={editarDataManual}
                  onExcluirManual={excluirManual}
                />
              ))}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

function ItemLinha({
  item,
  onAlternarAutomatico,
  onSalvarObservacao,
  onAlternarManual,
  onEditarTextoManual,
  onEditarDataManual,
  onExcluirManual,
}: {
  item: ItemListaPrazos;
  onAlternarAutomatico: (id: string, concluida: boolean) => void;
  onSalvarObservacao: (id: string, observacao: string) => void;
  onAlternarManual: (id: string, concluida: boolean) => void;
  onEditarTextoManual: (id: string, texto: string) => void;
  onEditarDataManual: (id: string, data: string) => void;
  onExcluirManual: (id: string) => void;
}) {
  if (item.tipo === "automatico") {
    return (
      <div
        className={`rounded-md border p-1.5 ${
          item.concluida ? "border-border bg-muted/40" : "border-primary/20 bg-primary/5"
        }`}
      >
        <div className="flex items-center gap-2">
          {item.tipoMovimentacao ? (
            <Badge className="shrink-0 px-2 py-0 text-[10px]">{item.tipoMovimentacao}</Badge>
          ) : null}
          <p
            className={`min-w-0 flex-1 truncate text-sm ${item.concluida ? "text-muted-foreground line-through" : ""}`}
            title={item.texto}
          >
            {item.texto}
          </p>
          <Checkbox
            className="shrink-0"
            checked={item.concluida}
            onCheckedChange={(v) => onAlternarAutomatico(item.movimentacaoId, v === true)}
            aria-label="Marcar concluído"
          />
        </div>
        <Input
          defaultValue={item.observacao ?? ""}
          placeholder="Observação (ex.: OK, resultado 14/10...)"
          className="mt-1 h-6 border-0 border-b border-dashed border-border/60 bg-transparent px-1 text-xs shadow-none focus-visible:ring-0"
          onBlur={(e) => {
            if (e.target.value !== (item.observacao ?? "")) {
              onSalvarObservacao(item.movimentacaoId, e.target.value);
            }
          }}
        />
      </div>
    );
  }

  return (
    <div
      className={`rounded-md border p-1.5 ${
        item.concluida ? "border-border bg-muted/40" : "border-dashed border-primary/30 bg-primary/5"
      }`}
    >
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="shrink-0 px-2 py-0 text-[10px]">
          nota
        </Badge>
        <Textarea
          defaultValue={item.texto}
          rows={1}
          className="min-h-0 flex-1 resize-none overflow-hidden border-0 bg-transparent px-1 py-0 text-sm leading-6 shadow-none focus-visible:ring-0"
          onBlur={(e) => {
            if (e.target.value.trim() !== item.texto) onEditarTextoManual(item.manualId, e.target.value);
          }}
        />
        <Checkbox
          className="shrink-0"
          checked={item.concluida}
          onCheckedChange={(v) => onAlternarManual(item.manualId, v === true)}
          aria-label="Marcar concluído"
        />
        <Button
          variant="ghost"
          size="icon"
          className="size-6 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={() => onExcluirManual(item.manualId)}
          aria-label="Excluir nota"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
      <Input
        type="date"
        defaultValue={item.data ?? ""}
        className="mt-1 h-6 w-36 border-0 border-b border-dashed border-border/60 bg-transparent px-1 text-xs shadow-none focus-visible:ring-0"
        onBlur={(e) => {
          if (e.target.value !== (item.data ?? "")) onEditarDataManual(item.manualId, e.target.value);
        }}
      />
    </div>
  );
}

function dataBR(iso: string | null): string {
  if (!iso) return "sem data";
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

const ROTULO_STATUS: Record<ItemImportadoClassificado["status"], string> = {
  novo: "Novo",
  duplicado_existente: "Possível duplicata — já existe no FaroLex",
  repetido_no_arquivo: "Repetido no próprio arquivo",
};

function PreviewImportacaoDialog({
  itens,
  selecionados,
  onAlternar,
  confirmando,
  onConfirmar,
  onCancelar,
}: {
  itens: ItemImportadoClassificado[];
  selecionados: Set<number>;
  onAlternar: (i: number) => void;
  confirmando: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}) {
  const novos = itens.filter((i) => i.status === "novo").length;
  const duplicadosExistentes = itens.filter((i) => i.status === "duplicado_existente").length;
  const repetidos = itens.filter((i) => i.status === "repetido_no_arquivo").length;

  return (
    <Dialog open onOpenChange={(v) => !v && onCancelar()}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-serif">Conferir importação do Word</DialogTitle>
          <DialogDescription>
            {novos} novo(s), {duplicadosExistentes} possível(eis) duplicata(s) já no FaroLex,{" "}
            {repetidos} repetido(s) no próprio arquivo. Confira e marque o que deve entrar — nada é
            gravado até confirmar.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {itens.map((item, i) => (
            <div
              key={i}
              className={`rounded-md border p-2 ${
                item.status === "novo"
                  ? "border-border"
                  : "border-dashed border-amber-400/60 bg-amber-50/40"
              }`}
            >
              <div className="flex items-start gap-2">
                <Checkbox
                  className="mt-0.5 shrink-0"
                  checked={selecionados.has(i)}
                  onCheckedChange={() => onAlternar(i)}
                  aria-label="Incluir na importação"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={item.status === "novo" ? "secondary" : "outline"}
                      className="px-2 py-0 text-[10px]"
                    >
                      {ROTULO_STATUS[item.status]}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {dataBR(item.dataOrdenacao)}
                    </span>
                  </div>
                  <p className="text-sm">{item.texto}</p>
                  {item.existente ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Já cadastrado ({dataBR(item.existente.data_ordenacao)}): "
                      {item.existente.texto}"
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancelar} disabled={confirmando}>
            Cancelar
          </Button>
          <Button onClick={onConfirmar} disabled={confirmando}>
            {confirmando
              ? "Importando..."
              : `Confirmar importação (${selecionados.size} selecionado(s))`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
