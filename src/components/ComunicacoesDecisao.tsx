import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, FileSignature, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  atualizarComunicacao,
  excluirComunicacao,
  gerarComunicacaoDecisao,
  listarComunicacoes,
  salvarComunicacao,
  type ComunicacaoDecisao,
} from "@/lib/comunicacoes";

export function ComunicacoesDecisao({ processoId }: { processoId: string }) {
  const queryClient = useQueryClient();
  const [gerando, setGerando] = useState(false);
  const [rascunho, setRascunho] = useState<{ texto: string; nomeArquivo: string } | null>(null);
  const [salvando, setSalvando] = useState(false);

  const comunicacoes = useQuery({
    queryKey: ["comunicacoes-decisao", processoId],
    queryFn: () => listarComunicacoes(processoId),
  });

  const excluir = useMutation({
    mutationFn: (id: string) => excluirComunicacao(id),
    onSuccess: async () => {
      toast.success("Comunicação excluída.");
      await queryClient.invalidateQueries({ queryKey: ["comunicacoes-decisao", processoId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const gerar = async (arquivo: File) => {
    setGerando(true);
    try {
      const texto = await gerarComunicacaoDecisao(arquivo);
      setRascunho({ texto, nomeArquivo: arquivo.name });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao gerar a comunicação.");
    } finally {
      setGerando(false);
    }
  };

  const salvarRascunho = async () => {
    if (!rascunho) return;
    setSalvando(true);
    try {
      await salvarComunicacao(processoId, rascunho.texto, rascunho.nomeArquivo);
      setRascunho(null);
      toast.success("Comunicação salva.");
      await queryClient.invalidateQueries({ queryKey: ["comunicacoes-decisao", processoId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar.");
    } finally {
      setSalvando(false);
    }
  };

  const copiar = async (texto: string) => {
    await navigator.clipboard.writeText(texto);
    toast.success("Copiado.");
  };

  const lista = comunicacoes.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-serif text-lg">
          <FileSignature className="size-4" /> Comunicação de decisão (E-law)
        </CardTitle>
        <CardDescription>
          Sobe o PDF da sentença/acórdão/decisão e a IA gera o texto pronto pra cadastrar no E-law,
          já linkado neste processo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Input
            type="file"
            accept="application/pdf"
            disabled={gerando}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void gerar(f);
              e.target.value = "";
            }}
          />
          {gerando ? (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Sparkles className="size-3.5 animate-pulse" /> Gerando...
            </span>
          ) : null}
        </div>

        {rascunho ? (
          <div className="space-y-2 rounded-lg border border-primary/40 bg-primary/5 p-3">
            <p className="text-xs text-muted-foreground">
              Gerado a partir de "{rascunho.nomeArquivo}" — revise antes de salvar.
            </p>
            <Textarea
              value={rascunho.texto}
              onChange={(e) => setRascunho({ ...rascunho, texto: e.target.value })}
              rows={14}
              className="font-mono text-sm"
            />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" disabled={salvando} onClick={() => void salvarRascunho()}>
                {salvando ? "Salvando..." : "Salvar"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => void copiar(rascunho.texto)}>
                <Copy className="size-4" /> Copiar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setRascunho(null)}>
                Descartar
              </Button>
            </div>
          </div>
        ) : null}

        {comunicacoes.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : lista.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma comunicação salva ainda.</p>
        ) : (
          <ul className="space-y-2">
            {lista.map((c) => (
              <ComunicacaoItem
                key={c.id}
                comunicacao={c}
                onExcluir={() => excluir.mutate(c.id)}
                onCopiar={() => void copiar(c.texto)}
                onSalvarEdicao={async (texto) => {
                  await atualizarComunicacao(c.id, texto);
                  toast.success("Comunicação atualizada.");
                  await queryClient.invalidateQueries({
                    queryKey: ["comunicacoes-decisao", processoId],
                  });
                }}
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ComunicacaoItem({
  comunicacao,
  onExcluir,
  onCopiar,
  onSalvarEdicao,
}: {
  comunicacao: ComunicacaoDecisao;
  onExcluir: () => void;
  onCopiar: () => void;
  onSalvarEdicao: (texto: string) => Promise<void>;
}) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(comunicacao.texto);
  const [salvando, setSalvando] = useState(false);

  return (
    <li className="rounded-lg border border-border p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {comunicacao.nome_arquivo_origem ? `${comunicacao.nome_arquivo_origem} · ` : ""}
          {new Date(comunicacao.created_at).toLocaleDateString("pt-BR")}
        </span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" aria-label="Copiar" onClick={onCopiar}>
            <Copy className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setTexto(comunicacao.texto);
              setEditando((v) => !v);
            }}
          >
            {editando ? "Cancelar" : "Editar"}
          </Button>
          <Button variant="ghost" size="icon" aria-label="Excluir" onClick={onExcluir}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
      {editando ? (
        <div className="space-y-2">
          <Textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={12}
            className="font-mono text-sm"
          />
          <Button
            size="sm"
            disabled={salvando}
            onClick={async () => {
              setSalvando(true);
              await onSalvarEdicao(texto);
              setSalvando(false);
              setEditando(false);
            }}
          >
            {salvando ? "Salvando..." : "Salvar edição"}
          </Button>
        </div>
      ) : (
        <p className="whitespace-pre-wrap text-sm">{comunicacao.texto}</p>
      )}
    </li>
  );
}
