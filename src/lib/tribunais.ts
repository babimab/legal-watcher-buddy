import type { Processo } from "./processos";

/**
 * Monta o link de consulta pública no sistema do tribunal a partir do
 * número CNJ, do sistema informado e da UF/tribunal do processo.
 */

export type LinkTribunal = {
  url: string;
  rotulo: string;
  /** true quando não foi possível identificar o sistema e caímos na busca genérica */
  generico: boolean;
};

// Cada estado usa um sistema diferente (e às vezes mais de um), e sem
// testar ao vivo não dá pra confiar em "adivinhar" o sistema pela UF —
// isso já gerou um link errado pro TJRJ. Por isso só assumimos um
// sistema estadual por UF quando é algo bem conhecido/documentado; nos
// outros casos caímos na busca genérica, a não ser que o processo tenha
// o campo "sistema" preenchido de verdade (dado real, não achismo).
const UF_ESAJ_CONHECIDO = ["SP"];
const UF_PROJUDI_CONHECIDO = ["PR"];
const UF_EPROC_CONHECIDO = ["RS", "SC"];

function digitos(cnj: string) {
  return cnj.replace(/\D/g, "");
}

/** Segmentos do CNJ: NNNNNNN-DD.AAAA.J.TR.OOOO */
function segmentos(cnj: string) {
  const d = digitos(cnj);
  if (d.length !== 20) return null;
  return {
    numero: d.slice(0, 7),
    dv: d.slice(7, 9),
    ano: d.slice(9, 13),
    justica: d.slice(13, 14),
    tribunal: d.slice(14, 16),
    origem: d.slice(16, 20),
  };
}

function normalizar(valor?: string | null) {
  return (valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function linkTribunal(
  p: Pick<Processo, "numero_cnj" | "sistema" | "uf" | "tribunal">,
): LinkTribunal {
  const cnj = digitos(p.numero_cnj);
  const seg = segmentos(p.numero_cnj);
  const sistema = normalizar(p.sistema);
  const tribunal = normalizar(p.tribunal);
  const uf = (p.uf ?? "").toUpperCase().trim();

  const generico = (rotulo = "Buscar o processo na internet"): LinkTribunal => ({
    url: `https://www.google.com/search?q=${encodeURIComponent(p.numero_cnj)}`,
    rotulo,
    generico: true,
  });

  // Justiça do Trabalho (J = 5) -> PJe do TRT correspondente
  if (seg?.justica === "5" || /trt/.test(tribunal) || /trt/.test(sistema)) {
    const numeroTrt = Number(seg?.tribunal ?? tribunal.match(/trt\s*-?\s*(\d+)/)?.[1] ?? 0);
    if (numeroTrt > 0)
      return {
        url: `https://pje.trt${numeroTrt}.jus.br/consultaprocessual/detalhe-processo/${cnj}`,
        rotulo: `Abrir no PJe do TRT-${numeroTrt}`,
        generico: false,
      };
  }

  // Justiça Federal (J = 4) -> PJe do TRF
  if (seg?.justica === "4" || /trf|jf/.test(tribunal)) {
    const numeroTrf = Number(seg?.tribunal ?? 0);
    if (numeroTrf > 0)
      return {
        url: `https://pje.trf${numeroTrf}.jus.br/consultaprocessual/detalhe-processo/${cnj}`,
        rotulo: `Abrir no PJe do TRF-${numeroTrf}`,
        generico: false,
      };
  }

  // Sistemas estaduais
  if (/esaj|saj/.test(sistema) || (!sistema && UF_ESAJ_CONHECIDO.includes(uf))) {
    if (uf) {
      const base = `https://esaj.tj${uf.toLowerCase()}.jus.br/cpopg`;
      // Com o CNJ dá pra ir direto pro resultado da busca, em vez de cair
      // na página de busca em branco.
      if (seg) {
        const params = new URLSearchParams({
          conversationId: "",
          cbPesquisa: "NUMPROC",
          numeroDigitoAnoUnificado: `${seg.numero}-${seg.dv}.${seg.ano}`,
          foroNumeroUnificado: seg.origem,
          dePesquisaNuUnificado: `${seg.numero}-${seg.dv}.${seg.ano}.${seg.justica}.${seg.tribunal}.${seg.origem}`,
          dePesquisa: "",
        });
        return {
          url: `${base}/search.do?${params.toString()}`,
          rotulo: `Abrir o e-SAJ do TJ${uf}`,
          generico: false,
        };
      }
      return {
        url: `${base}/open.do`,
        rotulo: `Abrir o e-SAJ do TJ${uf}`,
        generico: false,
      };
    }
  }

  if (/projudi/.test(sistema) || (!sistema && UF_PROJUDI_CONHECIDO.includes(uf))) {
    if (uf === "PR")
      return {
        url: "https://projudi.tjpr.jus.br/projudi/",
        rotulo: "Abrir o Projudi do TJPR",
        generico: false,
      };
    if (uf)
      return {
        url: `https://projudi.tj${uf.toLowerCase()}.jus.br/`,
        rotulo: `Abrir o Projudi do TJ${uf}`,
        generico: false,
      };
  }

  if (/eproc/.test(sistema) || (!sistema && UF_EPROC_CONHECIDO.includes(uf))) {
    if (uf === "RS")
      return {
        url: "https://eproc1g.tjrs.jus.br/eproc/",
        rotulo: "Abrir o eproc do TJRS",
        generico: false,
      };
    if (uf === "SC")
      return {
        url: "https://eproc1g.tjsc.jus.br/eproc/",
        rotulo: "Abrir o eproc do TJSC",
        generico: false,
      };
    if (uf)
      return {
        url: `https://eproc1g.tj${uf.toLowerCase()}.jus.br/eproc/`,
        rotulo: `Abrir o eproc do TJ${uf}`,
        generico: false,
      };
  }

  // PJe estadual: só quando o dado real de "sistema" confirma — sem isso,
  // a maioria dos estados (inclusive RJ) cai na busca genérica, porque a
  // gente não tinha como confirmar o padrão certo pra cada um.
  if (/pje/.test(sistema) && uf) {
    return {
      url: `https://pje.tj${uf.toLowerCase()}.jus.br/pje/ConsultaPublica/listView.seam`,
      rotulo: `Abrir o PJe do TJ${uf}`,
      generico: false,
    };
  }

  return generico();
}
