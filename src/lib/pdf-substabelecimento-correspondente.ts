import { type ItemSubstabelecimento, type ClienteSubstabelecimento, dataPorExtenso } from "@/lib/substabelecimento";
import { type ModeloCorrespondente, obterUrlAssinaturaModeloCorrespondente } from "@/lib/modelos-correspondente";
import {
  A4_W,
  MARGIN,
  CORES,
  Pagina,
  baixarBlob,
  desenharLinhaMista,
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

// Modelo bem mais simples que o Substabelecimento pra Advogados BCW:
// sem "movido por"/"em trâmite perante" (sem autor, sem juízo) -- só a
// lista de correspondentes, a companhia que concedeu os poderes
// originalmente e o número do processo. Texto exatamente como no
// modelo real (substabelecimentos-MXA-completonovo.pdf) que a BDR
// mandou, com reserva/companhia/processo como únicos pontos variáveis.
const PARAGRAFO_LISTA = (reserva: string, listaAdvogados: string) =>
  `Substabeleço, ${reserva} reserva, na pessoa de: ${listaAdvogados}.`;

const PARAGRAFO_PODERES = (cliente: string, processo: string) =>
  `Os poderes que me foram conferidos por ${cliente}, nos autos do processo nº ${processo}.`;

let logoCache: Promise<ImagemPdf> | null = null;
function carregarLogo() {
  if (!logoCache) logoCache = imagemComoJpeg(LOGO_URL, CORES.white);
  return logoCache;
}

async function carregarAssinatura(modelo: ModeloCorrespondente): Promise<ImagemPdf | null> {
  if (!modelo.assinaturaCaminho) return null;
  const url = await obterUrlAssinaturaModeloCorrespondente(modelo.assinaturaCaminho);
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

// A lista de correspondentes pode ter centenas de nomes (ex.: RJ, ~310
// advogados) -- não cabe numa página só, diferente do Substabelecimento
// pra Advogados BCW (só 12 nomes fixos). Por isso esse gerador devolve
// várias páginas por documento quando precisa, quebrando o texto antes
// de bater no rodapé (sem gente, texto estourava em cima do rodapé e
// empurrava a assinatura pra fora da área visível).
async function construirPaginas(
  modelo: ModeloCorrespondente,
  cliente: ClienteSubstabelecimento,
  item: ItemSubstabelecimento,
  logo: ImagemPdf,
  assinatura: ImagemPdf | null,
  nomeImagemAssinatura = "ImAssinatura",
): Promise<Pagina[]> {
  const larguraUtil = A4_W - MARGIN * 2;
  const paginas: Pagina[] = [];
  let p = new Pagina();
  let y = 140;

  desenharLogo(p, logo);
  p.text("SUBSTABELECIMENTO", A4_W / 2, y, 16, {
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

  const reserva = item.comReserva ? "com" : "sem";
  const desenharParagrafo = (corpo: string) => {
    const palavras = montarParagrafoComDestaques(corpo, []);
    const linhas = quebrarPalavras(palavras, larguraUtil, 14, "times");
    linhas.forEach((linha, i) => {
      if (y > LIMITE_Y) novaPagina();
      const ultima = i === linhas.length - 1;
      desenharLinhaMista(p, linha, MARGIN, y, 14, "times", ultima ? null : larguraUtil, PRETO);
      y += 20;
    });
  };

  desenharParagrafo(PARAGRAFO_LISTA(reserva, modelo.listaAdvogados));
  y += 20;
  desenharParagrafo(PARAGRAFO_PODERES(cliente.textoOutorgante, item.processo ?? "—"));
  y += 28;

  const altAssinatura = assinatura ? 320 / (assinatura.width / assinatura.height) : 0;
  // Espaço pra assinatura + nome + OAB impressos embaixo dela (igual o
  // modelo real -- só a imagem da assinatura, sem identificar quem
  // assina, fica sem serventia numa lista de centenas de nomes).
  const espacoFinal = 36 + (assinatura ? altAssinatura + 50 : 0);
  if (y + espacoFinal > LIMITE_Y) novaPagina();

  p.text(`${item.cidade}, ${dataPorExtenso(item.data)}.`, A4_W / 2, y, 14, {
    color: PRETO,
    fonte: "times",
    align: "center",
  });
  y += 36;

  if (assinatura) {
    const largAssinatura = 320;
    p.image(nomeImagemAssinatura, A4_W / 2 - largAssinatura / 2, y, largAssinatura, altAssinatura);
    y += altAssinatura + 6;
    if (modelo.assinanteNome) {
      p.text(modelo.assinanteNome, A4_W / 2, y, 11, {
        bold: true,
        align: "center",
        fonte: "times",
        color: PRETO,
      });
      y += 14;
    }
    if (modelo.assinanteOab) {
      p.text(modelo.assinanteOab, A4_W / 2, y, 10, {
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

export function nomeArquivoSubstabelecimentoCorrespondente(
  modelo: ModeloCorrespondente,
  item: ItemSubstabelecimento,
): string {
  const base = (item.processo ?? String(item.idx + 1))
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `substabelecimento-correspondente-${modelo.id}-${base || item.idx + 1}.pdf`;
}

export async function gerarEBaixarPdfSubstabelecimentoCorrespondente(
  modelo: ModeloCorrespondente,
  cliente: ClienteSubstabelecimento,
  item: ItemSubstabelecimento,
): Promise<void> {
  const logo = await carregarLogo();
  const assinatura = await carregarAssinatura(modelo);
  const paginas = await construirPaginas(modelo, cliente, item, logo, assinatura);
  const imagens: Record<string, ImagemPdf> = { ImLogo: logo };
  if (assinatura) imagens["ImAssinatura"] = assinatura;
  const blob = await montarPdf(paginas, imagens);
  baixarBlob(blob, nomeArquivoSubstabelecimentoCorrespondente(modelo, item));
}

// Lote combinado num PDF só -- o modelo (estado/correspondente) é o
// mesmo pro lote inteiro (escolhido no seletor), só a companhia muda
// linha a linha (casada por "Cia aérea", igual o Substabelecimento
// normal).
export async function gerarPdfSubstabelecimentosCorrespondente(
  modelo: ModeloCorrespondente,
  pares: { cliente: ClienteSubstabelecimento; item: ItemSubstabelecimento }[],
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

export async function gerarPdfsSubstabelecimentosCorrespondenteSeparados(
  modelo: ModeloCorrespondente,
  pares: { cliente: ClienteSubstabelecimento; item: ItemSubstabelecimento }[],
): Promise<{ nomeArquivo: string; blob: Blob }[]> {
  const logo = await carregarLogo();
  const assinatura = await carregarAssinatura(modelo);
  return Promise.all(
    pares.map(async ({ cliente, item }) => {
      const paginas = await construirPaginas(modelo, cliente, item, logo, assinatura);
      const imagens: Record<string, ImagemPdf> = { ImLogo: logo };
      if (assinatura) imagens["ImAssinatura"] = assinatura;
      const blob = await montarPdf(paginas, imagens);
      return { nomeArquivo: nomeArquivoSubstabelecimentoCorrespondente(modelo, item), blob };
    }),
  );
}
