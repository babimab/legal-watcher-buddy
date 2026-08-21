import { createFileRoute, Outlet, redirect, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Archive,
  Calculator,
  FolderKanban,
  Gavel,
  Inbox,
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
import { listarCaixaEntrada } from "@/lib/caixa-entrada";
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
  const caixaEntrada = useQuery({ queryKey: ["caixa-entrada"], queryFn: listarCaixaEntrada });
  const minhaSigla = useSiglaAtual();
  const ehEstagiaria = useCargoAtual() === "Estagiário";
  const emSeteDias = new Date();
  emSeteDias.setDate(emSeteDias.getDate() + 7);
  const emSeteDiasISO = emSeteDias.toISOString().slice(0, 10);
  const prazosUrgentes = (pendencias.data ?? []).filter(
    (m) => m.prazo && m.prazo <= emSeteDiasISO,
  ).length;
  const baixasAbertas = (baixasCliente.data ?? []).filter((b) => b.status !== "encerrado").length;
  const itensCaixaEntrada = caixaEntrada.data?.length ?? 0;
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
      <NavItem to="/caixa-entrada" icon={<Inbox className="size-4" />} label="Caixa de entrada" contador={itensCaixaEntrada} tourId="nav-caixa-entrada" />
      <NavItem to="/relatorio" icon={<AlertTriangle className="size-4" />} label="Meus prazos" search={{ aba: "pendencias", advogado: "eu" }} contador={meusPrazosUrgentes} />
      <NavItem to="/calculos" icon={<Calculator className="size-4" />} label="Cálculos" tourId="nav-calculos" />
      <NavItem to="/relatorio" icon={<LineChart className="size-4" />} label="Relatórios" contador={prazosUrgentes} tourId="nav-relatorios" />
      {ehEstagiaria ? null : <NavItem to="/grupos" icon={<Users className="size-4" />} label="Grupos" tourId="nav-grupos" />}
      {ehEstagiaria ? null : <NavItem to="/relatorio" icon={<Archive className="size-4" />} label="Encerramentos" search={{ aba: "encerramento" }} contador={baixasAbertas} tourId="nav-encerramento" />}
      <NavItem to="/publicacoes" icon={<Newspaper className="size-4" />} label="Publicações" tourId="nav-publicacoes" />
      <NavItem to="/citacoes" icon={<Gavel className="size-4" />} label="Citações" tourId="nav-citacoes" />
      {ehEstagiaria ? null : <NavItem to="/importar" icon={<Upload className="size-4" />} label="Importar" tourId="nav-importar" />}
      {ehEstagiaria ? null : <NavItem to="/qualidade-dados" icon={<ShieldCheck className="size-4" />} label="Qualidade dos dados" tourId="nav-qualidade" />}
    </>
  );

  const perfilESair = (
    <div className="flex shrink-0 items-center gap-1 text-slate-700">
      <Link
        to="/perfil"
        aria-label="Meu perfil"
        data-tour="nav-perfil"
        className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-white/60"
        activeProps={{ className: "bg-white/60 font-semibold" }}
      >
        <User className="size-4" /> Perfil
      </Link>
      <Button variant="ghost" size="sm" onClick={sair} className="text-slate-700 hover:bg-white/60 hover:text-slate-900">
        <LogOut className="size-4" /> Sair
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-slate-300/70 bg-slate-300/85 shadow-sm backdrop-blur">
        <div className="hidden h-36 items-center gap-3 px-5 md:flex lg:px-6">
          <Link to="/painel" className="flex shrink-0 items-center gap-2 rounded-lg px-1 py-2">
            <img src="/faro-logo-navy.png" alt="FaroLex" className="h-10 w-auto" />
            <span className="font-serif text-xl font-semibold tracking-tight text-slate-800">FaroLex</span>
          </Link>

          <img
            src="/faro-advogada.jpg"
            alt="FaroLex"
            className="ml-1 size-28 shrink-0 rounded-xl border border-slate-400/60 object-cover object-center shadow-sm"
          />

          <div className="min-w-0 w-full max-w-sm">
            <BuscaGlobal barraSuperior />
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1 text-slate-700">
            <GuiaRapido />
            {perfilESair}
          </div>
        </div>

        <div className="flex min-h-24 flex-wrap items-center gap-2 px-4 py-3 md:hidden">
          <Link to="/painel" className="flex shrink-0 items-center gap-2">
            <img src="/faro-logo-navy.png" alt="FaroLex" className="h-8 w-auto" />
            <span className="font-serif text-lg font-semibold text-slate-800">FaroLex</span>
          </Link>
          <img
            src="/faro-advogada.jpg"
            alt="FaroLex"
            className="size-14 shrink-0 rounded-xl border border-slate-400/60 object-cover object-center shadow-sm"
          />
          <div className="min-w-52 flex-1">
            <BuscaGlobal barraSuperior />
          </div>
          <div className="ml-auto flex items-center gap-1 text-slate-700">
            <GuiaRapido />
            <Link to="/perfil" aria-label="Meu perfil" className="rounded-md p-2 hover:bg-white/60">
              <User className="size-4" />
            </Link>
            <Button variant="ghost" size="icon" onClick={sair} className="text-slate-700 hover:bg-white/60 hover:text-slate-900">
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
        <aside className="hidden h-[calc(100vh-9rem)] flex-col overflow-y-auto border-r border-sidebar-border bg-sidebar pt-3 text-sidebar-foreground lg:sticky lg:top-36 lg:flex">
          <nav className="flex flex-col gap-1 px-3 pb-5 text-sm">{navegacao}</nav>
        </aside>

        <div className="min-w-0">
          <nav className="flex gap-1 overflow-x-auto border-b border-border bg-sidebar px-3 py-3 text-sm text-sidebar-foreground lg:hidden">
            {navegacao}
          </nav>

          <main className="mx-auto min-w-0 max-w-7xl px-4 py-8 sm:px-6">
            <Outlet />
          </main>

          <footer className="border-t border-border py-4 text-center text-xs text-muted-foreground">
            Essa aplicação foi criada por Bárbara Brandão.
          </footer>
        </div>
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
