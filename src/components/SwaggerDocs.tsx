// Isolado num arquivo próprio, carregado só no navegador (ver uso com
// React.lazy + ClientOnly em integracao.tsx).
//
// Usa swagger-ui-dist (a build "pura", sem wrapper de React) montada
// imperativamente num <div> -- o pacote swagger-ui-react quebrava em
// produção (TypeError dentro do próprio bundle dele, incompatível com
// esse projeto), então a UI do Swagger é montada fora da árvore do
// React, sem depender da integração React da lib.
import { useEffect, useRef } from "react";
import SwaggerUIBundle from "swagger-ui-dist/swagger-ui-bundle.js";
import "swagger-ui-dist/swagger-ui.css";
import { openapiIntegracao } from "@/lib/openapi-integracao";

export default function SwaggerDocs() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    SwaggerUIBundle({
      spec: openapiIntegracao,
      domNode: containerRef.current,
      presets: [SwaggerUIBundle.presets.apis],
      layout: "BaseLayout",
    });
  }, []);

  return <div ref={containerRef} />;
}
