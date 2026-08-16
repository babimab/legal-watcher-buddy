import { useEffect, useState } from "react";
import { HelpCircle, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type Passo = { alvo: string; titulo: string; texto: string };

const PASSOS: Passo[] = [
  {
    alvo: "nav-painel",
    titulo: "Painel",
    texto: "Resumo geral: prazos vencendo, andamentos não validados e valor em causa.",
  },
  {
    alvo: "nav-clientes",
    titulo: "Painéis de equipe",
    texto:
      "Equipe Souza Cruz e Equipe Astro (aqui do lado) — cada um mostra as pastas por advogado daquela equipe, com um botão pra exportar a planilha direto. Dentro de cada um também tem um atalho pra gerenciar quem faz parte da equipe.",
  },
  {
    alvo: "nav-meus-processos",
    titulo: "Meus processos",
    texto: "Só os processos que são seus, puxados pela sua sigla cadastrada no perfil.",
  },
  {
    alvo: "nav-todos-processos",
    titulo: "Todos os processos",
    texto: "A carteira inteira do escritório, com filtros por status, fase, cliente, advogado etc.",
  },
  {
    alvo: "nav-relatorios",
    titulo: "Relatórios",
    texto:
      "Andamentos novos e prazos pendentes. É aqui também que se valida os andamentos sugeridos pela aba de Publicações.",
  },
  {
    alvo: "nav-grupos",
    titulo: "Grupos",
    texto: "Libera acesso a pastas e clientes pra quem precisar — é aqui que se gerencia a equipe.",
  },
  {
    alvo: "nav-encerramento",
    titulo: "Encerramento",
    texto: "Revisão dos processos prontos pra fechar, com valor e observação pra Eliane.",
  },
  {
    alvo: "nav-publicacoes",
    titulo: "Publicações",
    texto: "Sobe a planilha de publicações do TI e o sistema já sugere os andamentos novos.",
  },
  {
    alvo: "nav-importar",
    titulo: "Importar",
    texto: "Sobe uma planilha de andamentos pra cadastrar vários processos de uma vez.",
  },
  {
    alvo: "nav-busca",
    titulo: "Busca rápida",
    texto: "Ctrl+K (ou Cmd+K) em qualquer tela abre essa busca pra achar um processo na hora.",
  },
  {
    alvo: "nav-perfil",
    titulo: "Perfil",
    texto: 'Seus dados — a sigla é o que liga os processos a você em "Meus processos".',
  },
];

// Guardado por usuário (não só por navegador): se a estagiária troca de
// conta num computador compartilhado do escritório, o guia aparece de
// novo pra ela, mesmo que outra pessoa já tenha visto nesse mesmo PC.
const CHAVE_VISTO_PREFIXO = "farolex_guia_visto_";

export function GuiaRapido() {
  const [aberto, setAberto] = useState(false);
  const [passo, setPasso] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [chaveVisto, setChaveVisto] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      const chave = `${CHAVE_VISTO_PREFIXO}${data.user.id}`;
      setChaveVisto(chave);
      if (!localStorage.getItem(chave)) setAberto(true);
    });
  }, []);

  useEffect(() => {
    if (!aberto) return;
    const atualizar = () => {
      const el = document.querySelector(`[data-tour="${PASSOS[passo]!.alvo}"]`);
      setRect(el ? el.getBoundingClientRect() : null);
    };
    atualizar();
    window.addEventListener("resize", atualizar);
    window.addEventListener("scroll", atualizar, true);
    return () => {
      window.removeEventListener("resize", atualizar);
      window.removeEventListener("scroll", atualizar, true);
    };
  }, [aberto, passo]);

  const encerrar = () => {
    setAberto(false);
    setPasso(0);
    if (chaveVisto) localStorage.setItem(chaveVisto, "1");
  };

  const abrirDoInicio = () => {
    setPasso(0);
    setAberto(true);
  };

  const proximo = () => {
    if (passo >= PASSOS.length - 1) {
      encerrar();
      return;
    }
    setPasso((p) => p + 1);
  };

  const anterior = () => setPasso((p) => Math.max(0, p - 1));

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={abrirDoInicio}
        aria-label="Guia rápido"
        title="Guia rápido"
        className="flex items-center gap-1 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent"
      >
        <HelpCircle className="size-4" />
      </button>
    );
  }

  const atual = PASSOS[passo]!;
  const top = rect ? rect.bottom + 10 : 80;
  const left = rect ? Math.max(8, Math.min(rect.left, window.innerWidth - 328)) : 20;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={encerrar} />
      {rect ? (
        <div
          className="pointer-events-none fixed z-50 rounded-md ring-2 ring-primary ring-offset-2"
          style={{
            top: rect.top - 4,
            left: rect.left - 4,
            width: rect.width + 8,
            height: rect.height + 8,
          }}
        />
      ) : null}
      <div
        className="fixed z-50 w-80 rounded-lg border border-border bg-popover p-4 text-popover-foreground shadow-lg"
        style={{ top, left }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-serif text-base font-semibold">{atual.titulo}</h3>
          <button
            type="button"
            onClick={encerrar}
            aria-label="Fechar guia"
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{atual.texto}</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {passo + 1} / {PASSOS.length}
          </span>
          <div className="flex gap-2">
            {passo > 0 ? (
              <Button type="button" size="sm" variant="outline" onClick={anterior}>
                Anterior
              </Button>
            ) : null}
            <Button type="button" size="sm" onClick={proximo}>
              {passo >= PASSOS.length - 1 ? "Concluir" : "Próximo"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
