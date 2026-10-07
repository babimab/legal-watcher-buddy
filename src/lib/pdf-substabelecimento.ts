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
  imagemComoJpeg,
  montarPdf,
  quebrarTexto,
  type ImagemPdf,
} from "@/lib/pdf-base";

const LOGO_URL = "/bcw-logo.png";

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
  p.stroke(CORES.border);
  p.line(MARGIN, 96, A4_W - MARGIN, 96);

  let y = 140;
  p.text("SUBSTABELECIMENTO", A4_W / 2, y, 14, { bold: true, color: CORES.blue, align: "center" });
  y += 36;

  const corpo = CORPO_RECEBENDO(
    item.comReserva ? "com" : "sem",
    cliente.textoOutorgante,
    item.processo ?? "—",
    item.autor ?? "—",
    item.juizo ?? "—",
  );
  const linhas = quebrarTexto(corpo, larguraUtil, 10.5);
  linhas.forEach((linha, i) => {
    p.text(linha, MARGIN, y + i * 16, 10.5, { color: CORES.text });
  });
  y += linhas.length * 16 + 28;

  p.text(`${item.cidade}, ${dataPorExtenso(item.data)}.`, MARGIN, y, 10.5, { color: CORES.text });
  y += 36;

  if (assinatura) {
    const razaoAssinatura = assinatura.width / assinatura.height;
    const largAssinatura = 170;
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
