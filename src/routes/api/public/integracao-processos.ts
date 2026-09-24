import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-api-key",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use datas no formato AAAA-MM-DD.");

const querySchema = z
  .object({
    data: dateSchema.optional(),
    desde: dateSchema.optional(),
    ate: dateSchema.optional(),
  })
  .superRefine((value, ctx) => {
    for (const [campo, data] of Object.entries(value)) {
      if (data && Number.isNaN(Date.parse(`${data}T00:00:00.000Z`))) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [campo], message: "Data inválida." });
      }
    }
    if (!value.data && value.desde && value.ate && value.desde > value.ate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ate"],
        message: "A data final deve ser igual ou posterior à data inicial.",
      });
    }
  });

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: corsHeaders });
}

function intervaloDoPedido(query: z.infer<typeof querySchema>): { de: string; ate: string } {
  if (query.data) {
    return { de: `${query.data}T00:00:00.000Z`, ate: `${query.data}T23:59:59.999Z` };
  }
  if (query.desde || query.ate) {
    return {
      de: query.desde ? `${query.desde}T00:00:00.000Z` : "1970-01-01T00:00:00.000Z",
      ate: query.ate ? `${query.ate}T23:59:59.999Z` : new Date().toISOString(),
    };
  }
  const hoje = new Date().toISOString().slice(0, 10);
  return { de: `${hoje}T00:00:00.000Z`, ate: `${hoje}T23:59:59.999Z` };
}

async function hashChaveApi(chave: string): Promise<string> {
  const bytes = new TextEncoder().encode(chave);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export const Route = createFileRoute("/api/public/integracao-processos")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      GET: async ({ request }) => {
        const chave = request.headers.get("x-api-key");
        if (!chave || chave.length > 256) return json({ error: "Não autorizado." }, 401);

        const url = new URL(request.url);
        const parsed = querySchema.safeParse({
          data: url.searchParams.get("data") ?? undefined,
          desde: url.searchParams.get("desde") ?? undefined,
          ate: url.searchParams.get("ate") ?? undefined,
        });
        if (!parsed.success) {
          return json({ error: parsed.error.issues[0]?.message ?? "Parâmetros inválidos." }, 400);
        }

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const chaveHash = await hashChaveApi(chave);
          const { data: chaveAtiva, error: erroChave } = await supabaseAdmin
            .from("chaves_api")
            .select("id")
            .eq("chave_hash", chaveHash)
            .eq("ativo", true)
            .maybeSingle();

          if (erroChave || !chaveAtiva) return json({ error: "Não autorizado." }, 401);

          const { de, ate } = intervaloDoPedido(parsed.data);
          const { data: processos, error } = await supabaseAdmin
            .from("processos")
            .select(
              "numero_cnj, cliente, numero_cliente, parte_contraria, vara, comarca, tribunal, classe, responsavel, created_at",
            )
            .gte("created_at", de)
            .lte("created_at", ate)
            .order("created_at", { ascending: true });

          if (error) throw error;
          return json({ processos: processos ?? [] });
        } catch (erro) {
          console.error("Falha na integração de processos", erro);
          return json({ error: "Falha ao listar processos." }, 500);
        }
      },
    },
  },
});