import { supabase } from "@/integrations/supabase/client";
import { supabaseSolto } from "@/lib/supabase-solto";
import type { ClienteSubstabelecimento } from "@/lib/substabelecimento";

// Cadastro de clientes de substabelecimento e suas assinaturas, guardado
// no Supabase (tabela clientes_substabelecimento + bucket privado
// assinaturas-substabelecimento) -- ver migração
// 20261007100000_clientes_substabelecimento.sql. Isso substitui a lista
// fixa que existia antes no código: a BDR cadastra o cliente e sobe a
// assinatura pela própria tela, sem precisar mexer em código nem passar
// o arquivo por aqui.

const BUCKET = "assinaturas-substabelecimento";
const TAMANHO_MAX_ASSINATURA = 5 * 1024 * 1024;

type LinhaCliente = {
  id: string;
  nome: string;
  texto_outorgante: string;
  assinante_nome: string | null;
  assinante_oab: string | null;
  assinatura_caminho: string | null;
};

function mapearCliente(linha: LinhaCliente): ClienteSubstabelecimento {
  return {
    id: linha.id,
    nome: linha.nome,
    textoOutorgante: linha.texto_outorgante,
    assinanteNome: linha.assinante_nome,
    assinanteOab: linha.assinante_oab,
    assinaturaCaminho: linha.assinatura_caminho,
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

export async function listarClientesSubstabelecimento(): Promise<ClienteSubstabelecimento[]> {
  const { data, error } = await supabaseSolto
    .from("clientes_substabelecimento")
    .select("*")
    .order("nome", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as LinhaCliente[]).map(mapearCliente);
}

export async function criarClienteSubstabelecimento(
  nome: string,
  textoOutorgante: string,
): Promise<ClienteSubstabelecimento> {
  const base = slugificar(nome) || "cliente";
  const { data: userData } = await supabase.auth.getUser();
  const criador = userData.user?.id ?? null;

  for (let tentativa = 0; tentativa < 6; tentativa++) {
    const id = tentativa === 0 ? base : `${base}-${tentativa + 1}`;
    const { data, error } = await supabaseSolto
      .from("clientes_substabelecimento")
      .insert({ id, nome, texto_outorgante: textoOutorgante, created_by: criador })
      .select("*")
      .single();
    if (!error) return mapearCliente(data as LinhaCliente);
    if (error.code !== "23505") throw error;
  }
  throw new Error("Não consegui gerar um identificador único para esse cliente.");
}

export async function atualizarClienteSubstabelecimento(
  id: string,
  dados: { nome: string; textoOutorgante: string },
): Promise<void> {
  const { error } = await supabaseSolto
    .from("clientes_substabelecimento")
    .update({ nome: dados.nome, texto_outorgante: dados.textoOutorgante })
    .eq("id", id);
  if (error) throw error;
}

export async function enviarAssinaturaCliente(
  cliente: ClienteSubstabelecimento,
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

  const caminho = `${cliente.id}/${crypto.randomUUID()}-${arquivo.name}`;
  const { error: erroUpload } = await supabase.storage.from(BUCKET).upload(caminho, arquivo);
  if (erroUpload) throw erroUpload;

  const { error: erroUpdate } = await supabaseSolto
    .from("clientes_substabelecimento")
    .update({
      assinatura_caminho: caminho,
      assinante_nome: assinanteNome || null,
      assinante_oab: assinanteOab || null,
    })
    .eq("id", cliente.id);
  if (erroUpdate) {
    await supabase.storage.from(BUCKET).remove([caminho]);
    throw erroUpdate;
  }

  if (cliente.assinaturaCaminho) {
    await supabase.storage.from(BUCKET).remove([cliente.assinaturaCaminho]);
  }
}

export async function removerAssinaturaCliente(cliente: ClienteSubstabelecimento): Promise<void> {
  const { error } = await supabaseSolto
    .from("clientes_substabelecimento")
    .update({ assinatura_caminho: null, assinante_nome: null, assinante_oab: null })
    .eq("id", cliente.id);
  if (error) throw error;
  if (cliente.assinaturaCaminho) {
    await supabase.storage.from(BUCKET).remove([cliente.assinaturaCaminho]);
  }
}

export async function excluirClienteSubstabelecimento(
  cliente: ClienteSubstabelecimento,
): Promise<void> {
  const { error } = await supabaseSolto
    .from("clientes_substabelecimento")
    .delete()
    .eq("id", cliente.id);
  if (error) throw error;
  if (cliente.assinaturaCaminho) {
    await supabase.storage.from(BUCKET).remove([cliente.assinaturaCaminho]);
  }
}

export async function obterUrlAssinaturaCliente(caminho: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(caminho, 300);
  if (error) throw error;
  return data.signedUrl;
}
