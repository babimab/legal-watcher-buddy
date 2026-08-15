-- Atualiza os processos de Souza Cruz (cliente 4608) que estão na
-- planilha "Ativos em fase ENCERRAMENTO": marca fase = Encerramento e
-- preenche classe/vara/comarca/UF/responsável/sócio a partir da
-- planilha, sem apagar o que já estava preenchido quando a planilha não
-- trouxer aquele dado (COALESCE mantém o valor atual nesse caso).

DO $$
DECLARE
  _atualizados int;
  _nao_encontrados text;
BEGIN
  CREATE TEMP TABLE _encerramento_souza_cruz (
    cnj_digits text,
    objeto text,
    vara text,
    comarca text,
    uf text,
    responsavel text,
    socio text
  ) ON COMMIT DROP;

  INSERT INTO _encerramento_souza_cruz (cnj_digits, objeto, vara, comarca, uf, responsavel, socio)
  VALUES
    ('00009606920248050043', '6461 - Cobrança Indevida', 'Vara Única', 'Canavieiras', 'BA', 'MLV', 'GFC'),
    ('00408874120258160030', '5318 - Moral e Material', 'Vara Única', 'Foz do Iguaçu', 'PR', 'BBS', 'ELV'),
    ('00037805820118050256', 'Acidente de Veículo', '2ª Vara Cível', 'Teixeira de Freitas', 'BA', 'BDR', 'GFC'),
    ('50000748820268240009', 'NEGATIVAÇÃO INDEVIDA', 'Vara Única', 'Bom Retiro', 'SC', 'BBS', 'ELV'),
    ('05034789620188050103', 'Acidente de Veículo (não relacionado a seguros)', '4ª Vara Cível', 'Ilhéus', 'BA', 'MLV', 'GFC'),
    ('50018085420218210067', 'Fumicultores', '1ª Vara Judicial', 'São Lourenço do Sul', 'RS', 'BDR', 'ELV'),
    ('50020371020228210154', '6461 - Cobrança Indevida', 'Vara Única', 'Agudo', 'RS', 'BDR', 'ELV'),
    ('08044108920258150231', '6461 - Cobrança Indevida', '2ª Vara Cível', 'Mamanguapé', 'PB', 'MLV', 'GFC'),
    ('08007406420258150321', '6461 - Cobrança Indevida', '1ª Vara Cível', 'Santa Luzia', 'PB', 'MLV', 'GFC'),
    ('50023324320258240159', '6461 - Cobrança Indevida', 'Vara Única', 'Armazém', 'SC', 'BBS', 'ELV'),
    ('50037211520228210042', 'NEGATIVAÇÃO INDEVIDA', '2ª Vara Cível', 'Canguçu', 'RS', 'BDR', 'ELV'),
    ('00021761420218160092', 'Fumicultores', 'Vara Única', 'Imbituva', 'PR', 'BDR', 'ELV'),
    ('50016613520268210008', '5318 - Material', '5ª Vara Cível', 'Canoas', 'RS', 'BDR', 'ELV'),
    ('00753559020268050001', 'Bloqueio/Desbloqueio', 'Vara Única', 'Salvador', 'BA', 'MLV', 'GFC'),
    ('56440939020098130702', 'Cobrança Derivada de Descumprimento Contratual', '4ª Vara Cível', 'Uberlândia', 'MG', 'BDR', 'ELV'),
    ('50277282420208130702', NULL, '7ª Vara Cível', 'Uberlândia', 'MG', 'JGV', 'ELV'),
    ('50010519120188210026', 'Cobrança', '1ª Vara Cível', 'Santa Cruz do Sul', 'RS', 'BDR', 'ELV'),
    ('50085664120228210026', NULL, '2ª Vara Cível', 'Santa Cruz do Sul', 'RS', 'BDR', 'ELV'),
    ('00018662820268050063', 'NEGATIVAÇÃO INDEVIDA', 'Vara Única', 'Conceição do Coité', 'BA', 'MLV', 'GFC'),
    ('50006075620258080032', NULL, '1ª Vara', 'Mimoso do Sul', 'ES', 'BBS', 'ELV'),
    ('50038936020258080026', 'NEGATIVAÇÃO INDEVIDA', 'Vara Única', 'Itapemirim', 'ES', 'BBS', 'ELV'),
    ('03253660420168190001', 'Uso Indevido de Marca', '4ª Vara Empresarial', 'Rio de Janeiro', 'RJ', 'BDR', 'GFC'),
    ('01247751620248172001', 'Corte - Distribuição', '28ª Vara Cível', 'Recife', 'PE', 'JGV', 'ELV'),
    ('10446820620268130024', 'COBRANÇA INDEVIDA', '1ª Vara Cível', 'Belo Horizonte', 'MG', 'BBS', 'ELV'),
    ('50015518420268080012', '6461 - Cobrança', 'Vara Única', 'Cariacica', 'ES', 'BBS', 'ELV'),
    ('50033611820258130327', 'NEGATIVAÇÃO INDEVIDA', 'Vara Única', 'Itambacuri', 'MG', 'BBS', 'ELV'),
    ('00016817320168210134', NULL, '1ª Vara Judicial', 'Sobradinho', 'RS', 'BDR', 'ELV'),
    ('08002287720198205163', '6461 - Cobrança Indevida', 'Vara Única', 'Ipanguaçu', 'RN', 'BBS', 'GFC'),
    ('50013652820238210134', '6461 - Cobrança', '2ª Vara', 'Sobradinho', 'RS', 'BDR', 'ELV'),
    ('50301080720258080048', 'Cobrança Indevida', 'Vara Única', 'Serra', 'ES', 'BBS', 'ELV'),
    ('50003370320258240027', 'Fumicultores', '1ª Vara', 'Ibirama', 'SC', 'BDR', 'ELV'),
    ('50046015820248210067', 'Fumicultores', 'vara única', 'São Lourenço do Sul', 'RS', 'BDR', 'ELV'),
    ('50004067620228210042', '6461 - Cobrança', 'Vara Adjunta', 'Canguçu', 'RS', 'BDR', 'ELV'),
    ('00011070420258160157', 'Fumicultores', 'Vara única', 'São João do Triunfo', 'PR', 'BDR', 'ELV'),
    ('00011097120258160157', 'Fumicultores', 'Vara única', 'São João do Triunfo', 'PR', 'BDR', 'ELV'),
    ('2208015801200178301', '6461 - Cobrança', 'Procon', 'Brasília', 'DF', 'BBS', 'GFC'),
    ('80139453120228050001', '6461 - Cobrança Indevida', 'Vara Única', 'Salvador', 'BA', 'MLV', 'GFC'),
    ('50027525520258210022', 'Fumicultores', 'Vara Única', 'Pelotas', 'RS', 'BDR', 'ELV'),
    ('50005503820258210109', NULL, '1ª Vara Cível', 'Marau', 'RS', 'BBS', 'ELV'),
    ('50024518220248210042', 'Recisão Contratual', '1ª Vara Cível', 'Canguçu', 'RS', 'BDR', 'ELV'),
    ('50024739020228210049', 'Fumicultores', 'Vara Única', 'Frederico Westphalen', 'RS', 'BDR', 'ELV'),
    ('50001502720178210134', NULL, 'Vara Única', 'Sobradinho', 'RS', 'BDR', 'ELV'),
    ('80006116420238050139', '6461 - Cobrança Indevida', 'Única', 'Jaguarari', 'BA', 'MLV', 'GFC'),
    ('50004750520258210107', 'Fumicultores', 'Vara Única', 'Jaguari', 'RS', 'BDR', 'ELV');

  UPDATE public.processos p
  SET fase = 'Encerramento',
      classe = COALESCE(d.objeto, p.classe),
      vara = COALESCE(d.vara, p.vara),
      comarca = COALESCE(d.comarca, p.comarca),
      uf = COALESCE(d.uf, p.uf),
      responsavel = COALESCE(d.responsavel, p.responsavel),
      socio = COALESCE(d.socio, p.socio)
  FROM _encerramento_souza_cruz d
  WHERE regexp_replace(p.numero_cnj, '\D', '', 'g') = d.cnj_digits;

  GET DIAGNOSTICS _atualizados = ROW_COUNT;

  SELECT string_agg(d.cnj_digits, ', ')
  INTO _nao_encontrados
  FROM _encerramento_souza_cruz d
  WHERE NOT EXISTS (
    SELECT 1 FROM public.processos p
    WHERE regexp_replace(p.numero_cnj, '\D', '', 'g') = d.cnj_digits
  );

  RAISE NOTICE 'Processos atualizados: %', _atualizados;
  IF _nao_encontrados IS NOT NULL THEN
    RAISE NOTICE 'CNJs da planilha que não bateram com nenhum processo cadastrado: %', _nao_encontrados;
  END IF;
END $$;
