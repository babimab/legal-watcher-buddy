import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { Upload, CheckCircle2, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import {
  exibir,
  formatarCNJ,
  listarProcessos,
  siglaOuEmailAtual,
  type Processo,
} from "@/lib/processos";
import { acompanharCitacao, listarAcompanhamentoCitacoes, marcarConferido } from "@/lib/citacoes";

export const Route = createFileRoute("/_authenticated/citacoes")({
  head: () => ({
    meta: [
      { title: "Citações | FaroLex" },
      {
        name: "description",
        content:
          "Envie a planilha de acompanhamento de citações/intimações e o sistema já sugere os andamentos dos processos que já estão cadastrados.",
      },
    ],
  }),
  component: CitacoesPage,
});

const TAMANHO_MAX = 20 * 1024 * 1024;
const EXTENSOES = [".xlsx", ".xls", ".xlsm"];

type Campo =
  "autor" | "reu" | "processo" | "uf" | "comarca" | "vara" | "data" | "andamento" | "observacao";

const SINONIMOS: Record<string, Campo> = {
  autor: "autor",
  "nome do autor": "autor",
  reu: "reu",
  "nome do reu": "reu",
  processo: "processo",
  "numero cnj": "processo",
  "numero do processo": "processo",
  "numero processo": "processo",
  numero: "processo",
  uf: "uf",
  estado: "uf",
  comarca: "comarca",
  vara: "vara",
  juizo: "vara",
  "data andamento": "data",
  "data do andamento": "data",
  data: "data",
  "descricao andamento": "andamento",
  "descricao do andamento": "andamento",
  andamento: "andamento",
  descricao: "andamento",
  observacoes: "observacao",
  observacao: "observacao",
  obs: "observacao",
};

type LinhaLida = { numero: number; origem: string; dados: Record<string, unknown> };

type LinhaCitacao = {
  idx: number;
  linha: number;
  origem: string;
  cnjDigits: string;
  cnjTexto: string;
  autor: string | null;
  reu: string | null;
  uf: string | null;
  comarca: string | null;
  vara: string | null;
  data: string | null;
  andamento: string | null;
  observacao: string | null;
};

type LinhaCasada = LinhaCitacao & { processo: Processo };

function normalizar(coluna: string) {
  return coluna
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function texto(valor: unknown): string | null {
  if (valor == null) return null;
  const s = String(valor).trim();
  return s === "" || s.toLowerCase() === "nan" ? null : s;
}

function dataISO(valor: unknown): string | null {
  if (valor == null || valor === "") return null;
  if (valor instanceof Date) {
    const d = new Date(valor.getTime() - valor.getTimezoneOffset() * 60000);
    return d.toISOString().slice(0, 10);
  }
  if (typeof valor === "number") {
    const p = XLSX.SSF.parse_date_code(valor);
    if (!p) return null;
    return `${String(p.y).padStart(4, "0")}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
  }
  const s = String(valor).trim();
  const br = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (br) {
    const ano = br[3]!.length === 2 ? `20${br[3]}` : br[3];
    return `${ano}-${br[2]!.padStart(2, "0")}-${br[1]!.padStart(2, "0")}`;
  }
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[0];
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

// Lê todas as abas do arquivo (o nome delas varia — "Ag. juntada de AR e
// citação", "Aguardando intimação para CR", "Outros casos relevantes" etc.
// — então em vez de filtrar por nome, a gente só usa o nome da aba como
// informação de contexto ("Origem") e lê qualquer aba que tenha as colunas
// certas. Nunca mexe em carteira/fase do processo — só sugere andamento.
function lerCitacoes(buffer: ArrayBuffer): LinhaLida[] {
  const wb = XLSX.read(buffer, { cellDates: true, cellFormula: false, cellHTML: false });
  const linhas: LinhaLida[] = [];

  for (const nomeAba of wb.SheetNames) {
    const sheet = wb.Sheets[nomeAba];
    if (!sheet) continue;

    const matriz = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false });
    const idxCabecalho = matriz.findIndex(
      (linha) => Array.isArray(linha) && linha.filter((c) => texto(c)).length >= 2,
    );
    if (idxCabecalho < 0) continue;
    const cabecalho = (matriz[idxCabecalho] ?? []).map((c, i) => texto(c) ?? `Coluna ${i + 1}`);
    if (!cabecalho.some((c) => SINONIMOS[normalizar(c)] === "processo")) continue;

    for (let i = idxCabecalho + 1; i < matriz.length; i++) {
      const bruta = matriz[i] ?? [];
      if (!bruta.some((c) => texto(c) != null)) continue;
      const dados: Record<string, unknown> = {};
      cabecalho.forEach((col, j) => {
        dados[col] = bruta[j] ?? null;
      });
      linhas.push({ numero: i + 1, origem: nomeAba.trim(), dados });
    }
  }
  return linhas;
}

function montarLinhas(linhas: LinhaLida[]): LinhaCitacao[] {
  const resultado: LinhaCitacao[] = [];
  for (const linha of linhas) {
    const l: Partial<Record<Campo, unknown>> = {};
    for (const [col, valor] of Object.entries(linha.dados)) {
      const campo = SINONIMOS[normalizar(col)];
      if (campo && (l[campo] == null || l[campo] === "")) l[campo] = valor;
    }
    const cnjBruto = texto(l.processo);
    if (!cnjBruto) continue;
    const cnjDigits = cnjBruto.replace(/\D/g, "");
    if (cnjDigits.length < 15) continue;

    resultado.push({
      idx: resultado.length,
      linha: linha.numero,
      origem: linha.origem,
      cnjDigits,
      cnjTexto: formatarCNJ(cnjDigits),
      autor: texto(l.autor),
      reu: texto(l.reu),
      uf: texto(l.uf),
      comarca: texto(l.comarca),
      vara: texto(l.vara),
      data: dataISO(l.data),
      andamento: texto(l.andamento),
      observacao: texto(l.observacao),
    });
  }
  return resultado;
}

function CitacoesPage() {
  const [linhas, setLinhas] = useState<LinhaCitacao[]>([]);
  const [origemAtiva, setOrigemAtiva] = useState<string | "todas">("todas");
  const [selecionadas, setSelecionadas] = useState<Set<number>>(new Set());
  const [importando, setImportando] = useState(false);
  const [detalhe, setDetalhe] = useState<LinhaCasada | null>(null);
  const queryClient = useQueryClient();

  const processos = useQuery({ queryKey: ["processos"], queryFn: listarProcessos });
  const acompanhamento = useQuery({
    queryKey: ["acompanhamento-citacoes"],
    queryFn: listarAcompanhamentoCitacoes,
  });

  const processoPorCnj = useMemo(() => {
    const mapa = new Map<string, Processo>();
    for (const p of processos.data ?? []) mapa.set(p.numero_cnj.replace(/\D/g, ""), p);
    return mapa;
  }, [processos.data]);

  const processoPorId = useMemo(() => {
    const mapa = new Map<string, Processo>();
    for (const p of processos.data ?? []) mapa.set(p.id, p);
    return mapa;
  }, [processos.data]);

  const pendentesConferencia = useMemo(
    () =>
      (acompanhamento.data ?? []).filter((a) => !a.conferido && processoPorId.has(a.processo_id)),
    [acompanhamento.data, processoPorId],
  );

  const { casadas, semProcesso } = useMemo(() => {
    const casadas: LinhaCasada[] = [];
    const semProcesso: LinhaCitacao[] = [];
    for (const l of linhas) {
      const processo = processoPorCnj.get(l.cnjDigits);
      if (processo) casadas.push({ ...l, processo });
      else semProcesso.push(l);
    }
    return { casadas, semProcesso };
  }, [linhas, processoPorCnj]);

  const origens = useMemo(() => [...new Set(casadas.map((l) => l.origem))].sort(), [casadas]);

  const contagemPorOrigem = useMemo(() => {
    const c = new Map<string, number>();
    for (const l of casadas) c.set(l.origem, (c.get(l.origem) ?? 0) + 1);
    return c;
  }, [casadas]);

  const exibidas = useMemo(
    () => (origemAtiva === "todas" ? casadas : casadas.filter((l) => l.origem === origemAtiva)),
    [casadas, origemAtiva],
  );

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
    try {
      const lidas = lerCitacoes(await arquivo.arrayBuffer());
      if (lidas.length === 0) {
        toast.error("Não encontrei nenhuma aba com coluna de processo/CNJ nesse arquivo.");
        return;
      }
      const montadas = montarLinhas(lidas);
      setLinhas(montadas);
      setSelecionadas(new Set(montadas.map((l) => l.idx)));
      setOrigemAtiva("todas");
      toast.success(`${montadas.length} linha(s) lida(s).`);
    } catch {
      toast.error("Não consegui ler o arquivo.");
    }
  };

  const alternarSelecao = (idx: number) => {
    setSelecionadas((atual) => {
      const novo = new Set(atual);
      if (novo.has(idx)) novo.delete(idx);
      else novo.add(idx);
      return novo;
    });
  };

  const selecionarTodasVisiveis = (marcar: boolean) => {
    setSelecionadas((atual) => {
      const novo = new Set(atual);
      for (const l of exibidas) {
        if (marcar) novo.add(l.idx);
        else novo.delete(l.idx);
      }
      return novo;
    });
  };

  const importar = async () => {
    const escolhidas = casadas.filter((l) => selecionadas.has(l.idx) && l.andamento && l.data);
    if (escolhidas.length === 0) {
      toast.error("Nenhuma linha selecionada com data e andamento preenchidos.");
      return;
    }
    setImportando(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const criador = userData.user?.id;
      if (!criador) throw new Error("Sessão expirada. Entre novamente para importar.");

      const idsProcessos = [...new Set(escolhidas.map((l) => l.processo.id))];
      const existentes = new Set<string>();
      for (let i = 0; i < idsProcessos.length; i += 100) {
        const { data, error } = await supabase
          .from("movimentacoes")
          .select("processo_id, data_movimentacao, descricao")
          .in("processo_id", idsProcessos.slice(i, i + 100));
        if (error) throw error;
        for (const m of data ?? [])
          existentes.add(`${m.processo_id}|${m.data_movimentacao}|${m.descricao}`);
      }

      const novas: {
        processo_id: string;
        data_movimentacao: string;
        descricao: string;
        observacao: string | null;
        tipo: string;
        exige_acao: boolean;
        fonte: string;
        validado: boolean;
        created_by: string;
      }[] = [];
      for (const l of escolhidas) {
        const chave = `${l.processo.id}|${l.data}|${l.andamento}`;
        if (existentes.has(chave)) continue;
        existentes.add(chave);
        novas.push({
          processo_id: l.processo.id,
          data_movimentacao: l.data!,
          descricao: l.andamento!,
          observacao: l.observacao,
          tipo: "Intimação",
          exige_acao: false,
          fonte: "citacoes",
          validado: false,
          created_by: criador,
        });
      }

      let ok = 0;
      const falhas: string[] = [];
      for (let i = 0; i < novas.length; i += 300) {
        const lote = novas.slice(i, i + 300);
        const { error } = await supabase.from("movimentacoes").insert(lote);
        if (error) falhas.push(error.message);
        else ok += lote.length;
      }

      // Marca cada processo como "em acompanhamento" — fica na lista da
      // própria página até alguém conferir, mesmo depois de fechar/voltar.
      // Uma linha por processo (upsert), mesmo que ele apareça em mais de
      // uma linha da planilha selecionada.
      const porProcesso = new Map<string, LinhaCasada>();
      for (const l of escolhidas) porProcesso.set(l.processo.id, l);
      for (const l of porProcesso.values()) {
        await acompanharCitacao({
          processo_id: l.processo.id,
          origem: l.origem,
          ultimo_andamento: l.andamento,
          ultimo_andamento_em: l.data,
          created_by: criador,
        });
      }

      const jaExistiam = escolhidas.length - novas.length;
      if (falhas.length > 0) {
        toast.warning(`${ok} andamento(s) importado(s). Erros: ${falhas.slice(0, 2).join(" | ")}`);
      } else {
        toast.success(
          `${ok} andamento(s) novo(s) sugerido(s), prontos pra validar na aba de Relatórios.` +
            (jaExistiam > 0 ? ` (${jaExistiam} já existiam e foram ignorados.)` : ""),
        );
        setLinhas([]);
        setSelecionadas(new Set());
      }
      await queryClient.invalidateQueries();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao importar.");
    } finally {
      setImportando(false);
    }
  };

  const totalSelecionadas = casadas.filter((l) => selecionadas.has(l.idx)).length;

  const conferir = async (id: string) => {
    try {
      const quem = await siglaOuEmailAtual();
      await marcarConferido(id, quem);
      await queryClient.invalidateQueries({ queryKey: ["acompanhamento-citacoes"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não consegui marcar como conferido.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold">Citações</h1>
        <p className="text-muted-foreground">
          Envie a planilha de acompanhamento de citações/intimações. O sistema cruza o número do
          processo com o que já está cadastrado aqui e já sugere o andamento — sem mexer na carteira
          ou na fase do processo.
        </p>
      </div>

      {pendentesConferencia.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-lg">
              {pendentesConferencia.length} processo(s) em acompanhamento
            </CardTitle>
            <CardDescription>
              Ficam nessa lista até alguém marcar como conferido — é a segunda conferência da
              semana, sem precisar subir a planilha de novo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-2 text-left">Processo</th>
                    <th className="p-2 text-left">Cliente</th>
                    <th className="p-2 text-left">Origem</th>
                    <th className="p-2 text-left">Último andamento</th>
                    <th className="w-56 p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {pendentesConferencia.map((a) => {
                    const p = processoPorId.get(a.processo_id)!;
                    return (
                      <tr key={a.id} className="border-t border-border">
                        <td className="p-2 font-mono text-xs">{formatarCNJ(p.numero_cnj)}</td>
                        <td className="p-2">{exibir(p.cliente)}</td>
                        <td className="p-2">
                          {a.origem ? <Badge variant="outline">{a.origem}</Badge> : "—"}
                        </td>
                        <td className="max-w-96 truncate p-2 text-xs text-muted-foreground">
                          {a.ultimo_andamento ?? "—"}
                          {a.ultimo_andamento_em
                            ? ` (${new Date(`${a.ultimo_andamento_em}T00:00:00`).toLocaleDateString("pt-BR")})`
                            : ""}
                        </td>
                        <td className="p-2 text-right">
                          <div className="flex justify-end gap-1">
                            <Button asChild type="button" size="sm" variant="ghost">
                              <Link to="/processos/$id" params={{ id: p.id }}>
                                <Pencil className="size-4" /> Editar
                              </Link>
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => void conferir(a.id)}
                            >
                              <CheckCircle2 className="size-4" /> Marcar conferido
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

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">Arquivo</CardTitle>
          <CardDescription>
            Formatos aceitos: .xlsx, .xls e .xlsm (até 20 MB). Só processos que já existem no
            FaroLex são sugeridos — nada novo é criado a partir daqui.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            type="file"
            accept=".xlsx,.xls,.xlsm"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void ler(f);
            }}
          />
        </CardContent>
      </Card>

      {linhas.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-lg">
              {casadas.length} linha(s) de processos já cadastrados
            </CardTitle>
            <CardDescription>
              {semProcesso.length > 0
                ? `${semProcesso.length} linha(s) da planilha não batem com nenhum processo cadastrado e foram ignoradas.`
                : "Todas as linhas da planilha bateram com processos cadastrados."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {origens.length > 1 ? (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={origemAtiva === "todas" ? "default" : "outline"}
                  onClick={() => setOrigemAtiva("todas")}
                >
                  Todas ({casadas.length})
                </Button>
                {origens.map((o) => (
                  <Button
                    key={o}
                    type="button"
                    size="sm"
                    variant={origemAtiva === o ? "default" : "outline"}
                    onClick={() => setOrigemAtiva(o)}
                  >
                    {o} ({contagemPorOrigem.get(o)})
                  </Button>
                ))}
              </div>
            ) : null}

            <div className="flex items-center gap-3 text-sm">
              <button
                type="button"
                className="text-primary underline-offset-4 hover:underline"
                onClick={() => selecionarTodasVisiveis(true)}
              >
                Selecionar todas visíveis
              </button>
              <button
                type="button"
                className="text-primary underline-offset-4 hover:underline"
                onClick={() => selecionarTodasVisiveis(false)}
              >
                Limpar seleção
              </button>
            </div>

            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="w-8 p-2"></th>
                    <th className="p-2 text-left">Processo</th>
                    <th className="p-2 text-left">Cliente</th>
                    <th className="p-2 text-left">Origem</th>
                    <th className="p-2 text-left">Data</th>
                    <th className="p-2 text-left">Andamento</th>
                  </tr>
                </thead>
                <tbody>
                  {exibidas.map((l) => (
                    <tr
                      key={`${l.cnjDigits}-${l.linha}`}
                      className="cursor-pointer border-t border-border hover:bg-muted/50"
                      onClick={() => setDetalhe(l)}
                    >
                      <td className="p-2" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selecionadas.has(l.idx)}
                          onCheckedChange={() => alternarSelecao(l.idx)}
                        />
                      </td>
                      <td className="p-2 font-mono text-xs">{l.cnjTexto}</td>
                      <td className="p-2">{exibir(l.processo.cliente)}</td>
                      <td className="p-2">
                        <Badge variant="outline">{l.origem}</Badge>
                      </td>
                      <td className="p-2">
                        {l.data ? new Date(`${l.data}T00:00:00`).toLocaleDateString("pt-BR") : "—"}
                      </td>
                      <td className="max-w-96 truncate p-2 text-xs text-muted-foreground">
                        {l.andamento ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Button onClick={importar} disabled={importando || totalSelecionadas === 0}>
              <Upload className="size-4" />
              {importando
                ? "Importando..."
                : `Sugerir ${totalSelecionadas} andamento(s) pros processos`}
            </Button>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <CheckCircle2 className="size-3.5" /> Os andamentos sugeridos entram como não
              validados — aparecem marcados em Relatórios até alguém confirmar.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Dialog open={!!detalhe} onOpenChange={(v) => !v && setDetalhe(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">
              {detalhe ? exibir(detalhe.processo.cliente) : ""}
            </DialogTitle>
            <DialogDescription className="font-mono text-xs">{detalhe?.cnjTexto}</DialogDescription>
          </DialogHeader>
          {detalhe ? (
            <div className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{detalhe.origem}</Badge>
                {detalhe.data ? (
                  <Badge variant="outline">
                    {new Date(`${detalhe.data}T00:00:00`).toLocaleDateString("pt-BR")}
                  </Badge>
                ) : null}
              </div>
              {detalhe.autor || detalhe.reu ? (
                <p className="text-muted-foreground">
                  Partes: {[detalhe.autor, detalhe.reu].filter(Boolean).join(" x ")}
                </p>
              ) : null}
              {detalhe.vara || detalhe.comarca || detalhe.uf ? (
                <p className="text-muted-foreground">
                  {[detalhe.vara, detalhe.comarca, detalhe.uf].filter(Boolean).join(" — ")}
                </p>
              ) : null}
              <div>
                <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                  Andamento
                </p>
                <p className="whitespace-pre-wrap">{detalhe.andamento ?? "—"}</p>
              </div>
              {detalhe.observacao ? (
                <div>
                  <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                    Observação
                  </p>
                  <p className="whitespace-pre-wrap">{detalhe.observacao}</p>
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
