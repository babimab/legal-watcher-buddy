import { supabase } from "@/integrations/supabase/client";
import { supabaseSolto } from "@/lib/supabase-solto";
import { slugificarNomeArquivo } from "@/lib/utils";

// Cadastro de modelos de Substabelecimento "para o correspondente
// local" -- por ESTADO, não por cliente (ver
// 20261020150000_modelos_substabelecimento_correspondente.sql). A BCW
// (que já tem a procuração da companhia) substabelece poderes pra essa
// lista de correspondentes, em vez de pros sócios da BCW -- a
// companhia aérea da linha continua vindo normalmente do cadastro de
// clientes_substabelecimento.
export type ModeloCorrespondente = {
  id: string;
  estado: string;
  listaAdvogados: string;
  assinaturaCaminho: string | null;
  assinanteNome: string | null;
  assinanteOab: string | null;
  modeloPdfCaminho: string | null;
  modeloPdfNomeArquivo: string | null;
};

const BUCKET_ASSINATURA = "assinaturas-substabelecimento";
const BUCKET_MODELO_PDF = "substabelecimentos-modelo-clientes";
const TAMANHO_MAX_ASSINATURA = 5 * 1024 * 1024;
const TAMANHO_MAX_PDF = 20 * 1024 * 1024;

type LinhaModelo = {
  id: string;
  estado: string;
  lista_advogados: string;
  assinatura_caminho: string | null;
  assinante_nome: string | null;
  assinante_oab: string | null;
  modelo_pdf_caminho: string | null;
  modelo_pdf_nome_arquivo: string | null;
};

function mapearModelo(linha: LinhaModelo): ModeloCorrespondente {
  return {
    id: linha.id,
    estado: linha.estado,
    listaAdvogados: linha.lista_advogados,
    assinaturaCaminho: linha.assinatura_caminho,
    assinanteNome: linha.assinante_nome,
    assinanteOab: linha.assinante_oab,
    modeloPdfCaminho: linha.modelo_pdf_caminho,
    modeloPdfNomeArquivo: linha.modelo_pdf_nome_arquivo,
  };
}

function slugificar(nome: string): string {
  return nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function listarModelosCorrespondente(): Promise<ModeloCorrespondente[]> {
  const { data, error } = await supabaseSolto
    .from("modelos_substabelecimento_correspondente")
    .select("*")
    .order("estado", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as LinhaModelo[]).map(mapearModelo);
}

export async function criarModeloCorrespondente(
  estado: string,
  listaAdvogados: string,
): Promise<ModeloCorrespondente> {
  const base = slugificar(estado) || "estado";
  const { data: userData } = await supabase.auth.getUser();
  const criador = userData.user?.id ?? null;

  for (let tentativa = 0; tentativa < 6; tentativa++) {
    const id = tentativa === 0 ? base : `${base}-${tentativa + 1}`;
    const { data, error } = await supabaseSolto
      .from("modelos_substabelecimento_correspondente")
      .insert({ id, estado, lista_advogados: listaAdvogados, created_by: criador })
      .select("*")
      .single();
    if (!error) return mapearModelo(data as LinhaModelo);
    if (error.code !== "23505") throw error;
  }
  throw new Error("Não consegui gerar um identificador único para esse estado.");
}

export async function atualizarModeloCorrespondente(
  id: string,
  dados: { estado: string; listaAdvogados: string },
): Promise<void> {
  const { error } = await supabaseSolto
    .from("modelos_substabelecimento_correspondente")
    .update({ estado: dados.estado, lista_advogados: dados.listaAdvogados })
    .eq("id", id);
  if (error) throw error;
}

export async function enviarAssinaturaModeloCorrespondente(
  modelo: ModeloCorrespondente,
  arquivo: File,
  assinanteNome: string,
  assinanteOab: string,
): Promise<void> {
  if (arquivo.size > TAMANHO_MAX_ASSINATURA) {
    throw new Error("Imagem muito grande (máximo 5 MB).");
  }
  if (!/^image\/(png|jpe?g)$/i.test(arquivo.type)) {
    throw new Error("Envie uma imagem PNG ou JPG.");
  }

  const caminho = `correspondente-${modelo.id}/${crypto.randomUUID()}-${slugificarNomeArquivo(arquivo.name)}`;
  const { error: erroUpload } = await supabase.storage
    .from(BUCKET_ASSINATURA)
    .upload(caminho, arquivo);
  if (erroUpload) throw erroUpload;

  const { error: erroUpdate } = await supabaseSolto
    .from("modelos_substabelecimento_correspondente")
    .update({
      assinatura_caminho: caminho,
      assinante_nome: assinanteNome || null,
      assinante_oab: assinanteOab || null,
    })
    .eq("id", modelo.id);
  if (erroUpdate) {
    await supabase.storage.from(BUCKET_ASSINATURA).remove([caminho]);
    throw erroUpdate;
  }

  if (modelo.assinaturaCaminho) {
    await supabase.storage.from(BUCKET_ASSINATURA).remove([modelo.assinaturaCaminho]);
  }
}

export async function removerAssinaturaModeloCorrespondente(
  modelo: ModeloCorrespondente,
): Promise<void> {
  const { error } = await supabaseSolto
    .from("modelos_substabelecimento_correspondente")
    .update({ assinatura_caminho: null, assinante_nome: null, assinante_oab: null })
    .eq("id", modelo.id);
  if (error) throw error;
  if (modelo.assinaturaCaminho) {
    await supabase.storage.from(BUCKET_ASSINATURA).remove([modelo.assinaturaCaminho]);
  }
}

// PDF original só de referência/backup -- não é lido pelo gerador, é só
// pra conferência manual (mesmo padrão do "modelo pronto" de cliente).
export async function enviarPdfReferenciaModeloCorrespondente(
  modelo: ModeloCorrespondente,
  arquivo: File,
): Promise<void> {
  if (arquivo.size > TAMANHO_MAX_PDF) throw new Error("Arquivo muito grande (máximo 20 MB).");
  if (arquivo.type !== "application/pdf") throw new Error("Envie um arquivo PDF.");

  const caminho = `correspondente-${modelo.id}/${crypto.randomUUID()}-${slugificarNomeArquivo(arquivo.name)}`;
  const { error: erroUpload } = await supabase.storage
    .from(BUCKET_MODELO_PDF)
    .upload(caminho, arquivo);
  if (erroUpload) throw erroUpload;

  const { error: erroUpdate } = await supabaseSolto
    .from("modelos_substabelecimento_correspondente")
    .update({ modelo_pdf_caminho: caminho, modelo_pdf_nome_arquivo: arquivo.name })
    .eq("id", modelo.id);
  if (erroUpdate) {
    await supabase.storage.from(BUCKET_MODELO_PDF).remove([caminho]);
    throw erroUpdate;
  }

  if (modelo.modeloPdfCaminho) {
    await supabase.storage.from(BUCKET_MODELO_PDF).remove([modelo.modeloPdfCaminho]);
  }
}

export async function removerPdfReferenciaModeloCorrespondente(
  modelo: ModeloCorrespondente,
): Promise<void> {
  const { error } = await supabaseSolto
    .from("modelos_substabelecimento_correspondente")
    .update({ modelo_pdf_caminho: null, modelo_pdf_nome_arquivo: null })
    .eq("id", modelo.id);
  if (error) throw error;
  if (modelo.modeloPdfCaminho) {
    await supabase.storage.from(BUCKET_MODELO_PDF).remove([modelo.modeloPdfCaminho]);
  }
}

export async function baixarPdfReferenciaModeloCorrespondente(
  modelo: ModeloCorrespondente,
): Promise<void> {
  if (!modelo.modeloPdfCaminho) return;
  const { data, error } = await supabase.storage
    .from(BUCKET_MODELO_PDF)
    .createSignedUrl(modelo.modeloPdfCaminho, 60);
  if (error) throw error;
  window.open(data.signedUrl, "_blank");
}

export async function excluirModeloCorrespondente(modelo: ModeloCorrespondente): Promise<void> {
  const { error } = await supabaseSolto
    .from("modelos_substabelecimento_correspondente")
    .delete()
    .eq("id", modelo.id);
  if (error) throw error;
  if (modelo.assinaturaCaminho) {
    await supabase.storage.from(BUCKET_ASSINATURA).remove([modelo.assinaturaCaminho]);
  }
  if (modelo.modeloPdfCaminho) {
    await supabase.storage.from(BUCKET_MODELO_PDF).remove([modelo.modeloPdfCaminho]);
  }
}

export async function obterUrlAssinaturaModeloCorrespondente(caminho: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET_ASSINATURA)
    .createSignedUrl(caminho, 300);
  if (error) throw error;
  return data.signedUrl;
}

// Mesma ideia de obterUrlAssinaturaModeloCorrespondente, mas pro bucket
// do PDF de referência (modeloPdfCaminho) -- usada pelo gerador de
// Procuração + Substabelecimento preenchida
// (pdf-procuracao-substabelecimento.ts), que precisa baixar o PDF em si
// pra sobrepor texto nele (ex.: AF/KLM, que mandam a própria Procuração
// + Substabelecimento já assinada pro correspondente local).
export async function obterUrlModeloPdfCorrespondente(caminho: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET_MODELO_PDF)
    .createSignedUrl(caminho, 300);
  if (error) throw error;
  return data.signedUrl;
}
