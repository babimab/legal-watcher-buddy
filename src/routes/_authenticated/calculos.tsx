import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Calculator, Download, FileText, Plus, Save, Sparkles, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  abrirDocumentoCalculo,
  calcularJudicial,
  criteriosIniciais,
  enviarDocumentoCalculo,
  excluirCalculo,
  exportarCalculoExcel,
  listarCalculos,
  listarDocumentosCalculo,
  novaVerba,
  salvarCalculo,
  type CalculoJudicial,
  type CriteriosCalculo,
  type EncargoCalculo,
  type IdentificacaoCalculo,
  type ResultadoCalculo,
} from "@/lib/calculos-judiciais";
import { exportarCalculoPdfDireto } from "@/lib/pdf-calculo";
import { exibir, formatarCNJ, listarProcessos, type Processo } from "@/lib/processos";

export const Route = createFileRoute("/_authenticated/calculos")({
  head: () => ({ meta: [{ title: "Cálculos | FaroLex" }] }),
  component: CalculosPage,
});

const TIPOS_VERBA = [
  "Dano moral",
  "Dano material",
  "Lucros cessantes",
  "Restituição",
  "Multa contratual",
  "Honorários sucumbenciais",
  "Outro",
];

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

function dinheiro(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function resumoEncargo(label: string, encargo: EncargoCalculo) {
  const valor = Number(encargo.valor) || 0;
  if (!valor) return null;
  if (encargo.modo === "percentual") return `${label} ${valor}%`;
  return `${label} ${dinheiro(valor)}`;
}

function resumoAcrescimos(criterios: CriteriosCalculo) {
  const itens = [
    resumoEncargo("Multa", criterios.multaExecucao),
    resumoEncargo("Hon. execução", criterios.honorariosExecucao),
    resumoEncargo("Hon. sucumbenciais", criterios.honorariosSucumbenciais),
  ].filter(Boolean) as string[];
  if (criterios.abatimentos.length) itens.push(`${criterios.abatimentos.length} ${criterios.abatimentos.length === 1 ? "abatimento" : "abatimentos"}`);
  if (criterios.observacoes?.trim()) itens.push("Observações preenchidas");
  return itens.length ? itens.join(" · ") : "Sem acréscimos";
}

function CalculosPage() {
  const qc = useQueryClient();
  const processos = useQuery({ queryKey: ["processos"], queryFn: listarProcessos });
  const salvos = useQuery({ queryKey: ["calculos-judiciais"], queryFn: listarCalculos });

  const [id, setId] = useState<string | undefined>();
  const [nome, setNome] = useState("Novo cálculo judicial");
  const [processoId, setProcessoId] = useState<string>("avulso");
  const [dataBase, setDataBase] = useState(hoje());
  const [criterios, setCriterios] = useState<CriteriosCalculo>(criteriosIniciais());
  const [resultado, setResultado] = useState<ResultadoCalculo | null>(null);
  const [calculando, setCalculando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [gerandoPdf, setGerandoPdf] = useState(false);

  const processo = useMemo(
    () => (processos.data ?? []).find((p) => p.id === processoId) ?? null,
    [processos.data, processoId],
  );

  const identificacaoAtual = useMemo<IdentificacaoCalculo>(() => {
    if (!processo) return criterios.identificacao ?? {};
    const clienteCaso =
      processo.numero_cliente && processo.numero_interno
        ? `${processo.numero_cliente}/${processo.numero_interno}`
        : processo.numero_interno || processo.numero_cliente || "";
    return {
      processo: formatarCNJ(processo.numero_cnj),
      clienteCaso,
      parteAutora: processo.autor ?? "",
      parteRe: processo.reu ?? "",
      cliente: processo.cliente ?? "",
      parteContraria: processo.parte_contraria ?? "",
    };
  }, [processo, criterios.identificacao]);

  const docs = useQuery({
    queryKey: ["calculo-documentos", id],
    queryFn: () => listarDocumentosCalculo(id!),
    enabled: !!id,
  });

  const novo = () => {
    setId(undefined);
    setNome("Novo cálculo judicial");
    setProcessoId("avulso");
    setDataBase(hoje());
    setCriterios(criteriosIniciais());
    setResultado(null);
  };

  const abrir = (c: CalculoJudicial) => {
    setId(c.id);
    setNome(c.nome);
    setProcessoId(c.processo_id ?? "avulso");
    setDataBase(c.data_base);
    setCriterios({ ...c.criterios, identificacao: c.criterios.identificacao ?? {} });
    setResultado(c.resultado);
  };

  const criteriosParaSalvar = (): CriteriosCalculo => ({
    ...criterios,
    identificacao: identificacaoAtual,
  });

  const rodar = async () => {
    setCalculando(true);
    try {
      const r = await calcularJudicial(criteriosParaSalvar(), dataBase);
      setResultado(r);
      toast.success("Cálculo atualizado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não consegui calcular.");
    } finally {
      setCalculando(false);
    }
  };

  const salvar = async () => {
    setSalvando(true);
    try {
      const c = await salvarCalculo({
        id,
        processoId: processoId === "avulso" ? null : processoId,
        nome: nome.trim() || "Cálculo judicial",
        dataBase,
        criterios: criteriosParaSalvar(),
        resultado,
      });
      setId(c.id);
      setCriterios(c.criterios);
      toast.success(id ? "Nova versão salva." : "Cálculo salvo.");
      await qc.invalidateQueries({ queryKey: ["calculos-judiciais"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não consegui salvar.");
    } finally {
      setSalvando(false);
    }
  };

  const duplicar = async () => {
    try {
      const c = await salvarCalculo({
        processoId: processoId === "avulso" ? null : processoId,
        nome: `${nome} — cópia`,
        dataBase,
        criterios: structuredClone(criteriosParaSalvar()),
        resultado: resultado ? structuredClone(resultado) : null,
      });
      abrir(c);
      await qc.invalidateQueries({ queryKey: ["calculos-judiciais"] });
      toast.success("Cálculo duplicado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não consegui duplicar.");
    }
  };

  const excluir = async () => {
    if (!id) return;
    if (!window.confirm(`Excluir o cálculo “${nome}”? Esta ação também excluirá os PDFs anexados e não poderá ser desfeita.`)) return;
    setExcluindo(true);
    try {
      await excluirCalculo(id);
      toast.success("Cálculo excluído.");
      novo();
      await qc.invalidateQueries({ queryKey: ["calculos-judiciais"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não consegui excluir o cálculo.");
    } finally {
      setExcluindo(false);
    }
  };

  const aplicarArt523 = () => {
    setCriterios((c) => ({
      ...c,
      multaExecucao: { modo: "percentual", valor: 10, base: "subtotal" },
      honorariosExecucao: { modo: "percentual", valor: 10, base: "subtotal" },
    }));
    toast.message("Sugestão aplicada: 10% de multa e 10% de honorários. Confira os critérios antes de calcular.");
  };

  const atualizarIdentificacao = (campo: keyof IdentificacaoCalculo, valor: string) => {
    setCriterios((c) => ({
      ...c,
      identificacao: { ...(c.identificacao ?? {}), [campo]: valor },
    }));
  };

  const exportarPdf = async () => {
    if (!resultado) return;
    setGerandoPdf(true);
    try {
      await exportarCalculoPdfDireto(nome, dataBase, criteriosParaSalvar(), resultado, identificacaoAtual);
      toast.success("PDF baixado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não consegui gerar o PDF.");
    } finally {
      setGerandoPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-semibold">Cálculos</h1>
          <p className="text-muted-foreground">Calculadora judicial geral com múltiplas verbas, índices e memória em Excel/PDF.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={novo}><Plus className="size-4" /> Novo</Button>
          {id ? <Button variant="outline" onClick={() => void duplicar()}>Duplicar</Button> : null}
          {id ? <Button variant="destructive" onClick={() => void excluir()} disabled={excluindo}><Trash2 className="size-4" /> {excluindo ? "Excluindo..." : "Excluir cálculo"}</Button> : null}
        </div>
      </div>

      {(salvos.data ?? []).length > 0 ? (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="font-serif text-lg">Cálculos salvos</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {(salvos.data ?? []).slice(0, 12).map((c) => (
              <Button key={c.id} variant={id === c.id ? "default" : "outline"} size="sm" onClick={() => abrir(c)}>
                {c.nome} <Badge variant="secondary" className="ml-1">v{c.versao}</Badge>
              </Button>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">Identificação</CardTitle>
          <CardDescription>Use um processo do FaroLex ou faça um cálculo avulso.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <Campo label="Nome do cálculo"><Input value={nome} onChange={(e) => setNome(e.target.value)} /></Campo>
          <Campo label="Processo">
            <Select value={processoId} onValueChange={(v) => { setProcessoId(v); setResultado(null); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="avulso">Cálculo avulso</SelectItem>
                {(processos.data ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{formatarCNJ(p.numero_cnj)} — {exibir(p.cliente)}</SelectItem>)}
              </SelectContent>
            </Select>
          </Campo>
          <Campo label="Data-base do cálculo"><Input type="date" value={dataBase} onChange={(e) => setDataBase(e.target.value)} /></Campo>
          {processo ? <ProcessoResumo processo={processo} /> : (
            <div className="grid gap-3 rounded-md border p-3 md:col-span-3 md:grid-cols-2">
              <Campo label="Número do processo"><Input value={criterios.identificacao?.processo ?? ""} onChange={(e) => atualizarIdentificacao("processo", e.target.value)} placeholder="Número CNJ ou referência" /></Campo>
              <Campo label="Cliente/Caso"><Input value={criterios.identificacao?.clienteCaso ?? ""} onChange={(e) => atualizarIdentificacao("clienteCaso", e.target.value)} placeholder="Ex.: 4608/2482" /></Campo>
              <Campo label="Parte autora"><Input value={criterios.identificacao?.parteAutora ?? ""} onChange={(e) => atualizarIdentificacao("parteAutora", e.target.value)} /></Campo>
              <Campo label="Parte ré"><Input value={criterios.identificacao?.parteRe ?? ""} onChange={(e) => atualizarIdentificacao("parteRe", e.target.value)} /></Campo>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        {criterios.verbas.map((v, vi) => (
          <VerbaCard key={v.id} indice={vi} verba={v} onChange={(nova) => setCriterios((c) => ({ ...c, verbas: c.verbas.map((x, i) => i === vi ? nova : x) }))} onDelete={() => setCriterios((c) => ({ ...c, verbas: c.verbas.filter((_, i) => i !== vi) }))} />
        ))}
        <Button variant="outline" onClick={() => setCriterios((c) => ({ ...c, verbas: [...c.verbas, novaVerba()] }))}><Plus className="size-4" /> Adicionar verba</Button>
      </div>

      <details className="group overflow-hidden rounded-lg border bg-card shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden">
          <div className="min-w-0">
            <p className="font-serif text-lg font-semibold">Acréscimos finais <span className="font-sans text-xs font-normal text-muted-foreground">(opcional)</span></p>
            <p className="mt-1 truncate text-sm text-muted-foreground">{resumoAcrescimos(criterios)}</p>
          </div>
          <span className="shrink-0 text-sm font-medium text-primary group-open:hidden">Adicionar/editar</span>
          <span className="hidden shrink-0 text-sm font-medium text-primary group-open:inline">Fechar</span>
        </summary>
        <div className="space-y-5 border-t px-5 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">Multa, honorários e abatimentos entram no fechamento do mesmo cálculo.</p>
            <Button variant="outline" size="sm" onClick={aplicarArt523}>Sugerir 10% + 10% do art. 523, §1º</Button>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Encargo label="Multa de execução" value={criterios.multaExecucao} onChange={(x) => setCriterios((c) => ({ ...c, multaExecucao: x }))} />
            <Encargo label="Honorários de execução" value={criterios.honorariosExecucao} onChange={(x) => setCriterios((c) => ({ ...c, honorariosExecucao: x }))} />
            <Encargo label="Honorários sucumbenciais" value={criterios.honorariosSucumbenciais} onChange={(x) => setCriterios((c) => ({ ...c, honorariosSucumbenciais: x }))} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between"><Label>Pagamentos / abatimentos</Label><Button variant="outline" size="sm" onClick={() => setCriterios((c) => ({ ...c, abatimentos: [...c.abatimentos, { id: crypto.randomUUID(), valor: 0, data: dataBase }] }))}><Plus className="size-4" /> Adicionar</Button></div>
            {criterios.abatimentos.map((a, i) => (
              <div key={a.id} className="grid gap-2 md:grid-cols-[1fr_1fr_2fr_auto]">
                <Input type="number" step="0.01" value={a.valor} onChange={(e) => setCriterios((c) => ({ ...c, abatimentos: c.abatimentos.map((x, j) => j === i ? { ...x, valor: Number(e.target.value) } : x) }))} placeholder="Valor" />
                <Input type="date" value={a.data} onChange={(e) => setCriterios((c) => ({ ...c, abatimentos: c.abatimentos.map((x, j) => j === i ? { ...x, data: e.target.value } : x) }))} />
                <Input value={a.descricao ?? ""} onChange={(e) => setCriterios((c) => ({ ...c, abatimentos: c.abatimentos.map((x, j) => j === i ? { ...x, descricao: e.target.value } : x) }))} placeholder="Descrição" />
                <Button variant="ghost" size="icon" onClick={() => setCriterios((c) => ({ ...c, abatimentos: c.abatimentos.filter((_, j) => j !== i) }))}><Trash2 className="size-4" /></Button>
              </div>
            ))}
          </div>
          <Campo label="Observações gerais"><Textarea value={criterios.observacoes ?? ""} onChange={(e) => setCriterios((c) => ({ ...c, observacoes: e.target.value }))} /></Campo>
        </div>
      </details>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void rodar()} disabled={calculando}><Calculator className="size-4" /> {calculando ? "Calculando..." : "Calcular"}</Button>
        <Button variant="outline" onClick={() => void salvar()} disabled={salvando}><Save className="size-4" /> {salvando ? "Salvando..." : id ? "Salvar nova versão" : "Salvar cálculo"}</Button>
        <Button variant="outline" onClick={() => { setDataBase(hoje()); setResultado(null); toast.message("Data-base do cálculo atualizada. Clique em Calcular."); }}>Atualizar até hoje</Button>
        <Button variant="outline" disabled={!resultado} onClick={() => resultado && void exportarCalculoExcel(nome, dataBase, criteriosParaSalvar(), resultado, identificacaoAtual)}><Download className="size-4" /> Excel</Button>
        <Button variant="outline" disabled={!resultado || gerandoPdf} onClick={() => void exportarPdf()}><FileText className="size-4" /> {gerandoPdf ? "Gerando PDF..." : "PDF"}</Button>
      </div>

      {resultado ? <Resultado resultado={resultado} identificacao={identificacaoAtual} dataBase={dataBase} /> : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-serif text-lg"><Upload className="size-4" /> Documentos para o cálculo</CardTitle>
          <CardDescription>Área complementar para anexar o título e os autos. A leitura automática por IA permanece em preparação.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <UploadCalculo calculoId={id} categoria="titulo" label="Sentença / acórdão / decisão / acordo" onDone={() => qc.invalidateQueries({ queryKey: ["calculo-documentos", id] })} />
            <UploadCalculo calculoId={id} categoria="autos" label="Autos / processo integral em PDF" onDone={() => qc.invalidateQueries({ queryKey: ["calculo-documentos", id] })} />
          </div>
          <Button variant="outline" disabled title="A integração de IA será adicionada sem expor chaves ou criar função anônima."><Sparkles className="size-4" /> Analisar documentos com IA — em preparação</Button>
          {(docs.data ?? []).length > 0 ? <div className="flex flex-wrap gap-2">{(docs.data ?? []).map((d) => <Button key={d.id} variant="ghost" size="sm" onClick={() => void abrirDocumentoCalculo(d)}><FileText className="size-4" /> {d.categoria === "autos" ? "Autos" : "Título"}: {d.nome_arquivo}</Button>)}</div> : null}
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">Confira os critérios jurídicos antes de utilizar a memória em juízo.</p>
    </div>
  );
}

function ProcessoResumo({ processo }: { processo: Processo }) {
  const clienteCaso = processo.numero_cliente && processo.numero_interno ? `${processo.numero_cliente}/${processo.numero_interno}` : processo.numero_interno || processo.numero_cliente;
  return <div className="grid gap-2 rounded-md border p-3 text-sm md:col-span-3 md:grid-cols-2">
    <div><span className="text-muted-foreground">Processo</span><p className="font-medium">{formatarCNJ(processo.numero_cnj)}</p></div>
    <div><span className="text-muted-foreground">Cliente/Caso</span><p className="font-medium">{clienteCaso || "—"}</p></div>
    <div><span className="text-muted-foreground">Parte autora</span><p className="font-medium">{processo.autor || "—"}</p></div>
    <div><span className="text-muted-foreground">Parte ré</span><p className="font-medium">{processo.reu || "—"}</p></div>
    {!processo.autor && !processo.reu ? <div className="md:col-span-2"><span className="text-muted-foreground">Partes cadastradas</span><p className="font-medium">{exibir(processo.cliente)}{processo.parte_contraria ? ` x ${processo.parte_contraria}` : ""}</p></div> : null}
  </div>;
}

function UploadCalculo({ calculoId, categoria, label, onDone }: { calculoId?: string | undefined; categoria: "titulo" | "autos"; label: string; onDone: () => void }) {
  const [enviando, setEnviando] = useState(false);
  return <Campo label={label}><Input type="file" accept="application/pdf" disabled={!calculoId || enviando} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (!f || !calculoId) return; setEnviando(true); void enviarDocumentoCalculo(calculoId, categoria, f).then(() => { toast.success("PDF anexado."); onDone(); }).catch((x) => toast.error(x instanceof Error ? x.message : "Falha no upload.")).finally(() => setEnviando(false)); }} /></Campo>;
}

function VerbaCard({ verba, indice, onChange, onDelete }: { verba: CriteriosCalculo["verbas"][number]; indice: number; onChange: (v: CriteriosCalculo["verbas"][number]) => void; onDelete: () => void }) {
  return <Card>
    <CardHeader className="pb-3"><div className="flex items-center justify-between gap-2"><CardTitle className="font-serif text-lg">Verba {indice + 1}</CardTitle><Button variant="ghost" size="icon" onClick={onDelete}><Trash2 className="size-4" /></Button></div></CardHeader>
    <CardContent className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <Campo label="Do que se trata"><Input list={`tipos-${verba.id}`} value={verba.descricao} onChange={(e) => onChange({ ...verba, descricao: e.target.value })} /><datalist id={`tipos-${verba.id}`}>{TIPOS_VERBA.map((x) => <option key={x} value={x} />)}</datalist></Campo>
        <Campo label="Observação / critério"><Input value={verba.observacao ?? ""} onChange={(e) => onChange({ ...verba, observacao: e.target.value })} /></Campo>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between"><Label>Parcelas / desembolsos</Label><Button variant="outline" size="sm" onClick={() => onChange({ ...verba, parcelas: [...verba.parcelas, { id: crypto.randomUUID(), valor: 0, data: "" }] })}><Plus className="size-4" /> Parcela</Button></div>
        {verba.parcelas.map((p, pi) => <div key={p.id} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]"><Input type="number" step="0.01" value={p.valor} onChange={(e) => onChange({ ...verba, parcelas: verba.parcelas.map((x, j) => j === pi ? { ...x, valor: Number(e.target.value) } : x) })} placeholder="Valor" /><Input type="date" value={p.data} onChange={(e) => onChange({ ...verba, parcelas: verba.parcelas.map((x, j) => j === pi ? { ...x, data: e.target.value } : x) })} /><Button variant="ghost" size="icon" onClick={() => onChange({ ...verba, parcelas: verba.parcelas.filter((_, j) => j !== pi) })}><Trash2 className="size-4" /></Button></div>)}
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Campo label="Correção monetária"><Select value={verba.indice} onValueChange={(x) => onChange({ ...verba, indice: x as typeof verba.indice })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="nenhum">Sem correção</SelectItem><SelectItem value="ipca">IPCA — IBGE/SIDRA</SelectItem><SelectItem value="manual">Manual / outro índice</SelectItem></SelectContent></Select></Campo>
        <Campo label="Correção desde"><Input type="date" value={verba.correcaoDesde ?? ""} onChange={(e) => onChange({ ...verba, correcaoDesde: e.target.value })} /></Campo>
        {verba.indice === "manual" ? <Campo label="Fator acumulado manual"><Input type="number" step="0.000001" value={verba.fatorManual ?? 1} onChange={(e) => onChange({ ...verba, fatorManual: Number(e.target.value) })} /></Campo> : null}
        <Campo label="Juros"><Select value={verba.juros} onValueChange={(x) => onChange({ ...verba, juros: x as typeof verba.juros })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="nenhum">Sem juros</SelectItem><SelectItem value="mensal">% ao mês</SelectItem><SelectItem value="anual">% ao ano</SelectItem><SelectItem value="selic">SELIC — Banco Central</SelectItem><SelectItem value="taxa_legal">Taxa Legal — 1% a.m. + SELIC</SelectItem></SelectContent></Select></Campo>
        <Campo label="Juros desde"><Input type="date" value={verba.jurosDesde ?? ""} onChange={(e) => onChange({ ...verba, jurosDesde: e.target.value })} /></Campo>
        {verba.juros === "mensal" || verba.juros === "anual" ? <Campo label="Taxa (%) — digite 1 para 1%"><Input type="number" step="0.01" value={verba.taxa ?? 0} onChange={(e) => onChange({ ...verba, taxa: Number(e.target.value) })} /></Campo> : null}
      </div>
      {verba.juros === "taxa_legal" ? <p className="text-xs text-muted-foreground">Transição automática: 1% a.m. até 29/08/2024 e SELIC a partir de 30/08/2024.</p> : null}
      {verba.indice !== "nenhum" && (verba.juros === "selic" || verba.juros === "taxa_legal") ? <p className="text-xs text-amber-700">Atenção: correção monetária + SELIC podem não ser cumuláveis conforme o título e o regime jurídico. Confira antes de utilizar.</p> : null}
    </CardContent>
  </Card>;
}

function Encargo({ label, value, onChange }: { label: string; value: EncargoCalculo; onChange: (x: EncargoCalculo) => void }) {
  return <div className="space-y-2 rounded-md border p-3"><Label>{label}</Label><div className="grid grid-cols-[1fr_1fr_auto] gap-2"><Select value={value.modo} onValueChange={(x) => onChange({ ...value, modo: x as EncargoCalculo["modo"] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="percentual">Percentual</SelectItem><SelectItem value="fixo">Valor fixo</SelectItem></SelectContent></Select><Input type="number" step="0.01" value={value.valor} onChange={(e) => onChange({ ...value, valor: Number(e.target.value) })} /><div className="flex items-center text-sm font-medium text-muted-foreground">{value.modo === "percentual" ? "%" : "R$"}</div></div>{value.modo === "percentual" ? <><p className="text-xs text-muted-foreground">Ex.: digite 10 para 10%.</p><Select value={value.base} onValueChange={(x) => onChange({ ...value, base: x as EncargoCalculo["base"] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="subtotal">Base: principal + correção + juros</SelectItem><SelectItem value="principal">Base: principal</SelectItem></SelectContent></Select></> : null}</div>;
}

function Resultado({ resultado, identificacao, dataBase }: { resultado: ResultadoCalculo; identificacao: IdentificacaoCalculo; dataBase: string }) {
  const partes = identificacao.parteAutora || identificacao.parteRe ? `${identificacao.parteAutora || "—"} x ${identificacao.parteRe || "—"}` : [identificacao.cliente, identificacao.parteContraria].filter(Boolean).join(" x ");
  const fechamento = [
    ["Principal", resultado.principal],
    ["Correção monetária", resultado.correcao],
    ["Juros", resultado.juros],
    ["Subtotal das verbas", resultado.subtotal],
    ["Multa de execução", resultado.multaExecucao],
    ["Honorários de execução", resultado.honorariosExecucao],
    ["Honorários sucumbenciais", resultado.honorariosSucumbenciais],
    ["Pagamentos / abatimentos", -resultado.abatimentos],
  ] as const;
  return <Card>
    <CardHeader><CardTitle className="font-serif text-xl">Resultado</CardTitle><CardDescription>{identificacao.processo ? `Processo ${identificacao.processo}` : "Cálculo avulso"}{partes ? ` · ${partes}` : ""} · Data-base do cálculo: {dataBase.split("-").reverse().join("/")}</CardDescription></CardHeader>
    <CardContent className="space-y-4">
      <div className="overflow-hidden rounded-md border">
        {fechamento.map(([label, valor], i) => <div key={label} className={`flex items-center justify-between gap-4 px-4 py-2.5 text-sm ${i === 3 ? "border-y bg-muted/40 font-semibold" : i > 3 ? "border-b last:border-b-0" : "border-b"}`}><span>{label}</span><span className="font-medium">{dinheiro(valor)}</span></div>)}
      </div>
      <div className="rounded-lg border-2 p-4"><p className="text-sm text-muted-foreground">Total atualizado</p><p className="font-serif text-3xl font-semibold">{dinheiro(resultado.total)}</p></div>
      {resultado.memoria.some((m) => (m.periodosJuros ?? []).length > 0) ? <div className="rounded-md border p-3"><p className="mb-2 text-sm font-medium">Taxa Legal — períodos aplicados</p>{resultado.memoria.flatMap((m) => (m.periodosJuros ?? []).map((p, i) => <p key={`${m.parcela}-${i}`} className="text-xs text-muted-foreground">{m.verba}: {p.descricao} de {p.de.split("-").reverse().join("/")} a {p.ate.split("-").reverse().join("/")} — {dinheiro(p.juros)}</p>))}</div> : null}
      {resultado.fontes.length > 0 ? <div><p className="mb-1 text-sm font-medium">Fontes e critérios</p><ul className="list-disc pl-5 text-sm text-muted-foreground">{resultado.fontes.map((f) => <li key={f}>{f}</li>)}</ul></div> : null}
    </CardContent>
  </Card>;
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
