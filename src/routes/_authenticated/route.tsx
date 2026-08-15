import { createFileRoute, Outlet, redirect, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FolderKanban, List, LineChart, LogOut, Upload, User, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { listarPendencias } from "@/lib/processos";

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
  const emSeteDias = new Date();
  emSeteDias.setDate(emSeteDias.getDate() + 7);
  const emSeteDiasISO = emSeteDias.toISOString().slice(0, 10);
  const prazosUrgentes = (pendencias.data ?? []).filter(
    (m) => m.prazo && m.prazo <= emSeteDiasISO,
  ).length;

  const sair = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth" });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-sidebar text-sidebar-foreground">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-3">
          <Link to="/processos" className="flex items-center">
            <img src="/faro-logo-white.png" alt="FaroLex" className="h-7 w-auto" />
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <NavItem
              to="/processos"
              icon={<FolderKanban className="size-4" />}
              label="Meus processos"
              search={{ advogado: "eu" }}
            />
            <NavItem
              to="/processos"
              icon={<List className="size-4" />}
              label="Todos os processos"
            />
            <NavItem
              to="/relatorio"
              icon={<LineChart className="size-4" />}
              label="Relatórios"
              contador={prazosUrgentes}
            />
            <NavItem to="/grupos" icon={<Users className="size-4" />} label="Grupos" />
            <NavItem to="/importar" icon={<Upload className="size-4" />} label="Importar" />
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <Link
              to="/perfil"
              aria-label="Meu perfil"
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
    </div>
  );
}

function NavItem({
  to,
  icon,
  label,
  contador,
  search,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  contador?: number;
  search?: Record<string, string>;
}) {
  return (
    <Link
      to={to}
      search={search ?? {}}
      activeOptions={{ exact: true, includeSearch: true }}
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
