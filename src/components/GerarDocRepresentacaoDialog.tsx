import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { formatarCNJ, normalizarNome, type Processo } from "@/lib/processos";
import { listarClientesSubstabelecimento } from "@/lib/clientes-substabelecimento";
import { lerPrepostos } from "@/lib/carta-preposicao";
import { gerarEBaixarPdfSubstabelecimento } from "@/lib/pdf-substabelecimento";
import { gerarEBaixarPdfCartaPreposicao } from "@/lib/pdf-carta-preposicao";

// "Juízo" não existe como campo único no processo -- monta a partir de
// vara/comarca/uf, igual o padrão já usado na leitura das planilhas de
// Substabelecimento/Carta de Preposição.
function juizoDoProcesso(p: Processo): string | null {
  if (!p.vara && !p.comarca) return null;
  const partes = [p.vara, p.comarca ? `comarca de ${p.comarca}` : null]
    .filter(Boolean)
    .join(" da ");
  return p.uf ? `${partes} - ${p.uf.toUpperCase()}` : partes;
}

export function GerarDocRepresentacaoDialog({ processo }: { processo: Processo }) {
  const [aberto, setAberto] = useState(false);
  const [aba, setAba] = useState<"substabelecimento" | "preposicao">("substabelecimento");
  const clientesQuery = useQuery({
    queryKey: ["clientes-substabelecimento"],
    queryFn: listarClientesSubstabelecimento,
    enabled: aberto,
  });
  const clientes = clientesQuery.data ?? [];
  const [clienteId, setClienteId] = useState("");
  const [comReserva, setComReserva] = useState(true);
  const [prepostosTexto, setPrepostosTexto] = useState("");
  const [cidade, setCidade] = useState("Rio de Janeiro");
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [gerando, setGerando] = useState(false);

  // Tenta já vir com o cliente certo selecionado, casando o nome do
  // cliente do processo com o cadastro de Docs de Representação.
  useEffect(() => {
    if (clienteId || !clientesQuery.data || clientesQuery.data.length === 0) return;
    const alvo = normalizarNome(processo.cliente);
    const achado = clientesQuery.data.find((c) => normalizarNome(c.nome) === alvo);
    setClienteId((achado ?? clientesQuery.data[0])!.id);
  }, [clientesQuery.data, clienteId, processo.cliente]);

  const cliente = clientes.find((c) => c.id === clienteId) ?? null;
  const juizo = juizoDoProcesso(processo);
  const numeroFormatado = formatarCNJ(processo.numero_cnj);

  const gerar = async () => {
    if (!cliente) {
      toast.error("Escolha um cliente.");
      return;
    }
    setGerando(true);
    try {
      if (aba === "substabelecimento") {
        await gerarEBaixarPdfSubstabelecimento(cliente, {
          idx: 0,
          processo: numeroFormatado,
          autor: processo.autor,
          juizo,
          comReserva,
          cidade,
          data,
        });
      } else {
        await gerarEBaixarPdfCartaPreposicao(cliente, {
          idx: 0,
          processo: numeroFormatado,
          poloAtivo: processo.autor,
          juizo,
          prepostos: lerPrepostos(prepostosTexto),
          cidade,
          data,
        });
      }
      toast.success("Documento gerado.");
      setAberto(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não consegui gerar o documento.");
    } finally {
      setGerando(false);
    }
  };

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileText className="size-4" /> Substab. / Preposição
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerar documento de representação</DialogTitle>
          <DialogDescription>
            Processo {numeroFormatado}
            {juizo ? ` — ${juizo}` : " — sem vara/comarca cadastrada"}.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={aba} onValueChange={(v) => setAba(v as typeof aba)}>
          <TabsList>
            <TabsTrigger value="substabelecimento">Substabelecimento</TabsTrigger>
            <TabsTrigger value="preposicao">Carta de Preposição</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="gerar-doc-cliente">Cliente</Label>
            <Select value={clienteId} onValueChange={setClienteId}>
              <SelectTrigger id="gerar-doc-cliente">
                <SelectValue placeholder={clientesQuery.isLoading ? "Carregando..." : "Cliente"} />
              </SelectTrigger>
              <SelectContent>
                {clientes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!clientesQuery.isLoading && clientes.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Nenhum cliente cadastrado ainda em Docs de Representação.
              </p>
            ) : null}
          </div>

          {aba === "substabelecimento" ? (
            <div className="space-y-1">
              <Label htmlFor="gerar-doc-reserva">Reserva de poderes</Label>
              <Select
                value={comReserva ? "com" : "sem"}
                onValueChange={(v) => setComReserva(v === "com")}
              >
                <SelectTrigger id="gerar-doc-reserva">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="com">Com reserva</SelectItem>
                  <SelectItem value="sem">Sem reserva</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-1">
              <Label htmlFor="gerar-doc-prepostos">Prepostos (um por linha, "Nome - CPF")</Label>
              <Textarea
                id="gerar-doc-prepostos"
                rows={4}
                value={prepostosTexto}
                onChange={(e) => setPrepostosTexto(e.target.value)}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="gerar-doc-cidade">Cidade</Label>
              <Input
                id="gerar-doc-cidade"
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="gerar-doc-data">Data</Label>
              <Input
                id="gerar-doc-data"
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setAberto(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={() => void gerar()} disabled={gerando || !cliente}>
            {gerando ? "Gerando..." : "Gerar e baixar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
