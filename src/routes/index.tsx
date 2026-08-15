import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarClock, FolderKanban, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FaroLex — acompanhamento de processos do escritório" },
      {
        name: "description",
        content:
          "Cadastre os processos do escritório, registre movimentações e receba o resumo do que mudou desde a última verificação.",
      },
      { property: "og:title", content: "FaroLex" },
      {
        property: "og:description",
        content:
          "Cadastre os processos do escritório, registre movimentações e veja o que mudou a cada verificação.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-secondary">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-6">
        <img src="/faro-logo-navy.png" alt="FaroLex" className="h-9 w-auto" />
        <Button asChild size="sm">
          <Link to="/auth">Entrar</Link>
        </Button>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-20 pt-4">
        <img
          src="/faro-capa.jpg"
          alt="FaroLex — acompanhamento processual"
          className="w-full rounded-xl border border-border shadow-sm"
        />

        <h1 className="mt-12 max-w-2xl font-serif text-4xl font-semibold leading-tight sm:text-5xl">
          O faro certo para cada processo do escritório.
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted-foreground">
          Cadastre a carteira, registre as movimentações e rode o relatório quando quiser: o sistema
          mostra exatamente o que mudou desde a última verificação e quais prazos estão em aberto.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/auth">Começar agora</Link>
          </Button>
        </div>

        <section className="mt-16 grid gap-6 sm:grid-cols-3">
          <Recurso
            icon={<FolderKanban className="size-5 text-primary" />}
            titulo="Carteira compartilhada"
            texto="Toda a equipe vê e edita os mesmos processos, com cliente, tribunal, vara e responsável."
          />
          <Recurso
            icon={<CalendarClock className="size-5 text-primary" />}
            titulo="Relatório de novidades"
            texto="Um clique mostra as movimentações registradas desde a última checagem e os prazos pendentes."
          />
          <Recurso
            icon={<Upload className="size-5 text-primary" />}
            titulo="Importação da planilha"
            texto="Suba seu CSV atual e a carteira nasce pronta, sem redigitar processo por processo."
          />
        </section>
      </main>
    </div>
  );
}

function Recurso({
  icon,
  titulo,
  texto,
}: {
  icon: React.ReactNode;
  titulo: string;
  texto: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      {icon}
      <h2 className="mt-3 font-serif text-lg font-semibold">{titulo}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{texto}</p>
    </div>
  );
}
