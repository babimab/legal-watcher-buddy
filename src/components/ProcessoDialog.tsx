import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import {
  STATUS_OPCOES,
  TIPOS_DESDOBRAMENTO,
  UF_OPCOES,
  SOCIOS_CONHECIDOS,
  type Processo,
} from "@/lib/processos";
import { listarGrupos, listarPastas } from "@/lib/grupos";

type Props = {
  processo?: Processo;
  trigger: ReactNode;
  /** Ao criar um desdobramento (recurso, cumprimento de sentença...), id do processo principal. */
  paiId?: string;
  /** Valores para pré-preencher um desdobramento novo (partes, vara, comarca...). */
  iniciais?: Partial<Processo>;
};

export function ProcessoDialog({ processo, trigger, paiId, iniciais }: Props) {
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [grupoId, setGrupoId] = useState<string>("");
  const queryClient = useQueryClient();

  const grupos = useQuery({ queryKey: ["grupos"], queryFn: listarGrupos, enabled: aberto });
  const pastas = useQuery({ queryKey: ["pastas"], queryFn: listarPastas, enabled: aberto });

  const pastaAtualId = processo?.pasta_id ?? iniciais?.pasta_id ?? "";
  const grupoSelecionado =
    grupoId || (pastas.data ?? []).find((p) => p.id === pastaAtualId)?.grupo_id || "";
  const pastasDoGrupo = useMemo(
    () => (pastas.data ?? []).filter((p) => p.grupo_id === grupoSelecionado),
    [pastas.data, grupoSelecionado],
  );

  const salvar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const valor = String(form.get("valor_causa") ?? "")
      .replace(/\./g, "")
      .replace(",", ".");
    const pastaId = String(form.get("pasta_id") ?? "");
    const payload = {
      numero_cnj: String(form.get("numero_cnj") ?? "").trim(),
      cliente: String(form.get("cliente") ?? "").trim(),
      parte_contraria: String(form.get("parte_contraria") ?? "").trim() || null,
      tribunal: String(form.get("tribunal") ?? "").trim() || null,
      vara: String(form.get("vara") ?? "").trim() || null,
      comarca: String(form.get("comarca") ?? "").trim() || null,
      uf: (() => {
        const v = String(form.get("uf") ?? "").trim();
        return v && v !== "nenhum" ? v : null;
      })(),
      classe: String(form.get("classe") ?? "").trim() || null,
      fase: String(form.get("fase") ?? "").trim() || null,
      responsavel: String(form.get("responsavel") ?? "").trim() || null,
      socio: String(form.get("socio") ?? "").trim() || null,
      status: String(form.get("status") ?? "ativo"),
      valor_causa: valor ? Number(valor) : null,
      observacoes: String(form.get("observacoes") ?? "").trim() || null,
      pasta_id: pastaId && pastaId !== "nenhuma" ? pastaId : null,
      ...(paiId && !processo
        ? {
            processo_pai_id: paiId,
            tipo_desdobramento: String(form.get("tipo_desdobramento") ?? "").trim() || null,
          }
        : {}),
    };

    setSalvando(true);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = processo
      ? await supabase.from("processos").update(payload).eq("id", processo.id)
      : await supabase
          .from("processos")
          .insert({ ...payload, created_by: userData.user?.id ?? null });
    setSalvando(false);

    if (error) {
      toast.error(
        error.code === "23505" ? "Já existe um processo com esse número." : error.message,
      );
      return;
    }
    toast.success(processo ? "Processo atualizado." : "Processo cadastrado.");
    await queryClient.invalidateQueries();
    setAberto(false);
  };

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-serif">
            {processo ? "Editar processo" : paiId ? "Novo desdobramento" : "Novo processo"}
          </DialogTitle>
          <DialogDescription>
            Os dados ficam visíveis para toda a equipe do escritório.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={salvar} className="grid gap-4 sm:grid-cols-2">
          {paiId && !processo ? (
            <div className="space-y-2 sm:col-span-2">
              <Label>Tipo de desdobramento</Label>
              <Select name="tipo_desdobramento" defaultValue={TIPOS_DESDOBRAMENTO[0]} required>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_DESDOBRAMENTO.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <Campo
            label="Número CNJ"
            name="numero_cnj"
            required
            defaultValue={processo?.numero_cnj}
            placeholder="0000000-00.0000.0.00.0000"
          />
          <Campo
            label="Cliente"
            name="cliente"
            required
            defaultValue={processo?.cliente ?? iniciais?.cliente ?? ""}
          />
          <Campo
            label="Parte contrária"
            name="parte_contraria"
            defaultValue={processo?.parte_contraria ?? iniciais?.parte_contraria ?? ""}
          />
          <Campo
            label="Tribunal"
            name="tribunal"
            defaultValue={processo?.tribunal ?? iniciais?.tribunal ?? ""}
          />
          <Campo label="Vara" name="vara" defaultValue={processo?.vara ?? iniciais?.vara ?? ""} />
          <Campo
            label="Comarca"
            name="comarca"
            defaultValue={processo?.comarca ?? iniciais?.comarca ?? ""}
          />
          <div className="space-y-2">
            <Label>Estado (UF)</Label>
            <Select name="uf" defaultValue={processo?.uf ?? iniciais?.uf ?? "nenhum"}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nenhum">Não informado</SelectItem>
                {UF_OPCOES.map((u) => (
                  <SelectItem key={u} value={u}>
                    {u}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Campo label="Classe / Assunto" name="classe" defaultValue={processo?.classe ?? ""} />
          <Campo label="Fase" name="fase" defaultValue={processo?.fase ?? ""} />
          <Campo
            label="Advogado responsável"
            name="responsavel"
            defaultValue={processo?.responsavel ?? iniciais?.responsavel ?? ""}
          />
          <div className="space-y-2">
            <Label htmlFor="socio">Sócio</Label>
            <Input
              id="socio"
              name="socio"
              list="socios-sugeridos"
              defaultValue={processo?.socio ?? iniciais?.socio ?? ""}
            />
            <datalist id="socios-sugeridos">
              {SOCIOS_CONHECIDOS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
          <Campo
            label="Valor da causa"
            name="valor_causa"
            defaultValue={processo?.valor_causa != null ? String(processo.valor_causa) : ""}
            placeholder="15000.00"
          />
          <div className="space-y-2">
            <Label>Status</Label>
            <Select name="status" defaultValue={processo?.status ?? "ativo"}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPCOES.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Grupo</Label>
            <Select value={grupoSelecionado} onValueChange={setGrupoId}>
              <SelectTrigger>
                <SelectValue placeholder="Sem grupo" />
              </SelectTrigger>
              <SelectContent>
                {(grupos.data ?? []).map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Pasta</Label>
            <Select
              key={grupoSelecionado || "sem-grupo"}
              name="pasta_id"
              defaultValue={pastaAtualId || "nenhuma"}
              disabled={!grupoSelecionado}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sem pasta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nenhuma">Sem pasta</SelectItem>
                {pastasDoGrupo.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              name="observacoes"
              rows={3}
              defaultValue={processo?.observacoes ?? ""}
            />
          </div>
          <DialogFooter className="sm:col-span-2">
            <Button type="submit" disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Campo({
  label,
  name,
  defaultValue,
  required,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string | undefined;
  required?: boolean | undefined;
  placeholder?: string | undefined;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
      />
    </div>
  );
}
