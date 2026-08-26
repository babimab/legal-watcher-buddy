import { supabase } from "@/integrations/supabase/client";
import { buscarTudoPaginado, listarProcessos, type Processo } from "@/lib/processos";

// --- Detecção/correção de mojibake (espelha a migração corrigir_mojibake:
// normaliza os caracteres especiais do Windows-1252 pros bytes 0x80-0x9F
// correspondentes — incluindo os 5 "buracos" que o Windows-1252 padrão não
// define — e reinterpreta como Latin-1 pra recuperar os bytes UTF-8
// originais). Roda no navegador, sem depender de round-trip pelo banco.
const CP1252_PARA_BYTE: Record<number, number> = {
  0x20ac: 0x80,
  0x0081: 0x81,
  0x201a: 0x82,
  0x0192: 0x83,
  0x201e: 0x84,
  0x2026: 0x85,
  0x2020: 0x86,
  0x2021: 0x87,
  0x02c6: 0x88,
  0x2030: 0x89,
  0x0160: 0x8a,
  0x2039: 0x8b,
  0x0152: 0x8c,
  0x008d: 0x8d,
  0x017d: 0x8e,
  0x008f: 0x8f,
  0x0090: 0x90,
  0x2018: 0x91,
  0x2019: 0x92,
  0x201c: 0x93,
  0x201d: 0x94,
  0x2022: 0x95,
  0x2013: 0x96,
  0x2014: 0x97,
  0x02dc: 0x98,
  0x2122: 0x99,
  0x0161: 0x9a,
  0x203a: 0x9b,
  0x0153: 0x9c,
  0x009d: 0x9d,
  0x017e: 0x9e,
  0x0178: 0x9f,
};

// Retorna o texto corrigido se (e só se) o valor bater com o padrão de
// mojibake E a reversão resultar num UTF-8 válido — ou seja, nunca
// "corrige" texto que já está certo (tipo "JOÃO" ou "CÂMARA").
export function tentarCorrigirMojibake(texto: string | null | undefined): string | null {
  if (!texto || !/[ÃÂ]/.test(texto)) return null;
  const bytes: number[] = [];
  for (const ch of texto) {
    const cp = ch.codePointAt(0)!;
    const byte = CP1252_PARA_BYTE[cp] ?? (cp <= 0xff ? cp : null);
    if (byte == null) return null;
    bytes.push(byte);
  }
  try {
    const decodificado = new TextDecoder("utf-8", { fatal: true }).decode(new Uint8Array(bytes));
    return decodificado !== texto ? decodificado : null;
  } catch {
    return null;
  }
}

const CAMPOS_PROCESSO_TEXTO = [
  "cliente",
  "parte_contraria",
  "autor",
  "reu",
  "sistema",
  "carteira",
  "tribunal",
  "vara",
  "comarca",
  "classe",
  "fase",
  "criticidade",
  "responsavel",
  "socio",
  "coordenador",
  "observacoes",
  "observacao_encerramento",
  "numero_interno",
  "numero_antigo",
  "numero_cliente",
] as const;

const CAMPOS_MOVIMENTACAO_TEXTO = ["descricao", "observacao", "tipo"] as const;

export type ProblemaAcento = {
  tabela: "processos" | "movimentacoes";
  id: string;
  campo: string;
  valorAtual: string;
  valorCorrigido: string;
  processoId: string;
  numeroCnj: string | null;
  cliente: string | null;
};

async function buscarCandidatosAcento<T extends Record<string, unknown>>(
  tabela: "processos" | "movimentacoes",
  campos: readonly string[],
  select: string,
) {
  const orExpr = campos.map((c) => `${c}.match.[ÃÂ]`).join(",");
  return buscarTudoPaginado<T>(
    (offset, limite) =>
      supabase
        .from(tabela)
        .select(select)
        .or(orExpr)
        .range(offset, offset + limite - 1) as unknown as PromiseLike<{
        data: T[] | null;
        error: { message: string } | null;
      }>,
  );
}

export async function listarProblemasAcento(): Promise<ProblemaAcento[]> {
  const problemas: ProblemaAcento[] = [];

  type ProcessoCandidato = { id: string; numero_cnj: string; cliente: string } & Record<
    (typeof CAMPOS_PROCESSO_TEXTO)[number],
    string | null
  >;

  const candidatosProcessos = await buscarCandidatosAcento<ProcessoCandidato>(
    "processos",
    CAMPOS_PROCESSO_TEXTO,
    `id, numero_cnj, cliente, ${CAMPOS_PROCESSO_TEXTO.join(", ")}`,
  );
  for (const p of candidatosProcessos) {
    for (const campo of CAMPOS_PROCESSO_TEXTO) {
      const valor = p[campo];
      const corrigido = tentarCorrigirMojibake(valor);
      if (corrigido) {
        problemas.push({
          tabela: "processos",
          id: p.id,
          campo,
          valorAtual: valor!,
          valorCorrigido: corrigido,
          processoId: p.id,
          numeroCnj: p.numero_cnj,
          cliente: p.cliente,
        });
      }
    }
  }

  const candidatosMovs = await buscarCandidatosAcento<{
    id: string;
    processo_id: string;
    descricao: string | null;
    observacao: string | null;
    tipo: string | null;
    processos: { numero_cnj: string; cliente: string } | null;
  }>(
    "movimentacoes",
    CAMPOS_MOVIMENTACAO_TEXTO,
    "id, processo_id, descricao, observacao, tipo, processos(numero_cnj, cliente)",
  );
  for (const m of candidatosMovs) {
    for (const campo of CAMPOS_MOVIMENTACAO_TEXTO) {
      const valor = m[campo];
      const corrigido = tentarCorrigirMojibake(valor);
      if (corrigido) {
        problemas.push({
          tabela: "movimentacoes",
          id: m.id,
          campo,
          valorAtual: valor!,
          valorCorrigido: corrigido,
          processoId: m.processo_id,
          numeroCnj: m.processos?.numero_cnj ?? null,
          cliente: m.processos?.cliente ?? null,
        });
      }
    }
  }

  return problemas;
}

export async function corrigirAcento(problema: ProblemaAcento): Promise<void> {
  const atualizacao = { [problema.campo]: problema.valorCorrigido } as Record<string, string>;
  const { error } = await supabase
    .from(problema.tabela)
    .update(atualizacao as never)
    .eq("id", problema.id);

  if (error) {
    // O erro do Supabase não é uma instância de Error do JS, então quem
    // capturava com "e instanceof Error" caía sempre na mensagem genérica,
    // escondendo o motivo real. Relança como Error de verdade.
    //
    // Um caso específico: corrigir o texto pode fazer essa linha ficar
    // idêntica a outro andamento que já existe certo -- o mesmo evento foi
    // importado duas vezes, uma com o acento quebrado, outra depois já
    // certa. Nesse caso o índice que evita andamento duplicado
    // (movimentacoes_dedupe_idx) barra a correção, porque ela criaria uma
    // duplicata de verdade. Não dá pra resolver sozinho com segurança
    // (pode ser que a cópia quebrada tenha um prazo/validação que a outra
    // não tem) -- melhor avisar e deixar a pessoa decidir qual excluir.
    if (problema.tabela === "movimentacoes" && error.message.includes("movimentacoes_dedupe_idx")) {
      throw new Error(
        "Já existe outro andamento igual (mesma data e descrição) certo nesse processo -- " +
          "provavelmente foi importado em duplicidade. Abra o processo, compare os dois " +
          "andamentos dessa data e exclua o que tem o texto quebrado.",
      );
    }
    throw new Error(error.message);
  }
}

export type ResultadoDuplicatasAcento = {
  excluidas: number;
  paraRevisao: number;
};

// Resolve automaticamente só os casos de "acento corrompido" em que a
// linha quebrada é uma duplicata inofensiva de um andamento que já existe
// certo (mesmo processo, mesma data, mesma descrição depois de corrigida):
// exclui a cópia quebrada quando ela não carrega nada que a cópia certa
// já não tenha -- sem prazo, sem exigir ação, sem observação, sem estar
// marcada pra destacar no e-mail. Quando a linha quebrada tem algo além
// disso, não mexe -- fica pra revisão manual (ver corrigirAcento).
export async function excluirDuplicatasSegurasAcento(
  problemas: ProblemaAcento[],
): Promise<ResultadoDuplicatasAcento> {
  const candidatos = problemas.filter(
    (p) => p.tabela === "movimentacoes" && p.campo === "descricao",
  );
  let excluidas = 0;
  let paraRevisao = 0;

  for (const problema of candidatos) {
    const { data: linha, error: erroLinha } = await supabase
      .from("movimentacoes")
      .select(
        "id, processo_id, data_movimentacao, exige_acao, prazo, concluida, observacao, destacar_email",
      )
      .eq("id", problema.id)
      .maybeSingle();
    if (erroLinha || !linha) continue;

    const { data: gemea, error: erroGemea } = await supabase
      .from("movimentacoes")
      .select("id")
      .eq("processo_id", linha.processo_id)
      .eq("data_movimentacao", linha.data_movimentacao)
      .eq("descricao", problema.valorCorrigido)
      .neq("id", linha.id)
      .limit(1)
      .maybeSingle();
    // Sem gêmea: não é caso de duplicata, o "Corrigir todos" normal resolve.
    if (erroGemea || !gemea) continue;

    const semNadaImportante =
      !linha.exige_acao &&
      !linha.prazo &&
      !linha.concluida &&
      !linha.observacao?.trim() &&
      !linha.destacar_email;

    if (!semNadaImportante) {
      paraRevisao++;
      continue;
    }

    const { error: erroExclusao } = await supabase
      .from("movimentacoes")
      .delete()
      .eq("id", linha.id);
    if (erroExclusao) {
      paraRevisao++;
      continue;
    }
    excluidas++;
  }

  return { excluidas, paraRevisao };
}

// --- Processos sem pasta ---
export type ProcessoSemPasta = Pick<Processo, "id" | "numero_cnj" | "cliente" | "responsavel">;

export function processosSemPasta(processos: Processo[]): ProcessoSemPasta[] {
  return processos
    .filter((p) => !p.pasta_id)
    .map((p) => ({
      id: p.id,
      numero_cnj: p.numero_cnj,
      cliente: p.cliente,
      responsavel: p.responsavel,
    }));
}

// --- CNJ duplicado ---
export type GrupoCnjDuplicado = {
  cnjDigits: string;
  processos: Pick<
    Processo,
    "id" | "numero_cnj" | "cliente" | "parte_contraria" | "status" | "responsavel"
  >[];
};

export function cnjsDuplicados(processos: Processo[]): GrupoCnjDuplicado[] {
  const porCnj = new Map<string, Processo[]>();
  for (const p of processos) {
    const digits = p.numero_cnj.replace(/\D/g, "");
    const atual = porCnj.get(digits);
    if (atual) atual.push(p);
    else porCnj.set(digits, [p]);
  }
  return [...porCnj.entries()]
    .filter(([, lista]) => lista.length > 1)
    .map(([cnjDigits, lista]) => ({
      cnjDigits,
      processos: lista.map((p) => ({
        id: p.id,
        numero_cnj: p.numero_cnj,
        cliente: p.cliente,
        parte_contraria: p.parte_contraria,
        status: p.status,
        responsavel: p.responsavel,
      })),
    }));
}

// --- Desdobramento provavelmente cadastrado como processo à parte ---
// Recurso/cumprimento de sentença/execução costumam ganhar um número CNJ
// novo, mas mantêm o mesmo "número do caso" (numero_interno) do processo
// original — então dois ou mais processos "raiz" (sem processo_pai_id)
// com o mesmo número de caso é sinal forte de que um deles deveria estar
// vinculado ao outro via "Vincular desdobramento", em vez de flutuar como
// processo independente.
export type GrupoDesdobramentoNaoVinculado = {
  numeroInterno: string;
  processos: Pick<
    Processo,
    | "id"
    | "numero_cnj"
    | "cliente"
    | "parte_contraria"
    | "responsavel"
    | "status"
    | "fase"
    | "tipo_desdobramento"
  >[];
};

export function desdobramentosNaoVinculados(
  processos: Processo[],
): GrupoDesdobramentoNaoVinculado[] {
  const porNumeroInterno = new Map<string, Processo[]>();
  for (const p of processos) {
    const numero = p.numero_interno?.trim();
    if (!numero) continue;
    const atual = porNumeroInterno.get(numero);
    if (atual) atual.push(p);
    else porNumeroInterno.set(numero, [p]);
  }

  return [...porNumeroInterno.entries()]
    .filter(([, lista]) => {
      if (lista.length < 2) return false;
      const raizes = lista.filter((p) => !p.processo_pai_id);
      // Uma família bem vinculada tem exatamente 1 raiz e o resto como
      // filho dela — 2+ raízes com o mesmo número de caso é o problema.
      return raizes.length > 1;
    })
    .map(([numeroInterno, lista]) => ({
      numeroInterno,
      processos: lista.map((p) => ({
        id: p.id,
        numero_cnj: p.numero_cnj,
        cliente: p.cliente,
        parte_contraria: p.parte_contraria,
        responsavel: p.responsavel,
        status: p.status,
        fase: p.fase,
        tipo_desdobramento: p.tipo_desdobramento,
      })),
    }));
}

// --- Possível desdobramento por parte adversa repetida ---
// Processos com a mesma parte adversa dentro da mesma pasta costumam ser
// fases do mesmo caso (recurso, cumprimento de sentença, execução...).
// Diferente da checagem por número de caso, essa é só um indício — por
// isso vira planilha pra revisão manual, não correção automática.
export type GrupoParteAdversa = {
  parteAdversa: string;
  processos: Pick<
    Processo,
    | "id"
    | "numero_cnj"
    | "cliente"
    | "classe"
    | "comarca"
    | "vara"
    | "status"
    | "fase"
    | "processo_pai_id"
    | "tipo_desdobramento"
  >[];
};

export function gruposPorParteAdversa(processos: Processo[], pastaId: string): GrupoParteAdversa[] {
  const porParte = new Map<string, { original: string; itens: Processo[] }>();
  for (const p of processos) {
    if (p.pasta_id !== pastaId) continue;
    const bruta = p.parte_contraria?.trim();
    if (!bruta) continue;
    const chave = bruta.toLowerCase();
    const atual = porParte.get(chave);
    if (atual) atual.itens.push(p);
    else porParte.set(chave, { original: bruta, itens: [p] });
  }

  return [...porParte.values()]
    .filter(({ itens }) => itens.length > 1)
    .map(({ original, itens }) => ({
      parteAdversa: original,
      processos: itens.map((p) => ({
        id: p.id,
        numero_cnj: p.numero_cnj,
        cliente: p.cliente,
        classe: p.classe,
        comarca: p.comarca,
        vara: p.vara,
        status: p.status,
        fase: p.fase,
        processo_pai_id: p.processo_pai_id,
        tipo_desdobramento: p.tipo_desdobramento,
      })),
    }))
    .sort((a, b) => b.processos.length - a.processos.length);
}

export async function listarProcessosParaSaude(): Promise<Processo[]> {
  return listarProcessos();
}
