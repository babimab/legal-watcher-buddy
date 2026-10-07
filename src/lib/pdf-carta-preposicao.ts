import { type ClienteSubstabelecimento } from "@/lib/substabelecimento";
import {
  type ItemCartaPreposicao,
  type Preposto,
  dataPorExtenso,
  nomeArquivoCartaPreposicao,
} from "@/lib/carta-preposicao";
import { obterUrlAssinaturaCliente } from "@/lib/clientes-substabelecimento";
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
  quebrarTexto,
  type ImagemPdf,
} from "@/lib/pdf-base";

const LOGO_URL = "/bcw-logo.png";
const PRETO = [0, 0, 0] as const;
// Mesmo vermelho do modelo real (FF0000) -- destaca os dados variáveis
// (processo/polo ativo/juízo) no alto do documento.
const VERMELHO = [204, 0, 0] as const;

const ENDERECOS = [
  "Rua Dom Gerardo, 35, 5º Andar, Centro, CEP: 20090-905, Rio de Janeiro – RJ, Brasil, Tel.: +55(21) 3543-1000",
  "Av. Brigadeiro Faria Lima, 4509, 8º andar, Itaim Bibi, CEP: 04538-133, São Paulo – SP, Brasil, Tel.: +55 (11) 3078-3858",
];

function trechoPreposto(p: Preposto): string {
  return p.cpf ? `${p.nome}, inscrito(a) no CPF sob o nº ${p.cpf}` : p.nome;
}

function listarPortugues(itens: string[]): string {
  if (itens.length <= 1) return itens[0] ?? "";
  return `${itens.slice(0, -1).join(", ")} e ${itens[itens.length - 1]}`;
}

// Texto fixo da cláusula -- mesmo texto do modelo real (Varnieri). Só
// a lista de prepostos e o nome do cliente variam.
const CORPO_PREPOSICAO = (prepostosTexto: string, plural: boolean, cliente: string) =>
  `Pelo presente, credenciamos como preposto${plural ? "s" : ""} ${prepostosTexto}, para ` +
  `representar a ${cliente} no processo acima detalhado, podendo, portanto, prestar depoimento ` +
  `pessoal, conciliar em audiência, transigir, firmar compromissos, levantar valores, e tudo ` +
  `mais que se fizer necessário à boa e fiel representação, nos termos dos §§ 9º e 10 do art. ` +
  `334, CPC.`;

let logoCache: Promise<ImagemPdf> | null = null;
function carregarLogo() {
  if (!logoCache) logoCache = imagemComoJpeg(LOGO_URL, CORES.white);
  return logoCache;
}

async function carregarAssinatura(cliente: ClienteSubstabelecimento): Promise<ImagemPdf | null> {
  if (!cliente.assinaturaCaminho) return null;
  const url = await obterUrlAssinaturaCliente(cliente.assinaturaCaminho);
  return imagemComoJpeg(url, CORES.white);
}

// Linha "rótulo em negrito preto + valor em vermelho", igual o modelo
// real. Sem rótulo (juízo), é só o valor inteiro em vermelho.
function desenharCampoDestacado(
  p: Pagina,
  rotulo: string | null,
  valor: string,
  y: number,
  larguraUtil: number,
): number {
  const tamanho = 11.5;
  if (!rotulo) {
    const linhas = quebrarTexto(valor, larguraUtil, tamanho, false, "times");
    linhas.forEach((linha, i) => {
      p.text(linha, MARGIN, y + i * 16, tamanho, { color: VERMELHO, fonte: "times" });
    });
    return y + linhas.length * 16;
  }
  p.text(rotulo, MARGIN, y, tamanho, { bold: true, color: PRETO, fonte: "times" });
  const larguraRotulo = estimarLargura(rotulo, tamanho, true, "times");
  p.text(valor, MARGIN + larguraRotulo, y, tamanho, { color: VERMELHO, fonte: "times" });
  return y + 16;
}

async function construirPaginaCartaPreposicao(
  cliente: ClienteSubstabelecimento,
  item: ItemCartaPreposicao,
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
  const titulo = "CARTA DE PREPOSIÇÃO";
  p.text(titulo, A4_W / 2, y, 14, { bold: true, color: PRETO, align: "center", fonte: "times" });
  const larguraTitulo = estimarLargura(titulo, 14, true, "times");
  p.stroke(PRETO);
  p.line(A4_W / 2 - larguraTitulo / 2, y + 3, A4_W / 2 + larguraTitulo / 2, y + 3);
  y += 34;

  y = desenharCampoDestacado(p, "Processo: ", item.processo ?? "—", y, larguraUtil);
  y += 10;
  y = desenharCampoDestacado(p, "Polo ativo: ", item.poloAtivo ?? "—", y, larguraUtil);
  y += 10;
  y = desenharCampoDestacado(p, null, item.juizo ?? "—", y, larguraUtil);
  y += 26;

  const prepostosTexto = listarPortugues(item.prepostos.map(trechoPreposto));
  const corpo = CORPO_PREPOSICAO(
    prepostosTexto,
    item.prepostos.length !== 1,
    cliente.textoOutorgante,
  );
  const destaques = [
    ...item.prepostos.flatMap((pr) => (pr.cpf ? [pr.nome, pr.cpf] : [pr.nome])),
    cliente.textoOutorgante,
  ];
  const palavras = montarParagrafoComDestaques(corpo, destaques);
  const linhas = quebrarPalavras(palavras, larguraUtil, 14, "times");
  linhas.forEach((linha, i) => {
    const ultima = i === linhas.length - 1;
    desenharLinhaMista(
      p,
      linha,
      MARGIN,
      y + i * 20,
      14,
      "times",
      ultima ? null : larguraUtil,
      PRETO,
    );
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

export async function gerarPdfCartaPreposicao(
  cliente: ClienteSubstabelecimento,
  item: ItemCartaPreposicao,
): Promise<Blob> {
  const logo = await carregarLogo();
  const assinatura = await carregarAssinatura(cliente);
  const pagina = await construirPaginaCartaPreposicao(cliente, item, logo, assinatura);
  const imagens: Record<string, ImagemPdf> = { ImLogo: logo };
  if (assinatura) imagens["ImAssinatura"] = assinatura;
  return montarPdf([pagina], imagens);
}

export async function gerarEBaixarPdfCartaPreposicao(
  cliente: ClienteSubstabelecimento,
  item: ItemCartaPreposicao,
): Promise<void> {
  const blob = await gerarPdfCartaPreposicao(cliente, item);
  baixarBlob(blob, nomeArquivoCartaPreposicao(cliente.id, item));
}

export async function gerarPdfCartasPreposicao(
  cliente: ClienteSubstabelecimento,
  itens: ItemCartaPreposicao[],
): Promise<Blob> {
  const logo = await carregarLogo();
  const assinatura = await carregarAssinatura(cliente);
  const paginas = await Promise.all(
    itens.map((item) => construirPaginaCartaPreposicao(cliente, item, logo, assinatura)),
  );
  const imagens: Record<string, ImagemPdf> = { ImLogo: logo };
  if (assinatura) imagens["ImAssinatura"] = assinatura;
  return montarPdf(paginas, imagens);
}
