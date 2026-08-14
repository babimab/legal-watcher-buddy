import { createFileRoute, Outlet, redirect, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FolderKanban, LineChart, LogOut, Upload, Users } from "lucide-react";

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
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3">
          <Link to="/processos" className="font-serif text-lg font-semibold">
            Radar Processual
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <NavItem
              to="/processos"
              icon={<FolderKanban className="size-4" />}
              label="Meus processos"
            />
            <NavItem
              to="/relatorio"
              icon={<LineChart className="size-4" />}
              label="Relatório de novos andamentos"
              contador={prazosUrgentes}
            />
            <NavItem to="/grupos" icon={<Users className="size-4" />} label="Grupos" />
            <NavItem to="/importar" icon={<Upload className="size-4" />} label="Importar" />
          </nav>
          <Button
            variant="ghost"
            size="sm"
            onClick={sair}
            className="ml-auto text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <LogOut className="size-4" /> Sair
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}

function NavItem({
  to,
  icon,
  label,
  contador,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  contador?: number;
}) {
  return (
    <Link
      to={to}
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
