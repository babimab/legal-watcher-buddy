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

async function construirPagina(
  modelo: ModeloCorrespondente,
  cliente: ClienteSubstabelecimento,
  item: ItemSubstabelecimento,
  logo: ImagemPdf,
  assinatura: ImagemPdf | null,
  nomeImagemAssinatura = "ImAssinatura",
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

  const reserva = item.comReserva ? "com" : "sem";
  const desenharParagrafo = (corpo: string) => {
    const palavras = montarParagrafoComDestaques(corpo, []);
    const linhas = quebrarPalavras(palavras, larguraUtil, 14, "times");
    linhas.forEach((linha, i) => {
      const ultima = i === linhas.length - 1;
      desenharLinhaMista(p, linha, MARGIN, y + i * 20, 14, "times", ultima ? null : larguraUtil, PRETO);
    });
    y += linhas.length * 20;
  };

  desenharParagrafo(PARAGRAFO_LISTA(reserva, modelo.listaAdvogados));
  y += 20;
  desenharParagrafo(PARAGRAFO_PODERES(cliente.textoOutorgante, item.processo ?? "—"));
  y += 28;

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
    p.image(nomeImagemAssinatura, A4_W / 2 - largAssinatura / 2, y, largAssinatura, altAssinatura);
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
  const pagina = await construirPagina(modelo, cliente, item, logo, assinatura);
  const imagens: Record<string, ImagemPdf> = { ImLogo: logo };
  if (assinatura) imagens["ImAssinatura"] = assinatura;
  const blob = await montarPdf([pagina], imagens);
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
  const paginas = await Promise.all(
    pares.map(({ cliente, item }) => construirPagina(modelo, cliente, item, logo, assinatura)),
  );
  const imagens: Record<string, ImagemPdf> = { ImLogo: logo };
  if (assinatura) imagens["ImAssinatura"] = assinatura;
  return montarPdf(paginas, imagens);
}

export async function gerarPdfsSubstabelecimentosCorrespondenteSeparados(
  modelo: ModeloCorrespondente,
  pares: { cliente: ClienteSubstabelecimento; item: ItemSubstabelecimento }[],
): Promise<{ nomeArquivo: string; blob: Blob }[]> {
  const logo = await carregarLogo();
  const assinatura = await carregarAssinatura(modelo);
  return Promise.all(
    pares.map(async ({ cliente, item }) => {
      const pagina = await construirPagina(modelo, cliente, item, logo, assinatura);
      const imagens: Record<string, ImagemPdf> = { ImLogo: logo };
      if (assinatura) imagens["ImAssinatura"] = assinatura;
      const blob = await montarPdf([pagina], imagens);
      return { nomeArquivo: nomeArquivoSubstabelecimentoCorrespondente(modelo, item), blob };
    }),
  );
}
