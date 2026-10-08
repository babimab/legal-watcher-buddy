import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabaseSolto } from "@/lib/supabase-solto";
import {
  FASE_OPCOES,
  RESULTADOS_PROCESSO,
  siglaOuEmailAtual,
  listarDesdobramentos,
  formatarCNJ,
  type Processo,
} from "@/lib/processos";

type ProcessoComResultado = Processo & { resultado_encerramento?: string | null };

export function EncerramentoDialog({
  processo,
  descricao = "Preenche o que a Eliane precisa pra dar baixa nesse processo.",
  mostrarDecisoesNoLd = true,
}: {
  processo: Processo;
  descricao?: string | undefined;
  mostrarDecisoesNoLd?: boolean;
}) {
  const processoComResultado = processo as ProcessoComResultado;
  const [aberto, setAberto] = useState(false);
  const [pronto, setPronto] = useState(processo.pronto_para_encerrar);
  const [decisoesNoLd, setDecisoesNoLd] = useState(processo.decisoes_no_ld);
  const [salvando, setSalvando] = useState(false);
  const [encerrando, setEncerrando] = useState(false);
  const [desdobramentosAtivos, setDesdobramentosAtivos] = useState<Processo[] | null>(null);
  const queryClient = useQueryClient();

  // Muda o status pra "encerrado" e cria a pendência de baixa no sistema
  // do cliente (aba "Baixa no cliente pendente") -- aplica no processo e,
  // se a pessoa confirmou, em todos os desdobramentos vinculados junto
  // (ids extras só vêm preenchidos depois da confirmação em
  // desdobramentosAtivos).
  const marcarEncerrado = async (idsExtras: string[] = []) => {
    setEncerrando(true);
    const { error } = await supabaseSolto
      .from("processos")
      .update({ status: "encerrado", baixa_cliente_pendente: true })
      .in("id", [processo.id, ...idsExtras]);
    setEncerrando(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(
      idsExtras.length > 0
        ? `Processo e ${idsExtras.length} desdobramento(s) marcados como encerrados.`
        : "Processo marcado como encerrado — foi pra fila de baixa no cliente.",
    );
    await queryClient.invalidateQueries();
    setDesdobramentosAtivos(null);
    setAberto(false);
  };

  // Antes de encerrar, checa se tem desdobramento ainda ativo vinculado --
  // se tiver, pede confirmação pra encerrar tudo junto (em vez de deixar o
  // desdobramento esquecido como "ativo" depois do processo principal
  // fechado).
  const iniciarEncerramento = async () => {
    setEncerrando(true);
    try {
      const filhos = await listarDesdobramentos(processo.id);
      const ativos = filhos.filter((f) => f.status !== "encerrado");
      if (ativos.length > 0) {
        setDesdobramentosAtivos(ativos);
      } else {
        await marcarEncerrado();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não consegui checar os desdobramentos.");
    } finally {
      setEncerrando(false);
    }
  };

  const salvar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const valorRaw = String(form.get("valor_encerramento") ?? "")
      .replace(/\./g, "")
      .replace(",", ".");
    const resultadoRaw = String(form.get("resultado_encerramento") ?? "");
    const faseRaw = String(form.get("fase") ?? "");
    setSalvando(true);
    // Só recarimba quem/quando quando o valor do checkbox de fato muda --
    // reabrir e salvar de novo com "Decisões no LD" já marcada não deve
    // apagar o carimbo de quem checou primeiro.
    const carimboDecisoesNoLd =
      decisoesNoLd === processo.decisoes_no_ld
        ? {}
        : decisoesNoLd
          ? {
              decisoes_no_ld_por: await siglaOuEmailAtual(),
              decisoes_no_ld_em: new Date().toISOString(),
            }
          : { decisoes_no_ld_por: null, decisoes_no_ld_em: null };
    const { error } = await supabaseSolto
      .from("processos")
      .update({
        pronto_para_encerrar: pronto,
        decisoes_no_ld: decisoesNoLd,
        ...carimboDecisoesNoLd,
        valor_encerramento: valorRaw ? Number(valorRaw) : null,
        resultado_encerramento: resultadoRaw === "nao-informado" ? null : resultadoRaw || null,
        observacao_encerramento: String(form.get("observacao_encerramento") ?? "").trim() || null,
        fase: faseRaw === "nenhuma" ? null : faseRaw || null,
      })
      .eq("id", processo.id);
    setSalvando(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Dados de encerramento salvos.");
    await queryClient.invalidateQueries();
    setAberto(false);
  };

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant={processo.pronto_para_encerrar ? "default" : "outline"}
          size="sm"
        >
          {processo.pronto_para_encerrar ? "Pronto pra encerrar" : "Encerramento"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-serif">Dados de encerramento</DialogTitle>
          <DialogDescription>{descricao}</DialogDescription>
        </DialogHeader>
        <form onSubmit={salvar} className="space-y-4">
          <div className="space-y-2">
            <Label>Fase</Label>
            <Select name="fase" defaultValue={processo.fase ?? "nenhuma"}>
              <SelectTrigger>
                <SelectValue placeholder="Fase" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nenhuma">Não informada</SelectItem>
                {FASE_OPCOES.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="pronto" checked={pronto} onCheckedChange={(v) => setPronto(v === true)} />
            <Label htmlFor="pronto">Pronto para encerrar</Label>
          </div>
          {mostrarDecisoesNoLd ? (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="decisoes_no_ld"
                  checked={decisoesNoLd}
                  onCheckedChange={(v) => setDecisoesNoLd(v === true)}
                />
                <Label htmlFor="decisoes_no_ld">Preenchida Decisões no LD</Label>
              </div>
              {processo.decisoes_no_ld_por ? (
                <p className="pl-6 text-xs text-muted-foreground">
                  Checado por {processo.decisoes_no_ld_por}
                  {processo.decisoes_no_ld_em
                    ? ` em ${new Date(processo.decisoes_no_ld_em).toLocaleDateString("pt-BR")}`
                    : ""}
                </p>
              ) : null}
            </div>
          ) : null}
          <div className="space-y-2">
            <Label>Resultado do processo</Label>
            <Select
              name="resultado_encerramento"
              defaultValue={processoComResultado.resultado_encerramento ?? "nao-informado"}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o resultado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nao-informado">Não informado</SelectItem>
                {RESULTADOS_PROCESSO.map((resultado) => (
                  <SelectItem key={resultado} value={resultado}>
                    {resultado}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="valor_encerramento">Valor</Label>
            <Input
              id="valor_encerramento"
              name="valor_encerramento"
              placeholder="0,00"
              defaultValue={
                processo.valor_encerramento != null
                  ? processo.valor_encerramento.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                    })
                  : ""
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="observacao_encerramento">Observação</Label>
            <Textarea
              id="observacao_encerramento"
              name="observacao_encerramento"
              rows={3}
              defaultValue={processo.observacao_encerramento ?? ""}
            />
          </div>
          <DialogFooter className="sm:justify-between">
            {processo.status !== "encerrado" ? (
              <Button
                type="button"
                variant="outline"
                disabled={encerrando || salvando}
                onClick={() => void iniciarEncerramento()}
              >
                {encerrando ? "Marcando..." : "Marcar como encerrado"}
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">Já está com status encerrado.</p>
            )}
            <Button type="submit" disabled={salvando || encerrando}>
              {salvando ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      <AlertDialog
        open={desdobramentosAtivos != null}
        onOpenChange={(v) => !v && setDesdobramentosAtivos(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Encerrar os desdobramentos junto?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  Esse processo tem {desdobramentosAtivos?.length} desdobramento(s) ainda ativo(s),
                  vinculado(s) a ele:
                </p>
                <ul className="list-disc pl-5">
                  {(desdobramentosAtivos ?? []).map((d) => (
                    <li key={d.id}>
                      {formatarCNJ(d.numero_cnj)}
                      {d.tipo_desdobramento ? ` — ${d.tipo_desdobramento}` : ""}
                    </li>
                  ))}
                </ul>
                <p>Confirma encerrar o processo principal e todos esses desdobramentos juntos?</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void marcarEncerrado((desdobramentosAtivos ?? []).map((d) => d.id))}
            >
              Encerrar todos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
