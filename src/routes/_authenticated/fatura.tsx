import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import JSZip from "jszip";
import { toast } from "sonner";
import { Download, FileDown, Receipt } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  formatarMoeda,
  lerPlanilhaFatura,
  nomeArquivoFatura,
  SIGLAS_PERMITIDAS_FATURA,
  type NotaFatura,
} from "@/lib/fatura";
import { gerarPdfNota, gerarEBaixarPdfNota } from "@/lib/pdf-fatura";
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
  const [notas, setNotas] = useState<NotaFatura[]>([]);
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());
  const [lendo, setLendo] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [gerandoIdx, setGerandoIdx] = useState<number | null>(null);

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
      const zip = new JSZip();
      const nomesUsados = new Map<string, number>();
      for (const nota of escolhidas) {
        const blob = await gerarPdfNota(nota);
        let nome = nomeArquivoFatura(nota);
        const vezes = nomesUsados.get(nome) ?? 0;
        nomesUsados.set(nome, vezes + 1);
        if (vezes > 0) nome = nome.replace(/\.pdf$/, `-${vezes + 1}.pdf`);
        zip.file(nome, blob);
      }
      const blobZip = await zip.generateAsync({ type: "blob" });
      baixarBlob(blobZip, `notas-honorarios-${new Date().toISOString().slice(0, 10)}.zip`);
      toast.success(`${escolhidas.length} nota(s) gerada(s).`);
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
          <Input
            type="file"
            accept=".xlsx,.xls,.xlsm"
            disabled={lendo}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void ler(f);
            }}
          />
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
                <Button type="button" onClick={() => void gerarSelecionadas()} disabled={gerando}>
                  <FileDown className="size-4" />
                  {gerando ? "Gerando..." : "Gerar Fatura"}
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
    </div>
  );
}
