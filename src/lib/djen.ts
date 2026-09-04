import { supabase } from "@/integrations/supabase/client";
import { formatarCNJ } from "@/lib/processos";

// Mapeamento tolerante do retorno do DJEN pra um formato normalizado. Os
// nomes de campo abaixo são os documentados publicamente pra API do DJEN,
// mas como não deu pra confirmar o formato real da resposta a partir deste
// ambiente (sem acesso de rede externo), cada campo tenta várias variantes
// de nome antes de recorrer a uma busca "por conteúdo" (contém a palavra),
// e um item que não bate com nada só fica com o campo vazio em vez de
// quebrar a busca inteira. Se algum campo vier errado na prática, o ajuste
// fica isolado aqui.

export type FiltrosDjen = {
  nomeAdvogado?: string;
  numeroOab?: string;
  ufOab?: string;
  siglaTribunal?: string;
  dataInicio: string;
  dataFim: string;
};

export type ComunicacaoDjen = {
  cnjDigits: string;
  cnjTexto: string;
  tribunal: string | null;
  orgao: string | null;
  dataDisponibilizacao: string | null;
  texto: string | null;
  nomesAdvogados: string[];
  partes: string[];
  link: string | null;
};

function pegar(obj: Record<string, unknown>, ...chaves: string[]): unknown {
  for (const chave of chaves) {
    const v = obj[chave];
    if (v != null && v !== "") return v;
  }
  return undefined;
}

function pegarFuzzy(obj: Record<string, unknown>, ...termos: string[]): unknown {
  for (const [chave, valor] of Object.entries(obj)) {
    const norm = chave.toLowerCase();
    if (termos.every((t) => norm.includes(t)) && valor != null && valor !== "") return valor;
  }
  return undefined;
}

function comoTexto(valor: unknown): string | null {
  if (valor == null) return null;
  const s = String(valor).trim();
  return s === "" ? null : s;
}

function comoDataISO(valor: unknown): string | null {
  const s = comoTexto(valor);
  if (!s) return null;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[0];
  const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (br) return `${br[3]}-${br[2]!.padStart(2, "0")}-${br[1]!.padStart(2, "0")}`;
  return null;
}

function nomesDeArray(valor: unknown): string[] {
  if (!Array.isArray(valor)) return [];
  const nomes: string[] = [];
  for (const item of valor) {
    if (typeof item === "string") {
      if (item.trim()) nomes.push(item.trim());
      continue;
    }
    if (item && typeof item === "object") {
      const obj = item as Record<string, unknown>;
      const alvo =
        obj["advogado"] && typeof obj["advogado"] === "object"
          ? (obj["advogado"] as Record<string, unknown>)
          : obj;
      const nome = comoTexto(pegar(alvo, "nome") ?? pegarFuzzy(alvo, "nome"));
      if (nome) nomes.push(nome);
    }
  }
  return nomes;
}

function mapearItem(itemBruto: unknown): ComunicacaoDjen | null {
  if (!itemBruto || typeof itemBruto !== "object") return null;
  const obj = itemBruto as Record<string, unknown>;

  const numeroProcesso = comoTexto(
    pegar(
      obj,
      "numero_processo",
      "numeroProcesso",
      "numeroprocesso",
      "numeroprocessocommascara",
      "numeroProcessoComMascara",
    ) ?? pegarFuzzy(obj, "numero", "processo"),
  );
  const cnjDigits = numeroProcesso ? numeroProcesso.replace(/\D/g, "") : "";

  const advogadosRaw =
    pegar(obj, "destinatarioadvogados", "destinatarios_advogados", "advogados") ??
    pegarFuzzy(obj, "advogado");
  const partesRaw = pegar(obj, "destinatarios", "partes") ?? pegarFuzzy(obj, "parte");

  return {
    cnjDigits: cnjDigits.length >= 15 ? cnjDigits : "",
    cnjTexto: cnjDigits.length >= 15 ? formatarCNJ(cnjDigits) : (numeroProcesso ?? "—"),
    tribunal: comoTexto(
      pegar(obj, "siglaTribunal", "sigla_tribunal", "tribunal") ?? pegarFuzzy(obj, "tribunal"),
    ),
    orgao: comoTexto(pegar(obj, "nomeOrgao", "nome_orgao", "orgao") ?? pegarFuzzy(obj, "orgao")),
    dataDisponibilizacao: comoDataISO(
      pegar(obj, "data_disponibilizacao", "dataDisponibilizacao", "datadisponibilizacao") ??
        pegarFuzzy(obj, "disponibiliz"),
    ),
    texto: comoTexto(pegar(obj, "texto", "teor", "conteudo") ?? pegarFuzzy(obj, "texto")),
    nomesAdvogados: nomesDeArray(advogadosRaw),
    partes: nomesDeArray(partesRaw),
    link: comoTexto(pegar(obj, "link", "linkPublicacao", "url") ?? pegarFuzzy(obj, "link")),
  };
}

export async function buscarDjen(
  filtros: FiltrosDjen,
): Promise<{ comunicacoes: ComunicacaoDjen[]; totalRecebido: number; totalComCnj: number }> {
  const { data, error } = await supabase.functions.invoke<{
    itens?: unknown[];
    error?: string;
  }>("buscar-djen", { body: filtros });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);

  const itensCrus = data?.itens ?? [];
  const comunicacoes = itensCrus.map(mapearItem).filter((c): c is ComunicacaoDjen => c != null);
  const totalComCnj = comunicacoes.filter((c) => c.cnjDigits).length;

  return { comunicacoes, totalRecebido: itensCrus.length, totalComCnj };
}
