import { supabase } from "@/integrations/supabase/client";

export type Grupo = {
  id: string;
  nome: string;
  created_by: string | null;
  created_at: string;
};

export type Pasta = {
  id: string;
  grupo_id: string;
  nome: string;
  created_by: string | null;
  created_at: string;
};

export type MembroGrupo = {
  membro_id: string;
  user_id: string;
  nome: string | null;
  email: string | null;
  created_at: string;
};

export type ConviteGrupo = {
  id: string;
  email: string;
  created_at: string;
};

export async function listarGrupos(): Promise<Grupo[]> {
  const { data, error } = await supabase.from("grupos").select("*").order("nome");
  if (error) throw error;
  return (data ?? []) as Grupo[];
}

export async function listarPastas(): Promise<Pasta[]> {
  const { data, error } = await supabase.from("pastas").select("*").order("nome");
  if (error) throw error;
  return (data ?? []) as Pasta[];
}

export async function criarGrupo(nome: string): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("grupos")
    .insert({ nome, created_by: userData.user?.id ?? null });
  if (error) throw error;
}

export async function criarPasta(grupoId: string, nome: string): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("pastas")
    .insert({ grupo_id: grupoId, nome, created_by: userData.user?.id ?? null });
  if (error) throw error;
}

export async function removerGrupo(grupoId: string): Promise<void> {
  const { error } = await supabase.from("grupos").delete().eq("id", grupoId);
  if (error) throw error;
}

export async function removerPasta(pastaId: string): Promise<void> {
  const { error } = await supabase.from("pastas").delete().eq("id", pastaId);
  if (error) throw error;
}

export async function listarMembrosGrupo(grupoId: string): Promise<MembroGrupo[]> {
  const { data, error } = await supabase.rpc("listar_membros_grupo", { _grupo_id: grupoId });
  if (error) throw error;
  return data ?? [];
}

export async function adicionarMembroGrupo(
  grupoId: string,
  email: string,
): Promise<{ pendente: boolean }> {
  const { data, error } = await supabase.rpc("adicionar_membro_grupo", {
    _grupo_id: grupoId,
    _email: email,
  });
  if (error) throw error;
  return { pendente: data?.[0]?.pendente ?? false };
}

export async function removerMembroGrupo(membroId: string): Promise<void> {
  const { error } = await supabase.from("grupo_membros").delete().eq("id", membroId);
  if (error) throw error;
}

export async function listarConvitesGrupo(grupoId: string): Promise<ConviteGrupo[]> {
  const { data, error } = await supabase.rpc("listar_convites_grupo", { _grupo_id: grupoId });
  if (error) throw error;
  return data ?? [];
}

export async function removerConviteGrupo(conviteId: string): Promise<void> {
  const { error } = await supabase.from("convites_grupo").delete().eq("id", conviteId);
  if (error) throw error;
}

export async function listarMembrosPasta(pastaId: string): Promise<MembroGrupo[]> {
  const { data, error } = await supabase.rpc("listar_membros_pasta", { _pasta_id: pastaId });
  if (error) throw error;
  return data ?? [];
}

export async function adicionarMembroPasta(pastaId: string, email: string): Promise<void> {
  const { error } = await supabase.rpc("adicionar_membro_pasta", {
    _pasta_id: pastaId,
    _email: email,
  });
  if (error) throw error;
}

export async function removerMembroPasta(membroId: string): Promise<void> {
  const { error } = await supabase.from("pasta_membros").delete().eq("id", membroId);
  if (error) throw error;
}

export async function moverProcessoParaPasta(
  processoId: string,
  pastaId: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("processos")
    .update({ pasta_id: pastaId })
    .eq("id", processoId);
  if (error) throw error;
}
