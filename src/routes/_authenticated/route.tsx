import { createFileRoute, Outlet, redirect, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Archive,
  Calculator,
  ClipboardCheck,
  FolderKanban,
  Gavel,
  LayoutDashboard,
  List,
  LineChart,
  LogOut,
  Newspaper,
  ShieldCheck,
  Upload,
  User,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BuscaGlobal } from "@/components/BuscaGlobal";
import { GuiaRapido } from "@/components/GuiaRapido";
import { supabase } from "@/integrations/supabase/client";
import { listarBaixasCliente } from "@/lib/baixas-cliente";
import {
  listarPendencias,
  ehResponsavelDaSigla,
  useSiglaAtual,
  useCargoAtual,
} from "@/lib/processos";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AppLayout,
});

function AppLayout() {
  const router = useRouter();

  const pendencias = useQuery({ queryKey: ["pendencias"], queryFn: listarPendencias });
  const baixasCliente = useQuery({ queryKey: ["baixas-cliente"], queryFn: listarBaixasCliente });
  const minhaSigla = useSiglaAtual();
  const ehEstagiaria = useCargoAtual() === "Estagiário";
  const emSeteDias = new Date();
  emSeteDias.setDate(emSeteDias.getDate() + 7);
  const emSeteDiasISO = emSeteDias.toISOString().slice(0, 10);
  const prazosUrgentes = (pendencias.data ?? []).filter(
    (m) => m.prazo && m.prazo <= emSeteDiasISO,
  ).length;
  const baixasAbertas = (baixasCliente.data ?? []).filter((b) => b.status !== "encerrado").length;
  const meusPrazosUrgentes = (pendencias.data ?? []).filter(
    (m) =>
      m.prazo &&
      m.prazo <= emSeteDiasISO &&
      ehResponsavelDaSigla(m.processos?.responsavel, minhaSigla),
  ).length;

  const sair = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth" });
  };

  const navegacao = (
    <>
      <NavItem to="/painel" icon={<LayoutDashboard className="size-4" />} label="Painel" tourId="nav-painel" />
      <NavItem to="/painel" icon={<LayoutDashboard className="size-4" />} label="Equipe Souza Cruz" search={{ grupo: "Equipe Souza Cruz" }} tourId="nav-clientes" />
      <NavItem to="/painel" icon={<LayoutDashboard className="size-4" />} label="Equipe Astro" search={{ grupo: "Equipe Astro" }} />
      <NavItem to="/processos" icon={<FolderKanban className="size-4" />} label="Meus processos" search={{ advogado: "eu" }} tourId="nav-meus-processos" />
      <NavItem to="/processos" icon={<List className="size-4" />} label="Todos os processos" tourId="nav-todos-processos" />
      <NavItem to="/calculos" icon={<Calculator className="size-4" />} label="Cálculos" tourId="nav-calculos" />
      <NavItem to="/relatorio" icon={<LineChart className="size-4" />} label="Relatórios" contador={prazosUrgentes} tourId="nav-relatorios" />
      <NavItem to="/relatorio" icon={<AlertTriangle className="size-4" />} label="Meus prazos" search={{ aba: "pendencias", advogado: "eu" }} contador={meusPrazosUrgentes} />
      {ehEstagiaria ? null : <NavItem to="/grupos" icon={<Users className="size-4" />} label="Grupos" tourId="nav-grupos" />}
      {ehEstagiaria ? null : <NavItem to="/relatorio" icon={<Archive className="size-4" />} label="Encerramentos" search={{ aba: "encerramento" }} contador={baixasAbertas} tourId="nav-encerramento" />}
      <NavItem to="/publicacoes" icon={<Newspaper className="size-4" />} label="Publicações" tourId="nav-publicacoes" />
      <NavItem to="/citacoes" icon={<Gavel className="size-4" />} label="Citações" tourId="nav-citacoes" />
      {ehEstagiaria ? null : <NavItem to="/importar" icon={<Upload className="size-4" />} label="Importar" tourId="nav-importar" />}
      {ehEstagiaria ? null : <NavItem to="/qualidade-dados" icon={<ShieldCheck className="size-4" />} label="Qualidade dos dados" tourId="nav-qualidade" />}
    </>
  );

  const utilidades = (
    <div className="flex items-center gap-1">
      <GuiaRapido />
      <Link
        to="/perfil"
        aria-label="Meu perfil"
        data-tour="nav-perfil"
        className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-muted"
        activeProps={{ className: "bg-muted font-semibold" }}
      >
        <User className="size-4" /> Perfil
      </Link>
      <Button variant="ghost" size="sm" onClick={sair}>
        <LogOut className="size-4" /> Sair
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
      <aside className="hidden h-screen flex-col overflow-y-auto border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:sticky lg:top-0 lg:flex">
        <div className="px-4 pb-3 pt-5">
          <Link to="/painel" className="flex items-center px-1">
            <img src="/faro-logo-white.png" alt="FaroLex" className="h-8 w-auto" />
          </Link>
        </div>

        <div className="px-3 pb-4">
          <div className="flex items-center gap-2.5 rounded-xl border border-sidebar-border bg-sidebar-accent/20 p-2.5">
            <img
              src="/faro-advogada.jpg"
              alt="FaroLex"
              className="size-12 shrink-0 rounded-lg border border-sidebar-border object-cover shadow-sm"
            />
            <BuscaGlobal compacta />
          </div>
        </div>

        <nav className="flex flex-col gap-1 px-3 pb-5 text-sm">
          {navegacao}
        </nav>
      </aside>

      <div className="min-w-0">
        <header className="border-b border-border bg-sidebar text-sidebar-foreground lg:hidden">
          <div className="flex items-center gap-3 px-4 py-3">
            <Link to="/painel" className="flex items-center">
              <img src="/faro-logo-white.png" alt="FaroLex" className="h-7 w-auto" />
            </Link>
            <div className="ml-auto flex items-center gap-1">
              <GuiaRapido />
              <BuscaGlobal atalhoTeclado={false} />
              <Link to="/perfil" aria-label="Meu perfil" className="rounded-md p-2 text-sidebar-foreground hover:bg-sidebar-accent">
                <User className="size-4" />
              </Link>
              <Button variant="ghost" size="icon" onClick={sair} className="text-sidebar-foreground hover:bg-sidebar-accent">
                <LogOut className="size-4" />
              </Button>
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-3 pb-3 text-sm">{navegacao}</nav>
        </header>

        <div className="hidden items-center justify-end border-b border-border bg-background px-6 py-2 lg:flex">
          {utilidades}
        </div>

        <main className="mx-auto min-w-0 max-w-7xl px-4 py-8 sm:px-6">
          <Outlet />
        </main>

        <footer className="border-t border-border py-4 text-center text-xs text-muted-foreground">
          Essa aplicação foi criada por Bárbara Brandão.
        </footer>
      </div>
    </div>
  );
}

function NavItem({
  to,
  icon,
  label,
  contador,
  search,
  tourId,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  contador?: number;
  search?: Record<string, string>;
  tourId?: string;
}) {
  return (
    <Link
      to={to}
      search={search ?? {}}
      activeOptions={{ exact: true, includeSearch: true }}
      data-tour={tourId}
      className="flex shrink-0 items-center gap-2 rounded-md px-3 py-2 transition-colors hover:bg-sidebar-accent"
      activeProps={{ className: "bg-sidebar-accent font-semibold" }}
    >
      <span className="shrink-0">{icon}</span>
      <span className="whitespace-nowrap">{label}</span>
      {contador ? <Badge variant="destructive" className="ml-auto px-1.5 py-0 text-xs">{contador}</Badge> : null}
    </Link>
  );
}
