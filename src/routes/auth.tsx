import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";

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

type ModoAuth = "normal" | "recuperar" | "nova-senha";

function AuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [nome, setNome] = useState("");
  const [sigla, setSigla] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [modo, setModo] = useState<ModoAuth>(() => {
    if (typeof window === "undefined") return "normal";
    const query = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    return query.get("recuperar") === "1" || hash.get("type") === "recovery"
      ? "nova-senha"
      : "normal";
  });

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const veioDeRecuperacao =
      query.get("recuperar") === "1" || hash.get("type") === "recovery";

    if (veioDeRecuperacao) setModo("nova-senha");

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setModo("nova-senha");
      }
    });

    void supabase.auth.getSession().then(({ data }) => {
      if (data.session && !veioDeRecuperacao) router.navigate({ to: "/painel" });
    });

    return () => subscription.unsubscribe();
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
        data: { nome, sigla: sigla.trim().toUpperCase() || null },
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

  const solicitarRecuperacao = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailNormalizado = email.trim().toLowerCase();

    // Mantemos a mensagem genérica para não revelar se determinado endereço possui conta.
    if (!emailNormalizado.endsWith("@bcw.com.br")) {
      toast.success(
        "Se houver uma conta vinculada a esse e-mail, você receberá as instruções para redefinir a senha.",
      );
      return;
    }

    setCarregando(true);
    const { error } = await supabase.auth.resetPasswordForEmail(emailNormalizado, {
      redirectTo: `${window.location.origin}/auth?recuperar=1`,
    });
    setCarregando(false);

    if (error) {
      toast.error("Não foi possível enviar o e-mail de recuperação. Tente novamente em alguns minutos.");
      return;
    }

    toast.success(
      "Se houver uma conta vinculada a esse e-mail, você receberá as instruções para redefinir a senha.",
    );
  };

  const salvarNovaSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    if (senha.length < 8) {
      toast.error("A nova senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (senha !== confirmarSenha) {
      toast.error("As senhas não coincidem.");
      return;
    }

    setCarregando(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    if (error) {
      setCarregando(false);
      toast.error(error.message);
      return;
    }

    await supabase.auth.signOut();
    setCarregando(false);
    setSenha("");
    setConfirmarSenha("");
    window.history.replaceState({}, "", "/auth");
    setModo("normal");
    toast.success("Senha alterada com sucesso. Entre novamente com a nova senha.");
  };

  const voltarParaLogin = () => {
    setSenha("");
    setConfirmarSenha("");
    setModo("normal");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center">
          <img src="/faro-logo-navy.png" alt="FaroLex" className="h-10 w-auto" />
        </Link>
        <Card>
          <CardHeader>
            <CardTitle className="font-serif">
              {modo === "recuperar"
                ? "Recuperar senha"
                : modo === "nova-senha"
                  ? "Definir nova senha"
                  : "Acesso do escritório"}
            </CardTitle>
            <CardDescription>
              {modo === "recuperar"
                ? "Informe o e-mail cadastrado para receber o link de recuperação."
                : modo === "nova-senha"
                  ? "Escolha uma nova senha para sua conta do FaroLex."
                  : "Entre para ver a carteira de processos e o relatório de movimentações."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {modo === "recuperar" ? (
              <form onSubmit={solicitarRecuperacao} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email-recuperacao">E-mail</Label>
                  <Input
                    id="email-recuperacao"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="voce@bcw.com.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={carregando}>
                  {carregando ? "Enviando..." : "Enviar link de recuperação"}
                </Button>
                <button
                  type="button"
                  onClick={voltarParaLogin}
                  className="w-full text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  Voltar para entrar
                </button>
              </form>
            ) : modo === "nova-senha" ? (
              <form onSubmit={salvarNovaSenha} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nova-senha-recuperacao">Nova senha</Label>
                  <Input
                    id="nova-senha-recuperacao"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                  />
                  <BarraForcaSenha senha={senha} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmar-nova-senha">Confirmar nova senha</Label>
                  <Input
                    id="confirmar-nova-senha"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={carregando}>
                  {carregando ? "Salvando..." : "Salvar nova senha"}
                </Button>
              </form>
            ) : (
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
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <Label htmlFor="senha">Senha</Label>
                        <button
                          type="button"
                          onClick={() => {
                            setSenha("");
                            setModo("recuperar");
                          }}
                          className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                        >
                          Esqueceu sua senha?
                        </button>
                      </div>
                      <Input
                        id="senha"
                        type="password"
                        required
                        autoComplete="current-password"
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
                      <Label htmlFor="email-novo">E-mail</Label>
                      <Input
                        id="email-novo"
                        type="email"
                        required
                        autoComplete="email"
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
                        autoComplete="new-password"
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
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
