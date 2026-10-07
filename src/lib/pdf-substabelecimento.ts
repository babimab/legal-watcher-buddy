import {
  type ClienteSubstabelecimento,
  type ItemSubstabelecimento,
  dataPorExtenso,
  nomeArquivoSubstabelecimento,
} from "@/lib/substabelecimento";
import {
  A4_W,
  MARGIN,
  CORES,
  Pagina,
  baixarBlob,
  estimarLargura,
  imagemComoJpeg,
  montarPdf,
  type ImagemPdf,
} from "@/lib/pdf-base";

const LOGO_URL = "/bcw-logo.png";

// Corpo em preto puro (não o navy/slate CORES.text usado no resto do
// app) -- é o que o modelo real em Word usa, CORES.text ficava meio
// apagado nesse documento mais formal.
const PRETO = [0, 0, 0] as const;

const ENDERECOS = [
  "Rua Dom Gerardo, 35, 5º Andar, Centro, CEP: 20090-905, Rio de Janeiro – RJ, Brasil, Tel.: +55(21) 3543-1000",
  "Av. Brigadeiro Faria Lima, 4509, 8º andar, Itaim Bibi, CEP: 04538-133, São Paulo – SP, Brasil, Tel.: +55 (11) 3078-3858",
];

// Texto fixo do rol de advogados que recebem os poderes -- é o mesmo
// texto do modelo real (MODELO_Substabelecimento_BCW), não pode ser
// reescrito/resumido, é cláusula jurídica. {RESERVA}/{CLIENTE}/
// {PROCESSO}/{AUTOR}/{JUIZO} são os únicos pontos que variam.
const CORPO_RECEBENDO = (
  reserva: string,
  cliente: string,
  processo: string,
  autor: string,
  juizo: string,
) =>
  `Substabeleço, ${reserva} reservas, nas pessoas de Paulo Rogério de Araújo Brandão Couto, ` +
  `Walter Wigderowitz Neto, Josina Graffites da Costa, Joanice Maria Moreno da Costa, Isabel ` +
  `Linara Rodrigues da Silva, Jessica Valente Silva, João Lucas Cassibi Sillero e Giovanna ` +
  `Nascimento de Almeida Cardão, brasileiros, advogados, inscritos na OAB/RJ respectivamente ` +
  `sob os nos 33.996, 61.287, 120.445, 174.037, 264.096, 254.002, 237.711 e 253.568 com os ` +
  `seguintes endereços eletrônicos: prcouto@bcw.com.br, wwigderowitz@bcw.com.br, ` +
  `jcosta@bcw.com.br, jnc@bcw.com.br, ilr@bcw.com.br, jnv@bcw.com.br, jll@bcw.com.br e ` +
  `gnc@bcw.com.br, Nalu Yunes Marones de Gusmão, inscrita na OAB/RJ sob o nº 93.492, OAB/SP ` +
  `sob o nº 288.600 e OAB/AL sob o nº 23098A, endereço eletrônico ngusmao@bcw.com.br, Eliane ` +
  `Leve, inscrita na OAB/RJ sob o nº 117.534, OAB/RS sob o nº 121.437A e OAB/SC sob o nº ` +
  `53.263, endereço eletrônico elv@bcw.com.br, Carlos Alexandre Guimaraes Pessoa, inscrito na ` +
  `OAB/RJ sob o nº 80.572, OAB/ES sob o nº 43.298 e OAB/SP sob o nº 288.595, endereço ` +
  `eletrônico cgp@bcw.com.br, e Gustavo A. Faria Cortines, inscrito na OAB/RJ sob o nº ` +
  `103.502 e OAB/DF sob o nº 81.394, endereço eletrônico gfc@bcw.com.br, todos integrantes da ` +
  `sociedade de advogados Brandão Couto, Wigderowitz e Pessoa Advogados, inscrito na OAB/RJ ` +
  `sob o n.º 21656/2007, com sede na rua Dom Gerardo, nº 35 – 5º andar – CEP 20.090-030 – Rio ` +
  `de Janeiro – RJ, os poderes que me foram conferidos por ${cliente}, para representá-la nos ` +
  `autos do processo nº ${processo}, movido por ${autor}, em trâmite perante ${juizo}.`;

// Nomes dos advogados substabelecidos, exatamente como aparecem no texto
// acima -- usados só pra marcar onde entra negrito+versalete (igual o
// modelo real em Word). O nome do cliente ({cliente} no template) entra
// na mesma lista na hora de montar o parágrafo.
const NOMES_ADVOGADOS = [
  "Paulo Rogério de Araújo Brandão Couto",
  "Walter Wigderowitz Neto",
  "Josina Graffites da Costa",
  "Joanice Maria Moreno da Costa",
  "Isabel Linara Rodrigues da Silva",
  "Jessica Valente Silva",
  "João Lucas Cassibi Sillero",
  "Giovanna Nascimento de Almeida Cardão",
  "Nalu Yunes Marones de Gusmão",
  "Eliane Leve",
  "Carlos Alexandre Guimaraes Pessoa",
  "Gustavo A. Faria Cortines",
];

// Versalete (small caps) não existe nas fontes padrão do PDF -- a gente
// finge: letra minúscula vira maiúscula só que menor. 0.74 é a
// proporção comum desse efeito (perto do que o Word usa).
const ESCALA_VERSALETE = 0.74;

type Subrun = { texto: string; bold: boolean; versalete: boolean };
type Palavra = { subruns: Subrun[] };

function faixasEmNegritoVersalete(corpo: string, cliente: string) {
  const faixas: { inicio: number; fim: number }[] = [];
  for (const alvo of [...NOMES_ADVOGADOS, cliente]) {
    const inicio = corpo.indexOf(alvo);
    if (inicio >= 0) faixas.push({ inicio, fim: inicio + alvo.length });
  }
  return faixas.sort((a, b) => a.inicio - b.inicio);
}

// Quebra o parágrafo em "palavras" (separadas por espaço, igual
// quebrarTexto), mas cada palavra carrega pedaços (subruns) com o
// estilo (negrito+versalete ou normal) de cada trecho dela -- preciso
// disso pra pontuação colada no nome (ex.: "Couto,") sair só o nome em
// negrito e a vírgula normal.
function montarParagrafo(corpo: string, cliente: string): Palavra[] {
  const faixas = faixasEmNegritoVersalete(corpo, cliente);
  const estiloNoIndice = (i: number) => faixas.some((f) => i >= f.inicio && i < f.fim);

  const palavras: Palavra[] = [];
  let atual: Subrun[] = [];
  const flush = () => {
    if (atual.length > 0) palavras.push({ subruns: atual });
    atual = [];
  };

  [...corpo].forEach((ch, i) => {
    if (ch === " ") {
      flush();
      return;
    }
    const estilizado = estiloNoIndice(i);
    const ultimo = atual[atual.length - 1];
    if (ultimo && ultimo.bold === estilizado && ultimo.versalete === estilizado) {
      ultimo.texto += ch;
    } else {
      atual.push({ texto: ch, bold: estilizado, versalete: estilizado });
    }
  });
  flush();

  return palavras;
}

function larguraSubrun(sub: Subrun, tamanho: number, fonte: "times") {
  if (!sub.versalete) return estimarLargura(sub.texto, tamanho, sub.bold, fonte);
  let total = 0;
  for (const ch of sub.texto) {
    const minuscula = ch !== ch.toUpperCase();
    total += estimarLargura(
      ch.toUpperCase(),
      minuscula ? tamanho * ESCALA_VERSALETE : tamanho,
      sub.bold,
      fonte,
    );
  }
  return total;
}

function larguraPalavra(p: Palavra, tamanho: number, fonte: "times") {
  return p.subruns.reduce((acc, s) => acc + larguraSubrun(s, tamanho, fonte), 0);
}

function quebrarPalavras(
  palavras: Palavra[],
  largura: number,
  tamanho: number,
  fonte: "times",
): Palavra[][] {
  const larguraEspaco = estimarLargura(" ", tamanho, false, fonte);
  const linhas: Palavra[][] = [];
  let atual: Palavra[] = [];
  let larguraAtual = 0;
  for (const palavra of palavras) {
    const w = larguraPalavra(palavra, tamanho, fonte);
    const extra = atual.length === 0 ? w : larguraEspaco + w;
    if (atual.length > 0 && larguraAtual + extra > largura) {
      linhas.push(atual);
      atual = [palavra];
      larguraAtual = w;
    } else {
      atual.push(palavra);
      larguraAtual += extra;
    }
  }
  if (atual.length > 0) linhas.push(atual);
  return linhas;
}

// Desenha uma linha palavra por palavra (em vez de um Tj só) pra poder
// misturar negrito+versalete com texto normal. A justificação (margem
// reta) é feita abrindo manualmente o espaço entre as palavras, em vez
// de usar o operador Tw do PDF -- mais simples aqui porque a largura de
// cada palavra já varia por causa do versalete.
function desenharLinhaMista(
  p: Pagina,
  linha: Palavra[],
  x0: number,
  yTopo: number,
  tamanho: number,
  fonte: "times",
  larguraAlvo: number | null,
) {
  const larguraEspacoBase = estimarLargura(" ", tamanho, false, fonte);
  const larguraNatural =
    linha.reduce((acc, palavra) => acc + larguraPalavra(palavra, tamanho, fonte), 0) +
    (linha.length - 1) * larguraEspacoBase;
  const gaps = linha.length - 1;
  const espacoExtra =
    larguraAlvo != null && gaps > 0 && larguraNatural < larguraAlvo
      ? (larguraAlvo - larguraNatural) / gaps
      : 0;
  const larguraEspaco = larguraEspacoBase + espacoExtra;

  let x = x0;
  linha.forEach((palavra, i) => {
    for (const sub of palavra.subruns) {
      if (!sub.versalete) {
        p.text(sub.texto, x, yTopo, tamanho, { bold: sub.bold, color: PRETO, fonte });
        x += estimarLargura(sub.texto, tamanho, sub.bold, fonte);
      } else {
        for (const ch of sub.texto) {
          const minuscula = ch !== ch.toUpperCase();
          const tam = minuscula ? tamanho * ESCALA_VERSALETE : tamanho;
          const chDesenhado = ch.toUpperCase();
          p.text(chDesenhado, x, yTopo, tam, { bold: sub.bold, color: PRETO, fonte });
          x += estimarLargura(chDesenhado, tam, sub.bold, fonte);
        }
      }
    }
    if (i < linha.length - 1) x += larguraEspaco;
  });
}

let logoCache: Promise<ImagemPdf> | null = null;
function carregarLogo() {
  if (!logoCache) logoCache = imagemComoJpeg(LOGO_URL, CORES.white);
  return logoCache;
}

const cacheAssinatura = new Map<string, Promise<ImagemPdf>>();
function carregarAssinatura(url: string) {
  let p = cacheAssinatura.get(url);
  if (!p) {
    p = imagemComoJpeg(url, CORES.white);
    cacheAssinatura.set(url, p);
  }
  return p;
}

async function construirPaginaSubstabelecimento(
  cliente: ClienteSubstabelecimento,
  item: ItemSubstabelecimento,
  logo: ImagemPdf,
  assinatura: ImagemPdf | null,
): Promise<Pagina> {
  const larguraUtil = A4_W - MARGIN * 2;
  const p = new Pagina();

  const logoRatio = logo.width / logo.height;
  const logoW = 110;
  const logoH = logoW / logoRatio;
  p.image("ImLogo", MARGIN, 40, logoW, logoH);

  let y = 140;
  p.text("SUBSTABELECIMENTO", A4_W / 2, y, 16, {
    bold: true,
    color: PRETO,
    align: "center",
    fonte: "times",
  });
  y += 40;

  const corpo = CORPO_RECEBENDO(
    item.comReserva ? "com" : "sem",
    cliente.textoOutorgante,
    item.processo ?? "—",
    item.autor ?? "—",
    item.juizo ?? "—",
  );
  const palavras = montarParagrafo(corpo, cliente.textoOutorgante);
  const linhas = quebrarPalavras(palavras, larguraUtil, 14, "times");
  linhas.forEach((linha, i) => {
    // Justifica (margem reta nos dois lados) todas as linhas, exceto a
    // última -- igual no Word, a última linha de um parágrafo fica em
    // trapo (não estica pra preencher a largura toda).
    const ultima = i === linhas.length - 1;
    desenharLinhaMista(p, linha, MARGIN, y + i * 20, 14, "times", ultima ? null : larguraUtil);
  });
  y += linhas.length * 20 + 28;

  p.text(`${item.cidade}, ${dataPorExtenso(item.data)}.`, A4_W / 2, y, 14, {
    color: PRETO,
    fonte: "times",
    align: "center",
  });
  y += 36;

  if (assinatura) {
    const razaoAssinatura = assinatura.width / assinatura.height;
    const largAssinatura = 320;
    const altAssinatura = largAssinatura / razaoAssinatura;
    p.image("ImAssinatura", A4_W / 2 - largAssinatura / 2, y, largAssinatura, altAssinatura);
  }

  const rodapeY = 790;
  p.stroke(CORES.border);
  p.line(MARGIN, rodapeY - 10, A4_W - MARGIN, rodapeY - 10);
  ENDERECOS.forEach((linha, i) => {
    p.text(linha, MARGIN, rodapeY + i * 10, 6.8, { color: CORES.muted });
  });
  p.text("bcw.com.br", MARGIN, rodapeY + ENDERECOS.length * 10 + 2, 6.8, {
    bold: true,
    color: CORES.blue,
  });

  return p;
}

export async function gerarPdfSubstabelecimento(
  cliente: ClienteSubstabelecimento,
  item: ItemSubstabelecimento,
): Promise<Blob> {
  const logo = await carregarLogo();
  const assinatura = cliente.assinante ? await carregarAssinatura(cliente.assinante.imagem) : null;
  const pagina = await construirPaginaSubstabelecimento(cliente, item, logo, assinatura);
  const imagens: Record<string, ImagemPdf> = { ImLogo: logo };
  if (assinatura) imagens["ImAssinatura"] = assinatura;
  return montarPdf([pagina], imagens);
}

export async function gerarEBaixarPdfSubstabelecimento(
  cliente: ClienteSubstabelecimento,
  item: ItemSubstabelecimento,
): Promise<void> {
  const blob = await gerarPdfSubstabelecimento(cliente, item);
  baixarBlob(blob, nomeArquivoSubstabelecimento(cliente, item));
}

export async function gerarPdfSubstabelecimentos(
  cliente: ClienteSubstabelecimento,
  itens: ItemSubstabelecimento[],
): Promise<Blob> {
  const logo = await carregarLogo();
  const assinatura = cliente.assinante ? await carregarAssinatura(cliente.assinante.imagem) : null;
  const paginas = await Promise.all(
    itens.map((item) => construirPaginaSubstabelecimento(cliente, item, logo, assinatura)),
  );
  const imagens: Record<string, ImagemPdf> = { ImLogo: logo };
  if (assinatura) imagens["ImAssinatura"] = assinatura;
  return montarPdf(paginas, imagens);
}
