-- Corrige texto corrompido de uma importação antiga: caracteres UTF-8
-- (acentos, ç, ª/º) foram lidos como Windows-1252 na hora de importar, e
-- viraram coisa tipo "CÃvel" em vez de "Cível", "InstrutÃ³ria" em vez de
-- "Instrutória", "AraguaÃ­na" em vez de "Araguaína", "Vara Ãšnica" em vez
-- de "Vara Única", "SENTENÃ‡A" em vez de "SENTENÇA", "JUÃZO" em vez de
-- "JUÍZO".
--
-- O Windows-1252 "de verdade" do Postgres deixa 5 posições sem definição
-- (0x81, 0x8D, 0x8F, 0x90, 0x9D — usadas por Á/Í/Ï/Ð/Ý maiúsculas em
-- UTF-8) e erra nelas. Mas quem corrompeu esse texto originalmente
-- (ferramenta baseada em navegador/JS) usa a variante do padrão da web,
-- que preenche esses 5 buracos em vez de rejeitar. Por isso primeiro
-- normaliza os caracteres especiais do Windows-1252 pros bytes 0x80-0x9F
-- correspondentes (incluindo os 5 buracos), e só depois faz a reversão
-- via Latin-1 (que aceita todo o intervalo 0x00-0xFF, sem buraco nenhum).
--
-- Só mexe em valores que batem com o padrão de corrupção (contêm "Ã" ou
-- "Â") — o resto fica intocado, e se a reversão não resultar num UTF-8
-- válido (sinal de que o texto já estava certo, tipo "JOÃO" ou "CÂMARA"),
-- o valor original é mantido.

CREATE OR REPLACE FUNCTION public.corrigir_mojibake(_texto text)
RETURNS text LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  -- caracteres que o Windows-1252 usa pros bytes 0x80-0x9F (nessa ordem),
  -- incluindo os 5 buracos (0x81/0x8D/0x8F/0x90/0x9D) preenchidos com o
  -- próprio código de controle, do jeito que navegador/JS decodificam.
  _de text := chr(8364) || chr(129) || chr(8218) || chr(402) || chr(8222) || chr(8230)
    || chr(8224) || chr(8225) || chr(710) || chr(8240) || chr(352) || chr(8249)
    || chr(338) || chr(141) || chr(381) || chr(143) || chr(144) || chr(8216)
    || chr(8217) || chr(8220) || chr(8221) || chr(8226) || chr(8211) || chr(8212)
    || chr(732) || chr(8482) || chr(353) || chr(8250) || chr(339) || chr(157)
    || chr(382) || chr(376);
  _para text := chr(128) || chr(129) || chr(130) || chr(131) || chr(132) || chr(133)
    || chr(134) || chr(135) || chr(136) || chr(137) || chr(138) || chr(139)
    || chr(140) || chr(141) || chr(142) || chr(143) || chr(144) || chr(145)
    || chr(146) || chr(147) || chr(148) || chr(149) || chr(150) || chr(151)
    || chr(152) || chr(153) || chr(154) || chr(155) || chr(156) || chr(157)
    || chr(158) || chr(159);
  _normalizado text;
  _corrigido text;
BEGIN
  IF _texto IS NULL OR _texto !~ '[ÃÂ]' THEN
    RETURN _texto;
  END IF;
  BEGIN
    _normalizado := translate(_texto, _de, _para);
    _corrigido := convert_from(convert_to(_normalizado, 'LATIN1'), 'UTF8');
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
