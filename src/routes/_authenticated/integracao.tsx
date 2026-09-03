import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";
import { Copy, KeyRound, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCargoAtual } from "@/lib/processos";
import { gerarChaveApi, listarChavesApi, revogarChaveApi } from "@/lib/chaves-api";
import { openapiIntegracao } from "@/lib/openapi-integracao";

export const Route = createFileRoute("/_authenticated/integracao")({
  head: () => ({
    meta: [
      { title: "Integração | FaroLex" },
      {
        name: "description",
        content: "API de integração de andamentos e encerramentos, com documentação Swagger.",
      },
    ],
  }),
  component: IntegracaoPage,
});

function IntegracaoPage() {
  const cargo = useCargoAtual();
  const podeGerenciarChaves = cargo === "Administrativo";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold">Integração</h1>
        <p className="text-muted-foreground">
          API pra um sistema externo puxar diariamente os andamentos e os processos prontos para
          encerrar (pastas Equipe Souza Cruz e Equipe Astro).
        </p>
      </div>

      {podeGerenciarChaves ? (
        <GestaoChavesApi />
      ) : (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            A gestão de chaves de API é restrita à equipe Administrativo.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">Documentação (Swagger)</CardTitle>
          <CardDescription>
            Envie a chave de API no header <code>x-api-key</code>. "Try it out" chama a API de
            verdade.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SwaggerUI spec={openapiIntegracao} />
        </CardContent>
      </Card>
    </div>
  );
}

function GestaoChavesApi() {
  const queryClient = useQueryClient();
  const chaves = useQuery({ queryKey: ["chaves-api"], queryFn: listarChavesApi });
  const [nome, setNome] = useState("");
  const [gerando, setGerando] = useState(false);
  const [chaveGerada, setChaveGerada] = useState<string | null>(null);

  const gerar = async () => {
    if (!nome.trim()) {
      toast.warning('Dá um nome pra chave (ex.: "Sistema Souza Cruz").');
      return;
    }
    setGerando(true);
    try {
      const chave = await gerarChaveApi(nome.trim());
      setChaveGerada(chave);
      setNome("");
      await queryClient.invalidateQueries({ queryKey: ["chaves-api"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não consegui gerar a chave.");
    } finally {
      setGerando(false);
    }
  };

  const revogar = async (id: string) => {
    if (!window.confirm("Revogar esta chave? Quem estiver usando ela para de conseguir acessar.")) {
      return;
    }
    try {
      await revogarChaveApi(id);
      toast.success("Chave revogada.");
      await queryClient.invalidateQueries({ queryKey: ["chaves-api"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não consegui revogar.");
    }
  };

  const copiar = async (texto: string) => {
    await navigator.clipboard.writeText(texto);
    toast.success("Copiado.");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-serif text-lg">
          <KeyRound className="size-5" /> Chaves de API
        </CardTitle>
        <CardDescription>
          A chave só aparece em texto puro uma vez, na hora que é criada — guarde num lugar seguro.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {chaveGerada ? (
          <div className="space-y-2 rounded-lg border border-primary/40 bg-primary/5 p-3">
            <p className="text-xs text-muted-foreground">
              Copie agora — essa é a única vez que ela aparece em texto puro.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 overflow-x-auto rounded bg-muted px-2 py-1 text-sm">
                {chaveGerada}
              </code>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void copiar(chaveGerada)}
              >
                <Copy className="size-4" />
              </Button>
            </div>
            <Button type="button" size="sm" variant="ghost" onClick={() => setChaveGerada(null)}>
              Já copiei, fechar
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-2">
              <Label htmlFor="nome-chave">Nome da chave</Label>
              <Input
                id="nome-chave"
                placeholder="Ex.: Sistema Souza Cruz"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </div>
            <Button type="button" disabled={gerando} onClick={() => void gerar()}>
              {gerando ? "Gerando..." : "Gerar nova chave"}
            </Button>
          </div>
        )}

        {chaves.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : (chaves.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma chave criada ainda.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="p-2 text-left">Nome</th>
                  <th className="p-2 text-left">Prefixo</th>
                  <th className="p-2 text-left">Criada em</th>
                  <th className="p-2 text-left">Status</th>
                  <th className="w-24 p-2"></th>
                </tr>
              </thead>
              <tbody>
                {(chaves.data ?? []).map((c) => (
                  <tr key={c.id} className="border-t border-border">
                    <td className="p-2">{c.nome}</td>
                    <td className="p-2 font-mono text-xs">{c.prefixo}…</td>
                    <td className="p-2 text-xs text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="p-2">
                      {c.ativo ? (
                        <span className="text-primary">Ativa</span>
                      ) : (
                        <span className="text-muted-foreground">Revogada</span>
                      )}
                    </td>
                    <td className="p-2 text-right">
                      {c.ativo ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => void revogar(c.id)}
                        >
                          <Trash2 className="size-3.5" /> Revogar
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
