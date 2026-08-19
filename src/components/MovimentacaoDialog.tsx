import { useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { supabaseSolto } from "@/lib/supabase-solto";
import { FASE_OPCOES, TIPOS_MOVIMENTACAO, type Movimentacao } from "@/lib/processos";

type MovimentacaoComFase = Movimentacao & {
  fase_anterior?: string | null;
  fase_nova?: string | null;
};

export function MovimentacaoDialog({
  processoId,
  trigger,
  movimentacao,
  faseAtual,
}: {
  processoId: string;
  trigger: ReactNode;
  /** Quando informada, o dialog vira edição dessa movimentação em vez de criar uma nova. */
  movimentacao?: MovimentacaoComFase;
  /** Fase atualmente salva no processo. */
  faseAtual?: string | null;
}) {
  const editando = !!movimentacao;
  const [aberto, setAberto] = useState(false);
  const [exigeAcao, setExigeAcao] = useState(movimentacao?.exige_acao ?? false);
  const [salvando, setSalvando] = useState(false);
  const queryClient = useQueryClient();

  const salvar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setSalvando(true);
    const prazo = String(form.get("prazo") ?? "");
    const faseEscolhida = String(form.get("fase_processual") ?? "manter");
    const atualizarFase = faseEscolhida !== "manter" && faseEscolhida !== (faseAtual ?? "");

    const dadosBase = {
      data_movimentacao: String(form.get("data_movimentacao") ?? ""),
      descricao: String(form.get("descricao") ?? "").trim(),
      tipo: String(form.get("tipo") ?? "") || null,
      exige_acao: exigeAcao,
      prazo: prazo || null,
    };
    const dados = {
      ...dadosBase,
      ...(atualizarFase
        ? { fase_anterior: faseAtual ?? null, fase_nova: faseEscolhida }
        : {}),
    };

    let movimentacaoCriadaId: string | null = null;
    const resultado = editando
      ? await supabaseSolto.from("movimentacoes").update(dados).eq("id", movimentacao.id)
      : await (async () => {
          const { data: userData } = await supabase.auth.getUser();
          const resposta = await supabaseSolto
            .from("movimentacoes")
            .insert({ ...dados, processo_id: processoId, created_by: userData.user?.id ?? null })
            .select("id")
            .single();
          movimentacaoCriadaId = resposta.data?.id ?? null;
          return resposta;
        })();

    if (resultado.error) {
      setSalvando(false);
      toast.error(resultado.error.message);
      return;
    }

    const atualizacaoProcesso = {
      ...(!editando ? { ultima_verificacao_em: new Date().toISOString() } : {}),
      ...(atualizarFase ? { fase: faseEscolhida } : {}),
    };

    if (Object.keys(atualizacaoProcesso).length > 0) {
      const { error: erroProcesso } = await supabase
        .from("processos")
        .update(atualizacaoProcesso)
        .eq("id", processoId);

      if (erroProcesso) {
        // Mantém processo e movimentação coerentes se a segunda gravação falhar.
        if (!editando && movimentacaoCriadaId) {
          await supabaseSolto.from("movimentacoes").delete().eq("id", movimentacaoCriadaId);
        } else if (editando && movimentacao) {
          await supabaseSolto
            .from("movimentacoes")
            .update({
              data_movimentacao: movimentacao.data_movimentacao,
              descricao: movimentacao.descricao,
              tipo: movimentacao.tipo,
              exige_acao: movimentacao.exige_acao,
              prazo: movimentacao.prazo,
              fase_anterior: movimentacao.fase_anterior ?? null,
              fase_nova: movimentacao.fase_nova ?? null,
            })
            .eq("id", movimentacao.id);
        }
        setSalvando(false);
        toast.error(`Não foi possível atualizar o processo: ${erroProcesso.message}`);
        return;
      }
    }

    setSalvando(false);
    toast.success(
      atualizarFase
        ? `${editando ? "Movimentação atualizada" : "Movimentação registrada"} e fase alterada para ${faseEscolhida}.`
        : editando
          ? "Movimentação atualizada."
          : "Movimentação registrada.",
    );
    await queryClient.invalidateQueries();
    if (!editando) setExigeAcao(false);
    setAberto(false);
  };

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-serif">
            {editando ? "Editar movimentação" : "Nova movimentação"}
          </DialogTitle>
          <DialogDescription>
            {editando
              ? "Corrija os dados do andamento e, se necessário, atualize também a fase processual."
              : "Registre o andamento e, se ele mudar a etapa do processo, atualize a fase na mesma tela."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={salvar} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="data_movimentacao">Data</Label>
              <Input
                id="data_movimentacao"
                name="data_movimentacao"
                type="date"
                required
                defaultValue={
                  movimentacao?.data_movimentacao ?? new Date().toISOString().slice(0, 10)
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select name="tipo" defaultValue={movimentacao?.tipo ?? "Despacho"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_MOVIMENTACAO.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              name="descricao"
              rows={4}
              required
              defaultValue={movimentacao?.descricao}
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="exige_acao"
              checked={exigeAcao}
              onCheckedChange={(v) => setExigeAcao(v === true)}
            />
            <Label htmlFor="exige_acao">Exige providência minha</Label>
          </div>
          {exigeAcao ? (
            <div className="space-y-2">
              <Label htmlFor="prazo">Prazo</Label>
              <Input id="prazo" name="prazo" type="date" defaultValue={movimentacao?.prazo ?? ""} />
            </div>
          ) : null}
          <div className="space-y-2">
            <Label>Atualizar fase processual</Label>
            <Select name="fase_processual" defaultValue="manter">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manter">
                  {faseAtual ? `Manter fase atual (${faseAtual})` : "Manter fase atual"}
                </SelectItem>
                {FASE_OPCOES.map((fase) => (
                  <SelectItem key={fase} value={fase}>
                    {fase}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Opcional. Se escolher uma fase, ela também será atualizada no cadastro do processo.
            </p>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={salvando}>
              {salvando ? "Salvando..." : editando ? "Salvar" : "Registrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
