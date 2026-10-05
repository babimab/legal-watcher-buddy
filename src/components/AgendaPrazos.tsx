import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { exibir, formatarCNJ, type MovimentacaoComProcesso } from "@/lib/processos";

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

// `capitalize` do Tailwind deixa CADA palavra com inicial maiúscula
// ("Outubro De 2026") -- em português só a primeira letra deve ser.
const comInicialMaiuscula = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);

// Cor por tipo de prazo -- os 4 tipos fixos que o "Novo prazo" já usa
// (Prazo/Audiência/Julgamento/Providência interna); qualquer outro texto
// livre cai no cinza padrão.
const COR_TIPO: Record<string, string> = {
  Prazo: "bg-blue-100 text-blue-800 border-blue-200",
  Audiência: "bg-red-100 text-red-800 border-red-200",
  Julgamento: "bg-purple-100 text-purple-800 border-purple-200",
  "Providência interna": "bg-slate-100 text-slate-700 border-slate-200",
};
const corDoTipo = (tipo: string | null) =>
  COR_TIPO[tipo ?? ""] ?? "bg-muted text-foreground border-border";

const MAX_VISIVEL_POR_DIA = 3;

export function AgendaPrazos({ itens }: { itens: MovimentacaoComProcesso[] }) {
  const [mesAtual, setMesAtual] = useState(() => new Date());

  const comPrazo = useMemo(() => itens.filter((m) => m.prazo), [itens]);

  const dias = useMemo(() => {
    const inicio = startOfWeek(startOfMonth(mesAtual), { weekStartsOn: 0 });
    const fim = endOfWeek(endOfMonth(mesAtual), { weekStartsOn: 0 });
    return eachDayOfInterval({ start: inicio, end: fim });
  }, [mesAtual]);

  const porDia = useMemo(() => {
    const mapa = new Map<string, MovimentacaoComProcesso[]>();
    comPrazo.forEach((m) => {
      const chave = m.prazo!;
      if (!mapa.has(chave)) mapa.set(chave, []);
      mapa.get(chave)!.push(m);
    });
    return mapa;
  }, [comPrazo]);

  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-serif text-lg font-semibold">
            {comInicialMaiuscula(format(mesAtual, "MMMM 'de' yyyy", { locale: ptBR }))}
          </h3>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Mês anterior"
              onClick={() => setMesAtual((atual) => subMonths(atual, 1))}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setMesAtual(new Date())}
            >
              Hoje
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Próximo mês"
              onClick={() => setMesAtual((atual) => addMonths(atual, 1))}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-md border bg-border text-xs">
          {DIAS_SEMANA.map((dia) => (
            <div
              key={dia}
              className="bg-muted/40 p-1.5 text-center font-medium text-muted-foreground"
            >
              {dia}
            </div>
          ))}
          {dias.map((dia) => {
            const chave = format(dia, "yyyy-MM-dd");
            const eventosDoDia = porDia.get(chave) ?? [];
            const visiveis = eventosDoDia.slice(0, MAX_VISIVEL_POR_DIA);
            const resto = eventosDoDia.length - visiveis.length;
            return (
              <div
                key={chave}
                className={`min-h-24 space-y-1 bg-card p-1.5 sm:min-h-28 ${
                  isSameMonth(dia, mesAtual) ? "" : "bg-muted/20 text-muted-foreground"
                }`}
              >
                <span
                  className={`inline-flex size-5 items-center justify-center rounded-full text-[11px] ${
                    isToday(dia) ? "bg-primary font-semibold text-primary-foreground" : ""
                  }`}
                >
                  {format(dia, "d")}
                </span>
                <div className="space-y-1">
                  {visiveis.map((m) =>
                    m.processos ? (
                      <Link
                        key={m.id}
                        to="/processos/$id"
                        params={{ id: m.processos.id }}
                        title={`${m.tipo ?? "Prazo"} — ${exibir(m.processos.cliente)} — ${m.descricao}`}
                        className={`block truncate rounded border px-1 py-0.5 leading-tight hover:underline ${corDoTipo(m.tipo)}`}
                      >
                        {exibir(m.processos.cliente)}
                      </Link>
                    ) : (
                      <div
                        key={m.id}
                        title={m.descricao}
                        className={`truncate rounded border px-1 py-0.5 leading-tight ${corDoTipo(m.tipo)}`}
                      >
                        {m.descricao}
                      </div>
                    ),
                  )}
                  {resto > 0 ? (
                    <div className="px-1 text-[11px] text-muted-foreground">+{resto} mais</div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        <DetalhesDoDia dias={dias} porDia={porDia} mesAtual={mesAtual} />
      </CardContent>
    </Card>
  );
}

// Lista por extenso dos dias do mês atual que têm algo marcado -- a grade
// é boa pra enxergar acúmulo, mas pra ler o conteúdo (cliente, parte,
// link do processo, número CNJ) é mais fácil numa lista abaixo dela.
function DetalhesDoDia({
  dias,
  porDia,
  mesAtual,
}: {
  dias: Date[];
  porDia: Map<string, MovimentacaoComProcesso[]>;
  mesAtual: Date;
}) {
  const diasComEvento = dias.filter(
    (d) => isSameMonth(d, mesAtual) && (porDia.get(format(d, "yyyy-MM-dd")) ?? []).length > 0,
  );
  if (diasComEvento.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum prazo nesse mês.</p>;
  }
  return (
    <ol className="space-y-3 border-t pt-3">
      {diasComEvento.map((dia) => {
        const chave = format(dia, "yyyy-MM-dd");
        const eventos = porDia.get(chave) ?? [];
        return (
          <li key={chave}>
            <p className="text-sm font-semibold">
              {comInicialMaiuscula(format(dia, "EEEE, d 'de' MMMM", { locale: ptBR }))}
            </p>
            <ul className="mt-1 space-y-1">
              {eventos.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge variant="outline" className={corDoTipo(m.tipo)}>
                    {m.tipo ?? "Prazo"}
                  </Badge>
                  {m.processos ? (
                    <Link
                      to="/processos/$id"
                      params={{ id: m.processos.id }}
                      className="font-mono text-xs underline-offset-4 hover:underline"
                    >
                      {formatarCNJ(m.processos.numero_cnj)}
                    </Link>
                  ) : null}
                  <span className="font-medium">{exibir(m.processos?.cliente)}</span>
                  <span className="text-muted-foreground">{m.descricao}</span>
                  {isSameDay(dia, new Date()) ? <Badge>Hoje</Badge> : null}
                </li>
              ))}
            </ul>
          </li>
        );
      })}
    </ol>
  );
}
