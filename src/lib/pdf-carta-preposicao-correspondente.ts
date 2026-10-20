import { type ItemCartaPreposicao, dataPorExtenso } from "@/lib/carta-preposicao";
import { type ClienteSubstabelecimento } from "@/lib/substabelecimento";
import {
  type ModeloCartaPreposicaoCorrespondente,
  obterUrlAssinaturaModeloCartaPreposicaoCorrespondente,
} from "@/lib/modelos-carta-preposicao-correspondente";
import {
  A4_W,
  MARGIN,
  CORES,
  Pagina,
  baixarBlob,
  desenharLinhaMista,
  estimarLargura,
  imagemComoJpeg,
  montarPdf,
  montarParagrafoComDestaques,
  quebrarPalavras,
  type ImagemPdf,
} from "@/lib/pdf-base";

const LOGO_URL = "/bcw-logo.png";
const PRETO = [0, 0, 0] as const;

const ENDERECOS = [
  "Rua Dom Gerardo, 35, 5º Andar, Centro, CEP: 20090-905, Rio de Janeiro – RJ, Brasil, Tel.: +55(21) 3543-1000",
  "Av. Brigadeiro Faria Lima, 4509, 8º andar, Itaim Bibi, CEP: 04538-133, São Paulo – SP, Brasil, Tel.: +55 (11) 3078-3858",
];

// Modelo "por estado" pra correspondente local, igual o Substabelecimento
// pra Correspondente (pdf-substabelecimento-correspondente.ts): sem
// prepostos nomeados um a um, credencia uma lista enorme pré-cadastrada
// (nome + CPF, igual o modelo real que a BDR mandou -- carta-Muniz).
// Texto final não repete "credenciamos", só "para representar a ___ no
// processo acima detalhado...".
const PARAGRAFO_PODERES = (cliente: string) =>
  `para representar a ${cliente} no processo acima detalhado, podendo, portanto, prestar ` +
  `depoimento pessoal, conciliar em audiência, transigir, firmar compromissos, levantar ` +
  `valores, e tudo mais que se fizer necessário à boa e fiel representação, tudo nos termos ` +
  `dos §§ 9º e 10 do art. 334, CPC.`;

let logoCache: Promise<ImagemPdf> | null = null;
function carregarLogo() {
  if (!logoCache) logoCache = imagemComoJpeg(LOGO_URL, CORES.white);
  return logoCache;
}

async function carregarAssinatura(
  modelo: ModeloCartaPreposicaoCorrespondente,
): Promise<ImagemPdf | null> {
  if (!modelo.assinaturaCaminho) return null;
  const url = await obterUrlAssinaturaModeloCartaPreposicaoCorrespondente(modelo.assinaturaCaminho);
  return imagemComoJpeg(url, CORES.white);
}

// Abaixo disso quebra pra próxima página -- deixa uma folga antes do
// rodapé (que começa em 780).
const LIMITE_Y = 755;

function desenharRodape(p: Pagina) {
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
}

function desenharLogo(p: Pagina, logo: ImagemPdf) {
  const logoRatio = logo.width / logo.height;
  const logoW = 110;
  const logoH = logoW / logoRatio;
  p.image("ImLogo", MARGIN, 40, logoW, logoH);
}

// Trava largura E altura -- a imagem enviada às vezes tem bastante
// espaço em branco ao redor do traço da assinatura em si, o que deixa
// o recorte quase quadrado; limitando só a largura, esse tipo de
// imagem sai bem maior que uma assinatura de verdade.
function dimensoesAssinatura(assinatura: ImagemPdf) {
  const LARGURA_MAX = 200;
  const ALTURA_MAX = 70;
  const razao = assinatura.width / assinatura.height;
  let largura = LARGURA_MAX;
  let altura = largura / razao;
  if (altura > ALTURA_MAX) {
    altura = ALTURA_MAX;
    largura = altura * razao;
  }
  return { largura, altura };
}

function desenharCampo(p: Pagina, rotulo: string, valor: string, y: number): number {
  const tamanho = 12;
  p.text(rotulo, MARGIN, y, tamanho, { bold: true, color: PRETO, fonte: "times" });
  const larguraRotulo = estimarLargura(rotulo, tamanho, true, "times");
  p.text(valor, MARGIN + larguraRotulo, y, tamanho, { color: PRETO, fonte: "times" });
  return y + 18;
}

// A lista de prepostos pode ter centenas de nomes (igual a de
// correspondentes do Substabelecimento) -- não cabe numa página só, por
// isso esse gerador devolve várias páginas por documento quando
// precisa.
async function construirPaginas(
  modelo: ModeloCartaPreposicaoCorrespondente,
  cliente: ClienteSubstabelecimento,
  item: ItemCartaPreposicao,
  logo: ImagemPdf,
  assinatura: ImagemPdf | null,
  nomeImagemAssinatura = "ImAssinatura",
): Promise<Pagina[]> {
  const larguraUtil = A4_W - MARGIN * 2;
  const paginas: Pagina[] = [];
  let p = new Pagina();
  let y = 140;

  desenharLogo(p, logo);
  p.text("CARTA DE PREPOSIÇÃO", A4_W / 2, y, 16, {
    bold: true,
    color: PRETO,
    align: "center",
    fonte: "times",
  });
  y += 40;

  const novaPagina = () => {
    desenharRodape(p);
    paginas.push(p);
    p = new Pagina();
    desenharLogo(p, logo);
    y = 100;
  };

  y = desenharCampo(p, "Processo: ", item.processo ?? "—", y);
  y += 6;
  y = desenharCampo(p, "Polo Ativo: ", item.poloAtivo ?? "—", y);
  y += 6;
  y = desenharCampo(p, "Foro/Comarca: ", item.juizo ?? "—", y);
  y += 20;

  const TAMANHO_FONTE = 12;
  const ALTURA_LINHA = 17;
  const desenharParagrafo = (corpo: string) => {
    const palavras = montarParagrafoComDestaques(corpo, []);
    const linhas = quebrarPalavras(palavras, larguraUtil, TAMANHO_FONTE, "times");
    linhas.forEach((linha, i) => {
      if (y > LIMITE_Y) novaPagina();
      const ultima = i === linhas.length - 1;
      desenharLinhaMista(
        p,
        linha,
        MARGIN,
        y,
        TAMANHO_FONTE,
        "times",
        ultima ? null : larguraUtil,
        PRETO,
      );
      y += ALTURA_LINHA;
    });
  };

  desenharParagrafo(`${modelo.listaPrepostos}.`);
  y += ALTURA_LINHA;
  desenharParagrafo(PARAGRAFO_PODERES(cliente.textoOutorgante));
  y += 24;

  const { largura: largAssinatura, altura: altAssinatura } = assinatura
    ? dimensoesAssinatura(assinatura)
    : { largura: 0, altura: 0 };
  const espacoFinal = 32 + (assinatura ? altAssinatura + 40 : 0);
  if (y + espacoFinal > LIMITE_Y) novaPagina();

  p.text(`${item.cidade}, ${dataPorExtenso(item.data)}.`, A4_W / 2, y, 12, {
    color: PRETO,
    fonte: "times",
    align: "center",
  });
  y += 32;

  if (assinatura) {
    p.image(nomeImagemAssinatura, A4_W / 2 - largAssinatura / 2, y, largAssinatura, altAssinatura);
    y += altAssinatura + 6;
    if (modelo.assinanteNome) {
      p.text(modelo.assinanteNome, A4_W / 2, y, 10, {
        bold: true,
        align: "center",
        fonte: "times",
        color: PRETO,
      });
      y += 13;
    }
    if (modelo.assinanteOab) {
      p.text(modelo.assinanteOab, A4_W / 2, y, 9, {
        align: "center",
        fonte: "times",
        color: PRETO,
      });
    }
  }

  desenharRodape(p);
  paginas.push(p);
  return paginas;
}

export function nomeArquivoCartaPreposicaoCorrespondente(
  modelo: ModeloCartaPreposicaoCorrespondente,
  item: ItemCartaPreposicao,
): string {
  const base = (item.processo ?? String(item.idx + 1))
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `carta-preposicao-correspondente-${modelo.id}-${base || item.idx + 1}.pdf`;
}

export async function gerarEBaixarPdfCartaPreposicaoCorrespondente(
  modelo: ModeloCartaPreposicaoCorrespondente,
  cliente: ClienteSubstabelecimento,
  item: ItemCartaPreposicao,
): Promise<void> {
  const logo = await carregarLogo();
  const assinatura = await carregarAssinatura(modelo);
  const paginas = await construirPaginas(modelo, cliente, item, logo, assinatura);
  const imagens: Record<string, ImagemPdf> = { ImLogo: logo };
  if (assinatura) imagens["ImAssinatura"] = assinatura;
  const blob = await montarPdf(paginas, imagens);
  baixarBlob(blob, nomeArquivoCartaPreposicaoCorrespondente(modelo, item));
}

// Lote combinado num PDF só -- o modelo (estado/correspondente) é o
// mesmo pro lote inteiro (escolhido no seletor), só a companhia muda
// linha a linha (casada por "Cia aérea"/"Polo Passivo").
export async function gerarPdfCartasPreposicaoCorrespondente(
  modelo: ModeloCartaPreposicaoCorrespondente,
  pares: { cliente: ClienteSubstabelecimento; item: ItemCartaPreposicao }[],
): Promise<Blob> {
  const logo = await carregarLogo();
  const assinatura = await carregarAssinatura(modelo);
  const paginasPorPar = await Promise.all(
    pares.map(({ cliente, item }) => construirPaginas(modelo, cliente, item, logo, assinatura)),
  );
  const imagens: Record<string, ImagemPdf> = { ImLogo: logo };
  if (assinatura) imagens["ImAssinatura"] = assinatura;
  return montarPdf(paginasPorPar.flat(), imagens);
}

export async function gerarPdfsCartasPreposicaoCorrespondenteSeparadas(
  modelo: ModeloCartaPreposicaoCorrespondente,
  pares: { cliente: ClienteSubstabelecimento; item: ItemCartaPreposicao }[],
): Promise<{ nomeArquivo: string; blob: Blob }[]> {
  const logo = await carregarLogo();
  const assinatura = await carregarAssinatura(modelo);
  return Promise.all(
    pares.map(async ({ cliente, item }) => {
      const paginas = await construirPaginas(modelo, cliente, item, logo, assinatura);
      const imagens: Record<string, ImagemPdf> = { ImLogo: logo };
      if (assinatura) imagens["ImAssinatura"] = assinatura;
      const blob = await montarPdf(paginas, imagens);
      return { nomeArquivo: nomeArquivoCartaPreposicaoCorrespondente(modelo, item), blob };
    }),
  );
}
