-- Corrige texto corrompido de uma importação antiga: caracteres UTF-8
-- (acentos, ç, ª/º) foram lidos como Windows-1252 na hora de importar, e
-- viraram coisa tipo "CÃvel" em vez de "Cível", "InstrutÃ³ria" em vez de
-- "Instrutória", "AraguaÃ­na" em vez de "Araguaína", "Vara Ãšnica" em vez
-- de "Vara Única", "SENTENÃ‡A" em vez de "SENTENÇA".
--
-- (Usa Windows-1252, não Latin-1 puro: pra letras como Ç/É/Ó/Ú, o segundo
-- byte da sequência UTF-8 cai numa faixa onde as duas codificações
-- divergem — só o Windows-1252 reverte esses casos corretamente.)
--
-- A correção é reversível de forma exata: reinterpretar o texto corrompido
-- como Windows-1252 recupera os bytes originais em UTF-8, e decodificar
-- esses bytes como UTF-8 devolve o texto certo. Só mexe em valores que
-- batem com o padrão de corrupção (contêm "Ã" ou "Â") — o resto fica
-- intocado, e se a reversão não for um UTF-8 válido (sinal de que o texto
-- já estava certo, tipo "JOÃO" ou "CÂMARA"), o valor original é mantido.

CREATE OR REPLACE FUNCTION public.corrigir_mojibake(_texto text)
RETURNS text LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  _corrigido text;
BEGIN
  IF _texto IS NULL OR _texto !~ '[ÃÂ]' THEN
    RETURN _texto;
  END IF;
  BEGIN
    _corrigido := convert_from(convert_to(_texto, 'WIN1252'), 'UTF8');
  EXCEPTION WHEN OTHERS THEN
    RETURN _texto;
  END;
  RETURN _corrigido;
END;
$$;

UPDATE public.processos SET
  cliente = public.corrigir_mojibake(cliente),
  parte_contraria = public.corrigir_mojibake(parte_contraria),
  autor = public.corrigir_mojibake(autor),
  reu = public.corrigir_mojibake(reu),
  sistema = public.corrigir_mojibake(sistema),
  carteira = public.corrigir_mojibake(carteira),
  tribunal = public.corrigir_mojibake(tribunal),
  vara = public.corrigir_mojibake(vara),
  comarca = public.corrigir_mojibake(comarca),
  classe = public.corrigir_mojibake(classe),
  fase = public.corrigir_mojibake(fase),
  criticidade = public.corrigir_mojibake(criticidade),
  responsavel = public.corrigir_mojibake(responsavel),
  socio = public.corrigir_mojibake(socio),
  coordenador = public.corrigir_mojibake(coordenador),
  observacoes = public.corrigir_mojibake(observacoes),
  observacao_encerramento = public.corrigir_mojibake(observacao_encerramento),
  numero_interno = public.corrigir_mojibake(numero_interno),
  numero_antigo = public.corrigir_mojibake(numero_antigo),
  numero_cliente = public.corrigir_mojibake(numero_cliente)
WHERE cliente ~ '[ÃÂ]' OR parte_contraria ~ '[ÃÂ]' OR autor ~ '[ÃÂ]' OR reu ~ '[ÃÂ]'
   OR sistema ~ '[ÃÂ]' OR carteira ~ '[ÃÂ]' OR tribunal ~ '[ÃÂ]' OR vara ~ '[ÃÂ]'
   OR comarca ~ '[ÃÂ]' OR classe ~ '[ÃÂ]' OR fase ~ '[ÃÂ]' OR criticidade ~ '[ÃÂ]'
   OR responsavel ~ '[ÃÂ]' OR socio ~ '[ÃÂ]' OR coordenador ~ '[ÃÂ]'
   OR observacoes ~ '[ÃÂ]' OR observacao_encerramento ~ '[ÃÂ]'
   OR numero_interno ~ '[ÃÂ]' OR numero_antigo ~ '[ÃÂ]' OR numero_cliente ~ '[ÃÂ]';

UPDATE public.movimentacoes SET
  descricao = public.corrigir_mojibake(descricao),
  observacao = public.corrigir_mojibake(observacao),
  tipo = public.corrigir_mojibake(tipo)
WHERE descricao ~ '[ÃÂ]' OR observacao ~ '[ÃÂ]' OR tipo ~ '[ÃÂ]';

-- resumo: quantas linhas de cada tabela foram corrigidas
SELECT
  (SELECT count(*) FROM public.processos WHERE cliente ~ '[ÃÂ]' OR parte_contraria ~ '[ÃÂ]'
     OR autor ~ '[ÃÂ]' OR reu ~ '[ÃÂ]' OR sistema ~ '[ÃÂ]' OR carteira ~ '[ÃÂ]'
     OR tribunal ~ '[ÃÂ]' OR vara ~ '[ÃÂ]' OR comarca ~ '[ÃÂ]' OR classe ~ '[ÃÂ]'
     OR fase ~ '[ÃÂ]' OR criticidade ~ '[ÃÂ]' OR responsavel ~ '[ÃÂ]' OR socio ~ '[ÃÂ]'
     OR coordenador ~ '[ÃÂ]' OR observacoes ~ '[ÃÂ]' OR observacao_encerramento ~ '[ÃÂ]'
     OR numero_interno ~ '[ÃÂ]' OR numero_antigo ~ '[ÃÂ]' OR numero_cliente ~ '[ÃÂ]'
  ) AS processos_ainda_com_acento_estranho,
  (SELECT count(*) FROM public.movimentacoes
     WHERE descricao ~ '[ÃÂ]' OR observacao ~ '[ÃÂ]' OR tipo ~ '[ÃÂ]'
  ) AS movimentacoes_ainda_com_acento_estranho;

DROP FUNCTION public.corrigir_mojibake(text);
