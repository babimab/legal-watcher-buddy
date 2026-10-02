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
  lerPlanilhaFatura,
  numeroInvoice,
  nomeArquivoFatura,
  SIGLAS_PERMITIDAS_FATURA,
  type AtoFatura,
} from "@/lib/fatura";
import { gerarPdfAto, gerarEBaixarPdfAto } from "@/lib/pdf-fatura";
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
          "Envie a planilha de faturamento por ato de um cliente (ex.: resseguradora de companhia aérea) e gere um invoice em PDF, no timbrado do escritório, pra cada ato.",
      },
    ],
  }),
  component: FaturaPage,
});

const TAMANHO_MAX = 20 * 1024 * 1024;
const EXTENSOES = [".xlsx", ".xls", ".xlsm"];

function FaturaPage() {
  const [atos, setAtos] = useState<AtoFatura[]>([]);
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
      const lidos = lerPlanilhaFatura(await arquivo.arrayBuffer());
      if (lidos.length === 0) {
        toast.error(
          "Não encontrei nenhuma aba de Honorários, Despesas de Preposição ou Outras Despesas nesse arquivo.",
        );
        return;
      }
      setAtos(lidos);
      setSelecionados(new Set(lidos.map((a) => a.idx)));
      toast.success(`${lidos.length} ato(s) encontrado(s).`);
    } catch {
      toast.error("Não consegui ler o arquivo.");
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
    setSelecionados(marcar ? new Set(atos.map((a) => a.idx)) : new Set());
  };

  const baixarUm = async (ato: AtoFatura) => {
    setGerandoIdx(ato.idx);
    try {
      await gerarEBaixarPdfAto(ato);
    } catch {
      toast.error("Não consegui gerar esse invoice.");
    } finally {
      setGerandoIdx(null);
    }
  };

  const gerarSelecionados = async () => {
    const escolhidos = atos.filter((a) => selecionados.has(a.idx));
    if (escolhidos.length === 0) {
      toast.error("Selecione pelo menos um ato.");
      return;
    }
    setGerando(true);
    try {
      const zip = new JSZip();
      const nomesUsados = new Map<string, number>();
      for (const ato of escolhidos) {
        const blob = await gerarPdfAto(ato);
        let nome = nomeArquivoFatura(ato);
        const vezes = nomesUsados.get(nome) ?? 0;
        nomesUsados.set(nome, vezes + 1);
        if (vezes > 0) nome = nome.replace(/\.pdf$/, `-${vezes + 1}.pdf`);
        zip.file(nome, blob);
      }
      const blobZip = await zip.generateAsync({ type: "blob" });
      baixarBlob(blobZip, `faturas-${new Date().toISOString().slice(0, 10)}.zip`);
      toast.success(`${escolhidos.length} invoice(s) gerado(s).`);
    } catch {
      toast.error("Não consegui gerar as faturas.");
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
          com as abas de Honorários, Despesas de Preposição e/ou Outras Despesas e gere um invoice
          em PDF pra cada ato, no timbrado do escritório.
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

      {atos.length > 0 ? (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="font-serif text-lg">
                  {atos.length} ato{atos.length === 1 ? "" : "s"}
                </CardTitle>
                <CardDescription>{selecionados.size} selecionado(s)</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => marcarTodos(true)}>
                  Marcar todos
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => marcarTodos(false)}
                >
                  Desmarcar todos
                </Button>
                <Button type="button" onClick={() => void gerarSelecionados()} disabled={gerando}>
                  <FileDown className="size-4" />
                  {gerando ? "Gerando..." : "Gerar faturas selecionadas (.zip)"}
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
                    <th className="p-2">Tipo</th>
                    <th className="p-2">Caso</th>
                    <th className="p-2">Autor</th>
                    <th className="p-2">Réu</th>
                    <th className="p-2">Processo</th>
                    <th className="p-2">Descrição</th>
                    <th className="p-2 text-right">Valor</th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {atos.map((ato) => (
                    <tr key={ato.idx} className="border-b border-border/60">
                      <td className="p-2">
                        <Checkbox
                          checked={selecionados.has(ato.idx)}
                          onCheckedChange={() => alternarSelecao(ato.idx)}
                        />
                      </td>
                      <td className="p-2">
                        <Badge variant="outline">{ato.tipo}</Badge>
                      </td>
                      <td className="p-2">{ato.caso ?? "—"}</td>
                      <td className="p-2">{ato.autor ?? "—"}</td>
                      <td className="p-2">{ato.reu ?? "—"}</td>
                      <td className="p-2 font-mono text-xs">{ato.processo ?? "—"}</td>
                      <td className="p-2">{ato.descricao ?? "—"}</td>
                      <td className="p-2 text-right">
                        {ato.valor != null
                          ? ato.valor.toLocaleString("pt-BR", {
                              style: "currency",
                              currency: ato.moeda,
                            })
                          : "—"}
                      </td>
                      <td className="p-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Baixar invoice ${numeroInvoice(ato)}`}
                          onClick={() => void baixarUm(ato)}
                          disabled={gerandoIdx === ato.idx}
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
    </div>
  );
}
