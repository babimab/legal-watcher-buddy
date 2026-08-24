import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { AlertTriangle, FilePlus2, RefreshCw, Upload } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import {
  formatarCNJ,
  identificarCliente,
  listarProcessos,
  OUTROS_ADVOGADOS_CONHECIDOS,
  SOCIOS_CONHECIDOS,
  exibir,
} from "@/lib/processos";
import { listarGrupos, listarPastas } from "@/lib/grupos";

export const Route = createFileRoute("/_authenticated/importar")({
  head: () => ({
    meta: [
      { title: "Importar planilha | FaroLex" },
      {
        name: "description",
        content:
          "Atualize andamentos de processos existentes ou cadastre novos processos a partir de uma planilha.",
      },
      { property: "og:title", content: "Importar planilha de processos" },
      {
        property: "og:description",
        content:
          "Atualize andamentos de processos existentes ou cadastre novos processos a partir de uma planilha.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ImportarPage,
});

const TAMANHO_MAX = 15 * 1024 * 1024;
const EXTENSOES = [".xlsx", ".xls", ".csv"];

type ModoImportacao = "atualizar" | "criar";

type Campo =
  | "numero_cnj"
  | "numero_cliente"
  | "numero_interno"
  | "numero_antigo"
  | "autor"
  | "reu"
  | "uf"
  | "comarca"
  | "vara"
  | "sistema"
  | "data"
  | "descricao"
  | "observacao"
  | "valor_causa";

const ROTULOS: Record<Campo, string> = {
  numero_cnj: "Número do processo (CNJ)",
  numero_cliente: "Número do cliente",
  numero_interno: "Caso / número interno",
  numero_antigo: "Número antigo",
  autor: "Autor",
  reu: "Réu",
  uf: "UF",
  comarca: "Comarca",
  vara: "Vara",
  sistema: "Sistema",
  data: "Data do andamento",
  descricao: "Descrição do andamento",
  observacao: "Observação",
  valor_causa: "Valor da causa",
};

const CAMPOS_LISTA = Object.keys(ROTULOS) as Campo[];

const SINONIMOS: Record<string, Campo> = {
  cliente: "numero_cliente",
  "n cliente": "numero_cliente",
  "no cliente": "numero_cliente",
  "numero cliente": "numero_cliente",
  "numero do cliente": "numero_cliente",
  caso: "numero_interno",
  "n caso": "numero_interno",
  "no caso": "numero_interno",
  "numero interno": "numero_interno",
  "numero do caso": "numero_interno",
  autor: "autor",
  requerente: "autor",
  reu: "reu",
  requerido: "reu",
  "numero cnj": "numero_cnj",
  cnj: "numero_cnj",
  numero: "numero_cnj",
  "n processo": "numero_cnj",
  "no processo": "numero_cnj",
  "numero processo": "numero_cnj",
  "numero do processo": "numero_cnj",
  processo: "numero_cnj",
  "processo cnj": "numero_cnj",
  "numero antigo": "numero_antigo",
  "processo antigo": "numero_antigo",
  uf: "uf",
  estado: "uf",
  comarca: "comarca",
  vara: "vara",
  juizo: "vara",
  sistema: "sistema",
  "data andamento": "data",
  "data do andamento": "data",
  "data movimentacao": "data",
  "data da movimentacao": "data",
  data: "data",
  "descricao andamento": "descricao",
  "descricao do andamento": "descricao",
  andamento: "descricao",
  movimentacao: "descricao",
  descricao: "descricao",
  observacao: "observacao",
  observacoes: "observacao",
  obs: "observacao",
  "valor da causa": "valor_causa",
  "valor causa": "valor_causa",
  valor: "valor_causa",
};

const OBRIGATORIOS: Campo[] = ["numero_cnj"];

type Aba = {
  nome: string;
  colunas: string[];
  linhas: { numero: number; dados: Record<string, unknown> }[];
};

type ProcessoImport = {
  numero_cnj: string;
  numero_cliente: string | null;
  numero_interno: string | null;
  numero_antigo: string | null;
  cliente: string;
  parte_contraria: string | null;
  autor: string | null;
  reu: string | null;
  uf: string | null;
  comarca: string | null;
  vara: string | null;
  tribunal: string | null;
  sistema: string | null;
  carteira: string | null;
  valor_causa: number | null;
  movimentacoes: { data_movimentacao: string; descricao: string; observacao: string | null }[];
};

type ErroLinha = { aba: string; linha: number; motivo: string };

function normalizar(coluna: string) {
  return coluna
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function texto(valor: unknown): string | null {
  if (valor == null) return null;
  const s = String(valor).trim();
  return s === "" || s.toLowerCase() === "nan" ? null : s;
}

function numero(valor: unknown): number | null {
  if (valor == null || valor === "") return null;
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : null;
  const s = String(valor)
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
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

function lerArquivo(buffer: ArrayBuffer): Aba[] {
  const wb = XLSX.read(buffer, { cellDates: true, cellFormula: false, cellHTML: false });
  const abas: Aba[] = [];

  for (const nome of wb.SheetNames) {
    const sheet = wb.Sheets[nome];
    if (!sheet) continue;
    const matriz = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false });
    const idxCabecalho = matriz.findIndex(
      (linha) => Array.isArray(linha) && linha.filter((c) => texto(c)).length >= 2,
    );
    if (idxCabecalho < 0) continue;
    const cabecalho = (matriz[idxCabecalho] ?? []).map((c, i) => texto(c) ?? `Coluna ${i + 1}`);
    const linhas: Aba["linhas"] = [];

    for (let i = idxCabecalho + 1; i < matriz.length; i++) {
      const bruta = matriz[i] ?? [];
      if (!bruta.some((c) => texto(c) != null)) continue;
      const dados: Record<string, unknown> = {};
      cabecalho.forEach((col, j) => {
        dados[col] = bruta[j] ?? null;
      });
      linhas.push({ numero: i + 1, dados });
    }

    if (linhas.length > 0) abas.push({ nome, colunas: cabecalho, linhas });
  }

  return abas;
}

function mapaAutomatico(colunas: string[]): Record<string, Campo | ""> {
  const mapa: Record<string, Campo | ""> = {};
  for (const col of colunas) mapa[col] = SINONIMOS[normalizar(col)] ?? "";
  return mapa;
}

function montar(
  abas: Aba[],
  mapas: Record<string, Record<string, Campo | "">>,
): { processos: ProcessoImport[]; erros: ErroLinha[] } {
  const mapa = new Map<string, ProcessoImport>();
  const erros: ErroLinha[] = [];

  for (const aba of abas) {
    const mapaAba = mapas[aba.nome] ?? {};
    for (const linha of aba.linhas) {
      const l: Partial<Record<Campo, unknown>> = {};
      for (const [col, valor] of Object.entries(linha.dados)) {
        const campo = mapaAba[col];
        if (campo && (l[campo] == null || l[campo] === "")) l[campo] = valor;
      }

      const cnjBruto = texto(l.numero_cnj);
      if (!cnjBruto) {
        erros.push({ aba: aba.nome, linha: linha.numero, motivo: "Número do processo vazio" });
        continue;
      }
      const chave = cnjBruto.replace(/\D/g, "");
      if (chave.length < 15) {
        erros.push({
          aba: aba.nome,
          linha: linha.numero,
          motivo: `Número do processo inválido ("${cnjBruto}")`,
        });
        continue;
      }

      const autor = texto(l.autor);
      const reu = texto(l.reu);
      const { cliente, parteContraria } = identificarCliente(autor, reu);

      let p = mapa.get(chave);
      if (!p) {
        p = {
          numero_cnj: formatarCNJ(chave),
          numero_cliente: texto(l.numero_cliente),
          numero_interno: texto(l.numero_interno),
          numero_antigo: texto(l.numero_antigo),
          cliente,
          parte_contraria: parteContraria,
          autor,
          reu,
          uf: texto(l.uf),
          comarca: texto(l.comarca),
          vara: texto(l.vara),
          tribunal: texto(l.uf) ? `TJ${texto(l.uf)}` : null,
          sistema: texto(l.sistema),
          carteira: aba.nome.trim(),
          valor_causa: numero(l.valor_causa),
          movimentacoes: [],
        };
        mapa.set(chave, p);
      }

      const descricao = texto(l.descricao);
      const data = dataISO(l.data);
      if (descricao && !data && l.data != null && texto(l.data)) {
        erros.push({
          aba: aba.nome,
          linha: linha.numero,
          motivo: `Data do andamento não reconhecida ("${texto(l.data)}")`,
        });
      }
      if (data && descricao) {
        p.movimentacoes.push({
          data_movimentacao: data,
          descricao,
          observacao: texto(l.observacao),
        });
      }
    }
  }

  return {
    processos: [...mapa.values()].map((p) => ({
      ...p,
      movimentacoes: p.movimentacoes.sort((a, b) =>
        a.data_movimentacao < b.data_movimentacao ? 1 : -1,
      ),
    })),
    erros,
  };
}

// Cada consulta/inserção no banco tem um teto de tempo: sem isso, uma
// chamada que nunca responde deixava a tela "importando" pra sempre.
const TIMEOUT_MS = 30000;

async function comTimeout<T>(rotulo: string, promessa: PromiseLike<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(promessa),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${rotulo}: a operação demorou demais (mais de 30s). Tente novamente.`)),
          TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function ImportarPage() {
  const [modo, setModo] = useState<ModoImportacao>("atualizar");
  const [abas, setAbas] = useState<Aba[]>([]);
  const [mapas, setMapas] = useState<Record<string, Record<string, Campo | "">>>({});
  const [importando, setImportando] = useState(false);
  const [progresso, setProgresso] = useState("");
  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null);
  const [lendo, setLendo] = useState(false);
  const [inputKey, setInputKey] = useState(0);
  const [grupoId, setGrupoId] = useState("");
  const [pastaId, setPastaId] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [socio, setSocio] = useState("");
  const queryClient = useQueryClient();


  const grupos = useQuery({ queryKey: ["grupos"], queryFn: listarGrupos });
  const pastas = useQuery({ queryKey: ["pastas"], queryFn: listarPastas });
  const processosExistentes = useQuery({ queryKey: ["processos"], queryFn: listarProcessos });
  const pastasDoGrupo = useMemo(
    () => (pastas.data ?? []).filter((p) => p.grupo_id === grupoId),
    [pastas.data, grupoId],
  );

  const { processos, erros } = useMemo(() => montar(abas, mapas), [abas, mapas]);
  const existentesPorCnj = useMemo(
    () => new Map((processosExistentes.data ?? []).map((p) => [p.numero_cnj.replace(/\D/g, ""), p])),
    [processosExistentes.data],
  );
  const processosJaCadastrados = useMemo(
    () => processos.filter((p) => existentesPorCnj.has(p.numero_cnj.replace(/\D/g, ""))),
    [processos, existentesPorCnj],
  );
  const processosNovos = useMemo(
    () => processos.filter((p) => !existentesPorCnj.has(p.numero_cnj.replace(/\D/g, ""))),
    [processos, existentesPorCnj],
  );
  const processosAlvo = modo === "atualizar" ? processosJaCadastrados : processosNovos;
  const totalMovsAlvo = processosAlvo.reduce((soma, p) => soma + p.movimentacoes.length, 0);

  const faltando = useMemo(() => {
    const pendentes: { aba: string; campos: Campo[] }[] = [];
    for (const aba of abas) {
      const usados = new Set(Object.values(mapas[aba.nome] ?? {}));
      const campos = OBRIGATORIOS.filter((c) => !usados.has(c));
      if (campos.length > 0) pendentes.push({ aba: aba.nome, campos });
    }
    return pendentes;
  }, [abas, mapas]);

  const poucoMapeadas = useMemo(() => {
    const nomes = new Set<string>();
    for (const aba of abas) {
      if (aba.colunas.length < 3) continue;
      const mapaAba = mapas[aba.nome] ?? {};
      const mapeadas = aba.colunas.filter((c) => mapaAba[c]).length;
      if (mapeadas / aba.colunas.length < 0.4) nomes.add(aba.nome);
    }
    return nomes;
  }, [abas, mapas]);

  const limparSelecao = () => {
    setArquivoSelecionado(null);
    setInputKey((k) => k + 1);
  };

  // A leitura só acontece quando a pessoa confirma o arquivo — escolher no
  // seletor apenas guarda o File.
  const ler = async (arquivo: File) => {
    const nome = arquivo.name.toLowerCase();
    if (!EXTENSOES.some((ext) => nome.endsWith(ext))) {
      toast.error("Formato não suportado. Envie um arquivo .xlsx, .xls ou .csv.");
      return;
    }
    if (arquivo.size > TAMANHO_MAX) {
      toast.error("Arquivo muito grande (máximo 15 MB).");
      return;
    }
    setLendo(true);
    try {
      const lidas = lerArquivo(await arquivo.arrayBuffer());
      if (lidas.length === 0) {
        toast.error("Não encontrei linhas de dados no arquivo.");
        return;
      }
      const novosMapas: Record<string, Record<string, Campo | "">> = {};
      for (const aba of lidas) novosMapas[aba.nome] = mapaAutomatico(aba.colunas);
      setAbas(lidas);
      setMapas(novosMapas);
      toast.success(`${lidas.length} aba(s) lida(s). Confira o mapeamento das colunas.`);
    } catch {
      toast.error("Não consegui ler o arquivo.");
    } finally {
      setLendo(false);
    }
  };


  const inserirAndamentosNovos = async (
    alvos: ProcessoImport[],
    idPorNumero: Map<string, string>,
    criador: string,
    falhas: string[],
  ) => {
    const ids = [...idPorNumero.values()];
    const existentes = new Set<string>();
    for (let i = 0; i < ids.length; i += 100) {
      const { data, error } = await supabase
        .from("movimentacoes")
        .select("processo_id, data_movimentacao, descricao")
        .in("processo_id", ids.slice(i, i + 100));
      if (error) throw error;
      for (const m of data ?? [])
        existentes.add(`${m.processo_id}|${m.data_movimentacao}|${m.descricao}`);
    }

    const novas: {
      processo_id: string;
      data_movimentacao: string;
      descricao: string;
      observacao: string | null;
      fonte: string;
      created_by: string;
    }[] = [];
    for (const p of alvos) {
      const processoId = idPorNumero.get(p.numero_cnj);
      if (!processoId) continue;
      for (const m of p.movimentacoes) {
        const chave = `${processoId}|${m.data_movimentacao}|${m.descricao}`;
        if (existentes.has(chave)) continue;
        existentes.add(chave);
        novas.push({
          processo_id: processoId,
          data_movimentacao: m.data_movimentacao,
          descricao: m.descricao,
          observacao: m.observacao,
          fonte: "planilha",
          created_by: criador,
        });
      }
    }

    let movsOk = 0;
    for (let i = 0; i < novas.length; i += 300) {
      const lote = novas.slice(i, i + 300);
      const { error } = await supabase.from("movimentacoes").insert(lote);
      if (error) falhas.push(`Andamentos ${i + 1}–${i + lote.length}: ${error.message}`);
      else movsOk += lote.length;
    }
    return movsOk;
  };

  const importarAtualizacao = async (criador: string, falhas: string[]) => {
    const idPorNumero = new Map<string, string>();
    for (const p of processosJaCadastrados) {
      const existente = existentesPorCnj.get(p.numero_cnj.replace(/\D/g, ""));
      if (existente) idPorNumero.set(p.numero_cnj, existente.id);
    }

    const movsOk = await inserirAndamentosNovos(processosJaCadastrados, idPorNumero, criador, falhas);
    return { processosOk: processosJaCadastrados.length, movsOk };
  };

  const importarCriacao = async (criador: string, falhas: string[]) => {
    const idPorNumero = new Map<string, string>();
    let processosOk = 0;

    for (const p of processosNovos) {
      const { data, error } = await supabase
        .from("processos")
        .insert({
          numero_cnj: p.numero_cnj,
          numero_cliente: p.numero_cliente,
          numero_interno: p.numero_interno,
          numero_antigo: p.numero_antigo,
          cliente: p.cliente,
          parte_contraria: p.parte_contraria,
          autor: p.autor,
          reu: p.reu,
          uf: p.uf,
          comarca: p.comarca,
          vara: p.vara,
          tribunal: p.tribunal,
          sistema: p.sistema,
          carteira: p.carteira,
          valor_causa: p.valor_causa,
          ...(pastaId ? { pasta_id: pastaId } : {}),
          ...(responsavel.trim() ? { responsavel: responsavel.trim() } : {}),
          ...(socio.trim() ? { socio: socio.trim() } : {}),
          status: "ativo",
          created_by: criador,
        })
        .select("id, numero_cnj")
        .maybeSingle();

      if (error || !data) {
        falhas.push(`${p.numero_cnj}: ${error?.message ?? "não foi possível criar o processo"}`);
        continue;
      }
      idPorNumero.set(p.numero_cnj, data.id);
      processosOk++;
    }

    const criadosComSucesso = processosNovos.filter((p) => idPorNumero.has(p.numero_cnj));
    const movsOk = await inserirAndamentosNovos(criadosComSucesso, idPorNumero, criador, falhas);
    return { processosOk, movsOk };
  };

  const importar = async () => {
    setImportando(true);
    const falhas: string[] = [];
    try {
      const { data: userData } = await supabase.auth.getUser();
      const criador = userData.user?.id;
      if (!criador) throw new Error("Sessão expirada. Entre novamente para importar.");

      if (modo === "atualizar") {
        const { processosOk, movsOk } = await importarAtualizacao(criador, falhas);
        const ignorados = processosNovos.length;
        if (falhas.length > 0) {
          toast.warning(
            `${movsOk} andamento(s) novo(s) importado(s) em ${processosOk} processo(s). ${falhas.length} erro(s): ${falhas.slice(0, 3).join(" | ")}`,
          );
        } else {
          toast.success(
            `${movsOk} andamento(s) novo(s) importado(s) em ${processosOk} processo(s).${ignorados > 0 ? ` ${ignorados} processo(s) não cadastrado(s) foram ignorados.` : ""}`,
          );
          setAbas([]);
          setMapas({});
        }
      } else {
        const { processosOk, movsOk } = await importarCriacao(criador, falhas);
        const jaExistiam = processosJaCadastrados.length;
        if (falhas.length > 0) {
          toast.warning(
            `${processosOk} processo(s) criado(s) e ${movsOk} andamento(s) importado(s). ${falhas.length} erro(s): ${falhas.slice(0, 3).join(" | ")}`,
          );
        } else {
          toast.success(
            `${processosOk} processo(s) novo(s) criado(s) e ${movsOk} andamento(s) importado(s).${jaExistiam > 0 ? ` ${jaExistiam} processo(s) já existente(s) foram preservados sem alteração.` : ""}`,
          );
          setAbas([]);
          setMapas({});
        }
      }

      await queryClient.invalidateQueries();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao importar.");
    } finally {
      setImportando(false);
    }
  };

  const podeImportar =
    !importando &&
    faltando.length === 0 &&
    processosAlvo.length > 0 &&
    !processosExistentes.isLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold">Importar planilha</h1>
        <p className="text-muted-foreground">
          Escolha se a planilha deve apenas atualizar andamentos de processos já cadastrados ou criar novos casos.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <button
          type="button"
          onClick={() => setModo("atualizar")}
          className={`rounded-xl border p-4 text-left transition-colors ${
            modo === "atualizar" ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "hover:border-primary/40"
          }`}
        >
          <div className="flex items-start gap-3">
            <RefreshCw className="mt-0.5 size-5 text-primary" />
            <div>
              <p className="font-semibold">Atualizar carteira</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Adiciona apenas andamentos novos aos processos que já existem. Não cria casos e não altera dados cadastrais.
              </p>
            </div>
          </div>
        </button>
        <button
          type="button"
          onClick={() => setModo("criar")}
          className={`rounded-xl border p-4 text-left transition-colors ${
            modo === "criar" ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "hover:border-primary/40"
          }`}
        >
          <div className="flex items-start gap-3">
            <FilePlus2 className="mt-0.5 size-5 text-primary" />
            <div>
              <p className="font-semibold">Criar processos</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Cadastra somente CNJs ainda inexistentes no FaroLex. Processos já cadastrados são preservados sem alteração.
              </p>
            </div>
          </div>
        </button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">Arquivo</CardTitle>
          <CardDescription>
            Formatos aceitos: .xlsx, .xls e .csv (até 15 MB). As colunas são reconhecidas automaticamente e você pode ajustar o mapeamento antes de confirmar.
            {modo === "atualizar"
              ? " Neste modo, o CNJ é usado apenas para localizar processos já existentes."
              : " Neste modo, o sistema separa os casos novos dos que já estão cadastrados antes de criar qualquer registro."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void ler(f);
            }}
          />
        </CardContent>
      </Card>

      {modo === "criar" ? (
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-lg">Organização dos novos processos</CardTitle>
            <CardDescription>
              Opcional: aplique pasta, advogado responsável e sócio somente aos processos que serão criados nesta importação.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Grupo</Label>
              <Select
                value={grupoId}
                onValueChange={(v) => {
                  setGrupoId(v);
                  setPastaId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sem grupo" />
                </SelectTrigger>
                <SelectContent>
                  {(grupos.data ?? []).map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {exibir(g.nome)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Pasta</Label>
              <Select value={pastaId} onValueChange={setPastaId} disabled={!grupoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sem pasta" />
                </SelectTrigger>
                <SelectContent>
                  {pastasDoGrupo.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {exibir(p.nome)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground" htmlFor="responsavel-import">
                Advogado responsável
              </Label>
              <Input
                id="responsavel-import"
                list="advogados-sugeridos"
                placeholder="Ex.: BDR"
                value={responsavel}
                onChange={(e) => setResponsavel(e.target.value)}
              />
              <datalist id="advogados-sugeridos">
                <option value="BDR" />
                {OUTROS_ADVOGADOS_CONHECIDOS.map((a) => (
                  <option key={a} value={a} />
                ))}
              </datalist>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground" htmlFor="socio-import">
                Sócio
              </Label>
              <Input
                id="socio-import"
                list="socios-sugeridos"
                placeholder="Ex.: ELV"
                value={socio}
                onChange={(e) => setSocio(e.target.value)}
              />
              <datalist id="socios-sugeridos">
                {SOCIOS_CONHECIDOS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {abas.map((aba) => (
        <Card key={aba.nome} className={poucoMapeadas.has(aba.nome) ? "border-amber-500/50" : ""}>
          <CardHeader>
            <CardTitle className="font-serif text-lg">Aba “{aba.nome}”</CardTitle>
            <CardDescription>
              {aba.linhas.length} linha(s) com conteúdo. Associe cada coluna da planilha ao campo do sistema.
            </CardDescription>
            {poucoMapeadas.has(aba.nome) ? (
              <p className="flex items-center gap-2 text-sm text-amber-600">
                <AlertTriangle className="size-4" /> A maioria das colunas dessa aba não foi reconhecida automaticamente — confira o mapeamento antes de importar.
              </p>
            ) : null}
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {aba.colunas.map((col) => (
              <div key={col} className="space-y-1">
                <Label className="text-xs text-muted-foreground">{col}</Label>
                <Select
                  value={mapas[aba.nome]?.[col] || "ignorar"}
                  onValueChange={(v) =>
                    setMapas((atual) => ({
                      ...atual,
                      [aba.nome]: {
                        ...(atual[aba.nome] ?? {}),
                        [col]: v === "ignorar" ? "" : (v as Campo),
                      },
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ignorar">Ignorar coluna</SelectItem>
                    {CAMPOS_LISTA.map((campo) => (
                      <SelectItem key={campo} value={campo}>
                        {ROTULOS[campo]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {faltando.length > 0 ? (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-serif text-lg text-destructive">
              <AlertTriangle className="size-4" /> Campos obrigatórios não identificados
            </CardTitle>
            <CardDescription>
              {faltando.map((f) => (
                <span key={f.aba} className="block">
                  Aba “{f.aba}”: {f.campos.map((c) => ROTULOS[c]).join(", ")}
                </span>
              ))}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {abas.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-lg">Pré-visualização</CardTitle>
            <CardDescription>
              {processosExistentes.isLoading ? (
                "Conferindo os CNJs com a carteira atual..."
              ) : modo === "atualizar" ? (
                <>
                  <strong>{processosJaCadastrados.length}</strong> processo(s) encontrado(s) · {" "}
                  <strong>{processosNovos.length}</strong> não cadastrado(s) e serão ignorados · {" "}
                  <strong>{totalMovsAlvo}</strong> andamento(s) no arquivo para os processos encontrados
                  {erros.length > 0 ? ` · ${erros.length} linha(s) com problema` : ""}.
                </>
              ) : (
                <>
                  <strong>{processosNovos.length}</strong> novo(s) processo(s) · {" "}
                  <strong>{processosJaCadastrados.length}</strong> já cadastrado(s) e serão preservados · {" "}
                  <strong>{totalMovsAlvo}</strong> andamento(s) vinculados aos novos processos
                  {erros.length > 0 ? ` · ${erros.length} linha(s) com problema` : ""}.
                </>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {processos.length > 0 ? (
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-2 text-left">Situação</th>
                      <th className="p-2 text-left">Número</th>
                      <th className="p-2 text-left">Cliente/Caso</th>
                      <th className="p-2 text-left">Autor</th>
                      <th className="p-2 text-left">Réu</th>
                      <th className="p-2 text-left">Andamentos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processos.slice(0, 15).map((p) => {
                      const jaExiste = existentesPorCnj.has(p.numero_cnj.replace(/\D/g, ""));
                      const clienteCaso = p.numero_cliente && p.numero_interno
                        ? `${p.numero_cliente}/${p.numero_interno}`
                        : p.numero_interno || p.numero_cliente || "—";
                      return (
                        <tr key={p.numero_cnj} className="border-t border-border">
                          <td className="p-2">
                            <Badge variant={jaExiste ? "secondary" : "outline"}>
                              {jaExiste ? "Já cadastrado" : "Novo"}
                            </Badge>
                          </td>
                          <td className="p-2 font-mono text-xs">{p.numero_cnj}</td>
                          <td className="p-2">{clienteCaso}</td>
                          <td className="p-2">{p.autor ?? "—"}</td>
                          <td className="p-2">{p.reu ?? "—"}</td>
                          <td className="p-2">{p.movimentacoes.length}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}

            {processos.length > 15 ? (
              <p className="text-xs text-muted-foreground">Mostrando os primeiros 15 de {processos.length} processos lidos.</p>
            ) : null}

            {erros.length > 0 ? (
              <div className="max-h-48 overflow-y-auto rounded-md border border-border p-3 text-sm">
                {erros.slice(0, 50).map((e, i) => (
                  <p key={`${e.aba}-${e.linha}-${i}`} className="text-muted-foreground">
                    Aba “{e.aba}”, linha {e.linha}: {e.motivo}
                  </p>
                ))}
                {erros.length > 50 ? (
                  <p className="text-muted-foreground">…e mais {erros.length - 50} linha(s).</p>
                ) : null}
              </div>
            ) : null}

            {modo === "atualizar" && processosNovos.length > 0 ? (
              <p className="flex items-center gap-2 text-sm text-amber-600">
                <AlertTriangle className="size-4" /> {processosNovos.length} CNJ(s) não existem no FaroLex. Eles não serão criados neste modo.
              </p>
            ) : null}

            {modo === "criar" && processosJaCadastrados.length > 0 ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                {processosJaCadastrados.length} CNJ(s) já existem no FaroLex e serão ignorados para evitar qualquer sobrescrita.
              </p>
            ) : null}

            <Button onClick={importar} disabled={!podeImportar}>
              <Upload className="size-4" />
              {importando
                ? "Importando..."
                : modo === "atualizar"
                  ? `Importar andamentos em ${processosJaCadastrados.length} processo(s)`
                  : `Criar ${processosNovos.length} processo(s) novo(s)`}
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
