import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import Papa from "papaparse";
import { toast } from "sonner";
import { Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/importar")({
  head: () => ({
    meta: [
      { title: "Importar planilha | Radar Processual" },
      {
        name: "description",
        content: "Importe sua planilha CSV de processos para dentro da carteira do escritório.",
      },
      { property: "og:title", content: "Importar planilha de processos" },
      {
        property: "og:description",
        content: "Importe sua planilha CSV de processos para dentro da carteira do escritório.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ImportarPage,
});

const MAPA: Record<string, string> = {
  numero: "numero_cnj",
  "numero cnj": "numero_cnj",
  "número": "numero_cnj",
  "número cnj": "numero_cnj",
  "n processo": "numero_cnj",
  processo: "numero_cnj",
  cliente: "cliente",
  autor: "cliente",
  "parte contraria": "parte_contraria",
  "parte contrária": "parte_contraria",
  reu: "parte_contraria",
  "réu": "parte_contraria",
  tribunal: "tribunal",
  vara: "vara",
  comarca: "comarca",
  classe: "classe",
  assunto: "classe",
  fase: "fase",
  status: "status",
  situacao: "status",
  "situação": "status",
  responsavel: "responsavel",
  "responsável": "responsavel",
  advogado: "responsavel",
  "valor da causa": "valor_causa",
  valor: "valor_causa",
  observacoes: "observacoes",
  "observações": "observacoes",
  obs: "observacoes",
};

function normalizar(coluna: string) {
  return coluna.trim().toLowerCase().replace(/\s+/g, " ");
}

function ImportarPage() {
  const [linhas, setLinhas] = useState<Record<string, string>[]>([]);
  const [importando, setImportando] = useState(false);
  const queryClient = useQueryClient();

  const ler = (arquivo: File) => {
    Papa.parse<Record<string, string>>(arquivo, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const mapeadas = res.data.map((linha) => {
          const out: Record<string, string> = {};
          for (const [k, v] of Object.entries(linha)) {
            const campo = MAPA[normalizar(k)];
            if (campo && v != null && String(v).trim() !== "") out[campo] = String(v).trim();
          }
          return out;
        });
        const validas = mapeadas.filter((l) => l['numero_cnj'] && l['cliente']);
        setLinhas(validas);
        toast.success(
          `${validas.length} linha(s) reconhecida(s) de ${res.data.length} do arquivo.`,
        );
      },
      error: () => toast.error("Não consegui ler o arquivo."),
    });
  };

  const importar = async () => {
    setImportando(true);
    const { data: userData } = await supabase.auth.getUser();
    const registros = linhas.map((l) => ({
      numero_cnj: String(l['numero_cnj']),
      cliente: String(l['cliente']),
      parte_contraria: l['parte_contraria'] ?? null,
      tribunal: l['tribunal'] ?? null,
      vara: l['vara'] ?? null,
      comarca: l['comarca'] ?? null,
      classe: l['classe'] ?? null,
      fase: l['fase'] ?? null,
      responsavel: l['responsavel'] ?? null,
      observacoes: l['observacoes'] ?? null,
      status: (l['status'] ?? "ativo").toLowerCase(),
      valor_causa: l['valor_causa']
        ? Number(String(l['valor_causa']).replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", "."))
        : null,
      created_by: userData.user?.id ?? null,
    }));

    const { error } = await supabase
      .from("processos")
      .upsert(registros, { onConflict: "numero_cnj" });
    setImportando(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${registros.length} processo(s) importado(s).`);
    setLinhas([]);
    await queryClient.invalidateQueries();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold">Importar planilha</h1>
        <p className="text-muted-foreground">
          Envie um arquivo CSV (no Excel: Salvar como &rarr; CSV) com os seus processos.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">Colunas reconhecidas</CardTitle>
          <CardDescription>
            Número CNJ, Cliente, Parte contrária, Tribunal, Vara, Comarca, Classe/Assunto, Fase,
            Status, Responsável, Valor da causa e Observações. Colunas com outros nomes são
            ignoradas — me avise o nome real e eu adapto.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) ler(f);
            }}
          />
          {linhas.length > 0 ? (
            <>
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-2 text-left">Número</th>
                      <th className="p-2 text-left">Cliente</th>
                      <th className="p-2 text-left">Tribunal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {linhas.slice(0, 8).map((l, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="p-2 font-mono text-xs">{l['numero_cnj']}</td>
                        <td className="p-2">{l['cliente']}</td>
                        <td className="p-2">{l['tribunal'] ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button onClick={importar} disabled={importando}>
                <Upload className="size-4" />
                {importando ? "Importando..." : `Importar ${linhas.length} processo(s)`}
              </Button>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
