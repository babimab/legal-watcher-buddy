import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { KeyRound, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { CARGO_OPCOES } from "@/lib/processos";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({
    meta: [
      { title: "Meu perfil | FaroLex" },
      { name: "description", content: "Dados da sua conta e troca de senha." },
    ],
  }),
  component: PerfilPage,
});

function PerfilPage() {
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [sigla, setSigla] = useState("");
  const [cargo, setCargo] = useState("Advogado");
  const [salvandoNome, setSalvandoNome] = useState(false);
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setEmail(data.user?.email ?? "");
      if (!data.user) return;
      setUserId(data.user.id);
      const { data: perfil } = await supabase
        .from("profiles")
        .select("nome, sigla, cargo")
        .eq("id", data.user.id)
        .maybeSingle();
      setNome(perfil?.nome ?? "");
      setSigla(perfil?.sigla ?? "");
      setCargo(perfil?.cargo ?? "Advogado");
    });
  }, []);

  const salvarNome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      toast.error("Informe o nome completo.");
      return;
    }
    if (!sigla.trim()) {
      toast.error("Informe a sigla.");
      return;
    }
    setSalvandoNome(true);
    const { error } = await supabase
      .from("profiles")
      .update({ nome: nome.trim(), sigla: sigla.trim().toUpperCase(), cargo })
      .eq("id", userId);
    setSalvandoNome(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Dados atualizados.");
  };

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
          <CardTitle className="flex items-center gap-2 font-serif text-lg">
            <User className="size-4" /> Conta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">E-mail</p>
            <p className="text-sm">{email || "—"}</p>
          </div>
          <form onSubmit={salvarNome} className="grid max-w-sm gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome-completo">Nome completo</Label>
              <Input
                id="nome-completo"
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sigla-perfil">Sigla</Label>
              <Input
                id="sigla-perfil"
                type="text"
                placeholder="Ex.: BDR"
                maxLength={6}
                value={sigla}
                onChange={(e) => setSigla(e.target.value)}
                className="uppercase"
              />
              <p className="text-xs text-muted-foreground">
                As iniciais usadas nos processos como responsável — é o que liga "Meus processos" e
                "Meus prazos" a você.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cargo-perfil">Cargo</Label>
              <Select value={cargo} onValueChange={setCargo}>
                <SelectTrigger id="cargo-perfil">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CARGO_OPCOES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={salvandoNome} className="w-fit">
              {salvandoNome ? "Salvando..." : "Salvar"}
            </Button>
          </form>
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
