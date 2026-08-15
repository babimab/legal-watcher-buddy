import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar | Faro Processual" },
      {
        name: "description",
        content: "Acesse o painel de controle dos processos judiciais do escritório.",
      },
      { property: "og:title", content: "Entrar no Faro Processual" },
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
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.navigate({ to: "/processos" });
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
    router.navigate({ to: "/processos" });
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
        data: { nome },
        emailRedirectTo: `${window.location.origin}/processos`,
      },
    });
    setCarregando(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Conta criada! Se o e-mail exigir confirmação, verifique sua caixa de entrada.");
    router.navigate({ to: "/processos" });
  };

  const entrarComGoogle = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Não foi possível entrar com o Google.");
      return;
    }
    if (result.redirected) return;
    router.navigate({ to: "/processos" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center">
          <img src="/faro-logo-navy.png" alt="Faro Processual" className="h-10 w-auto" />
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
                      minLength={6}
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={carregando}>
                    Criar conta
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> ou{" "}
              <span className="h-px flex-1 bg-border" />
            </div>
            <Button variant="outline" className="w-full" onClick={entrarComGoogle}>
              Entrar com Google
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
