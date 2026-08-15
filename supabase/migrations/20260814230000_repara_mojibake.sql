-- Repara texto corrompido ao colar SQL manualmente no editor do Lovable
-- (UTF-8 lido como Windows-1252 e regravado como UTF-8 de novo -- vira
-- algo tipo "Ac,c,a3o" em vez do texto certo). Este arquivo nao tem
-- nenhum acento no proprio texto (usa chr() em vez de digitar o
-- caractere direto), entao nao corre o risco de corromper de novo ao
-- ser colado. Pode rodar mais de uma vez sem problema: o padrao so
-- reconhece o sinal exato da corrupcao (letra com til/cedilha seguida
-- de um simbolo estranho), nao qualquer acento sozinho, entao depois
-- de corrigido uma vez ele para de bater.

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
  FOR r IN SELECT id, cliente, autor, reu, parte_contraria, comarca, vara, classe, observacoes
           FROM public.processos
           WHERE cliente ~ _padrao
              OR autor ~ _padrao
              OR reu ~ _padrao
              OR parte_contraria ~ _padrao
              OR comarca ~ _padrao
              OR vara ~ _padrao
              OR classe ~ _padrao
              OR observacoes ~ _padrao
  LOOP
    BEGIN
      UPDATE public.processos SET
        cliente = convert_from(convert_to(cliente, 'WIN1252'), 'UTF8'),
        autor = CASE WHEN autor IS NOT NULL THEN convert_from(convert_to(autor, 'WIN1252'), 'UTF8') ELSE NULL END,
        reu = CASE WHEN reu IS NOT NULL THEN convert_from(convert_to(reu, 'WIN1252'), 'UTF8') ELSE NULL END,
        parte_contraria = CASE WHEN parte_contraria IS NOT NULL THEN convert_from(convert_to(parte_contraria, 'WIN1252'), 'UTF8') ELSE NULL END,
        comarca = CASE WHEN comarca IS NOT NULL THEN convert_from(convert_to(comarca, 'WIN1252'), 'UTF8') ELSE NULL END,
        vara = CASE WHEN vara IS NOT NULL THEN convert_from(convert_to(vara, 'WIN1252'), 'UTF8') ELSE NULL END,
        classe = CASE WHEN classe IS NOT NULL THEN convert_from(convert_to(classe, 'WIN1252'), 'UTF8') ELSE NULL END,
        observacoes = CASE WHEN observacoes IS NOT NULL THEN convert_from(convert_to(observacoes, 'WIN1252'), 'UTF8') ELSE NULL END
      WHERE id = r.id;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'processos %: pulei, nao converteu limpo (%).', r.id, SQLERRM;
    END;
  END LOOP;

  FOR r IN SELECT id, nome FROM public.pastas WHERE nome ~ _padrao
  LOOP
    BEGIN
      UPDATE public.pastas SET nome = convert_from(convert_to(nome, 'WIN1252'), 'UTF8') WHERE id = r.id;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'pastas %: pulei, nao converteu limpo (%).', r.id, SQLERRM;
    END;
  END LOOP;

  FOR r IN SELECT id, nome FROM public.grupos WHERE nome ~ _padrao
  LOOP
    BEGIN
      UPDATE public.grupos SET nome = convert_from(convert_to(nome, 'WIN1252'), 'UTF8') WHERE id = r.id;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'grupos %: pulei, nao converteu limpo (%).', r.id, SQLERRM;
    END;
  END LOOP;

  FOR r IN SELECT id, descricao, observacao FROM public.movimentacoes
           WHERE descricao ~ _padrao
              OR observacao ~ _padrao
  LOOP
    BEGIN
      UPDATE public.movimentacoes SET
        descricao = convert_from(convert_to(descricao, 'WIN1252'), 'UTF8'),
        observacao = CASE WHEN observacao IS NOT NULL THEN convert_from(convert_to(observacao, 'WIN1252'), 'UTF8') ELSE NULL END
      WHERE id = r.id;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'movimentacoes %: pulei, nao converteu limpo (%).', r.id, SQLERRM;
    END;
  END LOOP;
END $$;
