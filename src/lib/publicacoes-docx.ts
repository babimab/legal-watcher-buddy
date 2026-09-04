import { Document, HeadingLevel, Packer, Paragraph } from "docx";

// Gera o mesmo conteúdo do e-mail de Publicações como um arquivo Word
// pra baixar, pra quem prefere anexar/arquivar em vez de só mandar
// e-mail. Recebe as mesmas seções de texto já montadas por
// montarPartesPublicacoes (publicacoes.tsx) -- essa função só sabe
// transformar texto em parágrafos do docx, não conhece nada de regra de
// negócio de publicação.
export async function gerarDocxPublicacoes(titulo: string, partes: string[]): Promise<Blob> {
  const paragrafos: Paragraph[] = [
    new Paragraph({ text: titulo, heading: HeadingLevel.HEADING_1 }),
  ];

  partes.forEach((parte, i) => {
    if (i > 0) paragrafos.push(new Paragraph({ text: "" }));
    for (const linha of parte.split("\n")) {
      paragrafos.push(new Paragraph({ text: linha }));
    }
  });

  const documento = new Document({
    sections: [{ children: paragrafos }],
  });

  return Packer.toBlob(documento);
}

export function baixarBlob(blob: Blob, nomeArquivo: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
