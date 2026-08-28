// Monitoramento automático via Judit (https://docs.judit.io) -- roda
// periodicamente (ver instruções de agendamento) e consulta só os
// processos que a equipe marcou na tela de Monitoramento
// (processos.judit_monitoramento = true). Não espera o resultado da Judit
// ficar pronto na hora (diferente da consulta manual do botão "Judit") --
// isso é o que permite rodar em lote sem estourar o tempo da função,
// mesmo com muitos processos marcados.
//
// Funciona em duas fases a cada execução:
//   1) Colhe resultado de consultas já criadas antes (judit_request_pendente
//      preenchido). Se a Judit já terminou, grava os andamentos e limpa o
//      pendente. Se ainda não terminou, deixa pra tentar de novo na próxima
//      execução (e força a colheita mesmo sem terminar se já faz mais de 3
//      dias, pra não ficar pendente pra sempre).
//   2) Cria consulta nova só pros processos marcados que não têm nada
//      pendente e cujo último resultado colhido (judit_monitorado_em) já
//      passou de 7 dias (ou nunca rodou) -- isso é o que faz o custo ficar
//      parecido com rodar o botão manual 1x por semana por processo, não
//      mais que isso. Limitado a 25 consultas novas por execução pra não
//      criar um pico grande de custo de uma vez só.
//
// Pra isso rodar sozinha (ex.: 1x por dia), agende uma chamada HTTP POST
// pra essa função com o header "x-webhook-secret" batendo com o secret
// WEBHOOK_MOVIMENTACOES_SECRET (o mesmo já usado pelo webhook
// receber-andamento) -- ver instruções à parte de como configurar isso no
// Lovable Cloud. Também aceita chamada de um usuário logado (o botão
// "Rodar agora" da tela de Monitoramento).
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  buscarResultadoJudit,
  consultarStatusJudit,
  criarConsultaJudit,
  gravarAndamentos,
} from "../_shared/judit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

const LIMITE_NOVAS_CONSULTAS_POR_EXECUCAO = 25;
const DIAS_ENTRE_CONSULTAS = 7;
const DIAS_LIMITE_PENDENTE = 3;

type ProcessoMonitorado = {
  id: string;
  numero_cnj: string;
  judit_request_pendente: string | null;
  judit_request_criado_em: string | null;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      throw new Error("Configuração do Supabase ausente no ambiente da função.");
    }

    const segredoEsperado = Deno.env.get("WEBHOOK_MOVIMENTACOES_SECRET");
    const segredoRecebido = req.headers.get("x-webhook-secret");
    let autorizado = !!segredoEsperado && segredoRecebido === segredoEsperado;

    if (!autorizado) {
      const authHeader = req.headers.get("Authorization") ?? "";
      const supabaseCliente = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data } = await supabaseCliente.auth.getUser();
      autorizado = !!data.user;
    }

    if (!autorizado) {
      return new Response(JSON.stringify({ error: "Não autorizado." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("JUDIT_API_KEY");
    if (!apiKey) {
      throw new Error("JUDIT_API_KEY não configurado nos secrets do projeto.");
    }

    const supabaseServico = createClient(supabaseUrl, serviceRoleKey);

    // Fase 1: colhe resultado de consultas já criadas antes.
    const { data: pendentes, error: erroPendentes } = await supabaseServico
      .from("processos")
      .select("id, numero_cnj, judit_request_pendente, judit_request_criado_em")
      .eq("judit_monitoramento", true)
      .not("judit_request_pendente", "is", null);
    if (erroPendentes) throw new Error(erroPendentes.message);

    const colhidos: Array<Record<string, unknown>> = [];
    for (const processo of (pendentes ?? []) as ProcessoMonitorado[]) {
      const requestId = processo.judit_request_pendente;
      if (!requestId) continue;
      const criadoEm = processo.judit_request_criado_em
        ? new Date(processo.judit_request_criado_em).getTime()
        : 0;
      const pendenteHaMuitoTempo =
        criadoEm > 0 && Date.now() - criadoEm > DIAS_LIMITE_PENDENTE * 24 * 60 * 60 * 1000;

      let status = "desconhecido";
      try {
        status = await consultarStatusJudit(apiKey, requestId);
      } catch {
        // segue com "desconhecido" -- se estiver pendente há muito tempo,
        // colhe (ou desiste) do mesmo jeito mais abaixo.
      }

      if (status !== "completed" && !pendenteHaMuitoTempo) {
        continue; // ainda processando, tenta de novo na próxima execução
      }

      let gravado = { processados: 0, inseridas: 0, duplicadas: 0, erros: [] as unknown[] };
      let erro: string | null = null;
      if (status === "completed") {
        try {
          const { pageData } = await buscarResultadoJudit(apiKey, requestId);
          gravado = await gravarAndamentos(supabaseServico, processo, pageData);
        } catch (e) {
          erro = e instanceof Error ? e.message : "Falha ao buscar resultado.";
        }
      } else {
        erro = `Consulta não terminou em ${DIAS_LIMITE_PENDENTE} dias (status: ${status}), desistindo.`;
      }

      await supabaseServico
        .from("processos")
        .update({
          judit_request_pendente: null,
          judit_request_criado_em: null,
          judit_monitorado_em: new Date().toISOString(),
        })
        .eq("id", processo.id);

      colhidos.push({
        processoId: processo.id,
        numeroCnj: processo.numero_cnj,
        status,
        erro,
        ...gravado,
      });
    }

    // Fase 2: cria consulta nova só pros que já podem rodar de novo.
    const limiteData = new Date(
      Date.now() - DIAS_ENTRE_CONSULTAS * 24 * 60 * 60 * 1000,
    ).toISOString();
    const { data: devidos, error: erroDevidos } = await supabaseServico
      .from("processos")
      .select("id, numero_cnj")
      .eq("judit_monitoramento", true)
      .is("judit_request_pendente", null)
      .or(`judit_monitorado_em.is.null,judit_monitorado_em.lt.${limiteData}`)
      .limit(LIMITE_NOVAS_CONSULTAS_POR_EXECUCAO);
    if (erroDevidos) throw new Error(erroDevidos.message);

    const criados: Array<Record<string, unknown>> = [];
    for (const processo of (devidos ?? []) as Array<{ id: string; numero_cnj: string }>) {
      try {
        const { requestId } = await criarConsultaJudit(apiKey, processo.numero_cnj);
        if (!requestId) {
          criados.push({
            processoId: processo.id,
            numeroCnj: processo.numero_cnj,
            erro: "sem request_id",
          });
          continue;
        }
        await supabaseServico
          .from("processos")
          .update({
            judit_request_pendente: requestId,
            judit_request_criado_em: new Date().toISOString(),
          })
          .eq("id", processo.id);
        criados.push({ processoId: processo.id, numeroCnj: processo.numero_cnj, requestId });
      } catch (e) {
        criados.push({
          processoId: processo.id,
          numeroCnj: processo.numero_cnj,
          erro: e instanceof Error ? e.message : "Falha ao criar consulta.",
        });
      }
    }

    return new Response(JSON.stringify({ colhidos, criados }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Falha ao monitorar processos.";
    return new Response(JSON.stringify({ error: mensagem }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
