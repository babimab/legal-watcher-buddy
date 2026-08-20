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
  exportarCalculoExcel,
  listarCalculos,
  listarDocumentosCalculo,
  novaVerba,
  salvarCalculo,
  type CalculoJudicial,
  type CriteriosCalculo,
  type EncargoCalculo,
  type ResultadoCalculo,
} from "@/lib/calculos-judiciais";
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

  const processo = useMemo(
    () => (processos.data ?? []).find((p) => p.id === processoId) ?? null,
    [processos.data, processoId],
  );

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
    setCriterios(c.criterios);
    setResultado(c.resultado);
  };

  const rodar = async () => {
    setCalculando(true);
    try {
      const r = await calcularJudicial(criterios, dataBase);
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
        criterios,
        resultado,
      });
      setId(c.id);
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
        criterios: structuredClone(criterios),
        resultado: resultado ? structuredClone(resultado) : null,
      });
      abrir(c);
      await qc.invalidateQueries({ queryKey: ["calculos-judiciais"] });
      toast.success("Cálculo duplicado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não consegui duplicar.");
    }
  };

  const aplicarArt523 = () => {
    setCriterios((c) => ({
      ...c,
      multaExecucao: { modo: "percentual", valor: 10, base: "subtotal" },
      honorariosExecucao: { modo: "percentual", valor: 10, base: "subtotal" },
    }));
    toast.message("Sugestão aplicada. Confira os critérios antes de calcular.");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-semibold">Cálculos</h1>
          <p className="text-muted-foreground">
            Calculadora judicial geral com múltiplas verbas, índices oficiais e memória em Excel.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={novo}><Plus className="size-4" /> Novo</Button>
          {id ? <Button variant="outline" onClick={() => void duplicar()}>Duplicar</Button> : null}
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
            <Select value={processoId} onValueChange={setProcessoId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="avulso">Cálculo avulso</SelectItem>
                {(processos.data ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>{formatarCNJ(p.numero_cnj)} — {exibir(p.cliente)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Campo>
          <Campo label="Data-base"><Input type="date" value={dataBase} onChange={(e) => setDataBase(e.target.value)} /></Campo>
          {processo ? <ProcessoResumo processo={processo} /> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-serif text-lg"><Upload className="size-4" /> Documentos para o cálculo</CardTitle>
          <CardDescription>
            Salve primeiro o cálculo para anexar sentença/acórdão e, separadamente, os autos integrais. A leitura automática por IA será conectada nesta estrutura em etapa posterior.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <UploadCalculo calculoId={id} categoria="titulo" label="Sentença / acórdão / decisão / acordo" onDone={() => qc.invalidateQueries({ queryKey: ["calculo-documentos", id] })} />
            <UploadCalculo calculoId={id} categoria="autos" label="Autos / processo integral em PDF" onDone={() => qc.invalidateQueries({ queryKey: ["calculo-documentos", id] })} />
          </div>
          <Button variant="outline" disabled title="A integração de IA será adicionada sem expor chaves ou criar função anônima.">
            <Sparkles className="size-4" /> Analisar documentos com IA — em preparação
          </Button>
          {(docs.data ?? []).length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {(docs.data ?? []).map((d) => (
                <Button key={d.id} variant="ghost" size="sm" onClick={() => void abrirDocumentoCalculo(d)}>
                  <FileText className="size-4" /> {d.categoria === "autos" ? "Autos" : "Título"}: {d.nome_arquivo}
                </Button>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="space-y-4">
        {criterios.verbas.map((v, vi) => (
          <VerbaCard
            key={v.id}
            indice={vi}
            verba={v}
            onChange={(nova) => setCriterios((c) => ({ ...c, verbas: c.verbas.map((x, i) => i === vi ? nova : x) }))}
            onDelete={() => setCriterios((c) => ({ ...c, verbas: c.verbas.filter((_, i) => i !== vi) }))}
          />
        ))}
        <Button variant="outline" onClick={() => setCriterios((c) => ({ ...c, verbas: [...c.verbas, novaVerba()] }))}>
          <Plus className="size-4" /> Adicionar verba
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">Encargos gerais e abatimentos</CardTitle>
          <CardDescription>Multa e honorários ficam separados das verbas da condenação.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <Button variant="outline" size="sm" onClick={aplicarArt523}>Sugerir 10% + 10% do art. 523, §1º</Button>
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
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void rodar()} disabled={calculando}><Calculator className="size-4" /> {calculando ? "Calculando..." : "Calcular"}</Button>
        <Button variant="outline" onClick={() => void salvar()} disabled={salvando}><Save className="size-4" /> {salvando ? "Salvando..." : id ? "Salvar nova versão" : "Salvar cálculo"}</Button>
        <Button variant="outline" onClick={() => { setDataBase(hoje()); setResultado(null); toast.message("Data-base atualizada. Clique em Calcular."); }}>Atualizar até hoje</Button>
        <Button variant="outline" disabled={!resultado} onClick={() => resultado && void exportarCalculoExcel(nome, dataBase, criterios, resultado)}><Download className="size-4" /> Excel</Button>
      </div>

      {resultado ? <Resultado resultado={resultado} /> : null}

      <p className="text-sm text-muted-foreground">Confira os critérios jurídicos antes de utilizar a memória em juízo.</p>
    </div>
  );
}

function ProcessoResumo({ processo }: { processo: Processo }) {
  const id = processo.numero_cliente && processo.numero_interno ? `${processo.numero_cliente}/${processo.numero_interno}` : processo.numero_interno || processo.numero_cliente;
  return (
    <div className="rounded-md border p-3 text-sm md:col-span-3">
      <b>{formatarCNJ(processo.numero_cnj)}</b> · {exibir(processo.cliente)}{processo.parte_contraria ? ` x ${processo.parte_contraria}` : ""}{id ? ` · Cliente/Caso: ${id}` : ""}
    </div>
  );
}

function UploadCalculo({ calculoId, categoria, label, onDone }: { calculoId?: string; categoria: "titulo" | "autos"; label: string; onDone: () => void }) {
  const [enviando, setEnviando] = useState(false);
  return <Campo label={label}><Input type="file" accept="application/pdf" disabled={!calculoId || enviando} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (!f || !calculoId) return; setEnviando(true); void enviarDocumentoCalculo(calculoId, categoria, f).then(() => { toast.success("PDF anexado."); onDone(); }).catch((x) => toast.error(x instanceof Error ? x.message : "Falha no upload.")).finally(() => setEnviando(false)); }} /></Campo>;
}

function VerbaCard({ verba, indice, onChange, onDelete }: { verba: CriteriosCalculo["verbas"][number]; indice: number; onChange: (v: CriteriosCalculo["verbas"][number]) => void; onDelete: () => void }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2"><CardTitle className="font-serif text-lg">Verba {indice + 1}</CardTitle><Button variant="ghost" size="icon" onClick={onDelete} disabled={false}><Trash2 className="size-4" /></Button></div>
      </CardHeader>
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
          <Campo label="Juros"><Select value={verba.juros} onValueChange={(x) => onChange({ ...verba, juros: x as typeof verba.juros })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="nenhum">Sem juros</SelectItem><SelectItem value="mensal">% ao mês</SelectItem><SelectItem value="anual">% ao ano</SelectItem><SelectItem value="selic">SELIC — Banco Central</SelectItem></SelectContent></Select></Campo>
          <Campo label="Juros desde"><Input type="date" value={verba.jurosDesde ?? ""} onChange={(e) => onChange({ ...verba, jurosDesde: e.target.value })} /></Campo>
          {verba.juros === "mensal" || verba.juros === "anual" ? <Campo label="Taxa (%)"><Input type="number" step="0.01" value={verba.taxa ?? 0} onChange={(e) => onChange({ ...verba, taxa: Number(e.target.value) })} /></Campo> : null}
        </div>
        {verba.indice !== "nenhum" && verba.juros === "selic" ? <p className="text-xs text-amber-700">Atenção: correção monetária + SELIC podem não ser cumuláveis conforme o título e o regime jurídico. Confira antes de utilizar.</p> : null}
      </CardContent>
    </Card>
  );
}

function Encargo({ label, value, onChange }: { label: string; value: EncargoCalculo; onChange: (x: EncargoCalculo) => void }) {
  return <div className="space-y-2 rounded-md border p-3"><Label>{label}</Label><div className="grid grid-cols-2 gap-2"><Select value={value.modo} onValueChange={(x) => onChange({ ...value, modo: x as EncargoCalculo["modo"] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="percentual">Percentual</SelectItem><SelectItem value="fixo">Valor fixo</SelectItem></SelectContent></Select><Input type="number" step="0.01" value={value.valor} onChange={(e) => onChange({ ...value, valor: Number(e.target.value) })} /></div>{value.modo === "percentual" ? <Select value={value.base} onValueChange={(x) => onChange({ ...value, base: x as EncargoCalculo["base"] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="subtotal">Base: principal + correção + juros</SelectItem><SelectItem value="principal">Base: principal</SelectItem></SelectContent></Select> : null}</div>;
}

function Resultado({ resultado }: { resultado: ResultadoCalculo }) {
  const itens = [["Principal", resultado.principal], ["Correção", resultado.correcao], ["Juros", resultado.juros], ["Multa de execução", resultado.multaExecucao], ["Honorários de execução", resultado.honorariosExecucao], ["Honorários sucumbenciais", resultado.honorariosSucumbenciais], ["Abatimentos", -resultado.abatimentos]] as const;
  return <Card><CardHeader><CardTitle className="font-serif text-xl">Resultado</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{itens.map(([l, v]) => <div key={l} className="rounded-md border p-3"><p className="text-xs text-muted-foreground">{l}</p><p className="text-lg font-semibold">{dinheiro(v)}</p></div>)}</div><div className="rounded-lg border-2 p-4"><p className="text-sm text-muted-foreground">Total atualizado</p><p className="font-serif text-3xl font-semibold">{dinheiro(resultado.total)}</p></div>{resultado.fontes.length > 0 ? <div><p className="mb-1 text-sm font-medium">Fontes e critérios</p><ul className="list-disc pl-5 text-sm text-muted-foreground">{resultado.fontes.map((f) => <li key={f}>{f}</li>)}</ul></div> : null}</CardContent></Card>;
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
