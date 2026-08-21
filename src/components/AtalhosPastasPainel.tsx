import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FolderKanban } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listarGrupos, listarPastas, type Grupo, type Pasta } from "@/lib/grupos";
import {
  ehResponsavelDaSigla,
  listarProcessos,
  normalizarNome,
  useCargoAtual,
  useSiglaAtual,
} from "@/lib/processos";

const GRUPOS_ESTAGIARIO = ["Equipe Souza Cruz", "Equipe Astro"];

export function AtalhosPastasPainel() {
  const cargo = useCargoAtual();
  const sigla = useSiglaAtual();
  const grupos = useQuery({ queryKey: ["grupos"], queryFn: listarGrupos });
  const pastas = useQuery({ queryKey: ["pastas"], queryFn: listarPastas });
  const processos = useQuery({ queryKey: ["processos"], queryFn: listarProcessos });

  if (cargo !== "Advogado" && cargo !== "Estagiário") return null;

  const gruposPorId = new Map((grupos.data ?? []).map((g) => [g.id, g]));
  const ativos = (processos.data ?? []).filter((p) => p.status === "ativo");
  const contagemPorPasta = new Map<string, number>();
  for (const p of ativos) {
    if (!p.pasta_id) continue;
    contagemPorPasta.set(p.pasta_id, (contagemPorPasta.get(p.pasta_id) ?? 0) + 1);
  }

  if (cargo === "Advogado") {
    const idsComProcessosMeus = new Set(
      ativos
        .filter((p) => p.pasta_id && ehResponsavelDaSigla(p.responsavel, sigla))
        .map((p) => p.pasta_id!),
    );
    const siglaNormalizada = normalizarNome(sigla ?? "");
    const minhasPastas = (pastas.data ?? [])
      .filter((pasta) => {
        if (idsComProcessosMeus.has(pasta.id)) return true;
        if (!siglaNormalizada) return false;
        const nome = normalizarNome(pasta.nome);
        return nome === siglaNormalizada || nome.startsWith(`${siglaNormalizada} `) || nome.endsWith(` ${siglaNormalizada}`);
      })
      .sort((a, b) => {
        const ga = gruposPorId.get(a.grupo_id)?.nome ?? "";
        const gb = gruposPorId.get(b.grupo_id)?.nome ?? "";
        return ga.localeCompare(gb, "pt-BR") || a.nome.localeCompare(b.nome, "pt-BR");
      });

    if (!minhasPastas.length) return null;
    return (
      <BlocoPastas
        titulo="Minhas pastas"
        subtitulo="Atalhos para as carteiras em que você atua."
        pastas={minhasPastas}
        gruposPorId={gruposPorId}
        contagemPorPasta={contagemPorPasta}
      />
    );
  }

  const gruposEstagiario = GRUPOS_ESTAGIARIO
    .map((nome) => (grupos.data ?? []).find((g) => g.nome === nome))
    .filter(Boolean) as Grupo[];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="font-serif text-lg">Pastas das equipes</CardTitle>
        <p className="text-sm text-muted-foreground">Acesso rápido às pastas de Souza Cruz e Astro.</p>
      </CardHeader>
      <CardContent className="space-y-5">
        {gruposEstagiario.map((grupo) => {
          const itens = (pastas.data ?? [])
            .filter((p) => p.grupo_id === grupo.id)
            .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
          return (
            <div key={grupo.id} className="space-y-2">
              <p className="text-sm font-semibold">{grupo.nome.replace("Equipe ", "")}</p>
              {itens.length ? (
                <div className="flex flex-wrap gap-2">
                  {itens.map((pasta) => (
                    <AtalhoPasta key={pasta.id} pasta={pasta} contagem={contagemPorPasta.get(pasta.id) ?? 0} />
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Nenhuma pasta cadastrada.</p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function BlocoPastas({
  titulo,
  subtitulo,
  pastas,
  gruposPorId,
  contagemPorPasta,
}: {
  titulo: string;
  subtitulo: string;
  pastas: Pasta[];
  gruposPorId: Map<string, Grupo>;
  contagemPorPasta: Map<string, number>;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="font-serif text-lg">{titulo}</CardTitle>
        <p className="text-sm text-muted-foreground">{subtitulo}</p>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {pastas.map((pasta) => (
          <Link
            key={pasta.id}
            to="/processos"
            search={{ pasta: pasta.id }}
            className="group flex min-w-44 items-center gap-3 rounded-lg border bg-card px-3 py-2.5 transition-colors hover:border-primary hover:bg-muted/30"
          >
            <FolderKanban className="size-4 shrink-0 text-muted-foreground group-hover:text-primary" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{pasta.nome}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {gruposPorId.get(pasta.grupo_id)?.nome.replace("Equipe ", "") ?? "Equipe"}
              </span>
            </span>
            <Badge variant="secondary">{contagemPorPasta.get(pasta.id) ?? 0}</Badge>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}

function AtalhoPasta({ pasta, contagem }: { pasta: Pasta; contagem: number }) {
  return (
    <Link
      to="/processos"
      search={{ pasta: pasta.id }}
      className="inline-flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm transition-colors hover:border-primary hover:bg-muted/30"
    >
      <FolderKanban className="size-4 text-muted-foreground" />
      <span>{pasta.nome}</span>
      <Badge variant="secondary">{contagem}</Badge>
    </Link>
  );
}
