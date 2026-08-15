// Recebe andamentos de um provedor externo de monitoramento processual
// (Judit, Escavador, DataJud etc.) via webhook e grava na tabela de
// movimentações, evitando duplicata.
//
// Formato genérico esperado no corpo da requisição — um objeto, ou uma
// lista de objetos, ou { items: [...] }:
//   { numero_cnj, data_movimentacao (AAAA-MM-DD), descricao, tipo?, observacao?, id_externo? }
//
// Como cada provedor manda o payload num formato próprio, é bem provável
// que, ao escolher o provedor de verdade, seja preciso ajustar esse
// mapeamento de campos pro formato real que ele envia — isso aqui é a
// base (autenticação, achar o processo pelo CNJ, gravar sem duplicar).
//
// Autenticação: a requisição precisa vir com o header "x-webhook-secret"
// batendo com o secret WEBHOOK_MOVIMENTACOES_SECRET configurado nos
// secrets do projeto (mesmo lugar onde está o RESEND_API_KEY).
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

type AndamentoRecebido = {
  numero_cnj?: string;
  data_movimentacao?: string;
  descricao?: string;
  tipo?: string;
  observacao?: string;
  id_externo?: string;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const segredoEsperado = Deno.env.get("WEBHOOK_MOVIMENTACOES_SECRET");
    if (!segredoEsperado) {
      throw new Error("WEBHOOK_MOVIMENTACOES_SECRET não configurado nos secrets do projeto.");
    }
    if (req.headers.get("x-webhook-secret") !== segredoEsperado) {
      return new Response(JSON.stringify({ error: "Não autorizado." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const corpo = await req.json();
    const itens: AndamentoRecebido[] = Array.isArray(corpo)
      ? corpo
      : Array.isArray(corpo?.items)
        ? corpo.items
        : [corpo];

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Configuração do Supabase ausente no ambiente da função.");
    }
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const resultado = {
      processados: 0,
      inseridas: 0,
      duplicadas: 0,
      naoEncontrados: [] as string[],
      erros: [] as { numero_cnj: string; erro: string }[],
    };

    for (const item of itens) {
      if (!item?.numero_cnj || !item?.data_movimentacao || !item?.descricao) {
        resultado.erros.push({
          numero_cnj: item?.numero_cnj ?? "?",
          erro: "Campos obrigatórios ausentes (numero_cnj, data_movimentacao, descricao).",
        });
        continue;
      }

      resultado.processados++;
      const { data, error } = await supabase.rpc("registrar_movimentacao_externa", {
        _numero_cnj: item.numero_cnj,
        _data_movimentacao: item.data_movimentacao,
        _descricao: item.descricao,
        _tipo: item.tipo ?? null,
        _observacao: item.observacao ?? null,
        _provedor: "api_externa",
        _id_externo: item.id_externo ?? null,
      });

      if (error) {
        resultado.erros.push({ numero_cnj: item.numero_cnj, erro: error.message });
        continue;
      }

      const linha = Array.isArray(data) ? data[0] : data;
      if (!linha?.id_processo) {
        resultado.naoEncontrados.push(item.numero_cnj);
      } else if (linha.inserida) {
        resultado.inseridas++;
      } else {
        resultado.duplicadas++;
      }
    }

    return new Response(JSON.stringify(resultado), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Falha ao processar andamentos.";
    return new Response(JSON.stringify({ error: mensagem }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
