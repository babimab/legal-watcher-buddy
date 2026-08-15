-- Mesma reparacao da migration anterior (mojibake de UTF-8 lido como
-- Windows-1252), mas para as colunas "carteira" e "fase" de processos,
-- que ficaram de fora por engano da primeira vez. Mesmo padrao seguro
-- de detectar e mesma logica linha a linha, entao pode rodar mais de
-- uma vez sem problema. Nenhum acento digitado direto neste arquivo.

DO $$
DECLARE
  _padrao text := chr(195) || '(' ||
    '[' || chr(160) || '-' || chr(255) || ']' || chr(124) ||
    chr(338) || chr(124) || chr(339) || chr(124) || chr(352) || chr(124) || chr(353) || chr(124) ||
    chr(376) || chr(124) || chr(381) || chr(124) || chr(382) || chr(124) || chr(402) || chr(124) ||
    chr(710) || chr(124) || chr(732) || chr(124) || chr(8211) || chr(124) || chr(8212) || chr(124) ||
    chr(8216) || chr(124) || chr(8217) || chr(124) || chr(8218) || chr(124) || chr(8220) || chr(124) ||
    chr(8221) || chr(124) || chr(8222) || chr(124) || chr(8224) || chr(124) || chr(8225) || chr(124) ||
    chr(8226) || chr(124) || chr(8230) || chr(124) || chr(8240) || chr(124) || chr(8249) || chr(124) ||
    chr(8250) || chr(124) || chr(8364) || chr(124) || chr(8482) ||
    ')';
  r RECORD;
BEGIN
  FOR r IN SELECT id, carteira, fase FROM public.processos
           WHERE carteira ~ _padrao OR fase ~ _padrao
  LOOP
    BEGIN
      UPDATE public.processos SET
        carteira = CASE WHEN carteira IS NOT NULL THEN convert_from(convert_to(carteira, 'WIN1252'), 'UTF8') ELSE NULL END,
        fase = CASE WHEN fase IS NOT NULL THEN convert_from(convert_to(fase, 'WIN1252'), 'UTF8') ELSE NULL END
      WHERE id = r.id;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'processos %: pulei, nao converteu limpo (%).', r.id, SQLERRM;
    END;
  END LOOP;
END $$;
