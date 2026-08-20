import { createFileRoute } from "@tanstack/react-router";

import { BaixasCliente } from "@/components/BaixasCliente";

export const Route = createFileRoute("/_authenticated/baixas-cliente")({
  head: () => ({
    meta: [
      { title: "Baixas no cliente | FaroLex" },
      {
        name: "description",
        content: "Controle administrativo das baixas no sistema do cliente após o encerramento jurídico.",
      },
    ],
  }),
  component: BaixasClientePage,
});

function BaixasClientePage() {
  return <BaixasCliente />;
}
