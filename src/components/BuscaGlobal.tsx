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

type BuscaGlobalProps = {
  compacta?: boolean;
  atalhoTeclado?: boolean;
};

export function BuscaGlobal({ compacta = false, atalhoTeclado = true }: BuscaGlobalProps) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const navigate = useNavigate();

  const processos = useQuery({ queryKey: ["processos"], queryFn: listarProcessos });

  useEffect(() => {
    if (!atalhoTeclado) return;
    const ouvinte = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setAberto((v) => !v);
      }
    };
    document.addEventListener("keydown", ouvinte);
    return () => document.removeEventListener("keydown", ouvinte);
  }, [atalhoTeclado]);

  const resultados = useMemo(() => {
    const termo = normalizar(busca.trim());
    const compacto = termo.replace(/\s+/g, "");
    const digitos = busca.replace(/\D/g, "");
    const todos = processos.data ?? [];
    if (!termo) return todos.slice(0, LIMITE_RESULTADOS);
    return todos
      .filter((p) => {
        if (digitos.length >= 4 && p.numero_cnj.replace(/\D/g, "").includes(digitos)) return true;
        const interno = (p.numero_interno ?? "").replace(/\s+/g, "").toLowerCase();
        const numCliente = (p.numero_cliente ?? "").replace(/\s+/g, "").toLowerCase();
        if (compacto.includes("/")) {
          const [tc, ti] = compacto.split("/");
          if (`${numCliente}/${interno}`.includes(compacto)) return true;
          if ((!tc || numCliente.includes(tc)) && (!ti || interno.includes(ti))) return true;
        }
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
        data-tour="nav-busca"
        className={
          compacta
            ? "flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar-accent/30 px-2.5 py-2 text-left transition-colors hover:bg-sidebar-accent"
            : "flex items-center gap-2 rounded-md border border-sidebar-border px-3 py-1.5 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent"
        }
      >
        <Search className="size-4 shrink-0" />
        {compacta ? (
          <span className="min-w-0">
            <span className="block text-sm font-medium leading-tight">Buscar processo</span>
            <span className="mt-0.5 block truncate text-[11px] leading-tight text-sidebar-foreground/60">
              Número, parte ou Cliente/Caso
            </span>
          </span>
        ) : (
          <>
            Buscar
            <kbd className="ml-2 rounded border border-current/30 px-1.5 py-0.5 text-xs opacity-70">
              Ctrl K
            </kbd>
          </>
        )}
      </button>
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="overflow-hidden p-0">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Buscar por CNJ, cliente, parte, caso ou Cliente/Caso (ex. 4608/2482)..."
              value={busca}
              onValueChange={setBusca}
            />
            <CommandList>
              <CommandEmpty>Nenhum processo encontrado.</CommandEmpty>
              <CommandGroup heading="Processos">
                {resultados.map((p) => {
                  const interno = p.numero_interno?.trim();
                  const numCliente = p.numero_cliente?.trim();
                  const identificador =
                    numCliente && interno
                      ? `Cliente/Caso: ${numCliente}/${interno}`
                      : interno
                        ? `Caso: ${interno}`
                        : numCliente
                          ? `Nº do cliente: ${numCliente}`
                          : null;
                  return (
                    <CommandItem key={p.id} value={p.id} onSelect={() => ir(p.id)}>
                      <div className="flex flex-col">
                        <span className="font-mono text-xs">{formatarCNJ(p.numero_cnj)}</span>
                        <span className="text-sm">
                          {exibir(p.cliente)}
                          {p.parte_contraria ? ` x ${p.parte_contraria}` : ""}
                        </span>
                        {identificador ? (
                          <span className="text-xs text-muted-foreground">{identificador}</span>
                        ) : null}
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
