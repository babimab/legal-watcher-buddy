// Especificação OpenAPI 3.0 da API de integração, consumida pela
// página /integracao (Swagger UI).
export const openapiIntegracao = {
  openapi: "3.0.3",
  info: {
    title: "FaroLex — API de integração",
    version: "1.0.0",
    description:
      "Fornece processos cadastrados, andamentos processuais e processos prontos para encerrar. Autenticação por chave de API (header x-api-key), gerada na própria tela /integracao.",
  },
  servers: [{ url: "https://yditjzzqxqgmbxrlxkgk.supabase.co/functions/v1" }],
  components: {
    securitySchemes: {
      ChaveApi: { type: "apiKey", in: "header", name: "x-api-key" },
    },
    schemas: {
      Andamento: {
        type: "object",
        properties: {
          numero_cnj: { type: "string", example: "0001234-56.2026.8.13.0702" },
          cliente: { type: "string", nullable: true },
          numero_cliente: { type: "string", nullable: true },
          data_movimentacao: { type: "string", format: "date" },
          descricao: { type: "string" },
          tipo: { type: "string", nullable: true },
          cadastrado_em: { type: "string", format: "date-time" },
        },
      },
      Encerramento: {
        type: "object",
        properties: {
          numero_cnj: { type: "string" },
          cliente: { type: "string", nullable: true },
          numero_cliente: { type: "string", nullable: true },
          resultado: { type: "string", nullable: true },
          valor: { type: "number", nullable: true },
          observacao: { type: "string", nullable: true },
          pronto_para_encerrar_em: { type: "string", format: "date-time" },
        },
      },
      ProcessoCadastrado: {
        type: "object",
        properties: {
          numero_cnj: { type: "string", example: "0001234-56.2026.8.13.0702" },
          cliente: { type: "string" },
          numero_cliente: { type: "string", nullable: true },
          parte_contraria: { type: "string", nullable: true },
          vara: { type: "string", nullable: true },
          comarca: { type: "string", nullable: true },
          tribunal: { type: "string", nullable: true },
          classe: { type: "string", nullable: true },
          responsavel: { type: "string", nullable: true },
          created_at: { type: "string", format: "date-time" },
        },
      },
    },
  },
  security: [{ ChaveApi: [] }],
  paths: {
    "/api/public/integracao-processos": {
      get: {
        servers: [{ url: "https://www-farolex-com-br.lovable.app" }],
        summary: "Lista processos cadastrados num período",
        description:
          "Sem parâmetros, devolve os processos cadastrados no dia de hoje. Use 'data' para um dia específico, ou 'desde'/'ate' para um intervalo.",
        parameters: [
          {
            name: "data",
            in: "query",
            required: false,
            schema: { type: "string", format: "date" },
            description: "Um dia específico (AAAA-MM-DD). Ignora desde/ate se informado.",
          },
          {
            name: "desde",
            in: "query",
            required: false,
            schema: { type: "string", format: "date" },
          },
          { name: "ate", in: "query", required: false, schema: { type: "string", format: "date" } },
        ],
        responses: {
          "200": {
            description: "Lista de processos cadastrados",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    processos: {
                      type: "array",
                      items: { $ref: "#/components/schemas/ProcessoCadastrado" },
                    },
                  },
                },
              },
            },
          },
          "400": { description: "Parâmetros de data inválidos" },
          "401": { description: "Chave de API ausente ou inválida" },
        },
      },
    },
    "/integracao-andamentos": {
      get: {
        summary: "Lista andamentos cadastrados num período",
        description:
          "Sem parâmetros, devolve os andamentos cadastrados no dia de hoje. Use 'data' pra um dia específico, ou 'desde'/'ate' pra um intervalo (ex.: recuperar um dia perdido).",
        parameters: [
          {
            name: "data",
            in: "query",
            required: false,
            schema: { type: "string", format: "date" },
            description: "Um dia específico (AAAA-MM-DD). Ignora desde/ate se informado.",
          },
          {
            name: "desde",
            in: "query",
            required: false,
            schema: { type: "string", format: "date" },
          },
          { name: "ate", in: "query", required: false, schema: { type: "string", format: "date" } },
        ],
        responses: {
          "200": {
            description: "Lista de andamentos",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    andamentos: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Andamento" },
                    },
                  },
                },
              },
            },
          },
          "401": { description: "Chave de API ausente ou inválida" },
        },
      },
    },
    "/integracao-encerramentos": {
      get: {
        summary: "Lista processos marcados como pronto para encerrar num período",
        description:
          "Mesmos parâmetros de data de /integracao-andamentos, filtrando por quando o processo ficou pronto para encerrar.",
        parameters: [
          {
            name: "data",
            in: "query",
            required: false,
            schema: { type: "string", format: "date" },
          },
          {
            name: "desde",
            in: "query",
            required: false,
            schema: { type: "string", format: "date" },
          },
          { name: "ate", in: "query", required: false, schema: { type: "string", format: "date" } },
        ],
        responses: {
          "200": {
            description: "Lista de encerramentos",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    encerramentos: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Encerramento" },
                    },
                  },
                },
              },
            },
          },
          "401": { description: "Chave de API ausente ou inválida" },
        },
      },
    },
  },
};
