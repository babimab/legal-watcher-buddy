import { supabase } from "@/integrations/supabase/client";

export type ChaveApi = {
  id: string;
  nome: string;
  prefixo: string;
  ativo: boolean;
  created_at: string;
  revogada_em: string | null;
};

export async function listarChavesApi(): Promise<ChaveApi[]> {
  const { data, error } = await supabase
    .from("chaves_api")
    .select("id, nome, prefixo, ativo, created_at, revogada_em")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

async function gerarChaveAleatoria(): Promise<string> {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `farolex_${hex}`;
}

async function hashChave(chave: string): Promise<string> {
  const bytes = new TextEncoder().encode(chave);
  const buffer = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Gera uma chave nova e já grava o hash. A chave em claro só existe aqui, nunca é salva. */
export async function gerarChaveApi(nome: string): Promise<string> {
  const chave = await gerarChaveAleatoria();
  const hash = await hashChave(chave);
  const prefixo = chave.slice(0, 16);

  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase.from("chaves_api").insert({
    nome,
    chave_hash: hash,
    prefixo,
    created_by: userData.user?.id ?? null,
  });
  if (error) throw error;
  return chave;
}

export async function revogarChaveApi(id: string): Promise<void> {
  const { error } = await supabase
    .from("chaves_api")
    .update({ ativo: false, revogada_em: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
