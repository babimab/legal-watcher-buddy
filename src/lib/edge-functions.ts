// supabase.functions.invoke() joga fora o corpo da resposta quando o
// status HTTP não é 2xx: o error.message vira só "Edge Function
// returned a non-2xx status code", mesmo quando a função já devolveu um
// { error: "motivo real" } explicando o que aconteceu. Esse motivo de
// verdade continua acessível em error.context (a Response crua), então
// essa função tenta ler ele antes de desistir e cair na mensagem
// genérica do supabase-js.
export async function mensagemErroEdgeFunction(erro: unknown, generica: string): Promise<string> {
  const contexto = (erro as { context?: Response } | null | undefined)?.context;
  if (contexto && typeof contexto.json === "function") {
    try {
      const corpo = (await contexto.json()) as unknown;
      if (
        corpo &&
        typeof corpo === "object" &&
        typeof (corpo as { error?: unknown }).error === "string"
      ) {
        return (corpo as { error: string }).error;
      }
    } catch {
      // corpo não era JSON, ou já foi consumido antes -- cai na mensagem abaixo
    }
  }
  return erro instanceof Error ? erro.message : generica;
}
