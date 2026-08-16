import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { CARGO_OPCOES } from "@/lib/processos";

function forcaSenha(senha: string): { nivel: "fraca" | "media" | "forte"; texto: string } | null {
  if (!senha) return null;

  // Só um tipo de caractere (ex.: só números, ou só letras minúsculas) é
  // fraco mesmo que seja longo — "123456789" não deve passar por "média".
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(senha)).length;
  if (classes <= 1) return { nivel: "fraca", texto: "Senha fraca" };

  let pontos = 0;
  if (senha.length >= 8) pontos++;
  if (senha.length >= 12) pontos++;
  if (classes >= 3) pontos++;
  if (classes >= 4) pontos++;

  if (pontos <= 1) return { nivel: "fraca", texto: "Senha fraca" };
  if (pontos <= 2) return { nivel: "media", texto: "Senha média" };
  return { nivel: "forte", texto: "Senha boa" };
}

const CORES_FORCA: Record<"fraca" | "media" | "forte", string> = {
  fraca: "bg-destructive",
  media: "bg-amber-500",
  forte: "bg-emerald-500",
};

const LARGURAS_FORCA: Record<"fraca" | "media" | "forte", string> = {
  fraca: "w-1/3",
  media: "w-2/3",
  forte: "w-full",
};

function BarraForcaSenha({ senha }: { senha: string }) {
  const forca = forcaSenha(senha);
  if (!forca) return null;
  return (
    <div className="space-y-1">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${CORES_FORCA[forca.nivel]} ${LARGURAS_FORCA[forca.nivel]}`}
        />
      </div>
      <p className="text-xs text-muted-foreground">{forca.texto}</p>
    </div>
  );
}

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar | FaroLex" },
      {
        name: "description",
        content: "Acesse o painel de controle dos processos judiciais do escritório.",
      },
      { property: "og:title", content: "Entrar no FaroLex" },
      {
        property: "og:description",
        content: "Acesse o painel de controle dos processos judiciais do escritório.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [sigla, setSigla] = useState("");
  const [cargo, setCargo] = useState<string>("Advogado");
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.navigate({ to: "/painel" });
    });
  }, [router]);

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarregando(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setCarregando(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    router.navigate({ to: "/painel" });
  };

  const cadastrar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim().toLowerCase().endsWith("@bcw.com.br")) {
      toast.error("Só é possível criar conta com um e-mail @bcw.com.br.");
      return;
    }
    setCarregando(true);
    const { error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        data: { nome, sigla: sigla.trim().toUpperCase() || null, cargo },
        emailRedirectTo: `${window.location.origin}/painel`,
      },
    });
    setCarregando(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Conta criada! Se o e-mail exigir confirmação, verifique sua caixa de entrada.");
    router.navigate({ to: "/painel" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center">
          <img src="/faro-logo-navy.png" alt="FaroLex" className="h-10 w-auto" />
        </Link>
        <Card>
          <CardHeader>
            <CardTitle className="font-serif">Acesso do escritório</CardTitle>
            <CardDescription>
              Entre para ver a carteira de processos e o relatório de movimentações.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="entrar">
              <TabsList className="mb-4 grid w-full grid-cols-2">
                <TabsTrigger value="entrar">Entrar</TabsTrigger>
                <TabsTrigger value="criar">Criar conta</TabsTrigger>
              </TabsList>

              <TabsContent value="entrar">
                <form onSubmit={entrar} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="senha">Senha</Label>
                    <Input
                      id="senha"
                      type="password"
                      required
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={carregando}>
                    Entrar
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="criar">
                <form onSubmit={cadastrar} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome</Label>
                    <Input
                      id="nome"
                      required
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sigla">Sigla</Label>
                    <Input
                      id="sigla"
                      required
                      placeholder="Ex.: BDR"
                      maxLength={6}
                      value={sigla}
                      onChange={(e) => setSigla(e.target.value)}
                      className="uppercase"
                    />
                    <p className="text-xs text-muted-foreground">
                      As iniciais usadas nos processos como responsável (ex.: BDR, ELV) — é o que
                      liga "Meus processos" e "Meus prazos" a você.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cargo">Cargo</Label>
                    <Select value={cargo} onValueChange={setCargo}>
                      <SelectTrigger id="cargo">
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
                  <div className="space-y-2">
                    <Label htmlFor="email-novo">E-mail</Label>
                    <Input
                      id="email-novo"
                      type="email"
                      required
                      placeholder="voce@bcw.com.br"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Só e-mails @bcw.com.br podem criar conta.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="senha-nova">Senha</Label>
                    <Input
                      id="senha-nova"
                      type="password"
                      required
                      minLength={8}
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                    />
                    <BarraForcaSenha senha={senha} />
                    <p className="text-xs text-muted-foreground">
                      Mínimo de 8 caracteres. Evite senhas simples (ex.: só números em sequência) —
                      elas podem ser recusadas no cadastro.
                    </p>
                  </div>
                  <Button type="submit" className="w-full" disabled={carregando}>
                    Criar conta
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
