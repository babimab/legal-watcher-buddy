import { supabase } from "@/integrations/supabase/client";

export type ComunicacaoDecisao = {
  id: string;
  processo_id: string;
  texto: string;
  nome_arquivo_origem: string | null;
  created_by: string | null;
  created_at: string;
};

const TAMANHO_MAX_PDF = 15 * 1024 * 1024;

function arquivoParaBase64(arquivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => {
      const resultado = leitor.result as string;
      // data:application/pdf;base64,XXXX -> só o pedaço depois da vírgula
      resolve(resultado.slice(resultado.indexOf(",") + 1));
    };
    leitor.onerror = () => reject(new Error("Não consegui ler o arquivo."));
    leitor.readAsDataURL(arquivo);
  });
}

/** Chama a IA (Anthropic) via edge function e retorna o texto gerado, sem salvar ainda. */
export async function gerarComunicacaoDecisao(arquivo: File): Promise<string> {
  if (arquivo.type !== "application/pdf") throw new Error("Envie um arquivo PDF.");
  if (arquivo.size > TAMANHO_MAX_PDF) throw new Error("PDF muito grande (máximo 15 MB).");

  const pdfBase64 = await arquivoParaBase64(arquivo);
  const { data, error } = await supabase.functions.invoke<{ texto?: string; error?: string }>(
    "gerar-comunicacao-decisao",
    { body: { pdfBase64 } },
  );
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  if (!data?.texto) throw new Error("A IA não retornou nenhum texto.");
  return data.texto;
}

export async function listarComunicacoes(processoId: string): Promise<ComunicacaoDecisao[]> {
  const { data, error } = await supabase
    .from("processo_comunicacoes")
    .select("*")
    .eq("processo_id", processoId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function salvarComunicacao(
  processoId: string,
  texto: string,
  nomeArquivoOrigem: string | null,
): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const criador = userData.user?.id;
  if (!criador) throw new Error("Sessão expirada. Entre novamente para salvar.");

  const { error } = await supabase.from("processo_comunicacoes").insert({
    processo_id: processoId,
    texto,
    nome_arquivo_origem: nomeArquivoOrigem,
    created_by: criador,
  });
  if (error) throw error;
}

export async function atualizarComunicacao(id: string, texto: string): Promise<void> {
  const { error } = await supabase.from("processo_comunicacoes").update({ texto }).eq("id", id);
  if (error) throw error;
}

export async function excluirComunicacao(id: string): Promise<void> {
  const { error } = await supabase.from("processo_comunicacoes").delete().eq("id", id);
  if (error) throw error;
}
