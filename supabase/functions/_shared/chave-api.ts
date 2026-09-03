// Validação de chave de API pra integração externa (andamentos/encerramentos).
// A chave nunca é guardada em claro -- só o hash SHA-256 fica em
// chaves_api.chave_hash. O chamador manda a chave no header "x-api-key".
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

export async function hashChaveApi(chave: string): Promise<string> {
  const bytes = new TextEncoder().encode(chave);
  const buffer = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Retorna true se a chave do header x-api-key existir em chaves_api e estiver ativa. */
export async function validarChaveApi(
  req: Request,
  supabase: SupabaseClient,
): Promise<boolean> {
  const chave = req.headers.get("x-api-key");
  if (!chave) return false;

  const hash = await hashChaveApi(chave);
  const { data, error } = await supabase
    .from("chaves_api")
    .select("id")
    .eq("chave_hash", hash)
    .eq("ativo", true)
    .maybeSingle();

  return !error && !!data;
}
