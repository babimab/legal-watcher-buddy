import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({
    meta: [
      { title: "Meu perfil | Radar Processual" },
      { name: "description", content: "Dados da sua conta e troca de senha." },
    ],
  }),
  component: PerfilPage,
});

function PerfilPage() {
  const [email, setEmail] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  const trocarSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    if (novaSenha.length < 6) {
      toast.error("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (novaSenha !== confirmarSenha) {
      toast.error("As senhas não coincidem.");
      return;
    }
    setSalvando(true);
    const { error } = await supabase.auth.updateUser({ password: novaSenha });
    setSalvando(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setNovaSenha("");
    setConfirmarSenha("");
    toast.success("Senha alterada.");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold">Meu perfil</h1>
        <p className="text-muted-foreground">Dados da sua conta.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">Conta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">E-mail</p>
          <p className="text-sm">{email || "—"}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-serif text-lg">
            <KeyRound className="size-4" /> Trocar senha
          </CardTitle>
          <CardDescription>
            Use uma senha só sua. Se precisar passar acesso temporário pra alguém (ex.: suporte),
            troque para uma senha provisória agora e volte aqui depois para definir a senha
            definitiva.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={trocarSenha} className="grid max-w-sm gap-4">
            <div className="space-y-2">
              <Label htmlFor="nova-senha">Nova senha</Label>
              <Input
                id="nova-senha"
                type="password"
                required
                minLength={6}
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmar-senha">Confirmar nova senha</Label>
              <Input
                id="confirmar-senha"
                type="password"
                required
                minLength={6}
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={salvando} className="w-fit">
              {salvando ? "Salvando..." : "Trocar senha"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
