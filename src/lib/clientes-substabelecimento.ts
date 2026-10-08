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
const BUCKET_PROCURACAO = "procuracoes-clientes";
const BUCKET_CARTA_PREPOSICAO = "cartas-preposicao-clientes";
const BUCKET_SUBSTABELECIMENTO_MODELO = "substabelecimentos-modelo-clientes";
const TAMANHO_MAX_ASSINATURA = 5 * 1024 * 1024;
const TAMANHO_MAX_PDF = 20 * 1024 * 1024;

type LinhaCliente = {
  id: string;
  nome: string;
  texto_outorgante: string;
  assinante_nome: string | null;
  assinante_oab: string | null;
  assinatura_caminho: string | null;
  procuracao_caminho: string | null;
  procuracao_nome_arquivo: string | null;
  carta_preposicao_caminho: string | null;
  carta_preposicao_nome_arquivo: string | null;
  substabelecimento_modelo_caminho: string | null;
  substabelecimento_modelo_nome_arquivo: string | null;
};

function mapearCliente(linha: LinhaCliente): ClienteSubstabelecimento {
  return {
    id: linha.id,
    nome: linha.nome,
    textoOutorgante: linha.texto_outorgante,
    assinanteNome: linha.assinante_nome,
    assinanteOab: linha.assinante_oab,
    assinaturaCaminho: linha.assinatura_caminho,
    procuracaoCaminho: linha.procuracao_caminho,
    procuracaoNomeArquivo: linha.procuracao_nome_arquivo,
    cartaPreposicaoCaminho: linha.carta_preposicao_caminho,
    cartaPreposicaoNomeArquivo: linha.carta_preposicao_nome_arquivo,
    substabelecimentoModeloCaminho: linha.substabelecimento_modelo_caminho,
    substabelecimentoModeloNomeArquivo: linha.substabelecimento_modelo_nome_arquivo,
  };
}

// Fábrica de enviar/remover/baixar pra "um PDF só, só a versão atual"
// por cliente -- mesmo padrão pra procuração e carta de preposição
// modelo, só muda o bucket e as colunas.
function criarGerenciadorPdfCliente(
  bucket: string,
  colunaCaminho: string,
  colunaNomeArquivo: string,
  obterCaminhoAtual: (c: ClienteSubstabelecimento) => string | null,
) {
  async function enviar(cliente: ClienteSubstabelecimento, arquivo: File): Promise<void> {
    if (arquivo.size > TAMANHO_MAX_PDF) throw new Error("Arquivo muito grande (máximo 20 MB).");
    if (arquivo.type !== "application/pdf") throw new Error("Envie um arquivo PDF.");

    const caminho = `${cliente.id}/${crypto.randomUUID()}-${arquivo.name}`;
    const { error: erroUpload } = await supabase.storage.from(bucket).upload(caminho, arquivo);
    if (erroUpload) throw erroUpload;

    const { error: erroUpdate } = await supabaseSolto
      .from("clientes_substabelecimento")
      .update({ [colunaCaminho]: caminho, [colunaNomeArquivo]: arquivo.name })
      .eq("id", cliente.id);
    if (erroUpdate) {
      await supabase.storage.from(bucket).remove([caminho]);
      throw erroUpdate;
    }

    const anterior = obterCaminhoAtual(cliente);
    if (anterior) await supabase.storage.from(bucket).remove([anterior]);
  }

  async function remover(cliente: ClienteSubstabelecimento): Promise<void> {
    const { error } = await supabaseSolto
      .from("clientes_substabelecimento")
      .update({ [colunaCaminho]: null, [colunaNomeArquivo]: null })
      .eq("id", cliente.id);
    if (error) throw error;
    const anterior = obterCaminhoAtual(cliente);
    if (anterior) await supabase.storage.from(bucket).remove([anterior]);
  }

  async function baixar(cliente: ClienteSubstabelecimento): Promise<void> {
    const caminho = obterCaminhoAtual(cliente);
    if (!caminho) return;
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(caminho, 60);
    if (error) throw error;
    window.open(data.signedUrl, "_blank");
  }

  return { enviar, remover, baixar };
}

const gerenciadorProcuracao = criarGerenciadorPdfCliente(
  BUCKET_PROCURACAO,
  "procuracao_caminho",
  "procuracao_nome_arquivo",
  (c) => c.procuracaoCaminho,
);
const gerenciadorCartaPreposicao = criarGerenciadorPdfCliente(
  BUCKET_CARTA_PREPOSICAO,
  "carta_preposicao_caminho",
  "carta_preposicao_nome_arquivo",
  (c) => c.cartaPreposicaoCaminho,
);
const gerenciadorSubstabelecimentoModelo = criarGerenciadorPdfCliente(
  BUCKET_SUBSTABELECIMENTO_MODELO,
  "substabelecimento_modelo_caminho",
  "substabelecimento_modelo_nome_arquivo",
  (c) => c.substabelecimentoModeloCaminho,
);

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
  if (cliente.procuracaoCaminho) {
    await supabase.storage.from(BUCKET_PROCURACAO).remove([cliente.procuracaoCaminho]);
  }
  if (cliente.cartaPreposicaoCaminho) {
    await supabase.storage.from(BUCKET_CARTA_PREPOSICAO).remove([cliente.cartaPreposicaoCaminho]);
  }
  if (cliente.substabelecimentoModeloCaminho) {
    await supabase.storage
      .from(BUCKET_SUBSTABELECIMENTO_MODELO)
      .remove([cliente.substabelecimentoModeloCaminho]);
  }
}

export async function obterUrlAssinaturaCliente(caminho: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(caminho, 300);
  if (error) throw error;
  return data.signedUrl;
}

// Só guarda a versão atual: subir um novo arquivo substitui o anterior
// (sem manter histórico).
export const enviarProcuracaoCliente = gerenciadorProcuracao.enviar;
export const removerProcuracaoCliente = gerenciadorProcuracao.remover;
export const baixarProcuracaoCliente = gerenciadorProcuracao.baixar;

export const enviarCartaPreposicaoModeloCliente = gerenciadorCartaPreposicao.enviar;
export const removerCartaPreposicaoModeloCliente = gerenciadorCartaPreposicao.remover;
export const baixarCartaPreposicaoModeloCliente = gerenciadorCartaPreposicao.baixar;

export const enviarSubstabelecimentoModeloCliente = gerenciadorSubstabelecimentoModelo.enviar;
export const removerSubstabelecimentoModeloCliente = gerenciadorSubstabelecimentoModelo.remover;
export const baixarSubstabelecimentoModeloCliente = gerenciadorSubstabelecimentoModelo.baixar;
