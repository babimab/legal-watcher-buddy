import { supabase } from "@/integrations/supabase/client";
import { supabaseSolto } from "@/lib/supabase-solto";

// Cadastro de modelos de Carta de Preposição "para o correspondente
// local" -- por ESTADO, não por cliente (ver
// 20261020160000_modelos_carta_preposicao_correspondente.sql). Mesmo
// padrão do Substabelecimento para o Correspondente (ver
// modelos-correspondente.ts), só que credencia uma lista de prepostos
// (nome + CPF) em vez de advogados (nome + OAB).
export type ModeloCartaPreposicaoCorrespondente = {
  id: string;
  estado: string;
  listaPrepostos: string;
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
  lista_prepostos: string;
  assinatura_caminho: string | null;
  assinante_nome: string | null;
  assinante_oab: string | null;
  modelo_pdf_caminho: string | null;
  modelo_pdf_nome_arquivo: string | null;
};

function mapearModelo(linha: LinhaModelo): ModeloCartaPreposicaoCorrespondente {
  return {
    id: linha.id,
    estado: linha.estado,
    listaPrepostos: linha.lista_prepostos,
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

export async function listarModelosCartaPreposicaoCorrespondente(): Promise<
  ModeloCartaPreposicaoCorrespondente[]
> {
  const { data, error } = await supabaseSolto
    .from("modelos_carta_preposicao_correspondente")
    .select("*")
    .order("estado", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as LinhaModelo[]).map(mapearModelo);
}

export async function criarModeloCartaPreposicaoCorrespondente(
  estado: string,
  listaPrepostos: string,
): Promise<ModeloCartaPreposicaoCorrespondente> {
  const base = slugificar(estado) || "estado";
  const { data: userData } = await supabase.auth.getUser();
  const criador = userData.user?.id ?? null;

  for (let tentativa = 0; tentativa < 6; tentativa++) {
    const id = tentativa === 0 ? base : `${base}-${tentativa + 1}`;
    const { data, error } = await supabaseSolto
      .from("modelos_carta_preposicao_correspondente")
      .insert({ id, estado, lista_prepostos: listaPrepostos, created_by: criador })
      .select("*")
      .single();
    if (!error) return mapearModelo(data as LinhaModelo);
    if (error.code !== "23505") throw error;
  }
  throw new Error("Não consegui gerar um identificador único para esse estado.");
}

export async function atualizarModeloCartaPreposicaoCorrespondente(
  id: string,
  dados: { estado: string; listaPrepostos: string },
): Promise<void> {
  const { error } = await supabaseSolto
    .from("modelos_carta_preposicao_correspondente")
    .update({ estado: dados.estado, lista_prepostos: dados.listaPrepostos })
    .eq("id", id);
  if (error) throw error;
}

export async function enviarAssinaturaModeloCartaPreposicaoCorrespondente(
  modelo: ModeloCartaPreposicaoCorrespondente,
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

  const caminho = `carta-correspondente-${modelo.id}/${crypto.randomUUID()}-${arquivo.name}`;
  const { error: erroUpload } = await supabase.storage
    .from(BUCKET_ASSINATURA)
    .upload(caminho, arquivo);
  if (erroUpload) throw erroUpload;

  const { error: erroUpdate } = await supabaseSolto
    .from("modelos_carta_preposicao_correspondente")
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

export async function removerAssinaturaModeloCartaPreposicaoCorrespondente(
  modelo: ModeloCartaPreposicaoCorrespondente,
): Promise<void> {
  const { error } = await supabaseSolto
    .from("modelos_carta_preposicao_correspondente")
    .update({ assinatura_caminho: null, assinante_nome: null, assinante_oab: null })
    .eq("id", modelo.id);
  if (error) throw error;
  if (modelo.assinaturaCaminho) {
    await supabase.storage.from(BUCKET_ASSINATURA).remove([modelo.assinaturaCaminho]);
  }
}

// PDF original só de referência/backup -- não é lido pelo gerador, é só
// pra conferência manual (mesmo padrão do "modelo pronto" de cliente).
export async function enviarPdfReferenciaModeloCartaPreposicaoCorrespondente(
  modelo: ModeloCartaPreposicaoCorrespondente,
  arquivo: File,
): Promise<void> {
  if (arquivo.size > TAMANHO_MAX_PDF) throw new Error("Arquivo muito grande (máximo 20 MB).");
  if (arquivo.type !== "application/pdf") throw new Error("Envie um arquivo PDF.");

  const caminho = `carta-correspondente-${modelo.id}/${crypto.randomUUID()}-${arquivo.name}`;
  const { error: erroUpload } = await supabase.storage
    .from(BUCKET_MODELO_PDF)
    .upload(caminho, arquivo);
  if (erroUpload) throw erroUpload;

  const { error: erroUpdate } = await supabaseSolto
    .from("modelos_carta_preposicao_correspondente")
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

export async function removerPdfReferenciaModeloCartaPreposicaoCorrespondente(
  modelo: ModeloCartaPreposicaoCorrespondente,
): Promise<void> {
  const { error } = await supabaseSolto
    .from("modelos_carta_preposicao_correspondente")
    .update({ modelo_pdf_caminho: null, modelo_pdf_nome_arquivo: null })
    .eq("id", modelo.id);
  if (error) throw error;
  if (modelo.modeloPdfCaminho) {
    await supabase.storage.from(BUCKET_MODELO_PDF).remove([modelo.modeloPdfCaminho]);
  }
}

export async function baixarPdfReferenciaModeloCartaPreposicaoCorrespondente(
  modelo: ModeloCartaPreposicaoCorrespondente,
): Promise<void> {
  if (!modelo.modeloPdfCaminho) return;
  const { data, error } = await supabase.storage
    .from(BUCKET_MODELO_PDF)
    .createSignedUrl(modelo.modeloPdfCaminho, 60);
  if (error) throw error;
  window.open(data.signedUrl, "_blank");
}

export async function excluirModeloCartaPreposicaoCorrespondente(
  modelo: ModeloCartaPreposicaoCorrespondente,
): Promise<void> {
  const { error } = await supabaseSolto
    .from("modelos_carta_preposicao_correspondente")
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

export async function obterUrlAssinaturaModeloCartaPreposicaoCorrespondente(
  caminho: string,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET_ASSINATURA)
    .createSignedUrl(caminho, 300);
  if (error) throw error;
  return data.signedUrl;
}
