import { startOfWeek } from "date-fns";
import JSZip from "jszip";

import { supabase } from "@/integrations/supabase/client";
import { supabaseSolto } from "@/lib/supabase-solto";
import {
  clienteCasoCompactoDe,
  dataCompacta,
  juizoCompactoDe,
  listarPendencias,
  nomeParteContrariaDe,
  normalizarNome,
  type MovimentacaoComProcesso,
} from "@/lib/processos";
import { COR_BCW, gerarDocumentoWord, paragrafo, run } from "@/lib/relatorio-word";

// "horario" é coluna nova (migração 20261016150000_lista_prazos.sql) que
// ainda não está no types.ts gerado -- por isso a extensão local em vez de
// mexer no tipo Movimentacao compartilhado (mesmo padrão já usado pra
// colunas recém-criadas em outras telas).
export type MovimentacaoComHorario = MovimentacaoComProcesso & { horario: string | null };

export type ItemManualPrazo = {
  id: string;
  texto: string;
  data_ordenacao: string | null;
  concluida: boolean;
  created_at: string;
};

// Linha pronta pra exibir/exportar, já no formato compacto da chefe da BDR
// ("DD/MM/AA: Providência Nome (cliente/caso) [horário] Juízo ADVG"),
// unificando prazo automático (puxado de movimentacoes) e nota manual
// (ex.: aviso de férias, sem processo ligado).
export type ItemListaPrazos = {
  chave: string;
  data: string | null;
  texto: string;
  concluida: boolean;
} & (
  | {
      tipo: "automatico";
      movimentacaoId: string;
      observacao: string | null;
      tipoMovimentacao: string | null;
      responsavel: string | null;
      parteAdversa: string | null;
      numeroCliente: string | null;
      numeroInterno: string | null;
    }
  | { tipo: "manual"; manualId: string }
);

// Mesma fonte de "Meus prazos"/pendências (movimentacoes com exige_acao e
// não concluídas) -- só filtra as que têm data de prazo de verdade, já que
// a lista da chefe é estritamente cronológica.
export async function listarPrazosAutomaticos(): Promise<MovimentacaoComHorario[]> {
  const pendencias = await listarPendencias();
  return (pendencias as MovimentacaoComHorario[]).filter((m) => m.prazo != null);
}

export async function listarPrazosManuais(): Promise<ItemManualPrazo[]> {
  const { data, error } = await supabaseSolto
    .from("lista_prazos_manual")
    .select("id, texto, data_ordenacao, concluida, created_at")
    .order("data_ordenacao", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ItemManualPrazo[];
}

export async function criarPrazoManual(
  texto: string,
  dataOrdenacao: string | null,
): Promise<void> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const { error } = await supabaseSolto.from("lista_prazos_manual").insert({
    texto,
    data_ordenacao: dataOrdenacao,
    created_by: userData.user?.id ?? null,
  });
  if (error) throw error;
}

export async function atualizarPrazoManual(
  id: string,
  patch: Partial<Pick<ItemManualPrazo, "texto" | "data_ordenacao" | "concluida">>,
): Promise<void> {
  const { error } = await supabaseSolto
    .from("lista_prazos_manual")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function excluirPrazoManual(id: string): Promise<void> {
  const { error } = await supabaseSolto.from("lista_prazos_manual").delete().eq("id", id);
  if (error) throw error;
}

export async function alternarConcluidaAutomatico(id: string, concluida: boolean): Promise<void> {
  const { error } = await supabase.from("movimentacoes").update({ concluida }).eq("id", id);
  if (error) throw error;
}

export async function salvarObservacaoAutomatico(
  id: string,
  observacao: string | null,
): Promise<void> {
  const { error } = await supabase.from("movimentacoes").update({ observacao }).eq("id", id);
  if (error) throw error;
}

// A "providência" do item automático é a própria descrição já cadastrada
// pra essa movimentação (quem registrou o prazo escreveu algo como
// "Contestação" ou "Audiência de instrução") -- não tenta reclassificar em
// cima de texto livre já escrito por alguém do escritório.
export function montarEntradaAutomatica(m: MovimentacaoComHorario): string {
  const p = m.processos;
  const data = m.prazo ? dataCompacta(m.prazo) : "??/??/??";
  const campos = [
    m.descricao,
    p ? nomeParteContrariaDe(p) : null,
    p ? clienteCasoCompactoDe(p) : null,
    m.horario,
    p ? juizoCompactoDe(p) : null,
    p?.responsavel || null,
  ].filter((v): v is string => !!v);
  return `${data}: ${campos.join(" ")}`;
}

export function montarEntradaManual(item: Pick<ItemManualPrazo, "texto" | "data_ordenacao">): string {
  return item.data_ordenacao ? `${dataCompacta(item.data_ordenacao)}: ${item.texto}` : item.texto;
}

export function montarItensUnificados(
  automaticos: MovimentacaoComHorario[],
  manuais: ItemManualPrazo[],
): ItemListaPrazos[] {
  const itensAuto: ItemListaPrazos[] = automaticos.map((m) => ({
    chave: `auto-${m.id}`,
    data: m.prazo,
    texto: montarEntradaAutomatica(m),
    concluida: m.concluida,
    tipo: "automatico",
    movimentacaoId: m.id,
    observacao: m.observacao,
    tipoMovimentacao: m.tipo,
    responsavel: m.processos?.responsavel ?? null,
    parteAdversa: m.processos ? nomeParteContrariaDe(m.processos) : null,
    numeroCliente: m.processos?.numero_cliente ?? null,
    numeroInterno: m.processos?.numero_interno ?? null,
  }));
  const itensManuais: ItemListaPrazos[] = manuais.map((item) => ({
    chave: `manual-${item.id}`,
    data: item.data_ordenacao,
    texto: montarEntradaManual(item),
    concluida: item.concluida,
    tipo: "manual",
    manualId: item.id,
  }));
  return [...itensAuto, ...itensManuais].sort((a, b) => {
    if (a.data !== b.data) {
      if (!a.data) return 1;
      if (!b.data) return -1;
      return a.data.localeCompare(b.data);
    }
    return a.texto.localeCompare(b.texto, "pt-BR");
  });
}

// --- Filtros ---------------------------------------------------------
export type FiltrosListaPrazos = {
  advogado: string;
  dataDe: string | null;
  dataAte: string | null;
  parteAdversa: string;
  clienteCaso: string;
};

export const FILTROS_VAZIOS: FiltrosListaPrazos = {
  advogado: "",
  dataDe: null,
  dataAte: null,
  parteAdversa: "",
  clienteCaso: "",
};

function contemFiltro(alvo: string | null, filtro: string): boolean {
  if (!filtro.trim()) return true;
  if (!alvo) return false;
  return normalizarNome(alvo).includes(normalizarNome(filtro));
}

// Advogado/parte adversa/cliente-caso só existem nos itens automáticos
// (nota manual não tem processo ligado) -- com qualquer um desses 3
// preenchido, nota manual some do resultado (não tem como ela "bater"
// com um filtro de processo). Data filtra os dois tipos normalmente.
export function filtrarItens(
  itens: ItemListaPrazos[],
  filtros: FiltrosListaPrazos,
): ItemListaPrazos[] {
  const temFiltroDeProcesso = !!(
    filtros.advogado.trim() ||
    filtros.parteAdversa.trim() ||
    filtros.clienteCaso.trim()
  );

  return itens.filter((item) => {
    if (filtros.dataDe && (!item.data || item.data < filtros.dataDe)) return false;
    if (filtros.dataAte && (!item.data || item.data > filtros.dataAte)) return false;
    if (!temFiltroDeProcesso) return true;
    if (item.tipo !== "automatico") return false;
    if (!contemFiltro(item.responsavel, filtros.advogado)) return false;
    if (!contemFiltro(item.parteAdversa, filtros.parteAdversa)) return false;
    if (filtros.clienteCaso.trim()) {
      const alvo = `${item.numeroCliente ?? ""}/${item.numeroInterno ?? ""}`;
      if (!alvo.toLowerCase().includes(filtros.clienteCaso.trim().toLowerCase())) return false;
    }
    return true;
  });
}

export type GrupoSemanaPrazos = { inicioSemana: string; itens: ItemListaPrazos[] };

// Agrupa em semanas (segunda a segunda) só pra desenhar os divisores "***"
// que a chefe usa no Word pra separar uma semana da outra -- itens sem
// data (nota manual solta) ficam num grupo à parte, no fim.
export function agruparPorSemana(itens: ItemListaPrazos[]): GrupoSemanaPrazos[] {
  const grupos = new Map<string, ItemListaPrazos[]>();
  const semData: ItemListaPrazos[] = [];
  for (const item of itens) {
    if (!item.data) {
      semData.push(item);
      continue;
    }
    const inicio = startOfWeek(new Date(`${item.data}T12:00:00`), { weekStartsOn: 1 })
      .toISOString()
      .slice(0, 10);
    if (!grupos.has(inicio)) grupos.set(inicio, []);
    grupos.get(inicio)!.push(item);
  }
  const resultado: GrupoSemanaPrazos[] = Array.from(grupos.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([inicioSemana, itensDaSemana]) => ({ inicioSemana, itens: itensDaSemana }));
  if (semData.length) resultado.push({ inicioSemana: "—", itens: semData });
  return resultado;
}

export async function exportarListaPrazosWord(grupos: GrupoSemanaPrazos[]): Promise<void> {
  const dataGeracao = new Date().toLocaleDateString("pt-BR");
  const totalItens = grupos.reduce((soma, g) => soma + g.itens.length, 0);
  const titulo = paragrafo(run("LISTA DE PRAZOS", { negrito: true, tamanho: 32, cor: COR_BCW }), {
    centralizado: true,
    depois: 60,
  });
  const subtitulo = paragrafo(
    run(`Gerado em ${dataGeracao} — ${totalItens} item${totalItens === 1 ? "" : "s"}`, {
      tamanho: 18,
      cor: "666666",
    }),
    { centralizado: true, depois: 360 },
  );

  const corpo = grupos
    .map((grupo, i) => {
      const itensXml = grupo.itens
        .map((item) =>
          paragrafo(run(item.texto, item.concluida ? { cor: "999999" } : {}), { depois: 80 }),
        )
        .join("");
      const divisor =
        i < grupos.length - 1
          ? paragrafo(run("***", { negrito: true, cor: COR_BCW }), {
              centralizado: true,
              antes: 120,
              depois: 240,
            })
          : "";
      return itensXml + divisor;
    })
    .join("");

  await gerarDocumentoWord(titulo + subtitulo + corpo, "lista-de-prazos");
}

// --- Importação do Word da chefe (só pra começar) ------------------------
// Lê o .docx parágrafo por parágrafo (cada <w:p> vira uma string, juntando
// os <w:t> de dentro) -- o documento real da chefe é só texto corrido, sem
// tabela, então não precisa de nada além disso.
export async function extrairParagrafosDocx(buffer: ArrayBuffer): Promise<string[]> {
  const zip = await JSZip.loadAsync(buffer);
  const arquivo = zip.file("word/document.xml");
  if (!arquivo) throw new Error("Não parece um .docx válido (word/document.xml não encontrado).");
  const xml = await arquivo.async("text");
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  return Array.from(doc.getElementsByTagName("w:p")).map((p) =>
    Array.from(p.getElementsByTagName("w:t"))
      .map((t) => t.textContent ?? "")
      .join(""),
  );
}

export type ItemImportadoWord = { texto: string; dataOrdenacao: string | null };

const REGEX_DATA_COMPLETA = /^(\d{2})\/(\d{2})\/(\d{2,4}):?\s*(.+)$/;
const REGEX_BRACKET_DATADO = /^\[(\d{2})\/(\d{2}):?\s*(.+?)\]\s*$/;

function anoCompleto(ano: string): string {
  return ano.length === 2 ? `20${ano}` : ano;
}

// O Word da chefe é uma lista corrida de parágrafos no formato "DD/MM/AA:
// texto" (às vezes sem os 2 pontos, ou com ano de 4 dígitos -- o documento
// real tem as duas variações), intercalada com divisores "***" e notas
// soltas entre colchetes (com ou sem data embutida). Qualquer parágrafo
// que não bate com nenhum desses formatos (cabeçalho de seção, texto
// corrido de outro controle que não é a lista de prazos semanal etc.) é
// ignorado -- não tenta adivinhar.
export function interpretarParagrafosListaPrazos(paragrafos: string[]): ItemImportadoWord[] {
  const itens: ItemImportadoWord[] = [];
  let anoAtual: string | null = null;

  for (const paragrafoBruto of paragrafos) {
    const linha = paragrafoBruto.trim();
    if (!linha || linha === "***") continue;

    const completa = linha.match(REGEX_DATA_COMPLETA);
    if (completa) {
      const [, dd, mm, aaBruto, resto] = completa;
      const aaaa = anoCompleto(aaBruto!);
      anoAtual = aaaa;
      itens.push({ texto: resto!.trim(), dataOrdenacao: `${aaaa}-${mm}-${dd}` });
      continue;
    }

    const bracketDatado = linha.match(REGEX_BRACKET_DATADO);
    if (bracketDatado) {
      const [, dd, mm, resto] = bracketDatado;
      itens.push({
        texto: `[${resto!.trim()}]`,
        dataOrdenacao: anoAtual ? `${anoAtual}-${mm}-${dd}` : null,
      });
      continue;
    }

    if (linha.startsWith("[") && linha.endsWith("]")) {
      // Nota solta sem data reconhecível (ex.: "[Férias BDR: 28/12 a
      // 12/01]") -- importa sem data; dá pra ajustar na tela depois.
      itens.push({ texto: linha, dataOrdenacao: null });
    }
  }
  return itens;
}

export async function importarListaPrazosWord(buffer: ArrayBuffer): Promise<ItemImportadoWord[]> {
  const paragrafos = await extrairParagrafosDocx(buffer);
  return interpretarParagrafosListaPrazos(paragrafos);
}
