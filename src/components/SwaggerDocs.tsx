// Isolado num arquivo próprio, carregado só no navegador (ver uso com
// React.lazy + ClientOnly em integracao.tsx) -- o swagger-ui-react não é
// seguro pra renderização no servidor (Cloudflare Worker), então nem o
// import pode entrar no bundle do servidor.
import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";
import { openapiIntegracao } from "@/lib/openapi-integracao";

export default function SwaggerDocs() {
  return <SwaggerUI spec={openapiIntegracao} />;
}
