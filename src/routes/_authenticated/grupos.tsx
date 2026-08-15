import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Folder, Mail, Plus, Trash2, UserPlus, Users, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  adicionarMembroGrupo,
  criarGrupo,
  criarPasta,
  listarConvitesGrupo,
  listarGrupos,
  listarMembrosGrupo,
  listarPastas,
  removerConviteGrupo,
  removerGrupo,
  removerMembroGrupo,
  removerPasta,
  type Grupo,
  type Pasta,
} from "@/lib/grupos";
import { exibir } from "@/lib/processos";

export const Route = createFileRoute("/_authenticated/grupos")({
  head: () => ({
    meta: [
      { title: "Grupos | Radar Processual" },
      {
        name: "description",
        content: "Organize os processos em equipes e pastas e libere o acesso em bloco.",
      },
    ],
  }),
  component: GruposPage,
});

function GruposPage() {
  const queryClient = useQueryClient();
  const [nomeGrupo, setNomeGrupo] = useState("");

  const grupos = useQuery({ queryKey: ["grupos"], queryFn: listarGrupos });
  const pastas = useQuery({ queryKey: ["pastas"], queryFn: listarPastas });

  const novoGrupo = useMutation({
    mutationFn: (nome: string) => criarGrupo(nome),
    onSuccess: async () => {
      setNomeGrupo("");
      toast.success("Grupo criado.");
      await queryClient.invalidateQueries({ queryKey: ["grupos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pastasPorGrupo = (grupoId: string) =>
    (pastas.data ?? []).filter((p) => p.grupo_id === grupoId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold">Grupos</h1>
        <p className="text-muted-foreground">
          Organize os processos por equipe e pasta, e libere o acesso de alguém a um grupo inteiro —
          sem precisar compartilhar processo por processo.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">Novo grupo</CardTitle>
          <CardDescription>Ex.: "Equipe Souza Cruz", "Equipe Astro".</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!nomeGrupo.trim()) return;
              novoGrupo.mutate(nomeGrupo.trim());
            }}
          >
            <Input
              placeholder="Nome do grupo"
              value={nomeGrupo}
              onChange={(e) => setNomeGrupo(e.target.value)}
              className="max-w-xs"
            />
            <Button type="submit" disabled={novoGrupo.isPending}>
              <Plus className="size-4" /> Criar grupo
            </Button>
          </form>
        </CardContent>
      </Card>

      {grupos.isLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : (grupos.data ?? []).length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Nenhum grupo criado ainda.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {(grupos.data ?? []).map((g) => (
            <GrupoCard key={g.id} grupo={g} pastas={pastasPorGrupo(g.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function GrupoCard({ grupo, pastas }: { grupo: Grupo; pastas: Pasta[] }) {
  const queryClient = useQueryClient();
  const [nomePasta, setNomePasta] = useState("");
  const [email, setEmail] = useState("");

  const membros = useQuery({
    queryKey: ["membros-grupo", grupo.id],
    queryFn: () => listarMembrosGrupo(grupo.id),
    retry: false,
  });

  const convites = useQuery({
    queryKey: ["convites-grupo", grupo.id],
    queryFn: () => listarConvitesGrupo(grupo.id),
    retry: false,
  });

  const novaPasta = useMutation({
    mutationFn: (nome: string) => criarPasta(grupo.id, nome),
    onSuccess: async () => {
      setNomePasta("");
      toast.success("Pasta criada.");
      await queryClient.invalidateQueries({ queryKey: ["pastas"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const adicionarMembro = useMutation({
    mutationFn: (valor: string) => adicionarMembroGrupo(grupo.id, valor),
    onSuccess: async ({ pendente }) => {
      setEmail("");
      toast.success(
        pendente
          ? "Convite registrado. Assim que essa pessoa criar a conta com esse e-mail, o acesso ao grupo é liberado automaticamente."
          : "Acesso ao grupo liberado.",
      );
      await queryClient.invalidateQueries({ queryKey: ["membros-grupo", grupo.id] });
      await queryClient.invalidateQueries({ queryKey: ["convites-grupo", grupo.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removerMembro = useMutation({
    mutationFn: (membroId: string) => removerMembroGrupo(membroId),
    onSuccess: async () => {
      toast.success("Acesso removido.");
      await queryClient.invalidateQueries({ queryKey: ["membros-grupo", grupo.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancelarConvite = useMutation({
    mutationFn: (conviteId: string) => removerConviteGrupo(conviteId),
    onSuccess: async () => {
      toast.success("Convite cancelado.");
      await queryClient.invalidateQueries({ queryKey: ["convites-grupo", grupo.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const excluirGrupo = useMutation({
    mutationFn: () => removerGrupo(grupo.id),
    onSuccess: async () => {
      toast.success("Grupo excluído.");
      await queryClient.invalidateQueries({ queryKey: ["grupos"] });
      await queryClient.invalidateQueries({ queryKey: ["pastas"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const excluirPasta = useMutation({
    mutationFn: (pastaId: string) => removerPasta(pastaId),
    onSuccess: async () => {
      toast.success("Pasta excluída.");
      await queryClient.invalidateQueries({ queryKey: ["pastas"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="font-serif text-lg">{grupo.nome}</CardTitle>
          <CardDescription>
            {pastas.length} pasta(s) · {membros.data?.length ?? 0} pessoa(s) com acesso ao grupo
          </CardDescription>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Excluir grupo"
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="size-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir o grupo "{grupo.nome}"?</AlertDialogTitle>
              <AlertDialogDescription>
                Todas as pastas dele também serão excluídas. Os processos que estavam nessas pastas
                não são apagados, só ficam sem pasta.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  excluirGrupo.mutate();
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir grupo
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <p className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Folder className="size-4" /> Pastas
          </p>
          <div className="mb-2 flex flex-wrap gap-2">
            {pastas.length === 0 ? (
              <span className="text-sm text-muted-foreground">Nenhuma pasta ainda.</span>
            ) : (
              pastas.map((p) => (
                <span
                  key={p.id}
                  className="inline-flex items-center gap-1 rounded-full border border-border pl-1 pr-2 py-0.5"
                >
                  <Link to="/processos" search={{ grupo: grupo.id, pasta: p.id }}>
                    <Badge variant="outline" className="cursor-pointer border-0 hover:text-primary">
                      {exibir(p.nome)}
                    </Badge>
                  </Link>
                  <button
                    type="button"
                    aria-label={`Excluir pasta ${p.nome}`}
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => excluirPasta.mutate(p.id)}
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))
            )}
          </div>
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!nomePasta.trim()) return;
              novaPasta.mutate(nomePasta.trim());
            }}
          >
            <Input
              placeholder="Nova pasta (ex.: BDR)"
              value={nomePasta}
              onChange={(e) => setNomePasta(e.target.value)}
              className="max-w-xs"
            />
            <Button type="submit" variant="outline" size="sm" disabled={novaPasta.isPending}>
              <Plus className="size-4" /> Adicionar pasta
            </Button>
          </form>
        </div>

        {membros.isError ? null : (
          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Users className="size-4" /> Quem tem acesso ao grupo
            </p>
            <p className="mb-2 text-sm text-muted-foreground">
              Libere a consulta a todos os processos deste grupo (todas as pastas) para alguém da
              equipe, digitando o e-mail @bcw.com.br dela. Se a pessoa ainda não tiver conta, fica
              um convite pendente e o acesso é liberado sozinho assim que ela se cadastrar.
            </p>
            <form
              className="mb-2 flex flex-wrap gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!email.trim()) return;
                adicionarMembro.mutate(email.trim());
              }}
            >
              <Input
                type="email"
                placeholder="e-mail@bcw.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="max-w-xs"
              />
              <Button type="submit" size="sm" disabled={adicionarMembro.isPending}>
                <UserPlus className="size-4" /> Convidar / liberar acesso
              </Button>
            </form>

            {!convites.isError && (convites.data ?? []).length > 0 ? (
              <ul className="mb-3 divide-y divide-border rounded-lg border border-dashed border-border">
                {(convites.data ?? []).map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 px-3 py-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <Mail className="size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{c.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Convite pendente — aguardando cadastro
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Cancelar convite"
                      onClick={() => cancelarConvite.mutate(c.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}

            {membros.isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : (membros.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Ninguém além de você tem acesso a este grupo.
              </p>
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {(membros.data ?? []).map((m) => (
                  <li
                    key={m.membro_id}
                    className="flex items-center justify-between gap-3 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {m.nome ?? m.email ?? "Usuário"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Remover acesso"
                      onClick={() => removerMembro.mutate(m.membro_id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
