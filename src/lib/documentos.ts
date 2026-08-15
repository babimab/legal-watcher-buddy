import { supabase } from "@/integrations/supabase/client";

export type Documento = {
  id: string;
  processo_id: string;
  nome_arquivo: string;
  caminho: string;
  tamanho: number | null;
  tipo: string | null;
  created_by: string | null;
  created_at: string;
};

const BUCKET = "documentos-processos";
const TAMANHO_MAX = 25 * 1024 * 1024;

export async function listarDocumentos(processoId: string): Promise<Documento[]> {
  const { data, error } = await supabase
    .from("documentos")
    .select("*")
    .eq("processo_id", processoId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Documento[];
}

export async function enviarDocumento(processoId: string, arquivo: File): Promise<void> {
  if (arquivo.size > TAMANHO_MAX) throw new Error("Arquivo muito grande (máximo 25 MB).");

  const { data: userData } = await supabase.auth.getUser();
  const criador = userData.user?.id;
  if (!criador) throw new Error("Sessão expirada. Entre novamente para anexar.");

  const caminho = `${processoId}/${crypto.randomUUID()}-${arquivo.name}`;
  const { error: erroUpload } = await supabase.storage.from(BUCKET).upload(caminho, arquivo);
  if (erroUpload) throw erroUpload;

  const { error: erroInsert } = await supabase.from("documentos").insert({
    processo_id: processoId,
    nome_arquivo: arquivo.name,
    caminho,
    tamanho: arquivo.size,
    tipo: arquivo.type || null,
    created_by: criador,
  });
  if (erroInsert) {
    await supabase.storage.from(BUCKET).remove([caminho]);
    throw erroInsert;
  }
}

export async function baixarDocumento(doc: Documento): Promise<void> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(doc.caminho, 60);
  if (error) throw error;
  window.open(data.signedUrl, "_blank");
}

export async function excluirDocumento(doc: Documento): Promise<void> {
  const { error: erroStorage } = await supabase.storage.from(BUCKET).remove([doc.caminho]);
  if (erroStorage) throw erroStorage;
  const { error: erroDelete } = await supabase.from("documentos").delete().eq("id", doc.id);
  if (erroDelete) throw erroDelete;
}
