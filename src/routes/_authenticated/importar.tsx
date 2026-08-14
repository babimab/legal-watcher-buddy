import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { formatarCNJ } from "@/lib/processos";

export const Route = createFileRoute("/_authenticated/importar")({
  head: () => ({
    meta: [
      { title: "Importar planilha | Radar Processual" },
      {
        name: "description",
        content:
          "Importe sua planilha de andamentos (Excel ou CSV) e monte a carteira de processos do escritório.",
      },
      { property: "og:title", content: "Importar planilha de processos" },
      {
        property: "og:description",
        content:
          "Importe sua planilha de andamentos (Excel ou CSV) e monte a carteira de processos do escritório.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ImportarPage,
});

type LinhaBruta = Record<string, unknown>;

type ProcessoImport = {
  numero_cnj: string;
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
  movimentacoes: { data_movimentacao: string; descricao: string; observacao: string | null }[];
};

const CAMPOS: Record<string, string> = {
  cliente: "codigo_cliente",
  "codigo cliente": "codigo_cliente",
  caso: "numero_interno",
  "n caso": "numero_interno",
  autor: "autor",
  reu: "reu",
  "réu": "reu",
  "numero cnj": "numero_cnj",
  "número cnj": "numero_cnj",
  numero: "numero_cnj",
  "número": "numero_cnj",
  processo: "numero_cnj",
  "numero antigo": "numero_antigo",
  "número antigo": "numero_antigo",
  uf: "uf",
  rs: "uf",
  estado: "uf",
  comarca: "comarca",
  vara: "vara",
  sistema: "sistema",
  "data andamento": "data",
  data: "data",
  "descricao andamento": "descricao",
  "descrição andamento": "descricao",
  andamento: "descricao",
  "observacao": "observacao",
  "observação": "observacao",
  observacoes: "observacao",
  "observações": "observacao",
};

function normalizar(coluna: string) {
  return coluna
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function texto(valor: unknown): string | null {
  if (valor == null) return null;
  const s = String(valor).trim();
  return s === "" || s.toLowerCase() === "nan" ? null : s;
}

function dataISO(valor: unknown): string | null {
  if (valor == null || valor === "") return null;
  if (valor instanceof Date) return valor.toISOString().slice(0, 10);
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

function chaveCNJ(valor: string) {
  return valor.replace(/\D/g, "");
}

function agrupar(arquivo: ArrayBuffer): ProcessoImport[] {
  const wb = XLSX.read(arquivo, { cellDates: true });
  const mapa = new Map<string, ProcessoImport>();

  for (const aba of wb.SheetNames) {
    const sheet = wb.Sheets[aba];
    if (!sheet) continue;
    const linhas = XLSX.utils.sheet_to_json<LinhaBruta>(sheet, { defval: null });

    for (const bruta of linhas) {
      const l: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(bruta)) {
        const campo = CAMPOS[normalizar(k)];
        if (campo) l[campo] = v;
      }
      const cnjBruto = texto(l['numero_cnj']);
      if (!cnjBruto) continue;
      const chave = chaveCNJ(cnjBruto);
      if (chave.length < 15) continue;

      const autor = texto(l['autor']);
      const reu = texto(l['reu']);
      const nosso = [autor, reu].find((p) => p && /souza\s*cruz/i.test(p)) ?? autor ?? reu ?? "—";
      const outra = nosso === autor ? reu : autor;

      let p = mapa.get(chave);
      if (!p) {
        p = {
          numero_cnj: formatarCNJ(chave),
          numero_interno: texto(l['numero_interno']),
          numero_antigo: texto(l['numero_antigo']),
          cliente: nosso,
          parte_contraria: outra,
          autor,
          reu,
          uf: texto(l['uf']),
          comarca: texto(l['comarca']),
          vara: texto(l['vara']),
          tribunal: texto(l['uf']) ? `TJ${texto(l['uf'])}` : null,
          sistema: texto(l['sistema']),
          carteira: aba.trim(),
          movimentacoes: [],
        };
        mapa.set(chave, p);
      }

      const data = dataISO(l['data']);
      const descricao = texto(l['descricao']);
      if (data && descricao) {
        p.movimentacoes.push({
          data_movimentacao: data,
          descricao,
          observacao: texto(l['observacao']),
        });
      }
    }
  }

  return [...mapa.values()].map((p) => ({
    ...p,
    movimentacoes: p.movimentacoes.sort((a, b) =>
      a.data_movimentacao < b.data_movimentacao ? 1 : -1,
    ),
  }));
}

function ImportarPage() {
  const [processos, setProcessos] = useState<ProcessoImport[]>([]);
  const [importando, setImportando] = useState(false);
  const queryClient = useQueryClient();

  const ler = async (arquivo: File) => {
    try {
      const buffer = await arquivo.arrayBuffer();
      const lista = agrupar(buffer);
      setProcessos(lista);
      const movs = lista.reduce((soma, p) => soma + p.movimentacoes.length, 0);
      if (lista.length === 0) {
        toast.error("Não encontrei uma coluna de número CNJ no arquivo.");
        return;
      }
      toast.success(`${lista.length} processo(s) e ${movs} andamento(s) reconhecidos.`);
    } catch {
      toast.error("Não consegui ler o arquivo.");
    }
  };

  const importar = async () => {
    setImportando(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const criador = userData.user?.id ?? null;

      const registros = processos.map((p) => ({
        numero_cnj: p.numero_cnj,
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
        status: "ativo",
        created_by: criador,
      }));

      const { error: erroProc } = await supabase
        .from("processos")
        .upsert(registros, { onConflict: "numero_cnj" });
      if (erroProc) throw erroProc;

      const numeros = processos.map((p) => p.numero_cnj);
      const idPorNumero = new Map<string, string>();
      for (let i = 0; i < numeros.length; i += 200) {
        const { data, error } = await supabase
          .from("processos")
          .select("id, numero_cnj")
          .in("numero_cnj", numeros.slice(i, i + 200));
        if (error) throw error;
        for (const row of data ?? []) idPorNumero.set(row.numero_cnj, row.id);
      }

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
        created_by: string | null;
      }[] = [];
      for (const p of processos) {
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

      for (let i = 0; i < novas.length; i += 300) {
        const { error } = await supabase.from("movimentacoes").insert(novas.slice(i, i + 300));
        if (error) throw error;
      }

      toast.success(
        `${registros.length} processo(s) atualizados e ${novas.length} andamento(s) novos importados.`,
      );
      setProcessos([]);
      await queryClient.invalidateQueries();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao importar.");
    } finally {
      setImportando(false);
    }
  };

  const totalMovs = processos.reduce((soma, p) => soma + p.movimentacoes.length, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold">Importar planilha</h1>
        <p className="text-muted-foreground">
          Envie o Excel (.xlsx) ou CSV com os andamentos. Cada aba vira uma carteira e cada linha
          vira um andamento do processo correspondente.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">Colunas reconhecidas</CardTitle>
          <CardDescription>
            Cliente, Caso, Autor, Réu, Número CNJ, Número Antigo, UF, Comarca, Vara, Sistema, Data
            Andamento, Descrição Andamento e Observação. Reimportar a planilha atualizada só
            acrescenta os andamentos novos — nada é duplicado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void ler(f);
            }}
          />
          {processos.length > 0 ? (
            <>
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-2 text-left">Número</th>
                      <th className="p-2 text-left">Carteira</th>
                      <th className="p-2 text-left">Autor</th>
                      <th className="p-2 text-left">Réu</th>
                      <th className="p-2 text-left">Andamentos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processos.slice(0, 10).map((p) => (
                      <tr key={p.numero_cnj} className="border-t border-border">
                        <td className="p-2 font-mono text-xs">{p.numero_cnj}</td>
                        <td className="p-2">{p.carteira ?? "—"}</td>
                        <td className="p-2">{p.autor ?? "—"}</td>
                        <td className="p-2">{p.reu ?? "—"}</td>
                        <td className="p-2">{p.movimentacoes.length}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button onClick={importar} disabled={importando}>
                <Upload className="size-4" />
                {importando
                  ? "Importando..."
                  : `Importar ${processos.length} processo(s) e ${totalMovs} andamento(s)`}
              </Button>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
