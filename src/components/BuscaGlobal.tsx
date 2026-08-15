import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { exibir, formatarCNJ, listarProcessos } from "@/lib/processos";

const LIMITE_RESULTADOS = 30;

function normalizar(texto: string) {
  return texto.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function BuscaGlobal() {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const navigate = useNavigate();

  const processos = useQuery({ queryKey: ["processos"], queryFn: listarProcessos });

  useEffect(() => {
    const ouvinte = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setAberto((v) => !v);
      }
    };
    document.addEventListener("keydown", ouvinte);
    return () => document.removeEventListener("keydown", ouvinte);
  }, []);

  const resultados = useMemo(() => {
    const termo = normalizar(busca.trim());
    const digitos = busca.replace(/\D/g, "");
    const todos = processos.data ?? [];
    if (!termo) return todos.slice(0, LIMITE_RESULTADOS);
    return todos
      .filter((p) => {
        if (digitos.length >= 4 && p.numero_cnj.replace(/\D/g, "").includes(digitos)) return true;
        const campos = [
          p.cliente,
          p.parte_contraria,
          p.autor,
          p.reu,
          p.numero_interno,
          p.numero_cliente,
        ];
        return campos.some((c) => c && normalizar(c).includes(termo));
      })
      .slice(0, LIMITE_RESULTADOS);
  }, [busca, processos.data]);

  const ir = (id: string) => {
    setAberto(false);
    setBusca("");
    navigate({ to: "/processos/$id", params: { id } });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="flex items-center gap-2 rounded-md border border-sidebar-border px-3 py-1.5 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent"
      >
        <Search className="size-4" />
        Buscar
        <kbd className="ml-2 rounded border border-current/30 px-1.5 py-0.5 text-xs opacity-70">
          Ctrl K
        </kbd>
      </button>
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="overflow-hidden p-0">
          {/* A gente já filtra os processos na mão (CNJ/cliente/parte), então
          desliga o filtro fuzzy embutido do cmdk — ele compararia o texto
          digitado contra o "value" do item, que aqui é só o id. */}
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Buscar por número CNJ, cliente ou parte..."
              value={busca}
              onValueChange={setBusca}
            />
            <CommandList>
              <CommandEmpty>Nenhum processo encontrado.</CommandEmpty>
              <CommandGroup heading="Processos">
                {resultados.map((p) => (
                  <CommandItem key={p.id} value={p.id} onSelect={() => ir(p.id)}>
                    <div className="flex flex-col">
                      <span className="font-mono text-xs">{formatarCNJ(p.numero_cnj)}</span>
                      <span className="text-sm">
                        {exibir(p.cliente)}
                        {p.parte_contraria ? ` x ${p.parte_contraria}` : ""}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
