import { supabase } from "@/integrations/supabase/client";
import { supabaseSolto } from "@/lib/supabase-solto";
import { formatarCNJ, normalizarNome, type Processo } from "@/lib/processos";

// --- RTF -> texto plano -------------------------------------------------
// Os anexos do Alerte são .doc "de mentirinha": na verdade é RTF puro
// (confirmado abrindo os bytes), gerado por um RichEdit simples (sem
// revisões, sem OLE embutido) -- então dá pra extrair o texto com um
// parser dedicado, sem precisar de biblioteca externa. Acentos vêm como
// bytes crus em Windows-1252 (não como \'xx nem \uNNNN), então o primeiro
// passo é decodificar byte a byte nessa code page antes de interpretar os
// grupos/control words do RTF.
const CP1252_EXTRA: Record<number, string> = {
  0x80: "\u20AC", 0x82: "\u201A", 0x83: "\u0192", 0x84: "\u201E", 0x85: "\u2026",
  0x86: "\u2020", 0x87: "\u2021", 0x88: "\u02C6", 0x89: "\u2030", 0x8a: "\u0160",
  0x8b: "\u2039", 0x8c: "\u0152", 0x8e: "\u017D", 0x91: "\u2018", 0x92: "\u2019",
  0x93: "\u201C", 0x94: "\u201D", 0x95: "\u2022", 0x96: "\u2013", 0x97: "\u2014",
  0x98: "\u02DC", 0x99: "\u2122", 0x9a: "\u0161", 0x9b: "\u203A", 0x9c: "\u0153",
  0x9e: "\u017E", 0x9f: "\u0178",
};

// Grupos de metadado (tabela de fonte/cor, rodapé com número de página,
// etc.) -- nenhum desses deve aparecer no texto extraído.
const GRUPOS_DESCARTAVEIS = new Set([
  "fonttbl", "colortbl", "stylesheet", "info", "generator", "footer",
  "header", "pict", "object", "nonshppict", "themedata", "colorschememapping",
]);

export function rtfParaTexto(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let bruto = "";
  for (const b of bytes) {
    if (b >= 0xa0) bruto += String.fromCharCode(b);
    else bruto += CP1252_EXTRA[b] ?? String.fromCharCode(b);
  }

  type Escopo = { uc: number; descartar: boolean };
  const pilha: Escopo[] = [{ uc: 1, descartar: false }];
  let saida = "";
  let i = 0;

  while (i < bruto.length) {
    const ch = bruto[i];
    const topo = pilha[pilha.length - 1]!;

    if (ch === "{") {
      pilha.push({ uc: topo.uc, descartar: topo.descartar });
      i++;
      continue;
    }
    if (ch === "}") {
      if (pilha.length > 1) pilha.pop();
      i++;
      continue;
    }
    if (ch === "\\") {
      const prox = bruto[i + 1];
      if (prox === "*") {
        // "{\*\palavra ...}" -- destino de extensão: descarta o grupo
        // inteiro (é assim que "generator"/"fldinst" aparecem aqui).
        topo.descartar = true;
        i += 2;
        continue;
      }
      if (prox && /[a-zA-Z]/.test(prox)) {
        let k = i + 1;
        while (k < bruto.length && /[a-zA-Z]/.test(bruto[k]!)) k++;
        const palavra = bruto.slice(i + 1, k);
        let m = k;
        let negativo = false;
        if (bruto[m] === "-") {
          negativo = true;
          m++;
        }
        const inicioNum = m;
        while (m < bruto.length && /[0-9]/.test(bruto[m]!)) m++;
        const temNum = m > inicioNum;
        const num = temNum ? parseInt(bruto.slice(inicioNum, m), 10) * (negativo ? -1 : 1) : null;
        let fim = m;
        if (bruto[fim] === " ") fim++;

        if (GRUPOS_DESCARTAVEIS.has(palavra)) {
          topo.descartar = true;
        } else if (palavra === "uc") {
          topo.uc = num ?? 1;
        } else if (!topo.descartar) {
          if (palavra === "par" || palavra === "line") saida += "\n";
          else if (palavra === "tab") saida += "\t";
          else if (palavra === "u") {
            let codigo = num ?? 0;
            if (codigo < 0) codigo += 65536;
            saida += String.fromCharCode(codigo);
            // Pula o(s) caractere(s) de fallback ANSI que o RTF exige
            // logo após "\uN" (quantidade definida por \ucN, padrão 1).
            let pulados = 0;
            let p = fim;
            while (pulados < topo.uc && p < bruto.length) {
              if (bruto[p] === "\\" || bruto[p] === "{" || bruto[p] === "}") break;
              p++;
              pulados++;
            }
            fim = p;
          }
        }
        i = fim;
        continue;
      }
      if (prox != null) {
        if (!topo.descartar) saida += prox;
        i += 2;
        continue;
      }
    }
    if (!topo.descartar) saida += ch;
    i++;
  }
  return saida;
}

// --- Separação em recortes individuais ----------------------------------
// Cada arquivo do Alerte pode conter vários recortes (um por publicação
// encontrada), cada um começando com uma linha "(N/M)" e terminando num
// bloco "FIM DO RECORTE". O nome da pesquisa (embarcação/empresa que
// disparou o recorte) é sempre a última linha não vazia antes do "(N/M)".
const MARCADOR_RECORTE = /^\((\d+)\/(\d+)\)\s*$/;

export type RecorteAlerta = {
  idx: number;
  pacote: string;
  pesquisa: string | null;
  estruturado: boolean;
  tribunal: string | null;
  orgao: string | null;
  dataDisponibilizacao: string | null;
  tipoComunicacao: string | null;
  cnjDigits: string | null;
  cnjTexto: string | null;
  classeJudicial: string | null;
  partes: string[];
  texto: string;
};

function pegarCampo(linhas: string[], rotulo: RegExp): string | null {
  for (const linha of linhas) {
    const m = linha.match(rotulo);
    if (m) return m[1]!.trim();
  }
  return null;
}

function parsearRecorte(idx: number, pacote: string, pesquisa: string | null, bloco: string): RecorteAlerta {
  const linhas = bloco.split("\n").map((l) => l.trim());
  const tribunal = pegarCampo(linhas, /^Tribunal:\s*(.+)$/);
  const processoLinha = pegarCampo(linhas, /^Processo:\s*([\d.\-]+)/);
  const estruturado = tribunal != null && processoLinha != null;

  const cnjDigits = processoLinha ? processoLinha.replace(/\D/g, "") : null;
  const classeBruta = pegarCampo(linhas, /^Classe judicial:\s*(.+)$/);
  const classeJudicial = classeBruta ? classeBruta.replace(/\s*\(\d+\)\s*$/, "").trim() : null;

  const idxDestinatarios = linhas.findIndex((l) => /^Destinat[áa]rios:\s*$/.test(l));
  const idxAdvogados = linhas.findIndex((l) => /^Advogados dos Destinat[áa]rios:\s*$/.test(l));
  const idxTexto = linhas.findIndex((l) => /^Texto:/.test(l));
  const partes: string[] = [];
  if (idxDestinatarios !== -1) {
    const fim = idxAdvogados !== -1 ? idxAdvogados : idxTexto !== -1 ? idxTexto : linhas.length;
    for (let j = idxDestinatarios + 1; j < fim; j++) {
      const m = linhas[j]!.match(/^Nome:\s*(.+)$/);
      if (m) partes.push(m[1]!.trim());
    }
  }

  let texto: string;
  if (idxTexto !== -1) {
    const resto = linhas.slice(idxTexto).join("\n").replace(/^Texto:\s*/, "");
    // Corta no separador de rodapé do recorte (linha de hifens), se tiver.
    const corteFinal = resto.search(/\n-{10,}\s*$/m);
    texto = (corteFinal !== -1 ? resto.slice(0, corteFinal) : resto).trim();
  } else {
    // Recorte "solto" (DO1, CARF, TCU etc.) -- sem campos estruturados.
    // O cabeçalho decorativo do Alerte (telefone, borda, "Página: N") se
    // repete idêntico em todo recorte -- corta tudo até a última borda
    // antes do conteúdo real, senão vira ruído (e faz recortes diferentes
    // parecerem iguais na deduplicação, já que o início ficaria idêntico).
    const linhasBloco = bloco.split("\n");
    const REGEX_BORDA = /^[─-▟\s]{10,}$/;
    let ultimaBorda = -1;
    for (let j = 0; j < Math.min(linhasBloco.length, 20); j++) {
      if (REGEX_BORDA.test(linhasBloco[j]!.trim())) ultimaBorda = j;
    }
    texto = linhasBloco
      .slice(ultimaBorda + 1)
      .join("\n")
      .trim();
  }

  return {
    idx,
    pacote,
    pesquisa,
    estruturado,
    tribunal,
    orgao: pegarCampo(linhas, /^[ÓO]rg[ãa]o:\s*(.+)$/),
    dataDisponibilizacao: pegarCampo(linhas, /^Data de disponibiliza[çc][ãa]o:\s*(\d{2}\/\d{2}\/\d{4})/),
    tipoComunicacao: pegarCampo(linhas, /^Tipo de comunica[çc][ãa]o:\s*(.+)$/),
    cnjDigits: cnjDigits && cnjDigits.length >= 15 ? cnjDigits : null,
    cnjTexto: cnjDigits && cnjDigits.length >= 15 ? formatarCNJ(cnjDigits) : processoLinha,
    classeJudicial,
    partes,
    texto,
  };
}

export function extrairRecortes(textoCompleto: string, nomeArquivo: string): RecorteAlerta[] {
  const pacote = nomeArquivo.replace(/\.(doc|rtf|txt)$/i, "").replace(/_sd$/i, "");
  const linhasBrutas = textoCompleto.split("\n");

  const marcadores: { linha: number; pesquisa: string | null }[] = [];
  let ultimaNaoVazia: string | null = null;
  for (let i = 0; i < linhasBrutas.length; i++) {
    const linha = linhasBrutas[i]!.trim();
    if (MARCADOR_RECORTE.test(linha)) {
      marcadores.push({ linha: i, pesquisa: ultimaNaoVazia });
    } else if (linha) {
      ultimaNaoVazia = linha;
    }
  }

  const recortes: RecorteAlerta[] = [];
  marcadores.forEach((m, i) => {
    const fim = i + 1 < marcadores.length ? marcadores[i + 1]!.linha : linhasBrutas.length;
    const bloco = linhasBrutas.slice(m.linha + 1, fim).join("\n");
    recortes.push(parsearRecorte(recortes.length, pacote, m.pesquisa, bloco));
  });
  return recortes;
}

// --- Classificação -------------------------------------------------------
export type TierAlerta = "confirmado" | "candidato" | "descartado";

export type RecorteClassificado = RecorteAlerta & {
  trabalhista: boolean;
  tier: TierAlerta;
  motivo: string;
  processo: Processo | null;
};

const REGEX_TRABALHISTA_TRIBUNAL = /^(TRT|TST)\b/i;
const REGEX_TRABALHISTA_CLASSE = /trabalhist/i;

// O mesmo recorte às vezes vem duplicado no arquivo (o próprio Alerte já
// avisa isso no corpo do e-mail: "Total de recortes" x "Recortes únicos")
// -- junta por processo+início do texto antes de classificar, senão o
// mesmo caso aparece repetido no e-mail final.
export function deduplicarRecortes(recortes: RecorteAlerta[]): RecorteAlerta[] {
  const vistos = new Set<string>();
  const unicos: RecorteAlerta[] = [];
  for (const r of recortes) {
    const chave = `${r.cnjDigits ?? ""}|${normalizarNome(r.texto).slice(0, 200)}`;
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    unicos.push(r);
  }
  return unicos;
}

// O gerador de RTF do Alerte come o espaço logo depois de uma mudança de
// formatação dentro do nome (ele negrita o termo da pesquisa dentro do
// nome da parte) -- "ASTROMARÍTIMA NAVEGAÇÃO" sai colado como
// "ASTROMARÍTIMANAVEGAÇÃO". Por isso a comparação tenta primeiro normal
// e, se não bater, tenta de novo ignorando todo espaço dos dois lados.
function contemNome(alvoNorm: string, nomeNorm: string): boolean {
  if (!nomeNorm) return false;
  if (alvoNorm.includes(nomeNorm)) return true;
  const semEspacoAlvo = alvoNorm.replace(/\s+/g, "");
  const semEspacoNome = nomeNorm.replace(/\s+/g, "");
  return semEspacoNome.length > 0 && semEspacoAlvo.includes(semEspacoNome);
}

export function classificarRecortes(
  recortes: RecorteAlerta[],
  processos: Processo[],
  nomesMonitorados: string[],
): RecorteClassificado[] {
  const processosPorCnj = new Map<string, Processo>();
  for (const p of processos) {
    const digits = p.numero_cnj.replace(/\D/g, "");
    if (digits) processosPorCnj.set(digits, p);
  }
  const nomesNorm = nomesMonitorados
    .map((n) => n.trim())
    .filter(Boolean)
    .map((n) => [n, normalizarNome(n)] as const);

  return deduplicarRecortes(recortes).map((r): RecorteClassificado => {
    const trabalhista =
      (r.tribunal != null && REGEX_TRABALHISTA_TRIBUNAL.test(r.tribunal)) ||
      (r.classeJudicial != null && REGEX_TRABALHISTA_CLASSE.test(r.classeJudicial));
    if (trabalhista) {
      return { ...r, trabalhista: true, tier: "descartado", motivo: "Trabalhista", processo: null };
    }

    if (r.cnjDigits) {
      const processo = processosPorCnj.get(r.cnjDigits);
      if (processo) {
        return {
          ...r,
          trabalhista: false,
          tier: "confirmado",
          motivo: "Processo já cadastrado no FaroLex",
          processo,
        };
      }
    }

    // Nos recortes estruturados (DJEN via Alerte), só olha nas partes --
    // no recorte solto (diário/boletim em texto corrido), olha no corpo
    // inteiro, já que não tem campo de parte separado.
    const alvo = r.estruturado ? r.partes.join(" | ") : r.texto;
    const alvoNorm = normalizarNome(alvo);
    const encontrado = nomesNorm.find(([, norm]) => contemNome(alvoNorm, norm));
    if (encontrado) {
      return {
        ...r,
        trabalhista: false,
        tier: "candidato",
        motivo: `Menciona "${encontrado[0]}"`,
        processo: null,
      };
    }

    return {
      ...r,
      trabalhista: false,
      tier: "descartado",
      motivo: "Sem menção a nome monitorado nem processo cadastrado",
      processo: null,
    };
  });
}

// --- Nomes monitorados (lista editável, escritório inteiro) -------------
export async function listarNomesMonitoradosAstro(): Promise<string[]> {
  const { data, error } = await supabaseSolto
    .from("alerta_astro_nomes_monitorados")
    .select("nome")
    .order("ordem");
  if (error) throw error;
  return (data ?? []).map((r: { nome: string }) => r.nome);
}

export async function salvarNomesMonitoradosAstro(nomes: string[]): Promise<void> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;

  const { error: delError } = await supabaseSolto
    .from("alerta_astro_nomes_monitorados")
    .delete()
    .not("id", "is", null);
  if (delError) throw delError;
  if (nomes.length === 0) return;

  const { error: insError } = await supabaseSolto.from("alerta_astro_nomes_monitorados").insert(
    nomes.map((nome, i) => ({ nome, ordem: i, created_by: userData.user?.id ?? null })),
  );
  if (insError) throw insError;
}

// --- Montagem do e-mail ---------------------------------------------------
function linhaRecorte(r: RecorteClassificado): string {
  const partes = [
    r.dataDisponibilizacao,
    r.tribunal,
    r.cnjTexto,
    r.classeJudicial,
    r.estruturado ? r.partes.join(" x ") : null,
  ].filter((v): v is string => !!v);
  const cabecalho = partes.length ? partes.join(" — ") : r.pacote;
  const motivo = r.tier === "confirmado" ? r.motivo : `${r.motivo} (pacote ${r.pacote})`;
  const resumo = r.texto.replace(/\s+/g, " ").trim().slice(0, 300);
  return `${cabecalho}\n${motivo}\n${resumo}${resumo.length >= 300 ? "..." : ""}`;
}

export function montarEmailAlertaAstro(classificados: RecorteClassificado[]): string {
  const confirmados = classificados.filter((r) => r.tier === "confirmado");
  const candidatos = classificados.filter((r) => r.tier === "candidato");
  const descartados = classificados.filter((r) => r.tier === "descartado");
  const trabalhistas = descartados.filter((r) => r.trabalhista).length;

  const blocos: string[] = [
    "Prezados,",
    "",
    "Seguem as publicações do Alerte relevantes para a Astro recebidas hoje.",
  ];

  if (confirmados.length > 0) {
    blocos.push(
      "",
      `CASOS JÁ CADASTRADOS (${confirmados.length})`,
      "─".repeat(40),
      ...confirmados.map(linhaRecorte),
    );
  }
  if (candidatos.length > 0) {
    blocos.push(
      "",
      `CANDIDATOS — CONFIRMAR (${candidatos.length})`,
      "─".repeat(40),
      ...candidatos.map(linhaRecorte),
    );
  }
  if (confirmados.length === 0 && candidatos.length === 0) {
    blocos.push("", "Nenhuma publicação da Astro identificada hoje (fora as trabalhistas).");
  }

  blocos.push(
    "",
    `Descartados automaticamente: ${descartados.length} (${trabalhistas} trabalhista(s), ${
      descartados.length - trabalhistas
    } sem menção à Astro).`,
  );

  return blocos.join("\n");
}
