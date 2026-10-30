import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Sanitiza o nome original do arquivo antes de usar como parte da CHAVE
// no Supabase Storage -- nome de verdade (ex.: "KLM - Procuração e
// substabelecimentos 2026.pdf") tem espaço e acento, que o Storage
// rejeita ("Invalid key"). O nome original continua guardado à parte
// (coluna "..._nome_arquivo") só pra exibição -- isso aqui é só a parte
// física da chave, nunca mostrada pra ninguém.
export function slugificarNomeArquivo(nome: string): string {
  const pontoFinal = nome.lastIndexOf(".");
  const base = pontoFinal > 0 ? nome.slice(0, pontoFinal) : nome;
  const extensao = pontoFinal > 0 ? nome.slice(pontoFinal + 1) : "";
  const baseSlug =
    base
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "arquivo";
  const extSlug = extensao.toLowerCase().replace(/[^a-z0-9]/g, "");
  return extSlug ? `${baseSlug}.${extSlug}` : baseSlug;
}
