import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type Processo = {
  id: string;
  numero_cnj: string;
  cliente: string;
  numero_cliente: string | null;
  parte_contraria: string | null;
  numero_interno: string | null;
  numero_antigo: string | null;
  autor: string | null;
  reu: string | null;
  uf: string | null;
  sistema: string | null;
  carteira: string | null;
  tribunal: string | null;
  vara: string | null;
  comarca: string | null;
  classe: string | null;
  fase: string | null;
  criticidade: string | null;
  pasta_id: string | null;
  processo_pai_id: string | null;
  tipo_desdobramento: string | null;
  status: string;
  valor_causa: number | null;
  responsavel: string | null;
  socio: string | null;
  coordenador: string | null;
  observacoes: string | null;
  pronto_para_encerrar: boolean;
  valor_encerramento: number | null;
  observacao_encerramento: string | null;
  decisoes_no_ld: boolean;
  ultima_verificacao_em: string | null;
  fonte: string;
  monitorar: boolean;
  created_at: string;
  updated_at: string;
};

export type Movimentacao = {
  id: string;
  processo_id: string;
  data_movimentacao: string;
  descricao: string;
  tipo: string | null;
  exige_acao: boolean;
  prazo: string | null;
  concluida: boolean;
  observacao: string | null;
  fonte: string;
  validado: boolean;
  validado_por: string | null;
  validado_em: string | null;
  created_at: string;
};

// Sigla ou e-mail de quem está logado agora, pra registrar em
// "validado_por" no momento da validação (não precisa de FK pra
// auth.users porque cada um só escreve seu próprio identificador).
export async function siglaOuEmailAtual(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: perfil } = await supabase
    .from("profiles")
    .select("sigla")
    .eq("id", data.user.id)
    .maybeSingle();
  return perfil?.sigla || data.user.email || null;
}

export const STATUS_OPCOES = ["ativo", "suspenso", "arquivado", "baixado", "encerrado"] as const;

export const FASE_OPCOES = ["Instrutória", "Recursal", "Encerramento"] as const;

export const CRITICIDADE_OPCOES = ["Alta", "Média", "Baixa"] as const;

// Variante do Badge pra cada nível de criticidade — "Alta" chama mais
// atenção (mesma cor de alerta usada nos prazos vencidos).
export function variantCriticidade(
  criticidade: string | null | undefined,
): "destructive" | "default" | "outline" {
  if (criticidade === "Alta") return "destructive";
  if (criticidade === "Média") return "default";
  return "outline";
}

export const UF_OPCOES = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
] as const;

export function normalizarNome(valor: string) {
  return valor
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

// A sigla de cada pessoa é o começo do e-mail dela (ex.: bbs@bcw.com.br
// -> "BBS"), então "meus processos" funciona pra qualquer um que entrar,
// sem precisar cadastrar nada.
export function siglaDoEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const local = email.split("@")[0]?.trim();
  return local ? local.toUpperCase() : null;
}

// Apelidos antigos que devem contar como a mesma pessoa mesmo quando o
// responsavel no banco não é exatamente igual à sigla (ex.: processos
// antigos com "Bárbara" em vez de "BDR").
const APELIDOS_ANTIGOS: Record<string, string[]> = {
  BDR: ["barbara"],
};

export function ehResponsavelDaSigla(responsavel: string | null | undefined, sigla: string | null) {
  if (!responsavel || !sigla) return false;
  const respNormalizado = normalizarNome(responsavel);
  if (respNormalizado === normalizarNome(sigla)) return true;
  return (APELIDOS_ANTIGOS[sigla] ?? []).some((a) => normalizarNome(a) === respNormalizado);
}

// Sigla da pessoa logada agora. Vem do perfil (campo cadastrado no
// registro) sempre que existir; senão cai pro e-mail como antes, pra não
// quebrar quem criou conta antes desse campo existir.
export function useSiglaAtual(): string | null {
  const { data } = useQuery({
    queryKey: ["usuario-atual"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return { sigla: null, email: null };
      const { data: perfil } = await supabase
        .from("profiles")
        .select("sigla")
        .eq("id", data.user.id)
        .maybeSingle();
      return { sigla: perfil?.sigla ?? null, email: data.user.email ?? null };
    },
    staleTime: Infinity,
  });
  return data?.sigla || siglaDoEmail(data?.email ?? null);
}

// Siglas dos outros advogados do escritório, pra já aparecerem no filtro
// de Advogado mesmo antes de eles terem processo cadastrado.
export const OUTROS_ADVOGADOS_CONHECIDOS = ["BBS", "MLV", "JGV", "ELV"];

// Siglas conhecidas pro campo Coordenador (sugestão no cadastro).
export const COORDENADORES_CONHECIDOS = ["BDR", ...OUTROS_ADVOGADOS_CONHECIDOS];

// Clientes do escritório reconhecidos automaticamente na importação (autor
// ou réu batendo com o padrão vira o "nosso lado" do processo, com o nome
// já padronizado, independente de como veio escrito na planilha).
const CLIENTES_CONHECIDOS: { padrao: RegExp; nome: string }[] = [
  { padrao: /souza\s*cruz/i, nome: "Souza Cruz LTDA." },
  { padrao: /astro/i, nome: "Astromarítima" },
];

export const CATEGORIAS_CLIENTE = ["Astro", "Souza Cruz", "Merck", "PRC", "Outros"] as const;

// Agrupa o cliente do processo numa das categorias do filtro. Compara
// normalizado (sem acento, minúsculo) pra não depender de como o nome
// do cliente ficou salvo exatamente no banco.
export function categoriaCliente(
  cliente: string | null | undefined,
): (typeof CATEGORIAS_CLIENTE)[number] {
  const c = normalizarNome(cliente ?? "");
  if (c.includes("astro")) return "Astro";
  if (c.includes("souza cruz")) return "Souza Cruz";
  if (c.includes("merck")) return "Merck";
  if (c === "prc") return "PRC";
  return "Outros";
}

export function identificarCliente(
  autor: string | null,
  reu: string | null,
): { cliente: string; parteContraria: string | null } {
  for (const { padrao, nome } of CLIENTES_CONHECIDOS) {
    if (autor && padrao.test(autor)) return { cliente: nome, parteContraria: reu };
    if (reu && padrao.test(reu)) return { cliente: nome, parteContraria: autor };
  }
  return { cliente: autor ?? reu ?? "—", parteContraria: autor ? reu : null };
}

// Sócios conhecidos, pra já aparecerem no filtro de Sócio mesmo antes de
// ter processo com esse sócio cadastrado.
export const SOCIOS_CONHECIDOS = ["ELV", "GFC", "NYM"];

// Carteiras conhecidas, pra já aparecerem como sugestão ao cadastrar um
// processo mesmo antes de existir algum processo com essa carteira.
export const CARTEIRAS_CONHECIDAS = [
  "Cobrança Indevida",
  "Acidente de Trânsito",
  "Fumicultor",
  "Cash in",
  "Transportador",
  "FASC",
  "Merck",
];

export const TIPOS_DESDOBRAMENTO = [
  "Recurso",
  "Cumprimento de sentenca",
  "Execucao",
  "Embargos",
  "Agravo",
  "Outro",
] as const;

// Alguns textos ficaram salvos sem acento no banco (um problema antigo de
// codificação ao colar SQL manualmente no editor do Lovable). Em vez de
// arriscar corromper de novo escrevendo acento direto no banco, só a
// exibição é corrigida aqui.
const TEXTOS_PARA_EXIBICAO: Record<string, string> = {
  "Cumprimento de sentenca": "Cumprimento de sentença",
  Execucao: "Execução",
  "Perfis MLV (acoes de cobranca)": "Perfis MLV (ações de cobrança)",
  "RJ Astro Navegacao": "RJ Astro Navegação",
  Astromaritima: "Astromarítima",
};

export function exibir(texto: string): string;
export function exibir(texto: string | null | undefined): string | null;
export function exibir(texto: string | null | undefined): string | null {
  if (texto == null) return null;
  return TEXTOS_PARA_EXIBICAO[texto] ?? texto;
}

export const TIPOS_MOVIMENTACAO = [
  "Prazo",
  "Despacho",
  "Decisão",
  "Sentença",
  "Audiência",
  "Julgamento",
  "Providência interna",
  "Petição",
  "Intimação",
  "Publicação",
  "Acórdão",
  "Outro",
] as const;

export async function listarProcessos(): Promise<Processo[]> {
  const { data, error } = await supabase
    .from("processos")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Processo[];
}

export async function buscarProcesso(id: string): Promise<Processo> {
  const { data, error } = await supabase.from("processos").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Processo não encontrado");
  return data as Processo;
}

export async function listarDesdobramentos(processoId: string): Promise<Processo[]> {
  const { data, error } = await supabase
    .from("processos")
    .select("*")
    .eq("processo_pai_id", processoId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Processo[];
}

export async function listarMovimentacoes(processoId: string): Promise<Movimentacao[]> {
  const { data, error } = await supabase
    .from("movimentacoes")
    .select("*")
    .eq("processo_id", processoId)
    .order("data_movimentacao", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Movimentacao[];
}

export type MovimentacaoComProcesso = Movimentacao & {
  processos: Pick<
    Processo,
    | "id"
    | "numero_cnj"
    | "cliente"
    | "tribunal"
    | "autor"
    | "reu"
    | "parte_contraria"
    | "responsavel"
    | "socio"
    | "vara"
    | "comarca"
    | "uf"
    | "pasta_id"
  > | null;
};

const CAMPOS_PROCESSO_RELATORIO =
  "id, numero_cnj, cliente, tribunal, autor, reu, parte_contraria, responsavel, socio, vara, comarca, uf, pasta_id";

export async function listarMovimentacoesDesde(
  desde: string | null,
  limite?: number,
): Promise<MovimentacaoComProcesso[]> {
  let query = supabase
    .from("movimentacoes")
    .select(`*, processos(${CAMPOS_PROCESSO_RELATORIO})`)
    .order("created_at", { ascending: false });
  if (desde) query = query.gt("created_at", desde);
  if (limite) query = query.limit(limite);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as MovimentacaoComProcesso[];
}

export async function listarUltimasMovimentacoes(): Promise<Map<string, Movimentacao>> {
  const { data, error } = await supabase
    .from("movimentacoes")
    .select("*")
    .order("data_movimentacao", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  const ultimas = new Map<string, Movimentacao>();
  for (const m of (data ?? []) as Movimentacao[]) {
    if (!ultimas.has(m.processo_id)) ultimas.set(m.processo_id, m);
  }
  return ultimas;
}

export async function listarPendencias(): Promise<MovimentacaoComProcesso[]> {
  const { data, error } = await supabase
    .from("movimentacoes")
    .select(`*, processos(${CAMPOS_PROCESSO_RELATORIO})`)
    .eq("exige_acao", true)
    .eq("concluida", false)
    .order("prazo", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as unknown as MovimentacaoComProcesso[];
}

export async function listarNaoValidados(): Promise<MovimentacaoComProcesso[]> {
  const { data, error } = await supabase
    .from("movimentacoes")
    .select(`*, processos(${CAMPOS_PROCESSO_RELATORIO})`)
    .eq("validado", false)
    .order("data_movimentacao", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as MovimentacaoComProcesso[];
}

export async function ultimaVerificacao() {
  const { data, error } = await supabase
    .from("verificacoes")
    .select("*")
    .order("executado_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export function formatarCNJ(valor: string) {
  const d = valor.replace(/\D/g, "").slice(0, 20);
  if (d.length < 20) return valor;
  return `${d.slice(0, 7)}-${d.slice(7, 9)}.${d.slice(9, 13)}.${d.slice(13, 14)}.${d.slice(14, 16)}.${d.slice(16, 20)}`;
}
