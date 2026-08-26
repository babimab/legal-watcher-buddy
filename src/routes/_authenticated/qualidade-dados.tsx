import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AlertTriangle, CheckCircle2, Download, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { exibir, formatarCNJ } from "@/lib/processos";
import { listarGrupos, listarPastas } from "@/lib/grupos";
import { exportarGruposParteAdversaExcel } from "@/lib/excel";
import {
  cnjsDuplicados,
  corrigirAcento,
  desdobramentosNaoVinculados,
  excluirDuplicatasSegurasAcento,
  gruposPorParteAdversa,
  listarProblemasAcento,
  listarProcessosParaSaude,
  processosSemPasta,
  type ProblemaAcento,
} from "@/lib/saude";

export const Route = createFileRoute("/_authenticated/qualidade-dados")({
  head: () => ({
    meta: [
      { title: "Qualidade dos dados | FaroLex" },
      {
        name: "description",
        content:
          "Checagem automática de problemas na carteira: processo sem pasta, CNJ duplicado e acento corrompido.",
      },
    ],
  }),
  component: QualidadeDadosPage,
});

function QualidadeDadosPage() {
  const queryClient = useQueryClient();
  const processos = useQuery({
    queryKey: ["processos-saude"],
    queryFn: listarProcessosParaSaude,
  });
  const problemasAcento = useQuery({
    queryKey: ["problemas-acento"],
    queryFn: listarProblemasAcento,
  });
  const grupos = useQuery({ queryKey: ["grupos"], queryFn: listarGrupos });
  const pastas = useQuery({ queryKey: ["pastas"], queryFn: listarPastas });

  const [corrigindo, setCorrigindo] = useState<Set<string>>(new Set());
  const [corrigindoTodos, setCorrigindoTodos] = useState(false);
  const [excluindoDuplicatas, setExcluindoDuplicatas] = useState(false);
  const [exportandoParteAdversa, setExportandoParteAdversa] = useState(false);

  const semPasta = processos.data ? processosSemPasta(processos.data) : [];
  const duplicados = processos.data ? cnjsDuplicados(processos.data) : [];
  const desdobramentos = processos.data ? desdobramentosNaoVinculados(processos.data) : [];
  const acentos = problemasAcento.data ?? [];

  // Pasta BDR (Equipe Souza Cruz) — planilha de possíveis desdobramentos
  // por parte adversa repetida, pra revisão manual.
  const pastaBdr = (pastas.data ?? []).find((pa) => {
    const grupo = (grupos.data ?? []).find((g) => g.id === pa.grupo_id);
    return grupo?.nome === "Equipe Souza Cruz" && pa.nome === "BDR";
  });
  const gruposParteAdversaBdr =
    processos.data && pastaBdr ? gruposPorParteAdversa(processos.data, pastaBdr.id) : [];

  const exportarParteAdversa = async () => {
    setExportandoParteAdversa(true);
    try {
      await exportarGruposParteAdversaExcel(gruposParteAdversaBdr, "possiveis-desdobramentos-bdr");
    } catch {
      toast.error("Não consegui gerar a planilha.");
    } finally {
      setExportandoParteAdversa(false);
    }
  };

  const carregando = processos.isLoading || problemasAcento.isLoading;
  const semProblemas =
    !carregando &&
    semPasta.length === 0 &&
    duplicados.length === 0 &&
    desdobramentos.length === 0 &&
    acentos.length === 0;

  const corrigir = async (problema: ProblemaAcento) => {
    const chave = `${problema.tabela}-${problema.id}-${problema.campo}`;
    setCorrigindo((atual) => new Set(atual).add(chave));
    try {
      await corrigirAcento(problema);
      await queryClient.invalidateQueries({ queryKey: ["problemas-acento"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não consegui corrigir.");
    } finally {
      setCorrigindo((atual) => {
        const novo = new Set(atual);
        novo.delete(chave);
        return novo;
      });
    }
  };

  const corrigirTodos = async () => {
    setCorrigindoTodos(true);
    let ok = 0;
    let falhas = 0;
    let primeiroErro: string | null = null;
    for (const problema of acentos) {
      try {
        await corrigirAcento(problema);
        ok++;
      } catch (e) {
        falhas++;
        if (!primeiroErro) primeiroErro = e instanceof Error ? e.message : "Erro desconhecido.";
      }
    }
    setCorrigindoTodos(false);
    await queryClient.invalidateQueries({ queryKey: ["problemas-acento"] });
    if (falhas > 0) {
      toast.warning(`${ok} corrigido(s), ${falhas} falharam. Motivo: ${primeiroErro}`, {
        duration: 10000,
      });
    } else toast.success(`${ok} corrigido(s).`);
  };

  const excluirDuplicatas = async () => {
    setExcluindoDuplicatas(true);
    try {
      const { excluidas, paraRevisao } = await excluirDuplicatasSegurasAcento(acentos);
      await queryClient.invalidateQueries({ queryKey: ["problemas-acento"] });
      if (excluidas === 0 && paraRevisao === 0) {
        toast.success("Nenhuma duplicata encontrada nessa lista.");
      } else {
        toast.success(
          `${excluidas} duplicata(s) excluída(s).` +
            (paraRevisao > 0
              ? ` ${paraRevisao} ficaram pra revisão manual (têm prazo, observação ou algo mais que a cópia certa não tem).`
              : ""),
          { duration: 8000 },
        );
      }
    } catch {
      toast.error("Não consegui excluir as duplicatas.");
    } finally {
      setExcluindoDuplicatas(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold">Qualidade dos dados</h1>
        <p className="text-muted-foreground">
          Checagem automática da carteira, pra pegar esse tipo de problema antes de alguém notar por
          acaso.
        </p>
      </div>

      {carregando ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : semProblemas ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="size-4 text-primary" /> Nenhum problema encontrado.
        </p>
      ) : null}

      {semPasta.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-serif text-lg">
              <AlertTriangle className="size-5 text-amber-500" />
              {semPasta.length} processo(s) sem pasta
            </CardTitle>
            <CardDescription>
              Sem pasta, o processo não aparece nos painéis de equipe nem nas exportações por
              advogado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-2 text-left">Processo</th>
                    <th className="p-2 text-left">Cliente</th>
                    <th className="p-2 text-left">Responsável</th>
                    <th className="w-24 p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {semPasta.map((p) => (
                    <tr key={p.id} className="border-t border-border">
                      <td className="p-2 font-mono text-xs">{formatarCNJ(p.numero_cnj)}</td>
                      <td className="p-2">{exibir(p.cliente)}</td>
                      <td className="p-2">{exibir(p.responsavel)}</td>
                      <td className="p-2 text-right">
                        <Button asChild size="sm" variant="outline">
                          <Link to="/processos/$id" params={{ id: p.id }}>
                            Editar
                          </Link>
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

      {duplicados.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-serif text-lg">
              <AlertTriangle className="size-5 text-amber-500" />
              {duplicados.length} CNJ duplicado(s)
            </CardTitle>
            <CardDescription>
              Mesmo número de processo cadastrado mais de uma vez. Revise manualmente — pode ser
              cadastro repetido ou um desdobramento que deveria estar vinculado como tal.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {duplicados.map((grupo) => (
              <div key={grupo.cnjDigits} className="rounded-md border border-border p-3">
                <p className="mb-2 font-mono text-xs text-muted-foreground">
                  {formatarCNJ(grupo.cnjDigits)}
                </p>
                <div className="flex flex-wrap gap-2">
                  {grupo.processos.map((p) => (
                    <Link
                      key={p.id}
                      to="/processos/$id"
                      params={{ id: p.id }}
                      className="flex items-center gap-2 rounded-md border border-border px-2 py-1 text-sm hover:border-primary"
                    >
                      <span>
                        {exibir(p.cliente)}
                        {p.parte_contraria ? ` x ${exibir(p.parte_contraria)}` : ""}
                      </span>
                      {p.responsavel ? <Badge variant="outline">{p.responsavel}</Badge> : null}
                      <Badge variant="outline">{p.status}</Badge>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {desdobramentos.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-serif text-lg">
              <AlertTriangle className="size-5 text-amber-500" />
              {desdobramentos.length} possível(is) desdobramento(s) não vinculado(s)
            </CardTitle>
            <CardDescription>
              Mesmo número de caso, CNJs diferentes, e mais de um cadastrado como processo
              independente — provavelmente um recurso/cumprimento/execução do outro. Abre o processo
              e usa "Vincular desdobramento" pra corrigir.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {desdobramentos.map((grupo) => (
              <div key={grupo.numeroInterno} className="rounded-md border border-border p-3">
                <p className="mb-2 text-xs text-muted-foreground">Caso {grupo.numeroInterno}</p>
                <div className="flex flex-wrap gap-2">
                  {grupo.processos.map((p) => (
                    <Link
                      key={p.id}
                      to="/processos/$id"
                      params={{ id: p.id }}
                      className="flex items-center gap-2 rounded-md border border-border px-2 py-1 text-sm hover:border-primary"
                    >
                      <span className="font-mono text-xs">{formatarCNJ(p.numero_cnj)}</span>
                      <span>
                        {exibir(p.cliente)}
                        {p.parte_contraria ? ` x ${exibir(p.parte_contraria)}` : ""}
                      </span>
                      {p.responsavel ? <Badge variant="outline">{p.responsavel}</Badge> : null}
                      {p.fase ? <Badge variant="secondary">{p.fase}</Badge> : null}
                      {p.tipo_desdobramento ? (
                        <Badge variant="outline">{p.tipo_desdobramento}</Badge>
                      ) : null}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {gruposParteAdversaBdr.length > 0 ? (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 font-serif text-lg">
                  <AlertTriangle className="size-5 text-amber-500" />
                  {gruposParteAdversaBdr.length} parte(s) adversa(s) repetida(s) na pasta BDR
                </CardTitle>
                <CardDescription>
                  Processos com a mesma parte adversa costumam ser fases do mesmo caso — é só um
                  indício, por isso vira planilha pra você revisar e marcar com calma, em vez de
                  ligar automático.
                </CardDescription>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void exportarParteAdversa()}
                disabled={exportandoParteAdversa}
              >
                <Download className="size-4" />
                {exportandoParteAdversa ? "Gerando..." : "Exportar planilha"}
              </Button>
            </div>
          </CardHeader>
        </Card>
      ) : null}

      {acentos.length > 0 ? (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 font-serif text-lg">
                  <AlertTriangle className="size-5 text-amber-500" />
                  {acentos.length} campo(s) com acento corrompido
                </CardTitle>
                <CardDescription>
                  Texto que entrou com codificação errada numa importação antiga. Corrige na hora,
                  sem risco pro que já está certo.
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void excluirDuplicatas()}
                  disabled={excluindoDuplicatas}
                  title="Exclui só as cópias com texto quebrado que já têm uma gêmea certa e não têm prazo, observação ou destaque no e-mail"
                >
                  <Trash2 className="size-4" />
                  {excluindoDuplicatas ? "Excluindo..." : "Excluir duplicatas seguras"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void corrigirTodos()}
                  disabled={corrigindoTodos}
                >
                  <Wand2 className="size-4" />
                  {corrigindoTodos ? "Corrigindo..." : "Corrigir todos"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-2 text-left">Processo</th>
                    <th className="p-2 text-left">Campo</th>
                    <th className="p-2 text-left">Atual</th>
                    <th className="p-2 text-left">Corrigido</th>
                    <th className="w-28 p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {acentos.map((prob) => {
                    const chave = `${prob.tabela}-${prob.id}-${prob.campo}`;
                    return (
                      <tr key={chave} className="border-t border-border">
                        <td className="p-2">
                          <Link
                            to="/processos/$id"
                            params={{ id: prob.processoId }}
                            className="hover:underline"
                          >
                            {prob.numeroCnj ? formatarCNJ(prob.numeroCnj) : "—"}
                          </Link>
                        </td>
                        <td className="p-2 text-xs text-muted-foreground">{prob.campo}</td>
                        <td className="max-w-64 truncate p-2 text-xs">{prob.valorAtual}</td>
                        <td className="max-w-64 truncate p-2 text-xs text-primary">
                          {prob.valorCorrigido}
                        </td>
                        <td className="p-2 text-right">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={corrigindo.has(chave)}
                            onClick={() => void corrigir(prob)}
                          >
                            Corrigir
                          </Button>
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
    </div>
  );
}
