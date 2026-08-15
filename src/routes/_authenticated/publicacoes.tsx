import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { Upload, CheckCircle2, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import {
  categoriaCliente,
  exibir,
  formatarCNJ,
  listarProcessos,
  type Processo,
} from "@/lib/processos";

export const Route = createFileRoute("/_authenticated/publicacoes")({
  head: () => ({
    meta: [
      { title: "Publicações | FaroLex" },
      {
        name: "description",
        content:
          "Envie a planilha de publicações recebida do TI e o sistema já sugere os andamentos dos processos que já estão cadastrados.",
      },
    ],
  }),
  component: PublicacoesPage,
});

const TAMANHO_MAX = 20 * 1024 * 1024;
const EXTENSOES = [".xlsm", ".xlsx", ".xls"];

const GRUPOS = ["ELV", "GFC", "Astro", "Outros"] as const;
type Grupo = (typeof GRUPOS)[number];

type Campo =
  "cliente" | "coord" | "advg" | "autor" | "reu" | "processo" | "fase" | "data" | "andamento";

const SINONIMOS: Record<string, Campo> = {
  cliente: "cliente",
  coord: "coord",
  coordenacao: "coord",
  advg: "advg",
  advogado: "advg",
  "nome do autor": "autor",
  autor: "autor",
  "nome do reu": "reu",
  reu: "reu",
  processo: "processo",
  "numero do processo": "processo",
  fase: "fase",
  "data publicacao": "data",
  "data de publicacao": "data",
  andamento: "andamento",
};

type LinhaLida = { numero: number; dados: Record<string, unknown> };

type LinhaPublicacao = {
  idx: number;
  linha: number;
  cnjDigits: string;
  cnjTexto: string;
  clientePlanilha: string | null;
  coord: string | null;
  advg: string | null;
  autor: string | null;
  reu: string | null;
  fase: string | null;
  dataPublicacao: string | null;
  andamento: string | null;
};

type LinhaCasada = LinhaPublicacao & { processo: Processo; grupo: Grupo };

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

// Só a aba "Localizada" interessa aqui — é a que já vem com o processo
// identificado e o andamento pronto. As outras (Não Localizada, Termos,
// Resumo etc.) ficam pro projeto de análise da Bárbara no Claude.
function lerAbaLocalizada(buffer: ArrayBuffer): LinhaLida[] {
  const wb = XLSX.read(buffer, { cellDates: true, cellFormula: false, cellHTML: false });
  const nomeAba =
    wb.SheetNames.find((n) => normalizar(n) === "localizada") ??
    wb.SheetNames.find(
      (n) => normalizar(n).includes("localizada") && !normalizar(n).includes("nao"),
    );
  if (!nomeAba) return [];
  const sheet = wb.Sheets[nomeAba];
  if (!sheet) return [];

  const matriz = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false });
  const idxCabecalho = matriz.findIndex(
    (linha) => Array.isArray(linha) && linha.filter((c) => texto(c)).length >= 2,
  );
  if (idxCabecalho < 0) return [];
  const cabecalho = (matriz[idxCabecalho] ?? []).map((c, i) => texto(c) ?? `Coluna ${i + 1}`);

  const linhas: LinhaLida[] = [];
  for (let i = idxCabecalho + 1; i < matriz.length; i++) {
    const bruta = matriz[i] ?? [];
    if (!bruta.some((c) => texto(c) != null)) continue;
    const dados: Record<string, unknown> = {};
    cabecalho.forEach((col, j) => {
      dados[col] = bruta[j] ?? null;
    });
    linhas.push({ numero: i + 1, dados });
  }
  return linhas;
}

function montarLinhas(linhas: LinhaLida[]): LinhaPublicacao[] {
  const resultado: LinhaPublicacao[] = [];
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
      cnjDigits,
      cnjTexto: formatarCNJ(cnjDigits),
      clientePlanilha: texto(l.cliente),
      coord: texto(l.coord),
      advg: texto(l.advg),
      autor: texto(l.autor),
      reu: texto(l.reu),
      fase: texto(l.fase),
      dataPublicacao: dataISO(l.data),
      andamento: texto(l.andamento),
    });
  }
  return resultado;
}

function grupoDoProcesso(p: Processo): Grupo {
  if (categoriaCliente(p.cliente) === "Astro") return "Astro";
  if (p.socio === "ELV") return "ELV";
  if (p.socio === "GFC") return "GFC";
  return "Outros";
}

function saudacaoAgora() {
  const hora = new Date().getHours();
  if (hora < 12) return "bom dia";
  if (hora < 18) return "boa tarde";
  return "boa noite";
}

const SAUDACAO_INICIAL: Record<Grupo, string> = {
  ELV: "Eliane, {saudacao}.",
  GFC: "MLV e BBS, {saudacao}.",
  Astro: "Pessoal da Astro, {saudacao}.",
  Outros: "Pessoal, {saudacao}.",
};

const SEPARADOR_EMAIL = "═".repeat(60);

// Formato pensado a partir do projeto que a Bárbara já usa pra publicações:
// saudação por grupo, bloco por processo com Caso/Coord/ADVG/Partes/Juízo e
// um separador entre eles. A diferença é que aqui o "teor" é o texto bruto
// do ANDAMENTO da planilha — o sistema não faz a leitura jurídica (prazo,
// relevância, resumo) que o projeto de IA da Bárbara faz; isso continua lá.
function montarMailtoPublicacoes(grupo: Grupo, destinatarios: string[], itens: LinhaCasada[]) {
  const assunto = `Publicações — ${grupo}`;
  const saudacaoInicial = SAUDACAO_INICIAL[grupo].replace("{saudacao}", saudacaoAgora());

  const blocos = itens.map((l, i) => {
    const cliente = exibir(l.processo.cliente) ?? "";
    const numeroCliente = l.processo.numero_cliente ? ` (nº ${l.processo.numero_cliente})` : "";
    const caso = l.processo.numero_interno ? `\nCaso: ${l.processo.numero_interno}` : "";
    const coordAdvg = [l.coord ? `Coord.: ${l.coord}` : null, l.advg ? `ADVG: ${l.advg}` : null]
      .filter(Boolean)
      .join("   ");
    const partes = [l.autor, l.reu].filter(Boolean).join(" x ") || "—";
    const juizo = [l.processo.vara, l.processo.comarca].filter(Boolean).join(" — ") || "—";
    const data = l.dataPublicacao
      ? new Date(`${l.dataPublicacao}T12:00:00`).toLocaleDateString("pt-BR")
      : "—";
    return `${i + 1}. Processo: ${l.cnjTexto}
Cliente: ${cliente}${numeroCliente}${caso}
${coordAdvg || "Coord./ADVG: —"}
Partes: ${partes}
Juízo: ${juizo}
Data da publicação: ${data}
Teor da publicação: ${l.andamento ?? "—"}`;
  });

  const corpo = `${saudacaoInicial}

Seguem as publicações localizadas nos processos monitorados:

${blocos.join(`\n${SEPARADOR_EMAIL}\n\n`)}
${SEPARADOR_EMAIL}

Qualquer prazo mencionado acima precisa ser conferido com atenção antes de agendar — este
e-mail traz o teor da publicação tal como veio da planilha do TI, sem cálculo automático de
prazo.

Abs.,`;

  return `mailto:${destinatarios.join(",")}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
}

function PublicacoesPage() {
  const [linhas, setLinhas] = useState<LinhaPublicacao[]>([]);
  const [grupoAtivo, setGrupoAtivo] = useState<Grupo | "todos">("todos");
  const [selecionadas, setSelecionadas] = useState<Set<number>>(new Set());
  const [importando, setImportando] = useState(false);
  const queryClient = useQueryClient();

  const processos = useQuery({ queryKey: ["processos"], queryFn: listarProcessos });

  const processoPorCnj = useMemo(() => {
    const mapa = new Map<string, Processo>();
    for (const p of processos.data ?? []) mapa.set(p.numero_cnj.replace(/\D/g, ""), p);
    return mapa;
  }, [processos.data]);

  const { casadas, semProcesso } = useMemo(() => {
    const casadas: LinhaCasada[] = [];
    const semProcesso: LinhaPublicacao[] = [];
    for (const l of linhas) {
      const processo = processoPorCnj.get(l.cnjDigits);
      if (processo) casadas.push({ ...l, processo, grupo: grupoDoProcesso(processo) });
      else semProcesso.push(l);
    }
    return { casadas, semProcesso };
  }, [linhas, processoPorCnj]);

  const contagemPorGrupo = useMemo(() => {
    const c: Record<Grupo, number> = { ELV: 0, GFC: 0, Astro: 0, Outros: 0 };
    for (const l of casadas) c[l.grupo]++;
    return c;
  }, [casadas]);

  const exibidas = useMemo(
    () => (grupoAtivo === "todos" ? casadas : casadas.filter((l) => l.grupo === grupoAtivo)),
    [casadas, grupoAtivo],
  );

  const [emails, setEmails] = useState("");

  const enviarEmailDoGrupo = () => {
    if (grupoAtivo === "todos") {
      toast.error("Escolha um grupo (ELV, GFC, Astro ou Outros) pra montar o e-mail.");
      return;
    }
    const destinatarios = emails
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);
    if (destinatarios.length === 0) {
      toast.error("Informe pelo menos um e-mail.");
      return;
    }
    if (exibidas.length === 0) {
      toast.error("Nenhuma publicação desse grupo pra mandar.");
      return;
    }
    window.location.href = montarMailtoPublicacoes(grupoAtivo, destinatarios, exibidas);
  };

  const ler = async (arquivo: File) => {
    const nome = arquivo.name.toLowerCase();
    if (!EXTENSOES.some((ext) => nome.endsWith(ext))) {
      toast.error("Formato não suportado. Envie um arquivo .xlsm, .xlsx ou .xls.");
      return;
    }
    if (arquivo.size > TAMANHO_MAX) {
      toast.error("Arquivo muito grande (máximo 20 MB).");
      return;
    }
    try {
      const lidas = lerAbaLocalizada(await arquivo.arrayBuffer());
      if (lidas.length === 0) {
        toast.error('Não encontrei a aba "Localizada" com linhas de dados nesse arquivo.');
        return;
      }
      const montadas = montarLinhas(lidas);
      setLinhas(montadas);
      setSelecionadas(new Set(montadas.map((l) => l.idx)));
      setGrupoAtivo("todos");
      toast.success(`${montadas.length} publicação(ões) lida(s) da aba "Localizada".`);
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
    const escolhidas = casadas.filter(
      (l) => selecionadas.has(l.idx) && l.andamento && l.dataPublicacao,
    );
    if (escolhidas.length === 0) {
      toast.error("Nenhuma publicação selecionada com data e andamento preenchidos.");
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
        tipo: string;
        exige_acao: boolean;
        fonte: string;
        validado: boolean;
        created_by: string;
      }[] = [];
      for (const l of escolhidas) {
        const chave = `${l.processo.id}|${l.dataPublicacao}|${l.andamento}`;
        if (existentes.has(chave)) continue;
        existentes.add(chave);
        novas.push({
          processo_id: l.processo.id,
          data_movimentacao: l.dataPublicacao!,
          descricao: l.andamento!,
          tipo: "Publicação",
          exige_acao: false,
          fonte: "publicacoes",
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold">Publicações</h1>
        <p className="text-muted-foreground">
          Envie a planilha de publicações recebida do TI (aba "Localizada"). O sistema cruza o
          número do processo com o que já está cadastrado aqui e já sugere o andamento — a
          estagiária só confere e valida o último andamento de cada processo.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">Arquivo</CardTitle>
          <CardDescription>
            Formatos aceitos: .xlsm, .xlsx e .xls (até 20 MB). Só processos que já existem no
            FaroLex são sugeridos — nada novo é criado a partir daqui.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            type="file"
            accept=".xlsm,.xlsx,.xls"
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
              {casadas.length} publicação(ões) de processos já cadastrados
            </CardTitle>
            <CardDescription>
              {semProcesso.length > 0
                ? `${semProcesso.length} linha(s) da planilha não batem com nenhum processo cadastrado e foram ignoradas.`
                : "Todas as linhas da planilha bateram com processos cadastrados."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant={grupoAtivo === "todos" ? "default" : "outline"}
                onClick={() => setGrupoAtivo("todos")}
              >
                Todos ({casadas.length})
              </Button>
              {GRUPOS.map((g) => (
                <Button
                  key={g}
                  type="button"
                  size="sm"
                  variant={grupoAtivo === g ? "default" : "outline"}
                  onClick={() => setGrupoAtivo(g)}
                >
                  {g} ({contagemPorGrupo[g]})
                </Button>
              ))}
            </div>

            <div className="flex flex-wrap items-end gap-2 rounded-md border border-border bg-muted/40 p-3">
              <div className="min-w-64 flex-1 space-y-1">
                <Label htmlFor="emails-publicacoes" className="text-xs text-muted-foreground">
                  E-mail(s) de destino
                </Label>
                <Input
                  id="emails-publicacoes"
                  placeholder="e-mail@escritorio.com.br, outro@escritorio.com.br"
                  value={emails}
                  onChange={(e) => setEmails(e.target.value)}
                />
              </div>
              <Button type="button" onClick={enviarEmailDoGrupo} disabled={grupoAtivo === "todos"}>
                <Mail className="size-4" />
                Mandar e-mail — {grupoAtivo === "todos" ? "escolha um grupo" : grupoAtivo}
              </Button>
            </div>

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
                    <th className="p-2 text-left">Grupo</th>
                    <th className="p-2 text-left">Data publicação</th>
                    <th className="p-2 text-left">Andamento</th>
                  </tr>
                </thead>
                <tbody>
                  {exibidas.map((l) => {
                    return (
                      <tr key={`${l.cnjDigits}-${l.linha}`} className="border-t border-border">
                        <td className="p-2">
                          <Checkbox
                            checked={selecionadas.has(l.idx)}
                            onCheckedChange={() => alternarSelecao(l.idx)}
                          />
                        </td>
                        <td className="p-2 font-mono text-xs">{l.cnjTexto}</td>
                        <td className="p-2">{exibir(l.processo.cliente)}</td>
                        <td className="p-2">
                          <Badge variant="outline">{l.grupo}</Badge>
                        </td>
                        <td className="p-2">
                          {l.dataPublicacao
                            ? new Date(`${l.dataPublicacao}T00:00:00`).toLocaleDateString("pt-BR")
                            : "—"}
                        </td>
                        <td className="max-w-96 truncate p-2 text-xs text-muted-foreground">
                          {l.andamento ?? "—"}
                        </td>
                      </tr>
                    );
                  })}
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
    </div>
  );
}
