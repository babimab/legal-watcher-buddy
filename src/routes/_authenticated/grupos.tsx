import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Folder, Plus, Trash2, UserPlus, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  adicionarMembroGrupo,
  criarGrupo,
  criarPasta,
  listarGrupos,
  listarMembrosGrupo,
  listarPastas,
  removerMembroGrupo,
  type Grupo,
  type Pasta,
} from "@/lib/grupos";

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
    onSuccess: async () => {
      setEmail("");
      toast.success("Acesso ao grupo liberado.");
      await queryClient.invalidateQueries({ queryKey: ["membros-grupo", grupo.id] });
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif text-lg">{grupo.nome}</CardTitle>
        <CardDescription>
          {pastas.length} pasta(s) · {membros.data?.length ?? 0} pessoa(s) com acesso ao grupo
        </CardDescription>
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
                <Link key={p.id} to="/processos" search={{ grupo: grupo.id, pasta: p.id }}>
                  <Badge variant="outline" className="cursor-pointer hover:border-primary">
                    {p.nome}
                  </Badge>
                </Link>
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
              equipe — ela precisa já ter cadastro no sistema com o e-mail informado.
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
                placeholder="e-mail da pessoa"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="max-w-xs"
              />
              <Button type="submit" size="sm" disabled={adicionarMembro.isPending}>
                <UserPlus className="size-4" /> Liberar acesso
              </Button>
            </form>

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
