import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Copy, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  classificarRecortes,
  extrairRecortes,
  listarNomesMonitoradosAstro,
  montarEmailAlertaAstro,
  rtfParaTexto,
  salvarNomesMonitoradosAstro,
  type RecorteAlerta,
  type RecorteClassificado,
} from "@/lib/alerta-astro";
import { listarProcessos } from "@/lib/processos";

export const Route = createFileRoute("/_authenticated/alerta-astro")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Alerta Astro | FaroLex" },
      {
        name: "description",
        content:
          "Envie os recortes do Alerte (.doc) e o sistema separa trabalhista, cruza com o cadastro e sinaliza o que pode ser da Astro.",
      },
    ],
  }),
  component: AlertaAstroPage,
});

const EXTENSOES = [".doc", ".rtf"];
const TAMANHO_MAX = 10 * 1024 * 1024;

function AlertaAstroPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [lendo, setLendo] = useState(false);
  const [recortes, setRecortes] = useState<RecorteClassificado[]>([]);
  const [processados, setProcessados] = useState(false);
  const [arrastando, setArrastando] = useState(false);

  const processosQuery = useQuery({ queryKey: ["processos"], queryFn: listarProcessos });

  // Nomes monitorados (frota/empresas Astro) -- lista do escritório
  // inteiro, mesma trava de "não apagar antes de carregar" usada em
  // Publicações pros nomes ocultados.
  const [nomes, setNomes] = useState<string[]>([""]);
  const [nomesCarregados, setNomesCarregados] = useState(false);
  const nomesQuery = useQuery({
    queryKey: ["alertaAstroNomesMonitorados"],
    queryFn: listarNomesMonitoradosAstro,
  });
  const avisouErroRef = useRef(false);
  useEffect(() => {
    if (nomesCarregados) return;
    if (nomesQuery.isSuccess) {
      if (nomesQuery.data.length > 0) setNomes(nomesQuery.data);
      setNomesCarregados(true);
    } else if (nomesQuery.isError && !avisouErroRef.current) {
      avisouErroRef.current = true;
      toast.error(
        "Não consegui carregar a lista de nomes monitorados. Pra não apagar o que já está gravado, nada aqui vai ser salvo nesta sessão -- recarregue a página.",
      );
    }
  }, [nomesQuery.isSuccess, nomesQuery.isError, nomesQuery.data, nomesCarregados]);
  useEffect(() => {
    if (!nomesCarregados) return;
    const timer = setTimeout(() => {
      salvarNomesMonitoradosAstro(nomes.map((n) => n.trim()).filter(Boolean)).catch(() =>
        toast.error("Não foi possível salvar a lista de nomes monitorados."),
      );
    }, 600);
    return () => clearTimeout(timer);
  }, [nomes, nomesCarregados]);

  const processarArquivos = async (arquivos: FileList) => {
    const invalidos = Array.from(arquivos).filter(
      (a) => !EXTENSOES.some((ext) => a.name.toLowerCase().endsWith(ext)) || a.size > TAMANHO_MAX,
    );
    if (invalidos.length > 0) {
      toast.error("Envie só arquivos .doc/.rtf de até 10 MB cada.");
      return;
    }
    setLendo(true);
    try {
      const todosOsRecortes: RecorteAlerta[] = [];
      for (const arquivo of Array.from(arquivos)) {
        const texto = rtfParaTexto(await arquivo.arrayBuffer());
        todosOsRecortes.push(...extrairRecortes(texto, arquivo.name));
      }
      if (todosOsRecortes.length === 0) {
        toast.error("Não encontrei nenhum recorte nesses arquivos.");
        return;
      }
      const processos = processosQuery.data ?? [];
      const nomesValidos = nomes.map((n) => n.trim()).filter(Boolean);
      const classificados = classificarRecortes(todosOsRecortes, processos, nomesValidos);
      setRecortes(classificados);
      setProcessados(true);
      toast.success(`${classificados.length} recorte(s) processado(s).`);
    } catch (e) {
      console.error("Erro ao processar recortes do Alerte:", e);
      toast.error(e instanceof Error ? `Não consegui ler o arquivo: ${e.message}` : "Não consegui ler o arquivo.");
    } finally {
      setLendo(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const confirmados = recortes.filter((r) => r.tier === "confirmado");
  const candidatos = recortes.filter((r) => r.tier === "candidato");
  const descartados = recortes.filter((r) => r.tier === "descartado");
  const emailTexto = recortes.length > 0 ? montarEmailAlertaAstro(recortes) : "";

  const copiarEmail = async () => {
    try {
      await navigator.clipboard.writeText(emailTexto);
      toast.success("E-mail copiado.");
    } catch {
      toast.error("Não consegui copiar. Selecione o texto manualmente.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold">Alerta Astro</h1>
        <CardDescription>
          Suba os recortes (.doc) que o Alerte manda por e-mail — o sistema separa o que é
          trabalhista, cruza com o cadastro e sinaliza o que pode ser da Astro.
        </CardDescription>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">Nomes monitorados (frota/empresas Astro)</CardTitle>
          <CardDescription>
            Usado pra sinalizar "candidato" quando o recorte não tem processo cadastrado ainda (ex.:
            embarcação nova, processo recém-distribuído).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {nomes.map((nome, i) => (
            <div key={i} className="flex gap-2">
              <Input
                aria-label="Nome monitorado"
                placeholder="Ex.: Astro Arraia"
                value={nome}
                onChange={(e) =>
                  setNomes((atual) => atual.map((n, idx) => (idx === i ? e.target.value : n)))
                }
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() =>
                  setNomes((atual) => (atual.length <= 1 ? [""] : atual.filter((_, idx) => idx !== i)))
                }
                aria-label="Remover nome"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => setNomes((a) => [...a, ""])}>
            <Plus className="size-4" />
            Adicionar nome
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">Recortes do Alerte</CardTitle>
          <CardDescription>
            Selecione todos os .doc anexados no e-mail do dia (um por pacote/caderno).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            ref={inputRef}
            type="file"
            accept=".doc,.rtf"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && processarArquivos(e.target.files)}
          />
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setArrastando(true);
            }}
            onDragLeave={() => setArrastando(false)}
            onDrop={(e) => {
              e.preventDefault();
              setArrastando(false);
              if (e.dataTransfer.files.length > 0) processarArquivos(e.dataTransfer.files);
            }}
            className={`flex flex-col items-center gap-2 rounded-md border-2 border-dashed p-6 text-center transition-colors ${
              arrastando ? "border-primary bg-primary/5" : "border-border"
            }`}
          >
            <Upload className="size-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Arraste aqui os anexos .doc/.rtf direto do seu e-mail, ou
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => inputRef.current?.click()}
              disabled={lendo}
            >
              <Upload className="size-4" />
              {lendo ? "Processando..." : "Selecionar arquivos .doc"}
            </Button>
          </div>

          {processados ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 text-sm">
                <Badge className="bg-emerald-600">Confirmados: {confirmados.length}</Badge>
                <Badge className="bg-amber-500">Candidatos: {candidatos.length}</Badge>
                <Badge variant="outline">Descartados: {descartados.length}</Badge>
              </div>

              {[...confirmados, ...candidatos].length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum recorte confirmado ou candidato — provavelmente só trabalhista e ruído hoje.
                </p>
              ) : (
                <div className="space-y-3">
                  {[...confirmados, ...candidatos].map((r) => (
                    <RecorteCard key={`${r.pacote}-${r.idx}`} recorte={r} />
                  ))}
                </div>
              )}

              {descartados.length > 0 ? (
                <details className="rounded-md border border-border p-3 text-sm">
                  <summary className="cursor-pointer font-medium text-muted-foreground">
                    Ver descartados automaticamente ({descartados.length})
                  </summary>
                  <div className="mt-3 space-y-3">
                    {descartados.map((r) => (
                      <RecorteCard key={`${r.pacote}-${r.idx}`} recorte={r} />
                    ))}
                  </div>
                </details>
              ) : null}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">E-mail pronto</Label>
                  <Button type="button" variant="outline" size="sm" onClick={copiarEmail}>
                    <Copy className="size-4" />
                    Copiar e-mail
                  </Button>
                </div>
                <Textarea readOnly value={emailTexto} rows={14} className="font-mono text-xs" />
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function RecorteCard({ recorte: r }: { recorte: RecorteClassificado }) {
  const corBadge =
    r.tier === "confirmado" ? "bg-emerald-600" : r.tier === "candidato" ? "bg-amber-500" : undefined;
  return (
    <div className="rounded-md border border-border p-3 text-sm">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <Badge className={corBadge} variant={r.tier === "descartado" ? "outline" : "default"}>
          {r.tier}
        </Badge>
        {r.trabalhista ? <Badge variant="outline">trabalhista</Badge> : null}
        <span className="text-xs text-muted-foreground">
          pacote {r.pacote}
          {r.pesquisa ? ` — pesquisa: ${r.pesquisa}` : ""}
        </span>
      </div>
      {r.estruturado ? (
        <p className="text-xs text-muted-foreground">
          {[r.tribunal, r.cnjTexto, r.classeJudicial].filter(Boolean).join(" — ")}
          {r.partes.length > 0 ? ` · ${r.partes.join(" x ")}` : ""}
        </p>
      ) : null}
      <p className="mt-1 text-xs">{r.motivo}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {r.texto.replace(/\s+/g, " ").trim().slice(0, 240)}
        {r.texto.length > 240 ? "..." : ""}
      </p>
    </div>
  );
}
