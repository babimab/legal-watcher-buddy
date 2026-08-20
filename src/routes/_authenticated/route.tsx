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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-sidebar text-sidebar-foreground">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-3">
          <Link to="/painel" className="flex items-center">
            <img src="/faro-logo-white.png" alt="FaroLex" className="h-7 w-auto" />
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <NavItem
              to="/painel"
              icon={<LayoutDashboard className="size-4" />}
              label="Painel"
              tourId="nav-painel"
            />
            <NavItem
              to="/painel"
              icon={<LayoutDashboard className="size-4" />}
              label="Equipe Souza Cruz"
              search={{ grupo: "Equipe Souza Cruz" }}
              tourId="nav-clientes"
            />
            <NavItem
              to="/painel"
              icon={<LayoutDashboard className="size-4" />}
              label="Equipe Astro"
              search={{ grupo: "Equipe Astro" }}
            />
            <NavItem
              to="/processos"
              icon={<FolderKanban className="size-4" />}
              label="Meus processos"
              search={{ advogado: "eu" }}
              tourId="nav-meus-processos"
            />
            <NavItem
              to="/processos"
              icon={<List className="size-4" />}
              label="Todos os processos"
              tourId="nav-todos-processos"
            />
            <NavItem
              to="/calculos"
              icon={<Calculator className="size-4" />}
              label="Cálculos"
              tourId="nav-calculos"
            />
            <NavItem
              to="/relatorio"
              icon={<LineChart className="size-4" />}
              label="Relatórios"
              contador={prazosUrgentes}
              tourId="nav-relatorios"
            />
            <NavItem
              to="/relatorio"
              icon={<AlertTriangle className="size-4" />}
              label="Meus prazos"
              search={{ aba: "pendencias", advogado: "eu" }}
              contador={meusPrazosUrgentes}
            />
            {ehEstagiaria ? null : (
              <NavItem
                to="/grupos"
                icon={<Users className="size-4" />}
                label="Grupos"
                tourId="nav-grupos"
              />
            )}
            {ehEstagiaria ? null : (
              <NavItem
                to="/relatorio"
                icon={<Archive className="size-4" />}
                label="Encerramento Souza Cruz"
                search={{ aba: "encerramento" }}
                tourId="nav-encerramento"
              />
            )}
            {ehEstagiaria ? null : (
              <NavItem
                to="/relatorio"
                icon={<Archive className="size-4" />}
                label="Encerramento Astro"
                search={{ aba: "encerramento-astro" }}
                tourId="nav-encerramento-astro"
              />
            )}
            {ehEstagiaria ? null : (
              <NavItem
                to="/baixas-cliente"
                icon={<ClipboardCheck className="size-4" />}
                label="Baixas no cliente"
                contador={baixasAbertas}
                tourId="nav-baixas-cliente"
              />
            )}
            <NavItem
              to="/publicacoes"
              icon={<Newspaper className="size-4" />}
              label="Publicações"
              tourId="nav-publicacoes"
            />
            <NavItem
              to="/citacoes"
              icon={<Gavel className="size-4" />}
              label="Citações"
              tourId="nav-citacoes"
            />
            {ehEstagiaria ? null : (
              <NavItem
                to="/importar"
                icon={<Upload className="size-4" />}
                label="Importar"
                tourId="nav-importar"
              />
            )}
            {ehEstagiaria ? null : (
              <NavItem
                to="/qualidade-dados"
                icon={<ShieldCheck className="size-4" />}
                label="Qualidade dos dados"
                tourId="nav-qualidade"
              />
            )}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <GuiaRapido />
            <BuscaGlobal />
            <Link
              to="/perfil"
              aria-label="Meu perfil"
              data-tour="nav-perfil"
              className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
              activeProps={{ className: "bg-sidebar-accent font-semibold" }}
            >
              <User className="size-4" /> Perfil
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={sair}
              className="text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <LogOut className="size-4" /> Sair
            </Button>
          </div>
        </div>
      </header>
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-8">
        <aside className="hidden w-36 shrink-0 lg:block">
          <img
            src="/faro-advogada.jpg"
            alt="FaroLex"
            className="sticky top-8 rounded-xl border border-border shadow-sm"
          />
        </aside>
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
      <footer className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        Essa aplicação foi criada por Bárbara Brandão.
      </footer>
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
      className="flex items-center gap-2 rounded-md px-3 py-1.5 transition-colors hover:bg-sidebar-accent"
      activeProps={{ className: "bg-sidebar-accent font-semibold" }}
    >
      {icon}
      {label}
      {contador ? (
        <Badge variant="destructive" className="px-1.5 py-0 text-xs">
          {contador}
        </Badge>
      ) : null}
    </Link>
  );
}
