import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileText, Paperclip, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  baixarDocumento,
  enviarDocumento,
  excluirDocumento,
  listarDocumentos,
  type Documento,
} from "@/lib/documentos";

function formatarTamanho(bytes: number | null) {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentosProcesso({ processoId }: { processoId: string }) {
  const queryClient = useQueryClient();
  const [enviando, setEnviando] = useState(false);

  const documentos = useQuery({
    queryKey: ["documentos", processoId],
    queryFn: () => listarDocumentos(processoId),
  });

  const excluir = useMutation({
    mutationFn: (doc: Documento) => excluirDocumento(doc),
    onSuccess: async () => {
      toast.success("Documento excluído.");
      await queryClient.invalidateQueries({ queryKey: ["documentos", processoId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const enviar = async (arquivo: File) => {
    setEnviando(true);
    try {
      await enviarDocumento(processoId, arquivo);
      toast.success("Documento anexado.");
      await queryClient.invalidateQueries({ queryKey: ["documentos", processoId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao anexar o documento.");
    } finally {
      setEnviando(false);
    }
  };

  const abrir = async (doc: Documento) => {
    try {
      await baixarDocumento(doc);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao abrir o documento.");
    }
  };

  const lista = documentos.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-serif text-lg">
          <Paperclip className="size-4" /> Documentos
        </CardTitle>
        <CardDescription>
          Petições, decisões e outros arquivos deste processo — visíveis pra quem já pode ver o
          processo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Input
            type="file"
            disabled={enviando}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void enviar(f);
              e.target.value = "";
            }}
          />
          {enviando ? (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Upload className="size-3.5 animate-pulse" /> Enviando...
            </span>
          ) : null}
        </div>

        {documentos.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : lista.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum documento anexado ainda.</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {lista.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <button
                  type="button"
                  onClick={() => abrir(doc)}
                  className="flex min-w-0 items-center gap-2 text-left hover:underline"
                >
                  <FileText className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{doc.nome_arquivo}</span>
                    <span className="block text-xs text-muted-foreground">
                      {formatarTamanho(doc.tamanho)} ·{" "}
                      {new Date(doc.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  </span>
                </button>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Baixar"
                    onClick={() => abrir(doc)}
                  >
                    <Download className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Excluir"
                    onClick={() => excluir.mutate(doc)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
