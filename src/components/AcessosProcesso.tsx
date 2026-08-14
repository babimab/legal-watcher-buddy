import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export function AcessosProcesso({ processoId }: { processoId: string }) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");

  const acessos = useQuery({
    queryKey: ["acessos", processoId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("listar_acessos_processo", {
        _processo_id: processoId,
      });
      if (error) throw error;
      return data ?? [];
    },
    retry: false,
  });

  const compartilhar = useMutation({
    mutationFn: async (valor: string) => {
      const { error } = await supabase.rpc("compartilhar_processo", {
        _processo_id: processoId,
        _email: valor,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      setEmail("");
      toast.success("Acesso liberado.");
      await queryClient.invalidateQueries({ queryKey: ["acessos", processoId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remover = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("processo_acessos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Acesso removido.");
      await queryClient.invalidateQueries({ queryKey: ["acessos", processoId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Sem permissão para gerir acessos (não é dono nem admin): não mostra o bloco.
  if (acessos.isError) return null;

  const lista = acessos.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-serif text-lg">
          <Users className="size-4" /> Quem tem acesso
        </CardTitle>
        <CardDescription>
          Libere a consulta deste processo para pessoas da equipe (estagiárias, por exemplo). Elas
          precisam já ter cadastro no sistema com o e-mail informado.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!email.trim()) return;
            compartilhar.mutate(email.trim());
          }}
        >
          <Input
            type="email"
            placeholder="e-mail da pessoa"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="max-w-xs"
          />
          <Button type="submit" disabled={compartilhar.isPending}>
            <UserPlus className="size-4" /> Liberar acesso
          </Button>
        </form>

        {acessos.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : lista.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Ninguém além de você tem acesso a este processo.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {lista.map((a) => (
              <li key={a.acesso_id} className="flex items-center justify-between gap-3 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{a.nome ?? a.email ?? "Usuário"}</p>
                  <p className="truncate text-xs text-muted-foreground">{a.email}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Remover acesso"
                  onClick={() => remover.mutate(a.acesso_id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
