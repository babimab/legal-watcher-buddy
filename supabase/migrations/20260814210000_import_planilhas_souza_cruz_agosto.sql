-- Importação: Planilha ELV Agosto
-- 4 processo(s), pasta 'ELV' dentro de Equipe Souza Cruz, responsável 'ELV', sócio 'ELV'.

DO $$
DECLARE
  _criador uuid := (SELECT id FROM auth.users WHERE email = 'bdr@bcw.com.br');
  _pasta_id uuid := (SELECT p.id FROM public.pastas p JOIN public.grupos g ON g.id = p.grupo_id WHERE g.nome = 'Equipe Souza Cruz' AND p.nome = 'ELV');
BEGIN
  IF _pasta_id IS NULL THEN
    RAISE EXCEPTION 'Pasta ELV de Equipe Souza Cruz não encontrada';
  END IF;

  INSERT INTO public.processos
    (numero_cnj, numero_interno, numero_antigo, cliente, parte_contraria, autor, reu,
     uf, comarca, vara, tribunal, sistema, carteira, pasta_id, responsavel, socio,
     status, created_by)
  VALUES
    ('5002643-93.2019.8.21.0008', '527', NULL, 'Souza Cruz', 'Geolar Tonetto', 'Geolar Tonetto', 'Souza Cruz', 'RS', 'Canoas', '4ª Vara Cível', 'TJRS', 'eProc', 'KPMG', _pasta_id, 'ELV', 'ELV', 'ativo', _criador),
    ('5000041-36.2014.8.21.1001', '506', NULL, 'Souza Cruz', 'Elvira Gil dos Santos', 'Elvira Gil dos Santos', 'Souza Cruz', 'RS', 'Porto Alegre', '2ª Vara Cível', 'TJRS', 'eProc', 'KPMG', _pasta_id, 'ELV', 'ELV', 'ativo', _criador),
    ('5015193-44.2020.8.21.0022', '482', NULL, 'Souza Cruz', 'Marina Moreira Brisolara Rosa', 'Marina Moreira Brisolara Rosa', 'Souza Cruz', 'RS', 'Pelotas', '1ª Vara Cível', 'TJRS', 'eProc', 'KPMG', _pasta_id, 'ELV', 'ELV', 'ativo', _criador),
    ('5010800-64.2024.8.21.0013', '535', NULL, 'Souza Cruz', 'JUAREZ DE MELLO', 'JUAREZ DE MELLO', 'Souza Cruz', 'RS', 'Erechim', '1ª Vara Cível', 'TJRS', 'eProc', 'KPMG', _pasta_id, 'ELV', 'ELV', 'ativo', _criador)
  ON CONFLICT (numero_cnj) DO UPDATE SET
    numero_interno = EXCLUDED.numero_interno,
    numero_antigo = COALESCE(EXCLUDED.numero_antigo, public.processos.numero_antigo),
    cliente = EXCLUDED.cliente,
    parte_contraria = EXCLUDED.parte_contraria,
    autor = EXCLUDED.autor,
    reu = EXCLUDED.reu,
    uf = COALESCE(EXCLUDED.uf, public.processos.uf),
    comarca = COALESCE(EXCLUDED.comarca, public.processos.comarca),
    vara = COALESCE(EXCLUDED.vara, public.processos.vara),
    tribunal = COALESCE(EXCLUDED.tribunal, public.processos.tribunal),
    sistema = COALESCE(EXCLUDED.sistema, public.processos.sistema),
    carteira = EXCLUDED.carteira,
    pasta_id = EXCLUDED.pasta_id,
    responsavel = EXCLUDED.responsavel,
    socio = EXCLUDED.socio;

  INSERT INTO public.movimentacoes
    (processo_id, data_movimentacao, descricao, fonte, created_by)
  SELECT proc.id, v.data_movimentacao, v.descricao, 'planilha', _criador
  FROM (VALUES
    ('5002643-93.2019.8.21.0008', '2026-06-29'::date, 'Despacho: Portanto, à unidade para o encaminhamento dos documentos, certificando, oportunamente, acerca do andamento da carta rogatória.'),
    ('5000041-36.2014.8.21.1001', '2026-07-17'::date, 'Trânsito em julgado e baixa definitiva'),
    ('5015193-44.2020.8.21.0022', '2026-04-13'::date, 'Remetido os autos e baixa definitiva'),
    ('5010800-64.2024.8.21.0013', '2026-07-25'::date, 'Conclusos para decisão/despacho')
  ) AS v(numero_cnj, data_movimentacao, descricao)
  JOIN public.processos proc ON proc.numero_cnj = v.numero_cnj
  ON CONFLICT (processo_id, data_movimentacao, md5(descricao)) DO NOTHING;

END $$;

-- Importação: Planilha MLV (Sócio GFC)
-- 33 processo(s), pasta 'MLV' dentro de Equipe Souza Cruz, responsável 'MLV', sócio 'GFC'.

DO $$
DECLARE
  _criador uuid := (SELECT id FROM auth.users WHERE email = 'bdr@bcw.com.br');
  _pasta_id uuid := (SELECT p.id FROM public.pastas p JOIN public.grupos g ON g.id = p.grupo_id WHERE g.nome = 'Equipe Souza Cruz' AND p.nome = 'MLV');
BEGIN
  IF _pasta_id IS NULL THEN
    RAISE EXCEPTION 'Pasta MLV de Equipe Souza Cruz não encontrada';
  END IF;

  INSERT INTO public.processos
    (numero_cnj, numero_interno, numero_antigo, cliente, parte_contraria, autor, reu,
     uf, comarca, vara, tribunal, sistema, carteira, pasta_id, responsavel, socio,
     status, created_by)
  VALUES
    ('0000307-83.2006.8.05.0080', '407', NULL, 'Souza Cruz S.A.', 'Helio Santana', 'Souza Cruz S.A.', 'Helio Santana', 'BA', NULL, '1ª Vara Rel. Consumo, Civeis e Com. De Feira de Santana (BA)', 'TJBA', 'PJE', 'BA', _pasta_id, 'MLV', 'GFC', 'ativo', _criador),
    ('0503478-96.2018.8.05.0103', '3234', NULL, 'Souza Cruz S.A.', 'Rui Barbosa da Rocha e Outra', 'Rui Barbosa da Rocha e Outra', 'Souza Cruz S.A.', 'BA', NULL, '4ª VC de Ilhéus (BA)', 'TJBA', 'PJE', 'BA', _pasta_id, 'MLV', 'GFC', 'ativo', _criador),
    ('8013945-31.2022.8.05.0001', '3793', NULL, 'Souza Cruz S.A.', 'DULCIVANIA PEREIRA DA SILVA', 'DULCIVANIA PEREIRA DA SILVA', 'Souza Cruz S.A.', 'BA', NULL, '17ª VARA DE RELAÇÕES DE CONSUMO DA COMARCA DE SALVADOR', 'TJBA', 'pje', 'BA', _pasta_id, 'MLV', 'GFC', 'ativo', _criador),
    ('8012806-47.2022.8.05.0000', '3793', NULL, 'Souza Cruz S.A.', 'DULCIVANIA PEREIRA DA SILVA', 'DULCIVANIA PEREIRA DA SILVA', 'Souza Cruz S.A.', 'BA', NULL, 'Primeira Câmara Cível (Composição Reduzida) - Des. Paulo César Bandeira de Melo Jorge', 'TJBA', 'pje 2°', 'BA', _pasta_id, 'MLV', 'GFC', 'ativo', _criador),
    ('8041958-43.2022.8.05.0000', '3793', NULL, 'Souza Cruz S.A.', 'DULCIVANIA PEREIRA DA SILVA', 'Souza Cruz S.A.', 'DULCIVANIA PEREIRA DA SILVA', 'BA', NULL, 'Primeira Câmara Cível (Composição Reduzida) - Des. Paulo César Bandeira de Melo Jorge', 'TJBA', 'pje 2°', 'BA', _pasta_id, 'MLV', 'GFC', 'ativo', _criador),
    ('8002197-85.2022.8.05.0038', '3906', NULL, 'Souza Cruz S.A.', 'JOSE CARLOS DOS SANTOS OLIVEIRA', 'JOSE CARLOS DOS SANTOS OLIVEIRA', 'Souza Cruz S.A.', 'BA', NULL, 'VARA DOS FEITOS DE REL DE CONS CIV E COMERCIAIS DE CAMACAN', 'TJBA', 'pje', 'BA', _pasta_id, 'MLV', 'GFC', 'ativo', _criador),
    ('8000611-64.2023.8.05.0139', '4110', NULL, 'Souza Cruz S.A.', 'Jose Edilson Ramos da Silva', 'Jose Edilson Ramos da Silva', 'Souza Cruz S.A.', 'BA', NULL, 'V DOS FEITOS DE REL DE CONS CIV E COMERCIAIS DE JAGUARARI', 'TJBA', 'PJE', 'BA', _pasta_id, 'MLV', 'GFC', 'ativo', _criador),
    ('8003428-06.2023.8.05.0203', '4126', NULL, 'Souza Cruz S.A.', 'OTELINO OLIVEIRA SENA', 'OTELINO OLIVEIRA SENA', 'Souza Cruz S.A.', 'BA', NULL, 'V DOS FEITOS DE REL DE CONS CIV E COM. DE PRADO', 'TJBA', 'PJE', 'BA', _pasta_id, 'MLV', 'GFC', 'ativo', _criador),
    ('0000960-69.2024.8.05.0043', '4172', NULL, 'Souza Cruz S.A.', 'JARIO CARVALHO DOS SANTOS JUNIOR', 'JARIO CARVALHO DOS SANTOS JUNIOR', 'Souza Cruz S.A.', 'BA', NULL, 'JEC de Canavieiras', 'TJBA', 'PROJUDI', 'BA', _pasta_id, 'MLV', 'GFC', 'ativo', _criador),
    ('8002116-04.2024.8.05.0124', '4196', NULL, 'Souza Cruz S.A.', 'JOSE MAKSON COMERCIAL EIRELI', 'JOSE MAKSON COMERCIAL EIRELI', 'Souza Cruz S.A.', 'BA', NULL, 'VSJE', 'TJBA', 'PJE', 'BA', _pasta_id, 'MLV', 'GFC', 'ativo', _criador),
    ('0124163-40.2000.8.05.0001', '4332', NULL, 'Souza Cruz S.A.', 'POSTOS S JORGE DE COMBUSTIVEIS LIMITADA', 'POSTOS S JORGE DE COMBUSTIVEIS LIMITADA', 'Souza Cruz S.A.', 'BA', NULL, '1ª V EMPRESARIAL DE SALVADOR', 'TJBA', 'PJE', 'BA', _pasta_id, 'MLV', 'GFC', 'ativo', _criador),
    ('8002516-81.2025.8.05.0124', '4334', NULL, 'Souza Cruz S.A.', 'ALMIRO DE SOUZA JORGE JUNIOR', 'ALMIRO DE SOUZA JORGE JUNIOR', 'Souza Cruz S.A.', 'BA', NULL, 'V DOS FEITOS DE REL DE CONS CIV E COM. DE ITAPARICA', 'TJBA', 'PJE', 'BA', _pasta_id, 'MLV', 'GFC', 'ativo', _criador),
    ('0001866-28.2026.8.05.0063', '4413', NULL, 'Souza Cruz S.A.', 'MARILDES CARVALHO LIMA', 'MARILDES CARVALHO LIMA', 'Souza Cruz S.A.', 'BA', NULL, '1° Vara do Sistema dos Juizados - Conceição do Coité', 'TJBA', 'PROJUDI', 'BA', _pasta_id, 'MLV', 'GFC', 'ativo', _criador),
    ('0000854-63.2008.8.05.0239', '4415', NULL, 'Souza Cruz S.A.', 'COOPERATIVA NACIONAL DE TRANSPORTE CORPORATIVO - COOMAP', 'COOPERATIVA NACIONAL DE TRANSPORTE CORPORATIVO - COOMAP', 'Souza Cruz S.A.', 'BA', NULL, 'V DOS FEITOS DE REL DE CONS CIV E COMERCIAIS SÃO SEBASTIÃO DO PASSÉ', 'TJBA', 'PJE', 'BA', _pasta_id, 'MLV', 'GFC', 'ativo', _criador),
    ('0075355-90.2026.8.05.0001', '4423', NULL, 'Souza Cruz S.A.', 'ELZA MARIA FERREIRA GOMES', 'ELZA MARIA FERREIRA GOMES', 'Souza Cruz S.A.', 'BA', NULL, '1ª VSJE DO CONSUMIDOR', 'TJBA', 'PROJUDI', 'BA', _pasta_id, 'MLV', 'GFC', 'ativo', _criador),
    ('8000957-13.2026.8.05.0041', '4428', NULL, 'Souza Cruz S.A.', 'JOSE OLIVEIRA MATOS', 'JOSE OLIVEIRA MATOS', 'Souza Cruz S.A.', 'BA', NULL, '1ª V DOS FEITOS RELATIVOS ÀS RELAÇÕES DE CONSUMO, CÍVEIS, COMERCIAIS, REGISTROS PÚBLICOS E ACIDENTES DE TRABALHO DE CAMPO FORMOSO', 'TJBA', 'PJE', 'BA', _pasta_id, 'MLV', 'GFC', 'ativo', _criador),
    ('0037717-76.2011.8.06.0112', '1998', NULL, 'Souza Cruz S.A.', 'A.P Distribuidora De Petróleo Ltda.', 'A.P Distribuidora De Petróleo Ltda.', 'Souza Cruz S.A.', 'CE', NULL, '1ª Vara Cível de Juazeiro do Norte (CE)', 'TJCE', 'Pje', 'CE', _pasta_id, 'MLV', 'GFC', 'ativo', _criador),
    ('3000051-74.2026.8.06.0011', '4394', NULL, 'Souza Cruz S.A.', 'MATHEUS RODRIGUES BUSSON', 'MATHEUS RODRIGUES BUSSON', 'Souza Cruz S.A.', 'CE', NULL, '18ª Unidade do Juizado Especial Cível da Comarca de Fortaleza', 'TJCE', 'Pje', 'CE', _pasta_id, 'MLV', 'GFC', 'ativo', _criador),
    ('3023721-19.2026.8.06.6001', '4430', NULL, 'Souza Cruz S.A.', 'Antonio de Oliveira Silva', 'Antonio de Oliveira Silva', 'Souza Cruz S.A.', 'CE', NULL, '09ª Unidade do Juizado Especial Cível da Comarca de Fortaleza', 'TJCE', 'PJE', 'CE', _pasta_id, 'MLV', 'GFC', 'ativo', _criador),
    ('0800740-64.2025.8.15.0321', '4298', NULL, 'Souza Cruz LTDA.', 'FRANCISVANIA DA COSTA FERREIRA', 'FRANCISVANIA DA COSTA FERREIRA', 'Souza Cruz LTDA.', 'PB', NULL, 'Vara Única de Santa Luzia', 'TJPB', 'PJE', 'PB', _pasta_id, 'MLV', 'GFC', 'ativo', _criador),
    ('0801350-96.2025.8.15.0041', '4386', NULL, 'Souza Cruz LTDA.', 'SEVERINO BENEDITO ALVES', 'SEVERINO BENEDITO ALVES', 'Souza Cruz LTDA.', 'PB', NULL, 'Vara Única de Alagoa Nova', 'TJPB', 'PJE', 'PB', _pasta_id, 'MLV', 'GFC', 'ativo', _criador),
    ('0804410-89.2025.8.15.0231', '4387', NULL, 'Souza Cruz LTDA.', 'MARIA JOSE FIDELES DA SILVA', 'MARIA JOSE FIDELES DA SILVA', 'Souza Cruz LTDA.', 'PB', NULL, '2ª Vara Mista de Mamanguape', 'TJPB', 'PJE', 'PB', _pasta_id, 'MLV', 'GFC', 'ativo', _criador),
    ('0803706-79.2026.8.15.0251', '4424', NULL, 'Souza Cruz LTDA.', 'MARIA DE LOURDES BEZERRA DA SILVA TIBURTINO', 'MARIA DE LOURDES BEZERRA DA SILVA TIBURTINO', 'Souza Cruz LTDA.', 'PB', NULL, '1º Juizado Especial Misto de Patos', 'TJPB', 'PJE', 'PB', _pasta_id, 'MLV', 'GFC', 'ativo', _criador),
    ('0801117-33.2018.8.10.0058', '3381', NULL, 'Souza Cruz S.A.', 'Panificadora Estrela do Aracagy ME', 'Panificadora Estrela do Aracagy ME', 'Souza Cruz S.A.', 'MA', NULL, 'Regional de São José do Ribamar - 1ª Vara Cível', 'TJMA', 'PJE', 'MA', _pasta_id, 'MLV', 'GFC', 'ativo', _criador),
    ('0800609-48.2023.8.10.0079', '4072', NULL, 'Souza Cruz S.A.', 'SHARLES ANDERSON SOARES TAVARES', 'SHARLES ANDERSON SOARES TAVARES', 'Souza Cruz S.A.', 'MA', NULL, 'Vara Única de Cândido Mendes', 'TJMA', 'PJE', 'MA', _pasta_id, 'MLV', 'GFC', 'ativo', _criador),
    ('1013298-18.2023.8.26.0008', '4072', NULL, 'Souza Cruz S.A.', 'SHARLES ANDERSON SOARES TAVARES', 'SHARLES ANDERSON SOARES TAVARES', 'Souza Cruz S.A.', 'SP', NULL, 'Setor Unificado de Cartas Precatórias Cíveis', 'TJSP', 'e-SAJ', 'MA', _pasta_id, 'MLV', 'GFC', 'ativo', _criador),
    ('0803331-74.2025.8.10.0050', '4389', NULL, 'Souza Cruz S.A.', 'JOSE RIBAMAR FREITAS MARTINS', 'JOSE RIBAMAR FREITAS MARTINS', 'Souza Cruz S.A.', 'MA', NULL, 'Juizado Especial Cível e Criminal de Paço do Lumiar', 'TJMA', 'PJE', 'MA', _pasta_id, 'MLV', 'GFC', 'ativo', _criador),
    ('0000407-89.2016.8.18.0059', '2844', NULL, 'Souza Cruz S.A.', 'F. J. da Rocha Rodrigues Comercial - ME', 'F. J. da Rocha Rodrigues Comercial - ME', 'Souza Cruz S.A.', 'PI', NULL, 'Vara Única de Luis Correa (PI)', 'TJPI', 'PJE', 'PI', _pasta_id, 'MLV', 'GFC', 'ativo', _criador),
    ('0002034-66.2012.8.18.0028', '2079', NULL, 'Souza Cruz S.A.', 'Hercília Antonia dos Santos', 'Hercília Antonia dos Santos', 'Souza Cruz S.A.', 'PI', NULL, '2ª Vara de Floriano (PI)', 'TJPI', 'PJE', 'PI', _pasta_id, 'MLV', 'GFC', 'ativo', _criador),
    ('5412867792026809005', '4434', NULL, 'Souza Cruz S.A.', 'Lucas Eduardo Silva Costa', 'Lucas Eduardo Silva Costa', 'Souza Cruz S.A.', 'GO', NULL, '4º Juizado Especial Cível', 'TJGO', 'PROJUDI', 'GO', _pasta_id, 'MLV', 'GFC', 'ativo', _criador),
    ('2507017105400785301', '4364', NULL, 'Souza Cruz S.A', 'LUIS CARLOS COSTA GOMES', 'LUIS CARLOS COSTA GOMES', 'Souza Cruz S.A', 'MA', NULL, NULL, 'TJMA', NULL, 'CASOS PROCON', _pasta_id, 'MLV', 'GFC', 'ativo', _criador),
    ('26030107002002513', '4412', NULL, 'Souza Cruz S.A', 'Jucier Rodrigues dos Santos', 'Jucier Rodrigues dos Santos', 'Souza Cruz S.A', 'PB', NULL, NULL, 'TJPB', NULL, 'CASOS PROCON', _pasta_id, 'MLV', 'GFC', 'ativo', _criador),
    ('26040107002001693', '4422', NULL, 'Souza Cruz S.A', 'EDUARDO ALMEIDA DOS SANTOS', 'EDUARDO ALMEIDA DOS SANTOS', 'Souza Cruz S.A', 'PB', NULL, NULL, 'TJPB', NULL, 'CASOS PROCON', _pasta_id, 'MLV', 'GFC', 'ativo', _criador)
  ON CONFLICT (numero_cnj) DO UPDATE SET
    numero_interno = EXCLUDED.numero_interno,
    numero_antigo = COALESCE(EXCLUDED.numero_antigo, public.processos.numero_antigo),
    cliente = EXCLUDED.cliente,
    parte_contraria = EXCLUDED.parte_contraria,
    autor = EXCLUDED.autor,
    reu = EXCLUDED.reu,
    uf = COALESCE(EXCLUDED.uf, public.processos.uf),
    comarca = COALESCE(EXCLUDED.comarca, public.processos.comarca),
    vara = COALESCE(EXCLUDED.vara, public.processos.vara),
    tribunal = COALESCE(EXCLUDED.tribunal, public.processos.tribunal),
    sistema = COALESCE(EXCLUDED.sistema, public.processos.sistema),
    carteira = EXCLUDED.carteira,
    pasta_id = EXCLUDED.pasta_id,
    responsavel = EXCLUDED.responsavel,
    socio = EXCLUDED.socio;

  INSERT INTO public.movimentacoes
    (processo_id, data_movimentacao, descricao, fonte, created_by)
  SELECT proc.id, v.data_movimentacao, v.descricao, 'planilha', _criador
  FROM (VALUES
    ('0000307-83.2006.8.05.0080', '2026-03-17'::date, '17/03/2026 - Sentença publicada em 17/03/2026. 
17/03/2026 - Arquivamento e baixa definitiva. 
13/03/2026 - Trânsito em julgado.
10/03/2026 - Sentença - Processo extinto por desistência 
06/03/2026 - Conclusos 
18/12/2025 - Pet SC
12/12/2025 - intimação sobre despacho disponibilizado no DJEN
09/12/2025 - Certidão - despacho  encaminhado para publicação no DJEN
05/12/2025 - Expedida intimação sobre despacho no DJEN
26/08/2025 - DESPACHO - intime-se a parte exequente
20/05/2025 - Conclusos para decisão
09/01/2025 - Exarada certidão, na qual atesta impossibilidade de realizar movimentações dos feitos.
21/08/2024 - Petição da SC.
30/07/2024 - Decisão "Após, intime-se as partes para que, no prazo de 30 (trinta) dias: a) apresentem nos autos petição breve, indicando as principais ocorrências do processo, eventual requerimento não apreciado (sendo desnecessário renovar o fundamento fático e jurídico, bastando fazer referência ao ID em que foi apresentado), bem como indiquem a providência que entendem cabível para ser determinada neste momento processual; b) se manifestem acerca de eventual desconformidade na digitalização; e c) informem interesse no prosseguimento do feito, sob pena de extinção."
01/04/2024 - Concluso
06/03/2024 - Manifestação da SC.
14/02/2024 - Despacho: "deverão as partes, em atenção ao princípio da contemporaneidade, reiterarem eventuais requerimentos pendentes de apreciação, no prazo de 15 (quinze) dias, sob pena de preclusão, momento em que deverão manifestar interesse no prosseguimento do feito ou reconvenção, sob pena de extinção"
27/03/2023 - Conclusos
20/03/2023 - Pet da SC 
15/03/2023 - Despacho: "Dê-se ciência ao exequente da impossibilidade de efetuar penhora de numerário do executado, conforme certidão inserida nos autos."
27/02/23 - Certidão de impossibilidade de protocolo SISBAJUD
23/08/22 - Conclusos para julgamento
11/07/22 - Juntada de Petição
27/06/22 - Publicado Despacho
08/06/22 - Despacho disponibilizado no DJ eletronico
25/03/22 - Conclusos para despacho
10/03/22 - Juntada de Petição
25/02/22 - despacho publicado 
23/02/22 - despacho sem possibilidade de visualização
10/12/21 - conclusos para decisão 
16/11/21 - Certidão de publicação no DJE
31/05/21 - Publicação
28/05/21 - Disponibilizado no DJE
26/05/21 - Despacho 
31/03/21 - Petição da Souza Cruz; Conclusão
30/03/21 - Petição da Souza Cruz
26/03/21 - Despacho publicado
25/03/21 - Resultado SISBAJUD - Bloqueio
27/12/20 - Intimação publicada em 24/09 - Migração PJE
13/10/20 - Conclusos para decisão
01/10/20 - Juntada de petição
23/09/20 - Processo migrado para o PJE
21/07/20 - Juntada de petição
09/04/20 - Relação publicada
07/04/20 - Despacho remetido ao DJE
26/03/20 - Despacho de mero expediente
02/03/2020 - Concluso para despacho                          
19/02/2020 - Juntada de petição 
04/02/2020 - Publicado   
31/01/2020 - Despacho 
27/01/2020 - Juntada de petição 
14/01/2020  Publicado Relação :0008/2020 Data da Disponibilização: 13/01/2020 Data da Publicação: 14/01/2020 Número do Diário: 2538'),
    ('0503478-96.2018.8.05.0103', '2026-07-06'::date, '06/07/2026 - Ato ordinatório: Intime-se a parte Exequente para manifestar-se, no prazo de 15 (quinze), acerca da petição de ID 566300383 e documento.
26/06/2026 - PET SC
07/05/2026 - Ato ordinatório -  Intimem-se as partes do retorno dos autos ao juízo de primeiro grau, a fim de que requeiram, no prazo de 15 (quinze) dias, o que entenderem de direito. 
07/05/2026 - Autos evoluidos para cumprimento de sentença 
26/05/2025 - Remetidos os autos para o 2 grau
12/05/2025 -  Contrarrazões da autora
15/04/2025 - Ato ordinatório - intimem-se as apeladas para apresentar contrarrazão ou recurso adesivo
26/02/2025 - Certidão de que foi protocolada apelação
17/02/2025 - Juntada de Petição de Apelação de SC
23/01/2024 - Sentença; Pedido julgado procedente.
05/12/2022 - autos conclusos após juntada de pet da SC
23/11/2022 -  Processo Migrado PJE
01/11/22 - Remetido ao PJE
06/05/22 - Concluso para sentença
05/05/22 - Juntada de Petição
20/04/22 - Juntada de Petição
30/03/22 - Publicado
29/03/22 - Despacho remetido ao Diário de Justiça Eletrônico.
22/03/22 - Despacho: "Intimem-se as partes para que informem se desejam produzir outras provas e, em caso positivo, especifiquem e justifiquem a pertinência de cada uma delas, sob pena de indeferimento, tudo no prazo comum de 15 dias. Após, nova conclusão, sendo que, se não houver requerimento de provas, a conclusão será para sentença. Publique-se. Intimem-se. Cumpra-se."
21/07/20 - Juntada de petição
18/10/2019  Concluso para despacho
18/10/2019  Expedição de Certidão de Decurso do Prazo
TODOS - Certidão de Decurso de Prazo'),
    ('0503478-96.2018.8.05.0103', '2026-05-06'::date, '06/05/2026 - Baixa
06/05/2026 - Trânsito em julgado 
06/04/2026 - Ementa publicada 
04/04/2026 - Intimação publicada no DJEN
01/04/2026 - Certidão  de julgamento 
31/03/2026 - Embargos não acolhidos 
27/02/2026 - Intimação sobre pauta publicada no DJEN
25/02/2026 - Incluido na pauta de 23/03/2026, às 12h 
14/02/2026  - Solicitado dia de julgamento
11/11/2025 - Conclusão 
11/11/2025 - Certidão - Informa a ausência de contrarrazões da parte recorrida 
29/10/2025 - Embargos de declaração disponibilizado no DJEN 
28/10/2025 - Embargos de declaração SC. 
21/10/2025 - Publicado Ementa. 
06/10/2025-  Ácordão. 
17/09/2025 - Incluído em pauta para 06/10/2025 12:00:00 PLENÁRIO VIRTUAL.
15/09/2025 - Relatório e Solicitado dia de julgamento
13/06/2025 - Conclusos
13/06/2025 - Petição da Souza Cruz Manifestação
30/05/2025 - Publicado despacho 
28/05/2025 - Depacho - intime-se a parte recorrente para se manifestar
27/05/2025 - Conclusos
27/05/2025 - Certidão ao Relator Des. Cláudio Césare Braga Pereira
26/05/2025 - Distribuído'),
    ('8013945-31.2022.8.05.0001', '2026-03-18'::date, '18/03/2026 - Baixa definitiva 
18/03/2026 - Trânsito em julgado 
23/02/2026 - Publicado ementa 
21/02/2026 - Intimação publicada no DJEN
19/02/2026 - Intimação sobre acórdão expedida 
11/02/2026 - Acórdão - recurso provido em parte.
10/02/2026 - Deliberado em sessão - julgado
16/12/2025 - Processo incuído na pauta para 03/02/2026, às 12h
01/12/2025 - Conclusos'),
    ('8012806-47.2022.8.05.0000', '2023-06-19'::date, '19/06/2023 - Arquivado definitivamente; Baixa definitiva
16/06/2023 - Certidão de decurso de prazo para interposição de recurso da decisão (Id 43789479).
09/05/2023 - Sistema registrou ciência em 08/05/2023 para a intimação expedida via portal eletrônico no sistema Pje para SC
28/04/2023 - Certidão sobre publicação da decisão.
27/04/2023 - Prejudicado recurso
20/06/22 - Juntada de Petição de contra-razões; Juntada de certidão; Conclusos.
27/05/22 - Disponibilizado no DJ Eletrônico; Juntada de certidão.
26/05/22 - Juntada de certidão; Expedição de Ofício; Expedição de intimação; Disponibilizado no DJ Eletrônico; Publicado Decisão AI               
25/05/22 - Recebido o recurso Sem efeito suspensivo
04/04/22 - Distribuído por sorteio; Expedição de Certidão; Conclusos'),
    ('8041958-43.2022.8.05.0000', '2023-09-04'::date, '04/09/2023 - ARQUIVADO DEFINITIVAMENTE; BAIXA DEFINITIVA
07/06/2023 - CONHECIDO O RECURSO DE SOUZA CRUZ E PROVIDO (acórdão publicado dia 15/06/23)
06/06/2023 - Juntada de certidão de julgamento
26/05/2023 - Juntada de Memoriais da SC
18/05/2023 - INCLUÍDO EM PAUTA PARA 30/05/2023 12:00:00 TJBA - 1ª CÂMARA CÍVEL - PLENÁRIA VIRTUAL.
15/05/2023 - Relatório mandando processo para conclusão
07/03/2023 - Juntada de CR; Juntada de decisão dos Eds
13/02/2023 - CONCEDIDO EFEITO SUSPENSIVO A RECURSO
25/11/2022 - Petição da SC
20/11/2022 - Despacho determinando que a SC retique o erro referente a autuação do recurso
20/10/2022 - Junta de Embargos de declaração
13/10/2022 - DECISÃO TERMINATIVA MONOCRÁTICA SEM RESOLUÇÃO DE MÉRITO "Em razão do exposto, não conheço do recurso por ser inadmissível."
10/10/2022 - Distribuição'),
    ('8041958-43.2022.8.05.0000', '2023-03-28'::date, '28/03/2023 - Baixa Definitiva e Arquivado Definitivamente
13/02/2023 - EMITIDO JUÍZO DE RETRATAÇÃO PELO COLEGIADO "Na condição de Relator destes autos, entendo de modo diverso no tocante à admissibilidade do agravo de instrumento e, reservando-me a expor as razões da admissibilidade no recurso principal, entendo que a decisão monocrática impugnada deve ser reformada para viabilizar o novo exame da admissibilidade. Ante o exposto, RECEBO os EMBARGOS DE DECLARAÇÃO como AGRAVO INTERNO, e, nesta esteira, exerço o juízo positivo de retratação, REVOGANDO a decisão monocrática que negou seguimento ao agravo de instrumento, determinando que o recurso principal retorne concluso para novo juízo de admissibilidade. Translade-se cópia desta decisão ao recurso principal. Após, proceda-se com o arquivamento deste incidente e retornem os autos do agravo de instrumento conclusos.
27/01/2023 - Manifestação da Embargada
15/12/2022 - Recurso distribuído; Despacho determinando citadação da parte Embargada'),
    ('8002197-85.2022.8.05.0038', '2026-08-07'::date, '07/08/2026 - Conclusos
16/07/2026 - Petição SC
25/06/2026 - Intimação publicada no DJEN
18/06/2026 - Expedida comunicação eletrônica 
30/03/2026 - Petição autor - comprovante de pagamento 
18/03/2026 - Intimação publicada no DJEN
11/03/2026 - Intimação sobre despacho publicada 
09/03/2026 - Intimação sobre despacho expedida 
01/03/2026 - Despacho - determinações para o requerente 
20/02/2026 - Classe evoluída para cumprimento de sentença 
11/12/2025 - Pet SC - cumprimento de sentença
07/11/2025 - Intimação sobre a sentença publicada 
04/11/2025 - Sentença - Pedido julgado improcedente. 
04/11/2024 - Concluso
02/10/2024 - Pet da SC (sem provas)
26/09/2024 - Após, intimem-se as partes para que, no prazo comum de 05 (cinco) dias, especifiquem as provas que pretendem produzir ou postulem o julgamento antecipado do mérito.
25/09/2024 - Réplica
29/08/24 - Intimação para réplica.
20/08/24 - Contestação da SC
31/07/24 - AC sem acordo
28/06/24 - Juntada de AR da SC.
30/04/24 - Pet da SC (Habilitação + Cumprimento da Liminar)
24/04/24 - Expedição de Carta Precatória (ainda não distribuída).
23/04/24 - Liminar Deferida.
13/10/22 - Conclusos para decisão
11/10/22 - Juntada de petição - autor
06/10/22 - Disponibilizado no DJ eletronico
05/10/22 - Proferido despacho de mero expediente: "Intime-se a parte autora para, no prazo de 15 (quinze) dias, apresentar comprovante de residência em seu nome e atualizado (no mínimo dos últimos 2 meses), sob pena de extinção do processo."
27/09/22 - Distribuído por sorteio'),
    ('8000611-64.2023.8.05.0139', '2026-07-30'::date, '30/07/2026 - Comprovante pix 
27/07/2026 - Expedição de alvará 
23/07/2026 - Petição requerendo a liberação do depósito e conclusos 
26/06/2026 - Intimação sobre Eds publicada no DJEN
11/06/2026 - ED''s não acolhidos 
11/11/2025 - Conclusão 
11/11/2025 - Contra-razões apresentadas pela parte autora 
30/10/2025 - Certidão informando a tempestividade do ED
29/10/2025 - ED oposto pela SC 
17/10/2025 - SENTENÇA - Pedido julgado parcialmente procedente. 
30/08/2024 - Certidão - gravação da audiência foi incluída no PJE mídias
29/08/2024 - Concluso
27/08/2024 - Ata da Audiência
08/07/2024 - AR devolvido.
13/06/2024 - Expedição da Intimação para a AIJ.
01/06/2024 - Despacho "Designo a audiência de instrução virtual, por meio de videoconferência para o dia 27/08/2024, às 11:45"
20/12/2023 - Concluso e Juntada de AR da SC
23/11/2023 - AC realizada ata disponibilizada
22/11/2023 - Juntada de Contestação;
09/10/2023 - Liminar deferida; AC desgnada para 23/11/23; citação expedida
04/07/2023 - Distribuição'),
    ('8003428-06.2023.8.05.0203', '2024-07-16'::date, '16/07/2024 - Concluso
03/07/2024 - Réplica
02/07/2024 - Contestação da Global.
26/06/2024 - Contestação da SC.
11/06/2024 - Pet - Habilitação + Cumprimento de Liminar
04/06/2024 - Expedição da Citação.
27/05/2024 - Decisão "DEFIRO a tutela de urgência pleiteada para DETERMINAR que o Requerido proceda à exclusão do nome do autor dos cadastros de proteção ao crédito, bem como se abstenha de cobrar a dívi"
20/11/2023 - Conclusos 
AUDIÊNCIA CONCILIAÇÃO CANCELADA PARA 22/01/2024 08:00 V DOS FEITOS DE REL DE CONS CIV E COM. DE PRADO.'),
    ('0000960-69.2024.8.05.0043', '2026-06-03'::date, '03/06/2026 - Intimação sobre despacho publicado no DJEN
03/06/2026 - Remetidos os autos à contadoria 
03/06/2026 - Despachos - Autos à contadoria 
05/05/2026 - Certidão - Conta judicial zerada
23/04/2026 - Conclusos 
14/04/2026 - Pet sc
01/04/2026 - Intimação para SC disponibilizada no DJEN
01/04/2026 - Extrato de valores remanescentes 
13/03/2026 - Intimação sobre despacho expedida e disponibilizada no DJEN
12/03/2026 - Despacho - "Oficie-se o BRB como requerido e em caso de haver saldo remanescente, expeça-se o alvará em favor da parte ré."
03/03/2026 - Pet SC
03/03/2026 - Comprovante de Pix judicial 
27/02/2026 - Alvará pendente de assinatura de sistema bancário 
27/02/2026 - Conclusos para decisão sobre arquivamento 
27/02/2026 - Alvará expedido 
27/02/2026 - Autos remetidos para secretaria 
26/02/2026 - Juntada de pet SC
04/02/2026 - Intimação expedida e publicada para SC
05/12/2025 - Juntada de comprovante de pix judicial 
03/12/2025 - Intimação para a parte autora disponibilizada no DJEN 
03/12/2025 - Álvará expedido para parte autora
23/10/2025 - Disponibilizado no DJ
23/10/2025 - Autos remetidos a contadoria. 
22/10/2025 - Despacho enviando para o setor de cálculos. 
25/09/2025 - Concluso 
23/09/2025 - Disponibilizado no DJ
2/09/2025 - Solicitada a Expedição de Alvará
p/ SOUZA CRUZ LTDA e Publicada a inimação no DJEN
20/09/2025 - Julgada procedente a impugnação à execução de SOUZA CRUZ LTDA
07/07/2025 - Conclusos para Embargos de Execução
09/06/2025 - Petição requerendo o levantamento do valor
06/06/2025 - Disponibilizado no DJEN
03/06/2025 - Intimação expedida ao autor
21/05/2025 - Impugnação ao Cumprimento de Sentença de SC
29/04/2025 - Intimação lida SC
16/04/2025 - Intimação expedida para SC
15/04/2025 - Cumprimento de sentença do autor
15/04/2025 - Juntada de Registro de Retorno dos Autos da Turma Recursal
15/04/2025 - Baixa definitiva
15/04/2025 - Intimação expedida para SC
15/04/2025 - Transitado em Julgado
20/03/2025 - Juntada de petição de pagamento da condenação de SC
11/03/2025 - Intimação lida de Souza Cruz
26/02/2025 - Intimação expedida para Souza Cruz
26/02/2025 - ACÓRDÃO - Agravo Interno de SC conhecido e NEGADO. 
25/02/2025 - Conclusos
27/01/2025 - Juntada de Petição de Contrarrazões Recursais
09/01/2025 - Exarada certidão, na qual designou o prazo de 15 dias para manifestação acerca do agravo interno interposto.
22/11/2024 - Juntada de Agravo Interno pela SC.
20/10/2024 - Decisão "Ante o exposto, realizado julgamento do Recurso do processo acima epigrafado, com fulcro no Enunciado n. 103 do FONAJE, art. 932, IV do CPC e art. 15, XI, XII e XIII do Novo Regimento Interno das Turmas Recursais deste Estado, com alterações da Resolução nº 20/2023, monocraticamente, JULGO no sentido de CONHECER e NEGAR PROVIMENTO ao recurso interposto pela parte Ré."
09/10/2024 - Concluso
10/09/2024 - Certidão "O(s) Recurso(s) Inominado(s) interposto(s) nos autos afigura(m)-se TEMPESTIVO(S) e devidamente PREPARADO(S). Intimar a parte Recorrida para, querendo, contrarrazoar no prazo de 10 (dez) dias. Transcorrido o prazo, com ou sem manifestação, encaminhe-se os autos à Turma Recursal."
09/09/2024 - RI da SC
15/08/24 - Sentença "Face ao exposto, extingo o feito COM APRECIAÇÃO DO MÉRITO (art. 487, I do NCPC) e julgo PROCEDENTE o pedido, para confirmar a liminar concedida nos autos e CONDENAR a parte ré, a pagar à parte acionante, a título de danos morais, levando-se em conta a extensão do dano e critérios de razoabilidade, a quantia de R$ 5.000,00, a ser devidamente acrescido de juros 1% ao mês e correção monetária pelo INPC, a partir do arbitramento, em conformidade com a Súmula 362, do STJ."
26/05/24 - Juntada de AR (SC).
13/05/24 - Petição do Autor requerendo o levantamento.
10/05/24 - Contestação da SC.
07/05/24 - Concluso.
02/05/24 - Juntada de AR da Souza Cruz (Intimação).
20/04/24 - Juntada de AR da Souza Cruz (Citação).
10/04/24 - Decisão "O artigo 84 do CDC autoriza o juiz a conceder provimento antecipatório da tutela requerida, sendo relevante o fundamento da demanda e havendo justificado receio de ineficácia do provimento final, liminarmente ou após justificação prévia, citado o réu.
Entendo ser necessário oportunizar à ré pronunciamento antes de que seja formado qualquer juízo a respeito da questão.
Reservo-me a apreciar o pedido antecipatório após a manifestação da ré, para o que lhe assinalo o prazo de 05 (cinco) dias."
09/04/24 - Citação Expedida
08/04/24 - Audiência para 13/05/2024 - 8h
08/04/24 - Distribuição'),
    ('8002116-04.2024.8.05.0124', '2026-02-04'::date, '04/02/2026 - Conclusão
04/02/2026 - Certidão informa que a CR foi juntada tempestivamente 
22/01/2026 - Contra-razões SC
09/12/2025 - Intimação sobre ato ordinatório publicada no DJEN 
05/12/2025 - Ato ordinatório determinando intimação para SC para apresentar contrarazões 
03/11/2025 - Recurso inominado interposto pela parte autora 
20/10/2025 - Expedida a comunicação eletrônica.
10/10/2025 - SENTENÇA - Pedidos julgados parcialmente procedentes 
23/09/2024 - Conclusos para julgamento.
20/09/2024 - Apresentada contestação pela SC.
23/08/2024 - Juntada de AR da SC.
29/07/2024 - Designação de AC telepresencial para 23/09/2024 às 10h15
28/06/2024 - Concluso
18/06/2024 - Distribuição'),
    ('0124163-40.2000.8.05.0001', '2026-07-17'::date, '17/07/2026 - Conclusos para despacho
15/06 - Petição Bradesco - sem provas a produzir e Petição SC
09/06/2026 - Despacho - Intimação, no prazo de 5 dias, para a produção de provas 
13/05/2026 - Remetidos os Autos  para Secretaria Virtual
30/03/2026 - Conclusos
10/02/2026 - Conclusão 
30/01/2026 - Petição autor - Réplica 
27/12/2025  - Pet  de comunicações informando a intimação por engano 
23/12/2025 - Intimação da parte autora disponibilizada no DJEN
19/12/2025 - Despacho - "Fale a parte autora sobre a contestação apresentada"
19/11/2025 - Contestação Bradesco 
09/09/2025 - Concluso 
09/09/2025 - Réplica Posto S Jorge
19/08/2025 - Contestação Souza Cruz
29/07/2025 - Certidão - Juntada de AR positivo de Souza Cruz, dando início ao prazo para resposta
18/06/2025 - Certidão - expedida citação via AR à Souza Cruz
27/05/2025 - Petição comprovando pagamento das custas autor
11/04/2025 - Petição autor
02/04/2025 - Petição Banco Bradesco 
27/03/2025 - Despacho - autora deve providenciar endereço para a citação
22/03/2025 - Petição de Habilitação Bradesco
12/12/2000 - Distribuição'),
    ('8002516-81.2025.8.05.0124', '2026-02-20'::date, '20/02/2026 - Conclusos 
11/02/2026 - CR da parte autora 
10/02/2026 - Certidão informando a tempestividade dos ED
09/01/2026 - ED Souza Cruz 
02/02/2026 - Intimação sobre sentença publicada no DJEN
20/01/2026 - Expedida citação. 
20/01/2026 - Sentença - Pedido julgado parcialmente procedente 
22/09/2025 - Concluso 
22/09/2025 - Audiência UNA realizada
21/08/2025 - Não confirmada a citação eletrônica
19/08/2025 - Petição de Cumprimento da Liminar Souza Cruz
15/08/2025 - Expedida citação para a Souza Cruz
15/08/2025 - Audiência UNA designada para 22/09/2025, às 9h15
29/07/2025 - Expedida citação
17/07/2025 - Decisão - Concedida a menina liminar - Souza Cruz deve baixar as negativações
14/07/2025 - Distribuição'),
    ('0001866-28.2026.8.05.0063', '2026-07-31'::date, '31/07/2026 - Intimação disponibilizada no DJEN sobre trânsito em julgado 
31/07/2026 - Juntada de registro do retorno dos autos da turma recursal 
31/07/2026 - Trânsito em julgado 
06/07/2026 - Decisão: conhecido o recurso e não provido e publicado no DJEN
02/06/2026 - Intimaçao sobre recurso e despacho publicados no DJEN
01/06/2026 - Decisão - Concedida antecipação de tutela 
28/05/2026 - RI autor 
19/05/2026 - Intimação sobre sentença disponibilizada no DJEN 
18/05/2026 - Sentença - Pedido julgado improcedente 
08/04/2026 - Conclusos 
08/04/2026 - AC realizada 
07/04/2026 - Contestação 
09/03/2026 - Citação lida SC'),
    ('0001866-28.2026.8.05.0063', '2026-07-31'::date, '31/07/2026 - Trânsito e baixa 
06/07/2026 - Acórdão - Recurso não provido
01/07/2026 - Conclusos 
01/07/2026 - Juntada de certidão - Autos conclusos
02/06/2026 - Intimaçao sobre recurso e despacho publicados no DJEN
01/06/2026 - Decisão - Concedida antecipação de tutela 
28/05/2026 - RI autor'),
    ('0000854-63.2008.8.05.0239', '2026-07-27'::date, '27/07/2026 - Conclusos 
08/07/2026 - Publicado a intimação 
06/07/2026 - A. ordinatório - Intimação para o autor se manifestar sobre a contestação. 
13/04/2026 - Contestação SC
16/03/2026  - Citação expedida'),
    ('0075355-90.2026.8.05.0001', '2026-07-06'::date, '06/07/2026 - Arquivamento 
06/07/2026 - Expedido alvará 
01/07/2026 - Solicitação de alvará 
16/06/2026 - Pet SC
08/06/2026 - Intimação publicada no DJEN
08/06/2026 - Evolução para cumprimento de sentença 
/03/06/2026 - Transito em julgado 
02/06/2026 - Pet autor - Execução
16/05/2026 - Intimação sobre sentença disponibilizada no djen
15/05/2026 - Sentença - julgada procedente em parte 
13/05/2026 - Conclusos
13/05/2026 - AC realizada
13/05/2026 - Impugnação
12/05/2026 - Contestação 
16/04/2026 - Citação expedida SC
14/04/2026  - Não concedida a liminar
 10/04/2026 - AC designada para 13/05/2026, às 09h
10/04/2026 - Distribuido'),
    ('8000957-13.2026.8.05.0041', '2026-07-21'::date, '21/07/2026 - Certidão: Certifico para os devidos fins, que nesta data procedi ao envio do expediente de ID 569803432, tendo como código de rastreamento BN 451 571 626 BR. E publicado no DJEN
20/07/2026 - Audiência virtual realizada 
15/07/2026- Expedida a comunicação eletrônica
14/07/2026 - Despacho inicial - cita-se a parte ré; tutela antecipada será analisada após a formação do contraditório; ... 
01/05/2026 - Autos incluídos no Juízo 100% Digital'),
    ('0037717-76.2011.8.06.0112', '2026-06-08'::date, '08/06/2026 - Conclusos
08/06/2026 - Pet
07/05/2026 - Certidão - Não cumprimento do despacho 
06/05/2026  - Expedido alvará 
23/04/2026 - Despacho - Determinações sobre o cumprimento da sentença
04/03/2026 - Pet SC 
22/01/2026 - Confirmada a comunicação eletrônica 
21/01/2026 - Juntada de certidão de custas - guia vencida
14/01/2026 - Juntada de E-carta não entregue 
08/01/2026 - Juntada de E-carta entregue 
17/12/2025 - Ato ordinatório publicado no DJEN
15/12/2025 - Concluso
15/12/2025 - Juntada de certidão de custas
10/12/2025 - Juntada de petição 
01/12/2025 - Juntada de certidão de transito
01/12/2025 - Trâsito em julgado
04/11/2025 - Intimação sobre sentença publicada 
03/11/2025 - Sentença disponibilizada no DJEN
30/10/2025 - Sentença -  Embargos solicitados pela SC não acolhidos 
02/12/2024 - Conclusos.
13/11/2024 - Migrado para o PJE.
06/06/2024 - Concluso
24/04/2024 - Certidão "Decorreu o prazo legal referente à carta de intimação para constituir novo advogado no prazo de 30 (trinta) dias ( fl. 314)."
05/04/2024 - Despacho "Converto o julgamento em diligência, visto que o processo figura na filaconcluso para sentença, mas não se encontra pronto para julgamento.Aguarde-se o cumprimento dos atos determinados no despacho de página 313"
26/02/2024 - Expedição de Intimação.
23/02/2024 - Despacho "Ante a devolução das correspondências de páginas 305/310, intimem-se osautores Pan Distribuidora de Petroleo Ltda, Parente e Campos Ltda -mee e NataliaCampos Parente, por edital com prazo de 20 (vinte) dias, para constituir novo advogado noprazo de 30 (trinta) dias, e no prazo de 5 (cinco) dias, se manifeste sobre os embargos dedeclaração (art. 1023, § 2º do CPC).Renove-se a intimação da parte autora A.p Distribuidora de Petroleo Ltda,por carta com AR/MP, para constituir novo advogado no prazo de 30 (trinta) dias, e noprazo de 5 (cinco) dias, se manifeste sobre os embargos de declaração (art. 1023, § 2º doCPC)."
13/11/2023 - Juntada de EDs da SC
12/05/2023 - Juntada de AR
03/05/2023 - "Torno sem efeito sentença de fls. 277. Considerando a renúncia do mandato do advogado de fls. 277, intime-se os autores para constituir novo advogado no prazo de 30 (trinta) dias, sob pena de extinção do feito. " Expedição de intimações.
01/03/23 - Concluso para Sentença
09/02/23 - Conclusos
06/02/23 - Juntada de pet.
28/01/23 - Despacho disponibilizado no DJ eletrônico
23/01/23 - Encaminhado edital/relação para publicação
16/01/2023 - Extinto o processo por abandono da causa pelo autor
11/11/22 - Concluso para Despacho
16/05/22 - Concluso para Despacho; Certidão emitida
23/02/22 - Prazo alterado pelo ajuste na tabela de feriados "Prazo referente ao usuário foi alterado para 01/03/2022 devido à alteração da tabela de feriados.  Prazo referente à intimação foi alterado para 03/03/2022 devido à alteração da tabela de feriados"
09/02/22 - publicado despacho " Ante o lapso temporal da petição de fls. 274, uma vez que o prazo requerido já fora esgotado, determino que a parte seja intimada através do seu advogado, para manifestar seu interesse no prosseguimento do feito, no prazo de 10 (dez) dias, sob pena de extinção. "
08/02/22 - encaminhado o despacho do dia 14/12/21 para publicação 
13/01/22 - conclusos para despacho
21/12/21 - juntada de petição de renúncia de mandato
26/02/24 - Expedição de Intimação.
14/12/21 - proferido despacho de mero expediente
20/07/21 - Conclusão; petição do autor
29/04/21 - Julgamento convertido em diligência - Apresentar CR
04/03/21 - Certidão
23/11/20 - Certidão
16/09/20 - Alteração de prazo
28/07/20 - Interposição de EDs pela Souza Cruz; entranhamento do processo; conclusão.
20/07/20 - Decisão publicada
10/07/20 - Sentença parcialmente procedente
16/06/20 - Juntada de petição
17/09/2019 - Ceridão emitida 29/07/2019 - Concluso para sentença'),
    ('3000051-74.2026.8.06.0011', '2026-07-14'::date, '14/07/2026 - Arquivado definitivamente 
13/07/2026 - Sentença: homologando o acordo e julgado extinto o feito
06/07/2026 - Conclusos
25/06/2026 - Acordo 
07/05/2026 - Juntada de E-carta não entregue autor 
16/04/2026 - Juntada de E-carta entregue para SC
31/03/2026 - Intimação autor disponibilizada no DJEN
27/03/2026 - Expedida citação para SC 
30/01/2026 - Decisão - "Cite-se a parte promovida para a audiência de conciliação assinalada."
30/01/2026 - Despacho - "nalisando os autos, constata-se não se tratar de hipótese de prevenção de outro juízo."
16/01/2026  - Conclusos para decisão'),
    ('3023721-19.2026.8.06.6001', '2026-07-30'::date, '30/07/2026 - Pet autor - Emenda à inicial 
21/07/2026 - Decisão: recebida a emenda a inicial; determinada a citação; intimação da parte autora para AIJ
15/07/2026 - Petição (comprovante de residência) e conclusos para decisão 
24/06/2026 - Despacho determina emenda à inicial
02/06/2026 - Link ac 
01/06/2026 - AC designada para 30/07/2026, às 14h
01/06/2026 - Pet inicial'),
    ('0800740-64.2025.8.15.0321', '2026-08-02'::date, '02/08/2026 - Arquivamento 
31/07/2026 - Decisão - determina arquivamento dos autos 
28/07/2026 - Conclusos 
28/07/2026 - TJ recurso 
22/07/2026 - Pet SC
18/03/2026 - Autos remetidos ao 2 grau
18/03/2026 - Despacho - Determina a intimação para apresentar CR (já apresentamos)
17/03/2026 - CR SC
24/02/2026 - Intimação disponibilizada e publicada no DJEN
22/02/2026 - Ato ordinatório procedendo a intimação para SC para contrarrazões;  
11/02/2026 - Apelação autora 
03/2/2026 - Pet SC
27/01/2026 - Publicado expediente 
15/01/2026- Intimação sobre sentença disponibilizada no DJEN 
12/01/2026 - Expedição de intimação 
03/12/2025 - SENTENÇA - Pedido julgado parcialmente procedente
10/11/2025 - Petição autora - Requer o julgamento antecipado do mérito
05/11/2025 - Petição SC
17/10/2025 - Publicação intimada
15/10/2025 - Disponibilizado no DJEN
13/10/2025 - Despacho intimando as partes para informarem se tem interesse em conciliação. 
22/07/2025 - Impugnação a contestação
01/07/2025 - Publicada intimação
29/06/2025 - Intimação a autora
18/06/2025 - Despacho - intime-se parte autora para impugnar a contestação
17/06/2025 - Contestação Souza Cruz
08/06/2025 - Juntada AR SC citada
21/05/2025 - Expedição de citação SC
12/05/2025 - Decisão - concedida a gratuidade de justiça a autora
02/05/2025 - Distribuição'),
    ('0800740-64.2025.8.15.0321', '2026-07-28'::date, '28/07/2026 - Baixa definitiva 
22/07/2026 - Petição SC
02/07/2026 - Intimação sobre recurso publicado no DJEN
30/06/2026 - Acórdão - Provimento negado
26/06/2026 - Memoriais SC
09/06/2026 - Intimação sobre pauta publicada no DJEN 
09/06/2026 - Processo incluído na pauta a ser julgado entre 29 de Junho de 2026, às 14h00 até 06 de Julho de 2026.
09/06/2026 - Intimação sobre pauta
03/06/2026 - Despacho - Solicita inclusão na pauta virtual para julgamento e informa que a primeira sessão será 05 dias após a publicação no DJEN
18/03/2026 - Autos recebidos'),
    ('0801350-96.2025.8.15.0041', '2026-07-17'::date, '17/07/2026 - Petição SC
29/06/2026 - Documentos publicados no DJEN 
25/06/2026 - Expedição de outros documentos 
02/06/2026 - Pet autor - Provas 
25/05/2026 - Despacho - Pretenção de produzir provas
20/05/2026 - Conclusos 
18/05/2026 - Réplica 
28/04/2026 - Contestação SC
26/03/2026 - Expedida intimação para autor 
25/03/2026 - Decisão - Indeferimento de tutela e deferimento de justiça gratuita 
16/12/2025 - Autos incluídos no Juízo 100% Digital'),
    ('0804410-89.2025.8.15.0231', '2026-07-09'::date, '09/07/2026 - Mandado devolvido: Certifico eu, Oficial de Justiça abaixo nominado, que INTIMEI a Srª. MARIA JOSE FIDELES DA SILVA para ciência da sentença
30/06/2026 - Pet SC 
28/06/2026 - Pet DP - ciência e requer a intimação da autora 
20/05/2026 - Sentença - Pedido procedente 
05/05/2026 - Conclusos
05/05/2026 - Pet SC
24/04/2026 - Intimação disponibilizada no DJEN
22/04/2026 - Expedição de outros documentos
15/04/2026 - Decisão - Intimem-se as partes para que, no prazo de 5 (cinco) dias, especifiquem as provas que pretendem produzir, ou, se for o caso, manifestem-se pelo julgamento antecipado da lide.
24/03/2026 - DP - Cota de ciência 
17/03/2026 - Intimação para a parte autora publicada no DJEN
13/03/2026 - Ato ordinatório - Determina a impugnação a contestação
06/03/2026 - Carta entregue 
19/02/2026 - Intimação sobre impugnação publicada no DJEN
19/02/2026 - Intimação disponibilizado no DJ Eletrônico em 16/02/2026
13/02/2026 - Expediente informando prazo de impugnação da contestação 
10/02/2026 - Contestação SC
10/02/2026 - Pet autor - Juntada de documentos 
15/01/2026 - Expedição de carta 
14/01/2026 - Decisão - Tutela de urgência negada e 
deferimento da JG.'),
    ('0803706-79.2026.8.15.0251', '2026-08-12'::date, '12/08/2026 - Pedido autoral julgado improcedente 
02/06/2026 - Conclusos 
28/05/2026 - ac
27/05/2026 - Contestação SC
22/05/2026 - Citação recebida SC
06/05/2026 - Expedida intimação para ciência de audiência Una, Data: 28/05/2026 Hora: 08:00.
29/04/2026 - Certidão - recebimento da intimação pela parte autora 
25/04/2026 - Certidão de citação expirada
17/04/2026 - Expedida citação 
17/04/2026 - Expedida e publicada intimação sobre AC
07/04/2026 - Decisão - Não concedida a tutela de urgência
04/06/2026 - Distribuido'),
    ('0801117-33.2018.8.10.0058', '2026-07-14'::date, '14/07/2026 - Remetido os autos para contadoria 
10/07/2026 - Despacho: remeta-se os autos a contadoria
08/06/2026 - Conclusos para decisão 
27/05/2026 - Pet SC
22/05/2026 - Pet autora - Impugnação do cálculo 
13/05/2026 - Intimação sobre ato publicada no djen
11/05/2026 - Ato ordinatório - Vista às partes sobre o cálculo 
04/05/2026 - Autos retornados para a vara 
04/05/2026 - Cálculo realizado 
20/01/2026 - Recebidos os Autos pela Contadoria
20/01/2026 - Despacho - Envia os autos para contadoria
09/09/2025 - Conclusos
09/09/2025 - Certidão - autora não se manifestou
05/09/2025 - Petição Souza Cruz manifestação
27/08/2025 - Expedida intimação para a Souza Cruz
27/08/2025 - Ato ordinatório - partes devem se manifestar sobre planilha de cálculos
25/08/2025 - Petição autor Manifestação
05/08/2025 - Remetidos os autos da contadoria a 1° Vara Cível de São José de Ribamar
05/08/2025 - Certidão da Contadoria com o cálculo
16/06/2025 - Recebidos os autos pela contadoria
16/06/2025 - Certidão - remetido à Contadoria para verificação dos cálculos
12/06/2025 - Despacho - diante da impugnação do executado, determino o retorno dos autos à contadoria
03/02/2025 - Conclusos para Decisão.
22/01/2025 - Petição de impugnação aos cálculos pela SC.
12/12/2024 - Intimação para a SC, na qual apresenta planilha de cálculos, dê-se vista as partes, pelo prazo de 5 (cinco) dias, para manifestação.
17/10/2024 - Petição da exequente sobre os cálculos.
09/10/2024 - Cálculos da Contadoria
27/09/2024 - Remessa à Contadoria
26/09/2024 - Tendo em vista a impugnação apresentada pelo executado em id. 124005993, encaminhe-se os autos a Contadoria Judicial para verificação dos cálculos apresentados pelo exequente e proceder com sua atualização.
15/08/2024 - Concluso
26/07/2024 - Petição da Exequente
11/07/2024 - Impugnação ao Cumprimento de Sentença da (SC).
27/06/2024 - Petição da exequente atualizando o valor
22/06/2024 - Despacho "Intime-se o executado para efetuar o pagamento voluntário da quantia exigida pelo credor de  R$ 3.551,75 (três mil, quinhentos e cinquenta e um reais e setenta e cinco centavos) acrescido de custas, dentro de quinze dias."
15/03/2024 - Concluso.
14/12/2023 - EVOLUÍDA A CLASSE DE PROCEDIMENTO COMUM CÍVEL (7) PARA CUMPRIMENTO DE SENTENÇA
06/12/2023 - Petição requerendo o cumprimento de sentença: "E, nos termos do artigo 523 do novo codex, deve ser o executado devidamente intimado para pagar o valor do débito de R$ 3.551,75 (atualização até 11/2023) e, caso não o faça no prazo legal de 15 dias, deve ser acrescido ao débito a multa de dez por cento e, também, de honorários de advogado de dez por cento"
16/11/2023 - Juntada de petição da SC
10/11/2023 - Autos recebidos
15/09/22 - Certidão confirmando a tempestividade do recurso; REMETIDOS OS AUTOS (EM GRAU DE RECURSO) PARA AO TJMA.
25/05/22 - Juntada de Contrarrazoões
16/05/22 - Juntada de petição
20/02/22 - Decurso de prazo do réu
09/02/22 - juntada de apelação da autora 
29/01/22 - publicada intimação em 21/01
14/01/21 - enviado ao DJE
29/12/21 - pet. da SC informando pag da condenação e cumpr. das OBFs
14/12/21 - sentença - julgado procedente em parte
09/11/21 - Juntada de Petição
30/04/21 - Conclusão para julgamento
28/04/21 - Despacho - Conclusão
02/02/21 - Conclusão
04/08/20 - Juntada de petição
07/07/20 - Decorrido prazo da ré
22/06/20 - Juntada de petição
10/06/20 - Juntada de petição
04/06/20 - Comunicação eletrônica
03/06/20 - Conclusos para decisão
24/10/2019 - Juntada de petição 10/10/2019 - Decorrido prazo Souza Cruz'),
    ('0801117-33.2018.8.10.0058', '2023-11-10'::date, '10/11/2023 - BAIXA DEFINITIVA; Remessa para instância de origem
12/10/2023 - CONHECIDO E NÃO-PROVIDO (acórdão publicado em 18/10)
11/10/2023 - Juntada de parecer do MP
03/10/2023 - Juntada de CR da SC
23/09/2023 - Intimação de pauta ACERCA DO JULGAMENTO VIRTUAL PELA SEXTA CÂMARA CÍVEL CONSOANTE ART. 278-A DO RITJMA, NA SESSÃO COM INÍCIO ÀS 15:00H DO DIA 05/10/23 E TÉRMINO ÀS 14:59H DO DIA 12/10/23, OU NÃO SE REALIZANDO, NA SESSÃO VIRTUAL SUBSEQUENTE.
21/09/2023 - Relatório sobre manifestação do MP; PEDIDO DE INCLUSÃO EM PAUTA VIRTUAL
09/08/2023 - Parecer da procuradoria: "Dessa forma, manifesta-se esta Procuradoria de Justiça pelo julgamento do presente recurso, com o conhecimento do seu mérito, sobre o qual deixa de opinar, por inexistir na espécie quaisquer das hipóteses elencadas no art. 178, I, II e III, do Código de Processo Civil, bem como na Recomendação nº 34/2016 do Conselho Nacional do Ministério Público"; Conclusos
18/06/2023 - Despacho: "Encaminhem-se os autos à Procuradoria Geral de Justiça, para, querendo, intervir no feito, conforme determinam os arts. 179 c/c art. 932, VII, ambos do CPC e o art. 649, III do RITJMA.  "
15/09/22 - DISTRIBUÍDO POR SORTEIO; RECEBIDOS OS AUTOS; CONCLUSOS PARA DECISÃO'),
    ('0800609-48.2023.8.10.0079', '2026-07-01'::date, '01/07/2026 - Transito em julgado e arquivamento 
27/05/2026 -Mandado entregue a parter autora
7/05/2026 - Parte autora intimada 
13/05/2026 - Sentença - Pedido julgado improcedente 
20/02/2026 - Conclusos 
20/02/2026 - ATA de AC - sem acordo 
16/01/2026 - Certidão - encontra-se aguardando juntada de ata de audiência.
05/11/2025 - Carta de preposição Souza Cruz 
07/10/2025 - AC designada para 06/11/2025, 8h30 
06/10/2025- Despacho - "Aguarde-se a audiência de conciliação"
23/07/2025 - Certidão - autos conclusos
30/06/2025 - Petição de Souza Cruz - sem acordo
24/06/2025 - Certidão OJ autor intimado
04/06/2025 - Expedida intimação sobre a decisão
27/05/2025 - Decisão - partes intimadas para proposta de acordo
05/02/2025 - Conclusos para despacho
29/10/2024 - CERTIFICO que encaminho os autos para que seja providenciado designação de data para realização de Audiência UNA de conciliação, instrução e julgamento, como determinado no despacho ID 110440155..
07/02/2024 - Juntada de carta precatória
24/01/2024 - despacho determinando designação de Aud Una
13/09/2023 - Ac realizada; autos conclusos
25/08/2023 - Juntada de contestação
22/08/2023 - Confirmação de intimação do autor
09/08/2023 - JUNTADA DE PROTOCOLO DA CARTA PRECATÓRIA
04/08/2023 - Carta precatória expedida
03/08/2023 - NÃO CONCEDIDA A ANTECIPAÇÃO DE TUTELA
20/07/2023 - Distribuição'),
    ('1013298-18.2023.8.26.0008', '2024-02-05'::date, '05/02/2024  Remetida a Carta Precatória ao Cartório de Origem Sem Cumprimento
14/08/2023 - Despacho: "A presente carta precatória ingressou neste Setor poucos dias antes da data designada para realização do ato agendado pelo Juízo de origem, não havendo, portanto, tempo hábil para cumprimento de diligência em data tão próxima. Feitas estas considerações, devolva-se à origem para que seja providenciado novo agendamento, observado o prazo mínimo de 90 dias entre a data do encaminhamento da carta/aditamento e a designação da solenidade"
11/08/2023 - Redistribuído
09/08/2023 - DISTRIBUIÇÃO; Declarada incompetência; Remetidos os Autos para o Cartório Distribuidor Local para Redistribuição'),
    ('0803331-74.2025.8.10.0050', '2026-07-12'::date, '12/07/2026 - Arquivado definitivamente 
09/07/2026 - Juntada de termo(alvará de levantamento)
08/07/2026 - Certidão de trânsito em julgado
06/07/2026 - Autos encaminhados para expedição do alvará 
03/07/2026 - Pet autor - concordância com o cumprimento e requer expedição do alvará 
01/07/2026 - Pet SC - Condenação
25/06/2026 - Pet SC - OBF 
23/06/2026 - publicada intimação em 23/06/2026 
16/06/2026 - Pedidos autorais julgados procedentes 
09/04/2026 - Conclusos 
09/04/2026 - ATA AC
08/04/2026 - Constestação SC 
10/03/2026 - Pet SC
04/03/2026 - Citação expedida
04/03/2026 - Intimação sobre decisão liminar enviada para o DJEN
03/03/2026 - Deferida a liminar 
25/02/2026 - Pet autor -  Juntada de extrato serasa 
20/02/2026 - Petição autor - Emenda à inicial 
27/01/2026 - Publicado intimação sobre o despacho
23/01/2026 - Despacho - Determinada emenda à iniciL 
09/01/2026 - Conclusos para decisão'),
    ('0000407-89.2016.8.18.0059', '2026-05-28'::date, '28/05/2026 - Pet SC
22/05/2026 - Certidão de custas 
16/05/2026 - Intimação publicada no DJEN
14/05/2026 - Boleto de custas 
13/04/2026 - Certidão -  Alvara enviado para o banco do Brasil. 
30/03/2026 - Alvará 
08/01/2026 - Pet autor - Pede a expedição do alvará
19/12/2025 - Certidão juntando o comprovante de envio do alvará 
16/12/2025 - Expedição de alvarás
15/12/2025 -Pet SC - Verificação de custas finais 
11/12/2025 - Intimação sobre certidão publicada 
09/12/2025 - Certidão juntando os comprovantes de depósito judicial 
08/12/2025 - Ciência autor 
05/12/2025 - SENTENÇA - Julga o cumprimento de sentença extinto
23/11/2025 - Conclusão 
23/11/2025 - Certidão informando a evolução processual para cumprimento de sentença
10/11/2025 - Juntada de petição - Requerem a expedição de alvará 
03/11/2025 - Petição SC - Juntada de guia e comprovante de depósito. 
14/10/2025 - Publicado no DJEN
12/10/2025 - Despacho - "Evolua-se a classe processual para cumprimento definivo de sentença"
16/09/2025 - Evoluída a classe de PROCEDIMENTO COMUM CÍVEL (7) para CUMPRIMENTO DE SENTENÇA (156) ; e Conclusos pra Julgamento
28/08/2025 - Petição de impugnação ao pagamento da Souza Cruz 
14/08/2025 - Petição de pagamento Souza Cruz
01/08/2025 - Publicada intimação
30/07/2025 - Sentença: Embargos de Declaração Não acolhidos
03/10/2024 - Concluso
04/09/2024 - Ed da Souza Cruz
20/08/24 - Sentença "Ante o exposto, resolvo o mérito julgo PROCEDENTE o pedido inicial, nos termos do art. 487, I do CPC, para declarar a inexigibilidade do débito descrito na inicial e determinar: 1.  a restituição da quantia cobrada ao autor em dobro, corrigida monetariamente (INPC) e com juros, ambos calculados desde a data da citação.   2. Condenar a requerida ao pagamento de indenização por danos morais, no valor de R$ 5.000,00 (cinco mil reais), a ser atualizado monetariamente e com juros a partir desta sentença (INPC). Condeno a parte sucumbente ao pagamento das custas processuais e honorários advocatícios no valor de 10% sobre o proveito econômico. 
19/01/23 - Conclusos
27/09/22 - Juntada de certidão: "CERTIFICO QUE, nesta data, faço a juntada do CARTA/AR DEVOLVIDA pelos Correios e Telégrafos. Doc. anexo."
28/07/22 - Expedição de Certidão
08/07/22 - Juntada de Petição de manifestação
05/07/22 - Juntada de Petição de manifestação
22/06/22 - Expedição de Certidão; Ato ordinatório praticado; Expedição de Outros documentos
14/06/22 - Juntada de certidão
23/05/22 - Expedição de Certidão
17/05/22 - Juntada de certidão
18/04/22 - Juntada de Petição de manifestação
18/03/22 - Juntada de certidão
15/03/22 - Juntada de certidão; Ato ordinatório praticado;  Expedição de Outros documentos.
25/05/21 - Petição da ré
10/05/21 - Expedição de intimação; Despacho
08/11/20 - Decurso de prazo em 25/05
01/06/20 - Conclusos para despacho
18/05/20 - Juntada de petição
26/04/20 - Despacho
13/11/2019 - Publicação 
12/11/2019 - Disponibilização no DJE
12/11/2019 - Cancelamento de Distribuição
Cancelada a Distribuição
12/11/2019 - Juntada - Documento
Juntada de Informações
12/11/2019 - Expedição de documento
Expedição de Certidão.
12/11/2019 - Ato ordinatório praticado'),
    ('0002034-66.2012.8.18.0028', '2026-07-13'::date, '13/07/2026 - Comprovante de resgate e arquivado definitivamente
14/04/2026 - Oficio 
13/04/2026 - Alvará expedido em favor da Souza Cruz 
10/04/2026 - Comprovante de envio de ofício para o banco do Brasil
11/03/2026 - Despacho - Alvará expedido 
20/02/2026 - Certidão do sistema informando sobre os documentos juntados 
06/02/2026 - Juntada - Oficio para o BB não foi entregue por endereço incorreto.
27/01/2026 - Despacho - Determina a liberação do alvará 
06/11/2025 - Petição SC
30/09/2025 - Ofício. 
22/09/2025 - Conclusos para despacho
23/08/2025 - Despacho - expeça-se ofício ao Banco do Brasil
13/05/2025 - Conclusos
13/05/2025 - Certidão de desarquivamento
08/05/2025 - Petição SC
14/04/2025 - Baixa definitiva
14/04/2025 - Arquivado definitivamente
14/04/2025 - Despacho - determinado o arquivamento e baixa
04/02/2025 - Conclusos para Despacho
23/01/2025 - Juntada de Petição reinterando o requerimento de ordem de desbloqueio
13/01/2025 - Juntada de comprovante de resgate.
07/01/2025 - Juntado aos autos comprovante de recebimento de ofício e Alvará Judicial assinado pelo Banco do Brasil.
18/12/2024 - Expedição de alvarás em favor de SC.
05/12/2024 - Peticionado chamamento de feito à ordem pela SC.
18/11/2024 - Ato ordinatório praticado, para que manifeste-se a parte requerida, no prazo de 05 (cinco) dias.
06/11/2024 - Pet da SC
30/09/2024 - Certifico que, nesta data, encaminhei o ofício ID 64265334, ao banco para providências.
21/06/2024 - Certidão "Certifico que, nesta data, procedi o envio do ofício ID 59160934, ao banco para providências."
21/06/2024 - Expedição do Ofício para o BB.
18/06/2024 - Petição da Souza Cruz.
07/06/2024 - Despacho "DETERMINO que a Secretaria proceda com a juntada do comprovante de resgate referente ao alvará de ID nº 44652032."
22/03/2024 - Pet da SC.
27/02/2024 - Concluso para Despacho
01/03/2023 - Distribuidor - Cancelamento de Distribuição - Movimentação realizada em virtude da migração do processo para o PJe, conforme Art. 6º do Provimento Conjunto Nº 68/2022 (SEI 3355826)
Realizada por: SISTEMA THEMIS WEB
18/01/21 - Conclusão
18/01/21 - Juntada de petição
14/01/21 - Protocolo
18/12/20 - Publicação
17/12/20 - Ato ordinatório'),
    ('5412867792026809005', '2026-08-13'::date, '13/08/2026 - Despacho - Determina a parte autora para a juntada de documentos e indicação de endereço da BAT
03/08/2026 - Aditamento à inicial 
03/08/2026 - Juntada de documento - Comprovantes de negativação
29/07/2026 - Certidão 
27/07/2026 - Pet autor 
22/07/2026 - Intimação expedida Lucas 
21/07/2026 - Citação expedida para parte autora; informar endereço BA; Citação positiva LUCAS EDUARDO 
08/07/2026 - Citação expedida para SC
07/07/2026 - Autos conclusos pra sentença 
06/07/2026 - Impugnação de contestação 
03/07/2026 - Contestação SC
27/06/2026 - Citação efetivada SC
21/05/2026 - Tutela provisória negada
14/05/2026 - Emenda à inicial'),
    ('2507017105400785301', '2026-04-22'::date, '22/04/2026 - Processo encerrado. 
16/01/2026 - Processo encontra-se
 com o conciliador'),
    ('26030107002002513', '2026-07-08'::date, '08/07/2026  - Caso arquivado
29/05/2026 - Ainda sem contato da autora com PROCON 
02/04/2026 - A parte autora não entra em contato com o órgão desde a abertura da reclamação, em 05/03/2026. pós 120 dias sem manifestação, o caso é arquivado.'),
    ('26040107002001693', '2026-07-08'::date, '08/07/2026 - Ainda sem contato da autora com PROCON
03/06/2026 - A parte autora não entra em contato com o órgão desde a abertura da reclamação, em 08/04/2026. pós 120 dias sem manifestação, o caso é arquivado.')
  ) AS v(numero_cnj, data_movimentacao, descricao)
  JOIN public.processos proc ON proc.numero_cnj = v.numero_cnj
  ON CONFLICT (processo_id, data_movimentacao, md5(descricao)) DO NOTHING;

END $$;

-- Importação: Planilha BBS (Sócio GFC)
-- 20 processo(s), pasta 'BBS' dentro de Equipe Souza Cruz, responsável 'BBS', sócio 'GFC'.

DO $$
DECLARE
  _criador uuid := (SELECT id FROM auth.users WHERE email = 'bdr@bcw.com.br');
  _pasta_id uuid := (SELECT p.id FROM public.pastas p JOIN public.grupos g ON g.id = p.grupo_id WHERE g.nome = 'Equipe Souza Cruz' AND p.nome = 'BBS');
BEGIN
  IF _pasta_id IS NULL THEN
    RAISE EXCEPTION 'Pasta BBS de Equipe Souza Cruz não encontrada';
  END IF;

  INSERT INTO public.processos
    (numero_cnj, numero_interno, numero_antigo, cliente, parte_contraria, autor, reu,
     uf, comarca, vara, tribunal, sistema, carteira, pasta_id, responsavel, socio,
     status, created_by)
  VALUES
    ('2311003500100040000', '4121', NULL, 'Souza Cruz', 'Ricardo Diegues da Silva', 'Ricardo Diegues da Silva', 'Souza Cruz', 'AL', NULL, 'PROCON', 'TJAL', NULL, 'AL', _pasta_id, 'BBS', 'GFC', 'ativo', _criador),
    ('0000019-13.2026.8.02.0212', '4402', NULL, 'Souza Cruz', 'Conveniência Lafaiete Pacheco', 'Conveniência Lafaiete Pacheco', 'Souza Cruz', 'AL', NULL, 'CEJUSC do Maceió Shopping', 'TJAL', NULL, 'AL', _pasta_id, 'BBS', 'GFC', 'ativo', _criador),
    ('0029266-80.2025.8.04.1000', '4263', NULL, 'Souza Cruz', 'Gabriele Sampaio Macário', 'Gabriele Sampaio Macário', 'Souza Cruz', 'AM', NULL, '15° JEC de Manaus', 'TJAM', 'Projudi', 'AM', _pasta_id, 'BBS', 'GFC', 'ativo', _criador),
    ('0036870-58.2026.8.04.1000', NULL, NULL, 'Souza Cruz', 'I M COSTA', 'I M COSTA', 'Souza Cruz', 'AM', NULL, '15º Juizado Especial Cível da Comarca de Manaus - JE Cível', 'TJAM', 'projudi', 'AM', _pasta_id, 'BBS', 'GFC', 'ativo', _criador),
    ('0001500014956202234', '3927', NULL, 'Souza Cruz', 'Ronivon da Silva Nunes', 'Ronivon da Silva Nunes', 'Souza Cruz', 'DF', NULL, 'Procon/DF', 'TJDF', 'SEI/DF', 'DF', _pasta_id, 'BBS', 'GFC', 'ativo', _criador),
    ('1088468-34.2023.4.01.3400', '4103', NULL, 'Souza Cruz', 'Jose Edmilson Magalhães', 'Jose Edmilson Magalhães', 'Souza Cruz', 'DF', NULL, '14ª Vara Federal Cível da SJDF', 'TJDF', 'TRF1', 'DF', _pasta_id, 'BBS', 'GFC', 'ativo', _criador),
    ('2506022300100838301', '4333', NULL, 'Souza Cruz LTDA.', 'Maria dos Milagres da Conceição Cruz', 'Maria dos Milagres da Conceição Cruz', 'Souza Cruz LTDA.', 'GO', NULL, 'Procon Goias', 'TJGO', '-', 'GO', _pasta_id, 'BBS', 'GFC', 'ativo', _criador),
    ('5158342-34.2025.8.09.0127', '4272', NULL, 'Souza Cruz', 'JOSÉ MARIA DE ANDRADE', 'JOSÉ MARIA DE ANDRADE', 'Souza Cruz', 'GO', NULL, 'JUIZADO ESPECIAL CÍVEL DA COMARCA DE PIRES DO RIO/GO', 'TJGO', 'PROJUDI', 'GO', _pasta_id, 'BBS', 'GFC', 'ativo', _criador),
    ('5155870-64.2025.8.09.0158', '4303', NULL, 'Souza Cruz', 'Panificadora e Confeitaria M.M.M Ltda', 'Panificadora e Confeitaria M.M.M Ltda', 'Souza Cruz', 'GO', NULL, 'Santo Antônio do Descoberto - 2ª Vara Cível', 'TJGO', 'PROJUDI', 'GO', _pasta_id, 'BBS', 'GFC', 'ativo', _criador),
    ('0124757-15.2007.8.12.0001', '626', NULL, 'Souza Cruz S.A.', 'Beliza Distribuidora de Tabacos Ltda e Luiz Idelmar Gonçalves  e Aparecida Maria Parron Gonçalves', 'Souza Cruz S.A.', 'Beliza Distribuidora de Tabacos Ltda e Luiz Idelmar Gonçalves  e Aparecida Maria Parron Gonçalves', 'MS', NULL, '8ª Vara Cível de Campo Grande (MS)', 'TJMS', 'e-Saj 1º Grau', 'MS', _pasta_id, 'BBS', 'GFC', 'ativo', _criador),
    ('0802084-95.2023.8.12.0010', '4123', NULL, 'Souza Cruz LTDA', 'Daniele Barbosa Melo - ME', 'Daniele Barbosa Melo - ME', 'Souza Cruz LTDA', 'MS', NULL, '1ª Vara de Fátima do Sul', 'TJMS', 'e-Saj 1º Grau', 'MS', _pasta_id, 'BBS', 'GFC', 'ativo', _criador),
    ('0003721-26.2012.8.14.0049', '2265', NULL, 'Souza Cruz', 'Francisco Jose Dos Santos', 'Francisco Jose Dos Santos', 'Souza Cruz', 'PA', NULL, '1ª VC e Empresarial de Santa Izabel', 'TJPA', NULL, 'PA', _pasta_id, 'BBS', 'GFC', 'ativo', _criador),
    ('0800542-73.2023.8.14.0111', '4045', NULL, 'Souza Cruz', 'JOSIEL DE OLIVEIRA DOS SANTOS', 'JOSIEL DE OLIVEIRA DOS SANTOS', 'Souza Cruz', 'PA', NULL, 'Vara Única de Ipixuna do Pará', 'TJPA', NULL, 'PA', _pasta_id, 'BBS', 'GFC', 'ativo', _criador),
    ('0802025-15.2025.8.14.0097', '4343', NULL, 'Souza Cruz', 'Depósito e Tabacaria Mugyaras LTDA.', 'Depósito e Tabacaria Mugyaras LTDA.', 'Souza Cruz', 'PA', NULL, '2ª Vara Cível e Empresarial de Benevides', 'TJPA', NULL, 'PA', _pasta_id, 'BBS', 'GFC', 'ativo', _criador),
    ('0802879-87.2019.8.20.5129', '3509', NULL, 'Souza Cruz', 'Liunilson Nunes de Lima', 'Liunilson Nunes de Lima', 'Souza Cruz', 'RN', NULL, '3ª Vara de São Gonçalo do Amarante', 'TJRN', 'PJE', 'RN', _pasta_id, 'BBS', 'GFC', 'ativo', _criador),
    ('0800228-77.2019.8.20.5163', '4207', NULL, 'Souza Cruz', 'J G da Cunha Varejista ME', 'J G da Cunha Varejista ME', 'Souza Cruz', 'RN', NULL, 'Vara Única', 'TJRN', 'PJE', 'RN', _pasta_id, 'BBS', 'GFC', 'ativo', _criador),
    ('0816878-49.2024.8.20.5124', '4235', NULL, 'Souza Cruz', 'ABINADABE GOMES DA FONSECA', 'ABINADABE GOMES DA FONSECA', 'Souza Cruz', 'RN', NULL, '3ª Vara Cível da Comarca de Parnamirim', 'TJRN', 'PJE', 'RN', _pasta_id, 'BBS', 'GFC', 'ativo', _criador),
    ('0801785-60.2025.8.20.5108', '4300', NULL, 'Souza Cruz', 'FRANCISCO COSMO FREITAS DA SILVA', 'FRANCISCO COSMO FREITAS DA SILVA', 'Souza Cruz', 'RN', NULL, '3ª Vara da Comarca de Pau dos Ferros', 'TJRN', 'PJE', 'RN', _pasta_id, 'BBS', 'GFC', 'ativo', _criador),
    ('0802409-40.2025.8.20.5131', '4382', NULL, 'Souza Cruz', 'Walisson Jales da Silva', 'Walisson Jales da Silva', 'Souza Cruz', 'RN', NULL, 'Vara Única da Comarca de São Miguel', 'TJRN', 'PJE', 'RN', _pasta_id, 'BBS', 'GFC', 'ativo', _criador),
    ('23110035001000443', '4121', NULL, 'Souza Cruz S.A.', 'Ricardo Diegues da Silva', 'Ricardo Diegues da Silva', 'Souza Cruz S.A.', 'AL', NULL, 'Procon Maceió', 'TJAL', NULL, 'Administrativos', _pasta_id, 'BBS', 'GFC', 'ativo', _criador)
  ON CONFLICT (numero_cnj) DO UPDATE SET
    numero_interno = EXCLUDED.numero_interno,
    numero_antigo = COALESCE(EXCLUDED.numero_antigo, public.processos.numero_antigo),
    cliente = EXCLUDED.cliente,
    parte_contraria = EXCLUDED.parte_contraria,
    autor = EXCLUDED.autor,
    reu = EXCLUDED.reu,
    uf = COALESCE(EXCLUDED.uf, public.processos.uf),
    comarca = COALESCE(EXCLUDED.comarca, public.processos.comarca),
    vara = COALESCE(EXCLUDED.vara, public.processos.vara),
    tribunal = COALESCE(EXCLUDED.tribunal, public.processos.tribunal),
    sistema = COALESCE(EXCLUDED.sistema, public.processos.sistema),
    carteira = EXCLUDED.carteira,
    pasta_id = EXCLUDED.pasta_id,
    responsavel = EXCLUDED.responsavel,
    socio = EXCLUDED.socio;

  INSERT INTO public.movimentacoes
    (processo_id, data_movimentacao, descricao, fonte, created_by)
  SELECT proc.id, v.data_movimentacao, v.descricao, 'planilha', _criador
  FROM (VALUES
    ('2311003500100040000', '2025-04-04'::date, '04/04/2025 - Aguardando decisão
12/07/2024 - Aguardando decisão administrativa
22/01/2024 - Ac realizada
01/11/2023 - Reclamação registrada'),
    ('0000019-13.2026.8.02.0212', '2026-04-25'::date, '25/04/2026 - Arquivamento 
12/03/2026 - Resposta SC 
12/03/2026 - ATA AC - Informa a resolução da demanda de maneira externa.
13/02/2026 - Audiência designada para 06/03/2026'),
    ('0029266-80.2025.8.04.1000', '2026-02-13'::date, '13/02/2026 - Arquivamento 
13/02/2026 - Pedido de expedição de alvará 
13/02/2026 - Homologada transação 
13/02/2026 - Juntada de acordo 
22/05/2025 - Remetidos os autos para a área recursal
22/05/2025 - Petição de contrarrazões
09/05/2025 - Confirmação da intimação da autora
28/04/2025 - Expedida intimação da autora
25/04/2025 - Recebido o recurso, intimada a autora para contrarrazões
25/04/2025 - Conclusos
25/04/2025 - Petição SC
22/04/2025 - Recurso Inominado de SC
19/04/2025 - Intimação efetivada SC
14/04/2025 - Intimação efetivada Global
08/04/2025 - Expedida intimação a SC
07/04/2025 - ED''s de Global não acolhidos
05/04/2025 - JUNTADA DE PETIÇÃO DE CONTRARRAZÕES autor
04/04/2025 - Intimação confirmada SC
31/03/2025 - Embargos de declaração Global
24/03/2025 - Expedida intimação para SC
22/03/2025 - SENTENÇA - Julgada procedente em parte a ação
18/03/2025 - Conclusos para sentença
17/03/2025 - Juntada de petição de contestação
07/03/2025 - Petição de Contestação de SC
24/02/2025 - Expedição de citação para Precisão Golbal de Cobranças Ltda
21/02/2025 - Juntada de petição simples da autora - novo endereço de citação
17/02/2025 - Expedição de intimação para parte autora, sobre ato ordinatório
04/02/2025 - Expedição de citação para SC
03/02/2025 - Distribuido'),
    ('0029266-80.2025.8.04.1000', '2026-02-27'::date, '27/02/2026 - Disponibilização sobre extinção no DJEN
24/02/2026 - Arquivamento 
23/02/2026  - Sentença - Processo extinto
20/02/2026 - Alvará enviado 
20/02/2026 - Desarquivamento 
13/02/2026 - Arquivamento
12/02/2026 - Trânsito em julgado 
12/02/2026 - Juntada de pagamento SC
26/01/2026 - Juntada de acordo
16/01/2026 - - Disponibilização da intimação no DJEN
23/12/2025 - Disponibilização da intimação no DJEN
20/12/2025 - Expedida intimação para SC 
20/12/2025 - Juntada de acordão
19/12/2025 - Conhecido o recurso e não provido
15/12/2025  - Processo incluso na pauta do dia 
22/05/2025 - Conclusos
22/05/2025 - Recebidos os autos'),
    ('0036870-58.2026.8.04.1000', '2026-06-30'::date, '30/06/2026 - Leitura de citação pela corré
10/06/2026 - Expedida citação para corré 
03/06/2026 - Pet autor - Informa endereço do delivery pay 
18/05/2026 - Ato - Determinações para a parte autora 
11/05/2026 - Juntada AR delivery pay devolução 
30/03/2026 - Contestação 
05/03/2026 - Não concedida antecipação de tutela 
05/03/2026 - Expedida citação'),
    ('0001500014956202234', '2026-01-21'::date, '21/01/2026  - Conclusão do Processo na unidade.
01/04/2024 - Conclusão do Processo na unidade.
08/12/2023 - aguardando distribuição para análise
31/10/2023 - aguardando distribuição para análise
13/07/2023 - Ultimo andamento mantido
16/06/2023 - Ultimo andamento mantido
01/06/2023 - aguardando distribuição para análise (nº SEI 00015-00014956/2022-34)
20/04/2023 - aguardando distribuição para análise
27/02/2023 - Recurso recebido e processo encaminhado para acessoria
02/02/23 -  notificação à SC da decisão proferida
30/01/2023 - Decisão proferida'),
    ('0001500014956202234', '2026-01-19'::date, '19/01/2026 - Reabertura do processo na unidade
21/01/2026 - Conclusão de processo na unidade
01/04/2024 - Conclusão do Processo na unidade
08/12/2023 - aguardando distribuição para análise
31/10/2023 - aguardando distribuição para análise
13/07/2023 - Ultimo andamento mantido
16/06/2023 - Ultimo andamento mantido
01/06/2023 - aguardando distribuição para análise (nº SEI 00015-00014956/2022-34)
20/04/2023 - aguardando distribuição para análise
27/02/2023 - Recurso recebido e processo encaminhado para acessoria
02/02/23 -  notificação à SC da decisão proferida
30/01/2023 - Decisão proferida'),
    ('1088468-34.2023.4.01.3400', '2024-10-03'::date, '03/10/2024 - Remetidos os Autos (em grau de recurso) para Tribunal
28/08/2024 - Pet da SC.
08/08/2024 - Concluso
29/07/2024 - Apelação da União
10/07/2024 - Intimação para SC.
20/06/2024 - Petição da PHILIP MORRIS comprovando a obrigação de fazer
06/05/2024 - Sentença "Ante o exposto, acolho o pedido autoral, para declarar a nulidade da constituição da pessoa jurídica, JOSE EDMILSON MAGALHAES 75586231700, nome fantasia “COMERCIO VAREJISTA NOVO LAR”"
17/04/2024 - Concluso.
16/04/2024 - Juntada de Réplica
17/04/2024 - Concluso
06/03/2024 - Juntada de Carta Precatória (Citação da SC)
07/02/2024 - Contestação juntada
23/01/2024 - Carta precatoria recebida
09/01/2024 - Juntada de contestação do correu; cartas precatórias expedidas
15/12/2023 - depacho determinando citação dos demais réus (incluindo SC)
24/11/2023 - Conclusos
23/11/2023 - Juntada de contestação
25/10/2023 - Carta precatória expedida (comprovante de envio juntado em 27/10)
15/09/2023 - Conclusos
05/07/2023 - Distribuição'),
    ('1088468-34.2023.4.01.3400', '2026-01-28'::date, '28/01/2026 - Concluso
27/01/2026 - Pet autor - Informa desinteresse em possibilidade de acordo. 
19/12/2025 - Juntada de manifestação 
03/12/2025 - Intimação sobre despacho disponibilizada no DJEN
01/12/2025 - Despacho - Solicita manifestação sobre possibilidade de acordo 
09/02/2025 - Juntada de outras peças 
02/12/2025 - Intime-se as partes para se manifestarem sobre o interesse de AC
08/10/2024 - Conclusão
08/10/2024 - Manifestação do MPF
03/10/2024 - Recebido autos.'),
    ('2506022300100838301', '2026-01-21'::date, '21/01/2026 - Aguarda julgamento
07/10/2025 - Aguardando julgamento
 10/09/2025 - Decisão - Fundamentada não atendida. Em ligação, me informaram a decisão. Enviei e-mail requerendo o seu envio (BBS e MRZ em cópia). 
13/08/2025 - Defesa'),
    ('2506022300100838301', '2025-01-13'::date, '13/01/2025 - Aguardando julgamento 
07/10/2025 - Aguardando julgamento 10/09/2025 - Decisão - Fundamentada não atendida. Em ligação, me informaram a decisão. Enviei e-mail requerendo o seu envio (BBS e MRZ em cópia). 
13/08/2025 - Defesa'),
    ('5158342-34.2025.8.09.0127', '2026-02-05'::date, '05/02/2026 - Arquivamento 
29/12/2026 - Trânsito em julgado 
03/12/2025 - Intimação sobre sentença publicada 
03/12/2025 - Sentença - Processo extinto sem a resolução do feito por abandono 
21/10/2025 -  Autos conclusos para sentença
21/10/2025 - AC desmarcada
02/10/2025 - Ato ordinatório 
08/09/2025 - Carta Precatória Expedida
04/09/2025 - Intimação efetivada da Souza Cruz
04/09/2025 - Intimação expedida para a Souza Cruz
04/09/2025 - Instruções para a Audiência
29/08/2025 - Intimação expedida para a Souza Cruz; Intimação efetivada
29/08/2025 - Audiência de Conciliação designada para 22/10/2025, às 14h
23/07/2025 - Intimação efetivada Souza Cruz
23/07/2025 - Intimação expedida para Souza Cruz
23/07/2025 - Determinada redesignação de audiência
02/06/2025 - Intimação efetivada SC
02/06/2025 - Conclusos
02/06/2025 - Audiência de Conciliação
02/06/2025 - Contestação SC
30/05/2025 - Petição autor - citação por OJ
07/05/2025 - Citação expedida
09/04/2025 - Citação efetivada de SC
01/04/2025 - Juntada de resposta do Serasajud
24/03/2025 - Certidão expedida
12/03/2025 - Citação expedida para SC
11/03/2025 - Decisão - tutela provisória de urgência antecipada para determinar a imediata exclusão do autor perante os órgãos de proteção ao crédito
05/03/2025 - Intimação da parte autora efetivada
05/03/2025 - Designada audiência de conciliação para o dia 02/06/2025, às 13:30, na plataforma ZOOM (link já disponibilizado).
05/03/2025 - Citação expedida
27/02/2025 - Proc distribuído'),
    ('5155870-64.2025.8.09.0158', '2026-06-26'::date, '26/06/2026 - Conclusos
11/02/2026 - Troca de responsável 
27/01/2026 - Juntada de pet 
/14/01/2026 - Juntada de Pet
17/12/2025 - Efetivada intimação para a parte autora 
17/12/2025 - Despacho - Intime-se o autor para manifestar-se e reitere-se a intimação para União
17/10/2025 - Conclusão
03/10/25 - Petição 
09/09/2025 - Intimação expedida para o Estado de Goias, União e para o Município de Santo Antonio
09/09/2025 - Despacho - intimem-se as Fazendas Públicas municipal, estadual e federal.
18/08/2025 - Petição Estado de Goiás
14/07/2025 - Troca de procurador responsável pelo autor
27/06/2025 - Réplica
18/06/2025 - Intimação expedida Panificadora
18/06/2025 - Ato ordinatório - réplica
18/06/2025 - Conclusos
18/06/2025 - Intimação expedida para SC
04/06/2025 - Instrumento Procuratório
04/06/2025 - Petição - exclusão do polo passivo 
29/05/2025 - Intimação expedida
26/05/2025 - Contestação
22/05/2025 - Contestação SC
20/05/2025 - Parecer do MP - falta de interesse
16/05/2025 - Contestação - ilegitimidade passiva
08/05/2025 - Citação efetivada SC
05/05/2025 - Citação expedida SC
27/02/2025 - Distribuído'),
    ('0124757-15.2007.8.12.0001', '2026-06-26'::date, '26/06/2026 - Arquivado provisoriamente 
03/06/2026 - Decisão - Deferimento de suspensão do feito 
14/04/2026 - Conclusos para sentença 
02/04/2026 - Pet autor 
01/04/2026 - Ar Positivo
26/03/2026 - Juntada de oficio 
20/03/2026 -  Certidão Cartorária - Certifico para os devidos fins que imprimi a carta de intimação/ofício(s) retro e o encaminhei aos Correios através de guia de postagem.
12/03/2026 - Expedição de oficio 
10/03/2026 - Intimação publicada
06/03/2026 - "Intimação da parte exequente para dar prosseguimento ao feito, requerendo o que de direito."
05/02/2026 - Prazo em curso
04/02/2026 - Relação encaminhada ao D.J.
15/01/2026 - Intimação sobre decisão publicada no DJEN
24/11/2025 - Decisão - " intime-se o exequente para juntar a certidão simplificada da empresa Loja Materiais de Construção Nossa Senhora de Fátima Ltda-ME, no prazo de 15 dias. Sem prejuízo, oficie-se à Jucems para averbação da penhora das cotas sociais da referida empresa já realizada nos autos. Com a juntada dos documentos, digam as partes no prazo de 15 dias."
12/08/2025 - Conclusos
09/07/2025 - Petição 
11/06/2025 - Publicado ato 
10/06/2025 - Expedição intimação SC
06/06/2025 - Despacho - SC deve se manifestar em 15 dias
22/04/2025 - Petição - Pedido de extinção pelo reconhecimento de prescrição
03/12/2024 - Prazo alterado automaticamente em razão de feriado/interrupção de expediente. Prazo referente à movimentação foi alterado para 30/01/2025 devido à alteração da tabela de feriados.
15/11/2024 - Concluso para Despacho.
07/11/2024 - Certifico para os devidos fins que decorreu o prazo da intimação, sem manifestação da parte interessada. Nada mais.
28/10/2024 -  Prazo alterado automaticamente em razão de feriado/interrupção de expediente
Prazo referente à intimação foi alterado para 06/11/2024 devido à alteração da tabela de feriados Prazo referente à intimação foi alterado para 06/11/2024 devido à alteração da tabela de feriados Prazo referente à intimação foi alterado para 06/11/2024 devido à alteração da tabela de feriados Prazo referente à intimação foi alterado para 06/11/2024 devido à alteração da tabela de feriados Prazo referente à intimação foi alterado para 06/11/2024 devido à alteração da tabela de feriados
15/10/2024 -  Intimação para a parte exequente manifestar-se acerca do Aviso de Recebimento (AR) de fls. 736, devolvido sem cumprimento
03/10/2024 -  Juntada de AR  Negativo: Mudou-se - Destinatário : LOJA MATERIAIS DE CONSTRUÇÃO NOSSA SENHORA DE FATIMA LTDA - ME
12/09/2024 - Expedição de Ofício
31/07/2024 - Autos preparados para expedição
20/05/2024 - Mandado de Intimação
20/05/2024 - Petição da Souza Cruz'),
    ('0802084-95.2023.8.12.0010', '2026-07-06'::date, '06/07/2026 - Arquivado definitivamente 
26/06/2026 - Prazo em curso 
22/06/2026 - Expedição em análise para assinatura
11/06/2026 - Autos preparados para expedição 
25/05/2026 - Despacho - Expeça-se alvará em favor da parte exequente. Oportunamente, arquivem-se os autos, com as cautelas de praxe.
24/04/2026 - Autos preparados para expedição
24/04/2026 - Transito em julgado 
10/03/2026 - Extinção encaminhada ao DJEN
07/03/2026 - Extinta a execução 
18/12/2025 - Documento digitalizado 
18/12/2025 - Prazo em curso 
26/11/2025 - Juntada de petição solicitando extinção do feito 
16/10/2025 - Juntada de impugnação ao cumprimento de sentença 
23/09/2025 - Publicado o ato
19/09/2025 - Emissão da Relação - "Intima-se a parte executada quanto ao teor da petição de fl. 188-190 e documento de fl. 191"
06/08/2025 - Petição com nova planilha de cálculo 
18/07/2025 - Publicado ato em data da publicação
17/07/2025 - Relação encaminhada ao DJ
16/07/2025 - Emissão da relação - 15 dias para manifestação
26/05/2025 - Juntada outros documentos
16/05/2025 - Despacho publicado em 19/05/2025.
14/05/2025 - Despacho - Promova o cartório a evolução da classe processual para "Cumprimento de Sentença"
14/05/2025 - Guia de recolhimento emitida e pagamento efetuado
07/05/2025 - Despacho - Evolução da classe processual para "Cumprimento de Sentença" + intime-se o devedor para cumprir a sentença
07/05/2025 - Conclusos
06/05/2025 - Petição de cumprimento de sentença
29/04/2025 - Arquivado Definitivamente
29/04/2025 - Trânsito em Julgado
01/04/2025 - Publicada a decisão
17/03/2025 - SENTENÇA  - acolheu Embargos de Declaração de SC, alterando o termo inicial dos juros de mora da data do evento danoso para a data da citação
28/01/2025 - Conclusos para Decisão
19/12/2024 - Prazo em curso.
13/12/2024 - Embargos de Declaração opostos.
05/12/2024 - Proferida Sentença, na qual determinou parcial provimento aos pedidos autorais.'),
    ('0003721-26.2012.8.14.0049', '2026-06-25'::date, '25/06/2026 - Publicado o despacho 
22/06/2026 - Juntada de devolução do mandado 
09/06/2026 - Mandado recebido pelo O 
08/06/2026 - Mandando para a parte autora. Intimação publicada no DJEN
19/05/2026 - Despacho - Determinações para a parte autora
05/03/2026 - Pet PGE
11/02/2026 - Conclusão
10/02/2026 - Juntada de Pet 
27/01/2026 - Certidão - Informa envio para conclusão 
08/10/2025 - Petição PGM
29/09/2025 - Despacho solicitando a intimação da Fazenda Estadual 
26/09/2025 - Pet autora - apresentação de memoriais
02/09/2025 - Publicado despacho 
21/08/2025 - Despacho - intime-se o requerente
18/08/2025 - Conclusos
08/08/2025 - Petição de manifestação do município
15/07/2025 - Petição Estado do Pará
15/07/2025 - Intimação ao Município de Santa Izabel do Pará
06/07/2025 - Publicado despacho em 26/06
01/07/2025 - Petição parte autora
30/06/2025 - Petição Estado do Pará
24/06/2025 - Ofício para a Fazenda Pública do Estado do Pará; E-mail de envio do ofício.
27/05/2025 - Conclusos
26/05/2025 - Manifestação município
24/04/2025 - Fica entimado o município de Santa Izabel do Pará
23/04/2025 - Petição autor 
07/04/2025 - Publicada intimação
01/04/2025 - Estado do Pará oficiado
24/02/2025 - Juntada de petição do Estado do Pará - foi oficiada.
20/02/2025 - Expedição de outros documentos
18/02/2025 - DESPACHO DE MERO EXPEDIENTE - intime-se o Estado do Pará, a parte autora e o Município, pedido da petição de ID 135697297 deferido.
29/01/1015 - Conclusos para despacho.
11/11/2024 - Expedição de outros documentos.
03/07/2024 - Petição do Município de Santa Izabel, informando que não conseguiu localizar o imóvel objeto da lide.
13/05/2024 - Edital publicado.
09/05/2024 - Expedição de Edital.
26/03/2024 - Concluso.
18/03/2024 - Despacho "Considerando o tempo de paralisação do feito, intime-se a parte autora para, no prazo de 15 (quinze) dias, informar se possui interesse no prosseguimento do feito, sob pena de extinção do processo, bem como, por igual prazo, deverá requerer o que entender necessário para o prosseguimento do feito."
08/03/2024 - Conclusos
16/11/2023 - CANCELADA A MOVIMENTAÇÃO PROCESSUAL; Conclusos
04/04/2023 - Conclusos
23/03/2023 - Juntada de pet não específicada
21/12/22 - DECURSO DE PRAZO DAS PARTES
19/12/22 - Pet do autor e da SC
12/12/22 - CERTIDÃO PUBLICADA
07/12/22 - EXPEDIÇÃO DE CERTIDÃO E DOCS NÃO ESPECIFICADOS
20/06/22 - Juntada de Petição; Processo migrado do sistema Libra.
01/06/22 - Remessa interna; 
30/05/22 - Remessa - Sec da 1° Vara Civel e Empresarial de Santa Izabel
01/02/22 - à secretaria de origem'),
    ('0800542-73.2023.8.14.0111', '2025-03-20'::date, '20/03/2025 - Pet de SC sobre eventuais custas remanescentes
13/03/2025 - Juntada de petição de ciência
10/03/2025 - Arquivado definitivamente
06/03/2025 - Juntada de Alvará e Expedição de outros documentos
14/02/2025 - Publicada intimação
12/02/2025 - Sentença - Execução extinta e processo extinto com resolução de mérito em razão da satisfação da obrigação
20/01/2025 - Processo mudou de classe para cumprimento de sentença e está concluso para julgamento.
12/12/2024 - Petição de ciência da sentença juntada pelo autor.
10/12/2024 - Proferida Sentença que julgou parcialmente procedentes os pedidos autorais.
26/08/2024 - Pet da SC.
29/07/2024 - "01. INTIMEM-SE as partes para que, no prazo de 10 (dez) dias, manifestem-se pelo julgamento antecipado do mérito ou especifiquem eventuais provas que ainda pretendam produzir. "
26/07/2024 - Concluso para decisão
30/08/2023 - Concluso
29/08/2023 - Juntada de réplica; conclusos em 30/08
17/08/2023 - Juntada de contestação
04/08/2023 - Juntada de AR da SC recebido em 25/07/2023
19/06/2023 -  CONCEDIDA A ANTECIPAÇÃO DE TUTELA (publicado em 21/06)
07/05/2023 - Distribuição;'),
    ('0802025-15.2025.8.14.0097', '2026-05-28'::date, '28/05/2026 - Pet autor - Reconsideração da decisão
25/05/2026 - Intimação publicada no DJEN
20/05/2- 6 - Decisão - Indeferimento da gratuidade 
18/05/2026 - Conclusos 
15/05/2026 - RI autor 
30/04/2026 - Intimação sobre sentença publicada no DJEN
23/04/2026 - Pedido autoral julgado improcedente 
17/04/2026 - Conclusos 
07/04/2026 - AIJ realizada 
13/03/2026 - Despacho - AIJ designada para 07/04/2026, 12h
05/03/2026 - AC realizada
05/03/2026 - Carta preposição autor 
05/03/2026 - Contestação SC
20/12/2025 - Juntada - AR SC
03/12/2025 - Intimação sobre decisão publicada 
28/11/2025 - Decisão deferindo a tutela de urgência e desgnando a audiência para  05/03/26, 15h.
22/10/2025 - Petição autor
02/10/2025 - Despacho solicitando intimação da parte autora
15/09/2025 - Remetidos os autos para secretaria (juntada de certidão de custas)
08/09/2025 - Remetidos os autos para UNAJ 
08/09/2025 - Decisão - cancelamento do boleto de custas
04/09/2025 - Petição autor
25/08/2025 - Publicada intimação
21/08/2025 - Parte autora intimada a pagar as custas
21/08/2025 - Certidão - Custas pendentes
18/08/2025 - Remetidos os autos para os cálculos das custas
14/08/2025 - Despacho - indeferida gratuidade de justiça
04/08/2025 - Conclusos
30/07/2025 - Petição autor - emenda a inicial
30/07/2025 - Decisão - autora deve comprovar hipossuficiência
29/07/2025 - Distribuição'),
    ('0802879-87.2019.8.20.5129', '2026-03-03'::date, '03/03/2026 - Pet SC sobre custas 
23/02/2026 - Juntada de documento sobre custas finais
08/12/2025 - Pet SC - Apuração de custas finais
04/12/2025 - Arquivado definitivamente 
04/12/2025 - Certidão - Trânsito em julgado
23/09/2025 - Pet SC
17/09/2025 - Juntada de Alvará
03/09/2025 - Expedida minuta de alvará
31/08/2025 - Decisão - extinta a execução
26/06/2025 - Petição autor - informando conta
17/06/2025 - Petição de Pagamento SC
25/04/2025 - Conclusos
25/04/2025 - Evoluída a classe para cumprimento de sentença
10/04/2025 - Petição Cumprimento de sentença - autor
08/04/2025 - Transito em julgado; arquivado definitivamente
06/03/2025 - Expedição de outros documentos
02/03/2025 - DECISÃO - ED''s de SC julgados improcedentes.
07/10/2024 - Concluso
27/09/2024 - Decorrido o prazo para contrarrazões.
18/09/2024 INTIMO a parte contrária, na pessoa do advogado, para, querendo, manifestar-se no prazo de 5 (cinco) dias (CPC, art. 1.023, §2º).
09/08/2024 - ED da Souza Cruz
01/08/2024 - Sentença de Procedência
10/05/2024 - Concluso.
25/04/2024 - Pet da Souza Cruz.
06/03/2024 - Ato Ordinatório (às partes sobre o laudo).
23/02/2024 - Juntada de termo de tomada de grafismo
16/02/2024 - Solicitação de comparecimento da autora para coleta de assinatura para pericia grafotecnica
12/01/2024 - Juntada de certidão
19/09/2023 - PETIÇÃO REQUERENDO NOVA MARCAÇÃO DE PERICIA GRAFOTECNICA.
12/09/2023 - Ato ordenando autor compareça na Vara para coleta de sua assinatura para perícia grafotecnica.
03/05/2023 - Pet SC
26/04/2023 - Certidão: "Certifico, em razão do meu ofício, que o Períto Judiciário, Dr. André Jales Falcão Silva - NUPEJ/TJRN, aceitou a Perícia n° 1008/2023,  e atribuiu a data: 10 de abril de 2023, para o início dos trabalhos periciais, conforme ID Nº 98362205."
11/04/2023 - Juntada de  petição do autor
30/01/23 - Decisão 
23/09/22 - Juntada de certidão; Conclusos para despacho
26/05/22 - Juntada de Petição
23/05/22 - Outras Decisões
21/02/22 - certidão; conclusão
18/11/21 - juntada de petição de outros documentos
28/10/21 - Decisão de Saneamento e de Organização do Processo
23/07/21 - Conclusão; certidão
29/04/21 - Petição do autor - Pedido de perícia grafotécnica
08/04/21 - Petição da ré
17/03/21 - Decisão                                                                                                                                                                                                                                                                                                                                        15/10/20 - Conclusão; certidão
29/07/20 - Réplica à contestação
04/07/20 - Decorrido prazo do autora
25/06/20 - Decorrido prazo da autora
28/05/20 - Expedição de documentos e ato ordinatório
25/03/20 - Juntada de contestação
16/03/20 - Audiência de conciliação realizada
09/03/20 - Juntada de petição
27/01/2020 - Juntada de petição de diligência          07/01/2020 - Expedição de mandado'),
    ('0800228-77.2019.8.20.5163', '2026-07-15'::date, '15/07/2026 - Juntada de pet cumprimento de sentença
10/07/2026 - Juntada de intimação da pauta e recebido os autos 
23/01/2026 - Autos remetidos para instância superior 
15/10/2025 - Juntada de contrarrazões 
24/09/2025- Publicado no DJ 
22/09/2025 - Ato Ordinatório intimando a Souza Cruz a apresentar CR ao recurso
15/09/2025 - Apelação da autora
27/08/2025 - Publicada intimação
22/08/2025 - Sentença - Julgados procedentes os pedidos
29/04/2025 - Conclusos
06/03/2025 - Petição SC - sem provas a produzir
10/02/2025 - Juntada de Petição Polo Ativo - sem provas a produzir
06/02/2025 - Ato ordinatório praticado: "intimo as partes por meio de seus advogados para, no prazo comum de 10 (dez) dias, dizerem as provas que desejam produzir, devendo especificá-las e fundamentar a respectiva necessidade, informando o que com elas pretendem provar, sob pena do julgamento do feito no estado em que se encontra."
06/12/2024 - Réplica à Contestação apresentada pela parte autora
28/11/2024 - Ato ordinatório praticado, no qual determinou que o autor deverá apresentar réplica à contestação no prazo de 15 (quinze) dias.
24/09/2024 - Contestação da SC
28/06/2024 - Ofício devolução de CP
06/12/2023 - Expedição de CP
02/10/2023 - Petição pedindo citação da SC.
23/10/2019 - AC (sem comparecimento da SC)
24/07/2019 - Concedida a Liminar
04/06/2019 - Distribuição'),
    ('0800228-77.2019.8.20.5163', '2026-06-30'::date, '30/06/2026 - Certidão de trânsito em julgado
10/06/2026 - pet ciência 
01/06/2026 - Conhecido e provido o recurso 
15/05/2026 - ciencia autor
12/05/2026 - Publicada intimação 
12/05/2026 - Incluido no dia 25/05, às 8h. 
12/05/2026 - Pedido de inclusão em pauta 
11/05/2026 - Relatório 
23/01/2026 - Autos recebidos'),
    ('0816878-49.2024.8.20.5124', '2026-03-16'::date, '16/03/2026 - Autos remetidos ao 2 grau
10/03/2026 - CR Global
13/02/2026 - Intimação publicada 
10/02/2026 - Ato ordinário informando sobre contrarrazões 
17/12/2025 - Disponibilizado no DJEN
28/10/2025 - Juntada de apelação 
30/09/2025 - Sentença - Pedido julgado improcedente 
05/08/2025 - Conclusos
03/07/2025 - Petição autor - sem interesse de produzir provas
18/06/2025 - Petição Global
11/06/2025 - Publicada intimação
09/06/2025 - Ato ordinatório - intimação das partes para manifestar interesse na produção de provas
15/04/2025 - Réplica à contestação
27/03/2025 - Publicada intimação
21/03/2025 -Parte autora intimada para se manifestar sobre a contestação de SC
11/12/2024 - Contestação apresentada pela SC.
24/10/2024 - Despacho
09/10/2024 - Distribuição'),
    ('0816878-49.2024.8.20.5124', '2026-05-27'::date, '27/05/2026 - Conclusos 
27/05/2026 - Parecer PGE 
22/05/2026 - Despacho - À Procuradoria Geral de Justiça, para emissão de Parecer.
16/03/2026 - Autos Recebidos'),
    ('0801785-60.2025.8.20.5108', '2025-01-08'::date, '08/01/2025 - Arquivado 
05/12/2025 - Certidão - Trânsito em julgado
14/11/2025 - Alvará 
13/11/2025 - Calculo de planilha de honorários 
12/11/2025 - Pet autor - Juntada de contas bancárias e contrato de honorário
07/11/2025 - Sentença - Exntinguindo a execução 
04/11/2025 - Transito em julgado
29/10/2025 - Juntada de apelação 
30/09/2025 - Sentença - Pedido julgado improcedente
22/08/2025 - Conclusos
21/08/2025 - Petição Souza Cruz - sem provas
06/08/2025 - Publicada intimação
01/08/2025 - Petição - Manifestação da autora sobre as provas
01/08/2025 - Decisão de saneamento e organização do processo - tutela de urgência indeferida, partes intimadas a especificarem as provas
16/06/2025 - Aviso de recebimento Souza Cruz
09/06/2025 - Conclusos
06/06/2025 - Impugnação a contestação
05/06/2025 - Publicada intimação
03/06/2025 - Termo de Audiência
03/06/2025 - Contestação SC
22/05/2025 - Postagem correios
21/05/2025 - Publicada intimação em 21/05. 
19/05/2025 - Citação SC para audiência designada para o dia 03/06/2025, às 8h30, via Teams
16/05/2025 - AR de SC
13/05/2025 - Petição de habilitação SC
11/05/2025 - Publicado intimação em 02/05/2025
11/05/2025 - Disponibilizado no DJ Eletrônico
30/04/2025 - Expedida citação SC
23/04/2025 - Audiência de conciliação designada para 03/06/2025, às 8h30, via Microsoft Teams
23/04/2025 - Despacho - designe-se audiência
22/04/2025 - Conclusos
17/04/2025 - Emenda da inicial
12/04/2025 - Distribuição'),
    ('0802409-40.2025.8.20.5131', '2026-06-22'::date, '22/06/2026 - Reitera ED
19/06/2026 - ED autor 
15/05/2026 - Conclusos 
30/04/2026 - Pet autor - Sem provas para produzir
27/04/2026 - expedição de intimação sobre sentença 
27/04/2026 - Decisão -  intimem-se AMBAS as partes para dizerem acerca da necessidade de produção de provas ou, ao revés, sobre o julgamento antecipado da lide, em 10 (dez) dias.
23/04/2026 - Substabelecimento autor 
06/02/2026 - Réplica 
23/01/2026 - Contestação SC'),
    ('23110035001000443', '2025-10-15'::date, '15/10/2025 - Aguardando decisão administrativa 
11/09/2025 - Aguardando julgamento
04/08/2025 - Aguardando julgamento
25/06/2025 - Aguardando julgamento (comprovante no IM)
23/05/2025 - Aguardando decisão (juntei e-mail no IM)
04/04/2025 - Aguardando decisão
12/07/2024 - Aguardando decisão administrativa
22/01/2024 - Ac realizada
01/11/2023 - Reclamação registrada')
  ) AS v(numero_cnj, data_movimentacao, descricao)
  JOIN public.processos proc ON proc.numero_cnj = v.numero_cnj
  ON CONFLICT (processo_id, data_movimentacao, md5(descricao)) DO NOTHING;

END $$;

-- Importação: Planilha BBS (Sócio ELV)
-- 140 processo(s), pasta 'BBS' dentro de Equipe Souza Cruz, responsável 'BBS', sócio 'ELV'.

DO $$
DECLARE
  _criador uuid := (SELECT id FROM auth.users WHERE email = 'bdr@bcw.com.br');
  _pasta_id uuid := (SELECT p.id FROM public.pastas p JOIN public.grupos g ON g.id = p.grupo_id WHERE g.nome = 'Equipe Souza Cruz' AND p.nome = 'BBS');
BEGIN
  IF _pasta_id IS NULL THEN
    RAISE EXCEPTION 'Pasta BBS de Equipe Souza Cruz não encontrada';
  END IF;

  INSERT INTO public.processos
    (numero_cnj, numero_interno, numero_antigo, cliente, parte_contraria, autor, reu,
     uf, comarca, vara, tribunal, sistema, carteira, pasta_id, responsavel, socio,
     status, created_by)
  VALUES
    ('0028546-16.2012.8.08.0012', '1990', NULL, 'Souza Cruz', 'Paulo Roberto Brito', 'Souza Cruz', 'Paulo Roberto Brito', 'ES', NULL, '4ª VC Cariacica', 'TJES', NULL, 'ES', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('0026566-62.2012.8.08.0035', '3075', NULL, 'Souza Cruz', 'Rodney de Freitas', 'Rodney de Freitas', 'Souza Cruz', 'ES', NULL, '1ª VC Vila Velha', 'TJES', NULL, 'ES', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5000260-24.2025.8.08.0064', '4265', NULL, 'Souza Cruz', 'ADILSON TEIXEIRA PINTO', 'ADILSON TEIXEIRA PINTO', 'Souza Cruz', 'ES', NULL, 'JEC Ibatiba', 'TJES', NULL, 'ES', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5000607-56.2025.8.08.0032', '4301', NULL, 'Souza Cruz', 'Ana Ledicia Simoni Pastor', 'Ana Ledicia Simoni Pastor', 'Souza Cruz', 'ES', NULL, '1ª Vara Mimoso do Sul', 'TJES', NULL, 'ES', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5000276-83.2025.8.08.0029', '4307', NULL, 'Souza Cruz', '34.157.059 SILVANETE GERALDO DA SILVA', '34.157.059 SILVANETE GERALDO DA SILVA', 'Souza Cruz', 'ES', NULL, 'Cachoeiro de Itapemirim - 1º Juizado Especial Cível', 'TJES', NULL, 'ES', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5000467-77.2025.8.08.0046', '4328', NULL, 'Souza Cruz', 'Bar do Cebola LTDA.', 'Bar do Cebola LTDA.', 'Souza Cruz', 'ES', NULL, 'São José do Calçado - Vara Única', 'TJES', NULL, 'ES', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5023309-45.2025.8.08.0048', '4335', NULL, 'Souza Cruz', 'Açougue Gabi', 'Açougue Gabi', 'Souza Cruz', 'ES', NULL, 'Serra - Comarca da Capital - 4º Juizado Especial Cível', 'TJES', NULL, 'ES', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5029051-90.2025.8.08.0035', '4345', NULL, 'Souza Cruz', 'Percy Campos Junior', 'Percy Campos Junior', 'Souza Cruz', 'ES', NULL, 'Vila Velha - Comarca da Capital - 2º Juizado Especial Cível', 'TJES', NULL, 'ES', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5000525-13.2025.8.08.0036', '4347', NULL, 'Souza Cruz', 'Sergio Martins Vascouto', 'Sergio Martins Vascouto', 'Souza Cruz', 'ES', NULL, 'Muqui - Vara Única', 'TJES', NULL, 'ES', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5030108-07.2025.8.08.0048', '4352', NULL, 'Souza Cruz', '15.050.121 PAULO RENATO DA SILVA CAMPOS', '15.050.121 PAULO RENATO DA SILVA CAMPOS', 'Souza Cruz', 'ES', NULL, 'Serra - Comarca da Capital - 4º Juizado Especial Cível', 'TJES', NULL, 'ES', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5012281-37.2025.8.08.0030', '4354', NULL, 'Souza Cruz', 'ELINEIA DOS SANTOS CONCEICAO', 'ELINEIA DOS SANTOS CONCEICAO', 'Souza Cruz', 'ES', NULL, 'Linhares - 1º Juizado Especial Cível', 'TJES', NULL, 'ES', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5033660-77.2025.8.08.0048', '4356', NULL, 'Souza Cruz', 'WILLIAN WALLACY VICENTE MEIRELES', 'WILLIAN WALLACY VICENTE MEIRELES', 'Souza Cruz', 'ES', NULL, '2º Juizado Especial Cível - Serra', 'TJES', NULL, 'ES', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5035420-61.2025.8.08.0048', '4363', NULL, 'Souza Cruz', 'ROGÉRIO BORGES PIMENTEL', 'ROGÉRIO BORGES PIMENTEL', 'Souza Cruz', 'ES', NULL, 'Juízo de Serra  - 1º Juizado Especial Cível', 'TJES', NULL, 'ES', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5003893-60.2025.8.08.0026', '4385', NULL, 'Souza Cruz', 'Sergio Roberto Gonçalves 72268255620', 'Sergio Roberto Gonçalves 72268255620', 'Souza Cruz', 'ES', NULL, '2º Juizado Especial Cível, Criminal e da Fazenda Pública Regional', 'TJES', NULL, 'ES', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5001551-84.2026.8.08.0012', '4397', NULL, 'Souza Cruz', 'Francisco Albuquerque da Silva', 'Francisco Albuquerque da Silva', 'Souza Cruz', 'ES', NULL, 'Juízo de Direito do 1º Juizado Especial Cível de Cariacica', 'TJES', NULL, 'ES', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5000073-29.2026.8.08.0016', '4398', NULL, 'Souza Cruz', 'LANCHONETE ALTO DA SERRA LTDA', 'LANCHONETE ALTO DA SERRA LTDA', 'Souza Cruz', 'ES', NULL, 'Juízo de Direito da Vara Única de Conceição do Castelo', 'TJES', NULL, 'ES', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5000341-47.2026.8.08.0028', '4406', NULL, 'Souza Cruz', 'IRACILDA CAZATI OGGIONE', 'IRACILDA CAZATI OGGIONE', 'Souza Cruz', 'ES', NULL, 'Juízo de Direito da 1ª Vara de Iúna', 'TJES', NULL, 'ES', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5000181-79.2026.8.08.0009', '4411', NULL, 'Souza Cruz', 'OSMAR GURGEL MACHADO', 'OSMAR GURGEL MACHADO', 'Souza Cruz', 'ES', NULL, 'Juizado Especial Cível, Criminal e Fazenda Pública de Nova Venécia', 'TJES', NULL, 'ES', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5127540-75.2016.8.13.0024', '3105', NULL, 'Souza Cruz', 'UESLEI SOUSA PORTO', 'UESLEI SOUSA PORTO', 'Souza Cruz', 'MG', NULL, '32ª VC BH', 'TJMG', NULL, 'MG', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('0090713-64.2015.8.13.0452', '3271', NULL, 'Souza Cruz e outros', 'Maria Aparecida Paulino/Deivide Carvalho', 'Maria Aparecida Paulino/Deivide Carvalho', 'Souza Cruz e outros', 'MG', NULL, '1ª VC Nova Serrana', 'TJMG', NULL, 'MG', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5001253-71.2023.8.13.0105', '3955', NULL, 'Souza Cruz', 'Rita de Cássia Moreira da Silva', 'Rita de Cássia Moreira da Silva', 'Souza Cruz', 'MG', NULL, '2ª UJU - 4º JD 
G. Valadares', 'TJMG', NULL, 'MG', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5008204-18.2023.8.13.0223', '4012', NULL, 'Souza Cruz', 'Laura Aparecida Lopes', 'Laura Aparecida Lopes', 'Souza Cruz', 'MG', NULL, '4ª VC Divinópolis', 'TJMG', NULL, 'MG', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('476907007120202026', '4018', NULL, 'Souza Cruz', 'Conselho Regional de Administração de Minas Gerais', 'Conselho Regional de Administração de Minas Gerais', 'Souza Cruz', 'MG', NULL, 'CRA/MG', 'TJMG', NULL, 'MG', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5049887-53.2023.8.13.0702', '4104', NULL, 'Souza Cruz', 'Refrigerantes do Triângulo Ltda', 'Refrigerantes do Triângulo Ltda', 'Souza Cruz', 'MG', NULL, '4ª VC Uberlândia', 'TJMG', NULL, 'MG', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5000932-46.2024.8.13.0155', '4185', NULL, 'Souza Cruz', 'Pedro Paulo Morais da Cunha Souza', 'Pedro Paulo Morais da Cunha Souza', 'Souza Cruz', 'MG', NULL, 'JEC Caxambu', 'TJMG', NULL, 'MG', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5000918-09.2024.8.13.0205', '4186', NULL, 'Souza Cruz', 'Evandro Batista de Faria', 'Evandro Batista de Faria', 'Souza Cruz', 'MG', NULL, 'VU Cristina', 'TJMG', NULL, 'MG', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5002681-21.2024.8.13.0407', '4232', NULL, 'Souza Cruz', 'Valdir Soares Martins', 'Valdir Soares Martins', 'Souza Cruz', 'MG', NULL, '1ª VC Mateus Leme', 'TJMG', NULL, 'MG', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5001758-59.2025.8.13.0439', '4267', NULL, 'Souza Cruz', 'WELLYSON TIAGO CAMILO DA SILVA', 'WELLYSON TIAGO CAMILO DA SILVA', 'Souza Cruz', 'MG', NULL, 'UJ Muriaé', 'TJMG', NULL, 'MG', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5006408-27.2025.8.13.0027', '4271', NULL, 'Souza Cruz', 'CARLOS ANTONIO LISBOA FILHO', 'CARLOS ANTONIO LISBOA FILHO', 'Souza Cruz', 'MG', NULL, 'UJU Betim', 'TJMG', NULL, 'MG', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5004621-85.2025.8.13.0439', '4294', NULL, 'Souza Cruz', 'Mercearia Souza de Muriaé LTDA.', 'Mercearia Souza de Muriaé LTDA.', 'Souza Cruz', 'MG', NULL, 'Unidade Jurisdicional da Comarca de Muriaé', 'TJMG', NULL, 'MG', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('6095855-67.2025.4.06.3800', '4313', NULL, 'Souza Cruz', 'PRESIDENTE DO CONSELHO REGIONAL DE ADMINISTRAÇÃO DE MINAS GERAIS', 'PRESIDENTE DO CONSELHO REGIONAL DE ADMINISTRAÇÃO DE MINAS GERAIS', 'Souza Cruz', 'MG', NULL, 'Conselho Regional de Administração de Minas Gerais', 'TJMG', NULL, 'MG', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5007006-06.2025.8.13.0439', '4319', NULL, 'Souza Cruz', '43.609.616 ANGELA MARIA BERNARDINO', '43.609.616 ANGELA MARIA BERNARDINO', 'Souza Cruz', 'MG', NULL, 'Unidade Jurisdicional da Comarca de Muriaé', 'TJMG', NULL, 'MG', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5007047-70.2025.8.13.0439', '4320', NULL, 'Souza Cruz', 'Aparecida Luisa Correa Govea', 'Aparecida Luisa Correa Govea', 'Souza Cruz', 'MG', NULL, 'Unidade Jurisdicional da Comarca de Muriaé', 'TJMG', NULL, 'MG', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5006892-28.2025.8.13.0452', '4336', NULL, 'Souza Cruz', 'RONALDO PEREIRA DE OLIVEIRA EIRELI - ME', 'RONALDO PEREIRA DE OLIVEIRA EIRELI - ME', 'Souza Cruz', 'MG', NULL, '2ª Vara Cível da Comarca de Nova Serrana', 'TJMG', NULL, 'MG', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5181741-02.2025.8.13.0024', '4349', NULL, 'Souza Cruz', 'MFG Restaurante LTDA', 'MFG Restaurante LTDA', 'Souza Cruz', 'MG', NULL, '7ª Unidade Jurisdicional Cível - 21º JD da Comarca de Belo Horizonte', 'TJMG', NULL, 'MG', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5003361-18.2025.8.13.0327', '4357', NULL, 'Souza Cruz', 'Maria das Graças Cupertino dos Santos', 'Maria das Graças Cupertino dos Santos', 'Souza Cruz', 'MG', NULL, 'Juizado Especial Civel da Comarca de Itambacuri', 'TJMG', NULL, 'MG', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5033549-36.2025.8.13.0701', '4373', NULL, 'Souza Cruz', 'MINAS SAO PAULO CONVENIENCIA LTDA', 'MINAS SAO PAULO CONVENIENCIA LTDA', 'Souza Cruz', 'MG', NULL, 'Jurisdicional Cível - 2° JD da Comarca de Uberaba', 'TJMG', NULL, 'MG', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('1107097-59.2025.8.13.0024', '4391', NULL, 'Souza Cruz', 'VELSON FERNANDES DE OLIVEIRA  (EPROC MG)', 'VELSON FERNANDES DE OLIVEIRA  (EPROC MG)', 'Souza Cruz', 'MG', NULL, 'Juizado especial Civel da Comarca de Belo Horizonte', 'TJMG', NULL, 'MG', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('1000126-50.2026.8.13.0239', '4399', NULL, 'Souza Cruz', '33.414.131 HELDER LIMA OLIVEIRA
(EPROC)', '33.414.131 HELDER LIMA OLIVEIRA
(EPROC)', 'Souza Cruz', 'MG', NULL, 'Juizado Especial da Comarca de Entre Rios de Minas', 'TJMG', NULL, 'MG', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('1000938-36.2026.8.13.0290', '4407', NULL, 'Souza Cruz', 'MERCEARIA E DISTRIBUIDORA DE BEBIDAS IMPERIAL LTDA', 'MERCEARIA E DISTRIBUIDORA DE BEBIDAS IMPERIAL LTDA', 'Souza Cruz', 'MG', NULL, 'Juizado Especial da Comarca de Vespasiano', 'TJMG', NULL, 'MG', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5002675-25.2026.8.13.0704', '4414', NULL, 'Souza Cruz', 'SUPERMERCADO PAIVA LTDA', 'SUPERMERCADO PAIVA LTDA', 'Souza Cruz', 'MG', NULL, '1ª Vara Cível da Comarca de Unaí', 'TJMG', NULL, 'MG', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('26030665001001123', '4416', NULL, 'Souza Cruz', 'Ana Carolina Maia Bicalho', 'Ana Carolina Maia Bicalho', 'Souza Cruz', 'MG', NULL, 'Procon Visconde do Rio Branco/MG', 'TJMG', NULL, 'MG', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('1044682-06.2026.8.13.0024', '4419', NULL, 'Souza Cruz', 'LEAO LEAO TABACARIA E HEAD SHOP LTDA', 'LEAO LEAO TABACARIA E HEAD SHOP LTDA', 'Souza Cruz', 'MG', NULL, '1ª Vara Cível da Comarca de Belo Horizonte', 'TJMG', NULL, 'MG', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('1044670-89.2026.8.13.0024', '4420', NULL, 'Souza Cruz', 'LEAO LEAO TABACARIA E HEAD SHOP LTDA', 'LEAO LEAO TABACARIA E HEAD SHOP LTDA', 'Souza Cruz', 'MG', NULL, '19ª Vara Cível da Comarca de Belo Horizonte', 'TJMG', NULL, 'MG', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5014959-92.2025.8.13.0480', '4421', NULL, 'Souza Cruz', 'RAFAELA DE OLIVEIRA PRADO', 'RAFAELA DE OLIVEIRA PRADO', 'Souza Cruz', 'MG', NULL, '4ª Vara Cível da Comarca de Patos de Minas', 'TJMG', NULL, 'MG', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5007675-12.2026.8.13.0702', '4421', NULL, 'Souza Cruz', 'RAFAELA DE OLIVEIRA PRADO (CARTA PRECATÓRIA)', 'RAFAELA DE OLIVEIRA PRADO (CARTA PRECATÓRIA)', 'Souza Cruz', 'MG', NULL, '4ª Vara Cível da Comarca de Uberlândia', 'TJMG', NULL, 'MG', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('2608039400100008301', '4437', NULL, 'Souza Cruz', 'VANUSA CRISTINA MARRA', 'VANUSA CRISTINA MARRA', 'Souza Cruz', 'MG', NULL, 'Procon Itaúna/MG', 'TJMG', NULL, 'MG', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('0004411-95.2018.8.16.0079', '3328', NULL, 'Souza Cruz', 'PASSARINI DOIS VIZINHOS COMERCIO DE ALIMENTOS LTDA', 'PASSARINI DOIS VIZINHOS COMERCIO DE ALIMENTOS LTDA', 'Souza Cruz', 'PR', NULL, '1ª Vara Estadual de Falências e Recuperação Judicial', 'TJPR', NULL, 'PR', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('0000774-96.2024.8.16.0089', '4157', NULL, 'Souza Cruz', 'Supermercado Subtil', 'Supermercado Subtil', 'Souza Cruz', 'PR', NULL, 'JEC Ibati', 'TJPR', NULL, 'PR', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('0000648-94.2025.8.16.0191', '4264', NULL, 'Souza Cruz', 'VALTER GREIN JUNIOR ME', 'VALTER GREIN JUNIOR ME', 'Souza Cruz', 'PR', NULL, '1ª Vara Descentralizada do Pinheirinho - JEC Curitiba', 'TJPR', NULL, 'PR', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('0013106-73.2025.8.16.0182', '4264', NULL, 'Souza Cruz', 'VALTER GREIN JUNIOR ME', 'VALTER GREIN JUNIOR ME', 'Souza Cruz', 'PR', NULL, '5ª Turma Recusal
(Conflito de competência)', 'TJPR', NULL, 'PR', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('0023810-19.2025.8.16.0030', '4337', NULL, 'Souza Cruz', 'Celso Nataniel Biavati de Oliveira', 'Celso Nataniel Biavati de Oliveira', 'Souza Cruz', 'PR', NULL, '2º Juizado Especial Cível de Foz do Iguaçu', 'TJPR', NULL, 'PR', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('0006790-03.2025.8.16.0034', '4339', NULL, 'Souza Cruz', 'Rodrygo Otávio Raques Jess Monteiro Bar e Distribuidora de Bebidas', 'Rodrygo Otávio Raques Jess Monteiro Bar e Distribuidora de Bebidas', 'Souza Cruz', 'PR', NULL, 'Juizado Especial Cível de Piraquara', 'TJPR', NULL, 'PR', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('0001442-51.2025.8.16.0180', '4341', NULL, 'Souza Cruz', 'BUZATO TRANSPORTES LTDA', 'BUZATO TRANSPORTES LTDA', 'Souza Cruz', 'PR', NULL, 'Juizado Especial Cível de Santa Fé', 'TJPR', NULL, 'PR', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('0001080-25.2025.8.16.0091', '4362', NULL, 'SOUZA CRUZ', 'PANIFICADORA MANZOLE LTDA', 'PANIFICADORA MANZOLE LTDA', 'SOUZA CRUZ', 'PR', NULL, 'Juizado Especial Cível de Icaraíma', 'TJPR', NULL, 'PR', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('0001220-86.2025.8.16.0082', '4361', NULL, 'Souza Cruz', 'M C S CAMPOS', 'M C S CAMPOS', 'Souza Cruz', 'PR', NULL, 'Juizado Especial Cível de Formosa do Oeste', 'TJPR', NULL, 'PR', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('0001255-46.2025.8.16.0082', '4374', NULL, 'Souza Cruz', 'M C S CAMPOS', 'M C S CAMPOS', 'Souza Cruz', 'PR', NULL, 'Juizado Especial Cível de Formosa do Oeste', 'TJPR', NULL, 'PR', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('0019910-25.2025.8.16.0031', '4378', NULL, 'Souza Cruz', 'LARSSON MEURER MERCEARIA', 'LARSSON MEURER MERCEARIA', 'Souza Cruz', 'PR', NULL, '2° JEC de Guarapuava', 'TJPR', NULL, 'PR', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('0040887-41.2025.8.16.0030', '4384', NULL, 'Souza Cruz', 'CELSO NATANIEL BIAVATI DE OLIVEIRA', 'CELSO NATANIEL BIAVATI DE OLIVEIRA', 'Souza Cruz', 'PR', NULL, '2º Juizado Especial Cível 
de Foz do Iguaçu', 'TJPR', NULL, 'PR', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('0006848-32.2026.8.16.0014', '4405', NULL, 'Souza Cruz', 'WWX Conveniência LTDA', 'WWX Conveniência LTDA', 'Souza Cruz', 'PR', NULL, '5ª Vara Cível de Londrina', 'TJPR', NULL, 'PR', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('0000346-86.2026.8.16.0108', '4404', NULL, 'Souza Cruz', 'JHAINE AZEVEDO CHAMBERLAIN', 'JHAINE AZEVEDO CHAMBERLAIN', 'Souza Cruz', 'PR', NULL, 'Juizado Especial Cível de Mandaguaçu', 'TJPR', NULL, 'PR', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('0010241-53.2026.8.16.0017', '4426', NULL, 'Souza Cruz', 'Lucas Sanches Trovo', 'Lucas Sanches Trovo', 'Souza Cruz', 'PR', NULL, '5ª Vara Cível de Maringá', 'TJPR', NULL, 'PR', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5001394-09.2015.8.21.0086', '3439', NULL, 'Souza Cruz', 'BRUNO JORGE RIBEIRO', 'BRUNO JORGE RIBEIRO', 'Souza Cruz', 'RS', NULL, '2ª VC Cachoeirinha', 'TJRS', NULL, 'RS', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5004435-77.2021.8.21.6001', '1399', NULL, 'Souza Cruz', 'Luiz Eduardo Barz', 'Souza Cruz', 'Luiz Eduardo Barz', 'RS', NULL, '1ª VC - FR Tristeza - Porto Alegre', 'TJRS', NULL, 'RS', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5000040-32.2004.8.21.0086', '249', NULL, 'Souza Cruz', 'Osvaldo Krziminski', 'Souza Cruz', 'Osvaldo Krziminski', 'RS', NULL, '1ª VC Cachoeirinha', 'TJRS', NULL, 'RS', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5000128-08.2007.8.21.0008', '620', NULL, 'Souza Cruz', 'Distel Distribuidora Teixeira Ltda', 'Souza Cruz', 'Distel Distribuidora Teixeira Ltda', 'RS', NULL, '1ª VC Canoas', 'TJRS', NULL, 'RS', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5000322-08.2007.8.21.0008', '713', NULL, 'Souza Cruz', 'Hidrasul Comércio e Representações', 'Souza Cruz', 'Hidrasul Comércio e Representações', 'RS', NULL, '4ª VC Canoas', 'TJRS', NULL, 'RS', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5000343-68.2014.8.21.0030', '3440', NULL, 'Souza Cruz', 'CESAR IURI PRESTES MARQUES', 'Souza Cruz', 'CESAR IURI PRESTES MARQUES', 'RS', NULL, '3ª VC São Borja', 'TJRS', NULL, 'RS', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5003402-11.2021.8.21.0033', '155', NULL, 'Souza Cruz (CUMPRIMENTO DE SENTENÇA)', 'Guia Assessoria Ltda.', 'Souza Cruz (CUMPRIMENTO DE SENTENÇA)', 'Guia Assessoria Ltda.', 'RS', NULL, '3ª VC São Leopoldo', 'TJRS', NULL, 'RS', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5009672-56.2018.8.21.0033', '155', NULL, 'Souza Cruz
(IDPJ)', 'Guia Assessoria Ltda.', 'Souza Cruz
(IDPJ)', 'Guia Assessoria Ltda.', 'RS', NULL, '3ª VC São Leopoldo', 'TJRS', NULL, 'RS', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5204934-14.2026.8.21.7000', '155', NULL, 'Souza Cruz', 'GUIA ASSESSORIA LTDA
AGRAVO DE INSTRUMENTO', 'GUIA ASSESSORIA LTDA
AGRAVO DE INSTRUMENTO', 'Souza Cruz', 'RS', NULL, '11ª Câmara Cível', 'TJRS', NULL, 'RS', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5000002-75.2010.8.21.0129', '1671', NULL, 'Souza Cruz', 'Leandro Sarturi Milani', 'Souza Cruz', 'Leandro Sarturi Milani', 'RS', NULL, 'VJ São Pedro do Sul', 'TJRS', NULL, 'RS', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5000550-54.2010.8.21.0015', '1519', NULL, 'Souza Cruz
(PRINCIPAL - ETE)', 'Tabacaria Estrela Ltda ME', 'Souza Cruz
(PRINCIPAL - ETE)', 'Tabacaria Estrela Ltda ME', 'RS', NULL, '3ª VC Gravataí', 'TJRS', NULL, 'RS', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5003058-26.2017.8.21.0015', '1519', NULL, 'Souza Cruz
(IDPJ)', 'Hamilton de Souza Vasco e Itacir Borges', 'Souza Cruz
(IDPJ)', 'Hamilton de Souza Vasco e Itacir Borges', 'RS', NULL, '3ª VC Gravataí', 'TJRS', NULL, 'RS', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5002267-11.2019.8.21.0040', '3467', NULL, 'Souza Cruz', 'CLAIR DE VARGAS MOREIRA ME', 'CLAIR DE VARGAS MOREIRA ME', 'Souza Cruz', 'RS', NULL, '2ª VJ Caçapava do Sul', 'TJRS', NULL, 'RS', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5002320-41.2018.8.21.0132', '3451', NULL, 'Souza Cruz', 'CAROLINE ELIZABETE FORELL', 'CAROLINE ELIZABETE FORELL', 'Souza Cruz', 'RS', NULL, '3ª VC Sapiranga', 'TJRS', NULL, 'RS', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5004032-07.2022.8.21.0074', '3926', NULL, 'Souza Cruz', 'RISKA BAR LTDA', 'RISKA BAR LTDA', 'Souza Cruz', 'RS', NULL, '1ª VJ Três de Maio', 'TJRS', NULL, 'RS', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5005230-74.2025.8.21.0074', '3926', NULL, 'Souza Cruz', 'RISKA BAR LTDA (CUMPRIMENTO DE SENTENÇA)', 'RISKA BAR LTDA (CUMPRIMENTO DE SENTENÇA)', 'Souza Cruz', 'RS', NULL, '1ª VJ Três de Maio', 'TJRS', NULL, 'RS', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5004446-10.2022.8.21.0040', '3943', NULL, 'Souza Cruz', 'Mere Terezinha da Silva Goes', 'Mere Terezinha da Silva Goes', 'Souza Cruz', 'RS', NULL, '2ª VJ Caçapava do Sul', 'TJRS', NULL, 'RS', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5000094-82.2023.8.21.0069', '3957', NULL, 'Souza Cruz', 'Águas Minerais Sarandi Ltda', 'Águas Minerais Sarandi Ltda', 'Souza Cruz', 'RS', NULL, 'VJ Sarandi', 'TJRS', NULL, 'RS', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5004209-78.2025.8.21.0069', '3957', NULL, 'Souza Cruz', 'Águas Minerais Sarandi Ltda 
(CUMPRIMENTO DE SENTENÇA)', 'Águas Minerais Sarandi Ltda 
(CUMPRIMENTO DE SENTENÇA)', 'Souza Cruz', 'RS', NULL, 'VJ Sarandi', 'TJRS', NULL, 'RS', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5006480-07.2024.8.21.0001', '4142', NULL, 'Souza Cruz', 'Ana Paula Facchin Caldart', 'Ana Paula Facchin Caldart', 'Souza Cruz', 'RS', NULL, '4º JEC - Foro Central - Porto Alegre', 'TJRS', NULL, 'RS', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5012150-58.2025.8.21.9000', '4142', NULL, 'Souza Cruz', 'Ana Paula Facchin Caldart (Recurso Inominado)', 'Ana Paula Facchin Caldart (Recurso Inominado)', 'Souza Cruz', 'RS', NULL, 'Turma de Uniformização Cível', 'TJRS', NULL, 'RS', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5017094-89.2020.8.21.0008', '4156', NULL, 'Souza Cruz', 'Roberta Priscila Lumertz', 'Roberta Priscila Lumertz', 'Souza Cruz', 'RS', NULL, '1ª VC Canoas', 'TJRS', NULL, 'RS', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5000730-82.2024.8.21.0014', '4171', NULL, 'Souza Cruz', 'DANIANE TOLEDO DA COSTA', 'DANIANE TOLEDO DA COSTA', 'Souza Cruz', 'RS', NULL, '1ª VC Esteio', 'TJRS', NULL, 'RS', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5017200-27.2024.8.21.0003', '4219', NULL, 'Souza Cruz', 'DISTRIBUIDORA CARDOSO LTDA', 'DISTRIBUIDORA CARDOSO LTDA', 'Souza Cruz', 'RS', NULL, 'JEC Alvorada', 'TJRS', NULL, 'RS', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5002476-47.2026.8.21.0003', '4219', NULL, 'Souza Cruz', 'DISTRIBUIDORA CARDOSO LTDA (CUMPRIMENTO DE SENTENÇA)', 'DISTRIBUIDORA CARDOSO LTDA (CUMPRIMENTO DE SENTENÇA)', 'Souza Cruz', 'RS', NULL, 'Juizado Especial Cível da Comarca de Alvorada', 'TJRS', NULL, 'RS', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5001152-08.2025.8.21.0019', '4254', NULL, 'Souza Cruz', 'SUPERMERCADO HP LTDA', 'SUPERMERCADO HP LTDA', 'Souza Cruz', 'RS', NULL, '1º Juízo da 2ª VC de Novo Hamburgo', 'TJRS', NULL, 'RS', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5000550-38.2025.8.21.0109', '4259', NULL, 'Souza Cruz', 'GOLDBRASIL DISTRIBUIDORA LTDA EPP', 'GOLDBRASIL DISTRIBUIDORA LTDA EPP', 'Souza Cruz', 'RS', NULL, '1ª VJ Marau', 'TJRS', NULL, 'RS', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5162780-78.2026.8.21.7000', '4259', NULL, 'Souza Cruz', 'GOLDBRASIL DISTRIBUIDORA LTDA EPP', 'GOLDBRASIL DISTRIBUIDORA LTDA EPP', 'Souza Cruz', 'RS', NULL, 'Central de Cobrança', 'TJRS', NULL, 'RS', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5081602-89.2025.8.21.0001', '4287', NULL, 'Souza Cruz', 'VICTOR KUNDZIN NETO', 'VICTOR KUNDZIN NETO', 'Souza Cruz', 'RS', NULL, '5º JEC - Foro Central - Porto Alegre', 'TJRS', NULL, 'RS', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5002247-50.2025.8.21.0156', '4308', NULL, 'Souza Cruz', 'JOSIANE CRUZ DA CRUZ 01746303018', 'JOSIANE CRUZ DA CRUZ 01746303018', 'Souza Cruz', 'RS', NULL, 'Juízo da 1ª Vara Cível da Comarca de Charqueadas', 'TJRS', NULL, 'RS', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5001384-25.2025.8.21.0082', '4327', NULL, 'Souza Cruz', 'FABIANO MACEDO PANCOTTE 02341277080', 'FABIANO MACEDO PANCOTTE 02341277080', 'Souza Cruz', 'RS', NULL, 'Juízo do Juizado Especial Cível Adjunto da Comarca de Arvorezinha', 'TJRS', NULL, 'RS', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5014702-58.2025.8.21.0023', '4331', NULL, 'Souza Cruz', 'Douglas Medeiros Peres', 'Douglas Medeiros Peres', 'Souza Cruz', 'RS', NULL, '1º Juízo da 1ª Vara Cível da Comarca de Rio Grande', 'TJRS', NULL, 'RS', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5021329-30.2025.8.21.0039', '4338', NULL, 'Souza Cruz', 'Maria Gislene Machado Gehlen', 'Maria Gislene Machado Gehlen', 'Souza Cruz', 'RS', NULL, 'Juízo da 2ª Vara Cível da Comarca de Viamão', 'TJRS', NULL, 'RS', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5005684-81.2025.8.21.0065', '4348', NULL, 'Souza Cruz', 'Supermercado Sabiá', 'Supermercado Sabiá', 'Souza Cruz', 'RS', NULL, 'Juízo da 2ª Vara Judicial da Comarca de Santo Antônio da Patrulha', 'TJRS', NULL, 'RS', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5001089-29.2025.8.21.0036', '4366', NULL, 'Renozato Lautert Portela', 'PAULO RICARDO CORREA VIEIRA', 'Renozato Lautert Portela', 'PAULO RICARDO CORREA VIEIRA', 'RS', NULL, 'Juizado Especial Cível Adjunto da Comarca de Soledade', 'TJRS', NULL, 'RS', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('2510021300100050000', '4377', NULL, 'Souza Cruz', 'Walter Deon Lanches', 'Walter Deon Lanches', 'Souza Cruz', 'RS', NULL, 'PROCON CAXIAS DO SUL/RS.', 'TJRS', NULL, 'RS', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5000015-62.2026.8.21.0081', '4392', NULL, 'Souza Cruz', 'AMILTON CAETANO DE BARROS', 'AMILTON CAETANO DE BARROS', 'Souza Cruz', 'RS', NULL, 'Juízo da
 Vara Judicial da Comarca de 
Arroio Grande', 'TJRS', NULL, 'RS', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5000782-38.2026.8.21.0134', '4417', NULL, 'Souza Cruz', 'FABIO JADER HEIDEMANN', 'FABIO JADER HEIDEMANN', 'Souza Cruz', 'RS', NULL, 'Juizado Especial Cível Adjunto da Comarca de Sobradinho', 'TJRS', NULL, 'RS', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5008704-57.2026.8.21.0029', '4431', NULL, 'Souza Cruz', 'PATRICK ANDREI DE SOUZA WORNATH', 'PATRICK ANDREI DE SOUZA WORNATH', 'Souza Cruz', 'RS', NULL, 'Juízo do Juizado Especial Cível da Comarca de Santo Ângelo', 'TJRS', NULL, 'RS', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5001343-68.2026.8.21.0132', '4433', NULL, 'Souza Cruz', 'THAIS GABRIELLY SANTOS DA SILVA', 'THAIS GABRIELLY SANTOS DA SILVA', 'Souza Cruz', 'RS', NULL, 'Juízo da 2ª Vara Cível da Comarca de Sapiranga', 'TJRS', NULL, 'RS', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('0102243420268210035', '4438', NULL, 'Souza Cruz', 'GISLAINE DOS SANTOS MACHADO SARMENTO', 'GISLAINE DOS SANTOS MACHADO SARMENTO', 'Souza Cruz', 'RS', NULL, 'Juizado Especial Cível da Comarca de Sapucaia do Sul', 'TJRS', NULL, 'RS', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('0024359-74.2023.8.17.2001', '3987', NULL, 'Souza Cruz', 'Jose Laercio Bezerra da Silva', 'Jose Laercio Bezerra da Silva', 'Souza Cruz', 'PE', NULL, 'Seção B da 10ª VC Recife', 'TJPE', NULL, 'PE', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('2305015503200110000', '4040', NULL, 'Souza Cruz', 'Alvaro Bernardo de Souza', 'Alvaro Bernardo de Souza', 'Souza Cruz', 'PE', NULL, 'Procon Estadual de PE - Olinda', 'TJPE', NULL, 'PE', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('2204015500100713301', '3848', NULL, 'Souza Cruz', 'JOSE LAERCIO BEZERRA DA SILVA', 'JOSE LAERCIO BEZERRA DA SILVA', 'Souza Cruz', 'PE', NULL, 'Procon Estadual de PE - Recife', 'TJPE', NULL, 'PE', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('52627001781201912', '4052', NULL, 'Souza Cruz', 'INMETRO', 'INMETRO', 'Souza Cruz', 'PE', NULL, 'INMETRO', 'TJPE', NULL, 'PE', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('52627003852201911', '4054', NULL, 'Souza Cruz', 'INMETRO', 'INMETRO', 'Souza Cruz', 'PE', NULL, 'INMETRO', 'TJPE', NULL, 'PE', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('52627007372201831', '4057', NULL, 'Souza Cruz', 'INMETRO', 'INMETRO', 'Souza Cruz', 'PE', NULL, 'INMETRO', 'TJPE', NULL, 'PE', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('52627001924201805', '4058', NULL, 'Souza Cruz', 'INMETRO', 'INMETRO', 'Souza Cruz', 'PE', NULL, 'INMETRO', 'TJPE', NULL, 'PE', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('0001012-65.2024.8.17.2360', '4216', NULL, 'Souza Cruz', 'ARTHUR CAMELO B. SILVA ALIMENTOS', 'ARTHUR CAMELO B. SILVA ALIMENTOS', 'Souza Cruz', 'PE', NULL, 'VU Buíque', 'TJPE', NULL, 'PE', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('0000336-54.2025.8.17.8222', '4255', NULL, 'Souza Cruz', 'WILLAMS ROSENDO DA SILVA', 'WILLAMS ROSENDO DA SILVA', 'Souza Cruz', 'PE', NULL, '2º JEC Paulista', 'TJPE', NULL, 'PE', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('0000485-50.2025.8.17.8222', '4260', NULL, 'Souza Cruz', 'ALEXANDRE SOARES DE MELO', 'ALEXANDRE SOARES DE MELO', 'Souza Cruz', 'PE', NULL, '2º JEC Paulista', 'TJPE', NULL, 'PE', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('0000641-48.2025.8.17.3110', '4284', NULL, 'Souza Cruz', 'GEISON FERREIRA BATINGA', 'GEISON FERREIRA BATINGA', 'Souza Cruz', 'PE', NULL, '2ª VC Pesqueira', 'TJPE', NULL, 'PE', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('2504015505000037301', '4314', NULL, 'Souza Cruz', 'Jailson Correa Neto', 'Jailson Correa Neto', 'Souza Cruz', 'PE', NULL, 'Procon/PE', 'TJPE', NULL, 'PE', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('0074820-79.2025.8.17.2001', '4355', NULL, 'Souza Cruz', 'PAULO RODRIGUES DOS SANTOS', 'PAULO RODRIGUES DOS SANTOS', 'Souza Cruz', 'PE', NULL, 'Seção B da 23ª Vara Cível da Capital', 'TJPE', NULL, 'PE', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('0006225-83.2025.8.17.8223', '4375', NULL, 'Souza Cruz', 'GUILHERME FERREIRA DE MELO', 'GUILHERME FERREIRA DE MELO', 'Souza Cruz', 'PE', NULL, '2º Juizado Especial Cível e das Relações de Consumo de Olinda', 'TJPE', NULL, 'PE', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('0050337-82.2025.8.17.2001', '4372', NULL, 'Souza Cruz', 'Suhai Seguros S.A', 'Suhai Seguros S.A', 'Souza Cruz', 'PE', NULL, '21ª Vara Cível da Capital', 'TJPE', NULL, 'PE', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('0300281-52.2018.8.24.0083', '3153', NULL, 'Souza Cruz', 'Celso Adilio Alves
(PRINCIPAL)', 'Celso Adilio Alves
(PRINCIPAL)', 'Souza Cruz', 'SC', NULL, 'VU Correira Pinto', 'TJSC', NULL, 'SC', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5000930-29.2023.8.24.0083', '3153', NULL, 'Souza Cruz', 'Celso Adilio Alves
(CUMPRIMENTO DE SENTENÇA)', 'Celso Adilio Alves
(CUMPRIMENTO DE SENTENÇA)', 'Souza Cruz', 'SC', NULL, 'VU Correira Pinto', 'TJSC', NULL, 'SC', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('2504030900100506301', '4302', NULL, 'Souza Cruz', 'North Side Ltda.', 'North Side Ltda.', 'Souza Cruz', 'SC', NULL, 'Procon Estadual de SC', 'TJSC', NULL, 'SC', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5003572-79.2025.8.24.0058', '4306', NULL, 'Souza Cruz', 'GLAUBER NEWTON FERREIRA BISPO DOS SANTOS', 'GLAUBER NEWTON FERREIRA BISPO DOS SANTOS', 'Souza Cruz', 'SC', NULL, 'Juízo da 1ª Vara Cível 
da Comarca de São Bento do SuL', 'TJSC', NULL, 'SC', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5011024-86.2026.8.24.0000', '4306', NULL, 'Souza Cruz', 'GLAUBER NEWTON FERREIRA BISPO DOS SANTOS
(AGRAVO DE INSTRUMENTO)', 'GLAUBER NEWTON FERREIRA BISPO DOS SANTOS
(AGRAVO DE INSTRUMENTO)', 'Souza Cruz', 'SC', NULL, 'Gab. 01 - 3ª Câmara de Direito Civil', 'TJSC', NULL, 'SC', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5002905-98.2025.8.24.0024', '4317', NULL, 'Souza Cruz', 'SB COMERCIO DE ALIMENTOS LTDA', 'SB COMERCIO DE ALIMENTOS LTDA', 'Souza Cruz', 'SC', NULL, 'Juízo da 1ª Vara da Comarca de Fraiburgo', 'TJSC', NULL, 'SC', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5002332-43.2025.8.24.0159', '4381', NULL, 'Souza Cruz', 'Teresinha Meurer Schulter Voss', 'Teresinha Meurer Schulter Voss', 'Souza Cruz', 'SC', NULL, 'Juízo da Vara 
Única da Comarca de Armazém', 'TJSC', NULL, 'SC', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5022875-39.2025.8.24.0039', '4383', NULL, 'souza cruz', 'Rodrigo dos Anjos Duarte', 'Rodrigo dos Anjos Duarte', 'souza cruz', 'SC', NULL, 'Juizado Especial Cível da Comarca de Lages', 'TJSC', NULL, 'SC', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5000074-88.2026.8.24.0009', '4396', NULL, 'Souza Cruz', 'Juliana Fagundes Mercado', 'Juliana Fagundes Mercado', 'Souza Cruz', 'SC', NULL, 'Vara Única da Comarca de Bom Retiro', 'TJSC', NULL, 'SC', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5000179-65.2026.8.24.0009', '4400', NULL, 'Souza Cruz', 'JOBSON CHIQUIO', 'JOBSON CHIQUIO', 'Souza Cruz', 'SC', NULL, 'Juízo da Vara Única da Comarca de Bom Retiro', 'TJSC', NULL, 'SC', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5007439-57.2026.8.24.0022', '4425', NULL, 'Souza Cruz', 'TEC MERCEARIA LTDA', 'TEC MERCEARIA LTDA', 'Souza Cruz', 'SC', NULL, 'Juízo da 1ª Vara Cível da Comarca de Curitibanos', 'TJSC', NULL, 'SC', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('5011108-67.2026.8.24.0039', '4432', NULL, 'Souza Cruz', 'Mercado da Gula Ltda.', 'Mercado da Gula Ltda.', 'Souza Cruz', 'SC', NULL, 'Juízo da 3ª Vara Cível da Comarca de Lages', 'TJSC', NULL, 'SC', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('0023654-22.2016.8.19.0205', '5939/32', NULL, 'Souza Cruz', 'EZRAITA SIMÕES QUINTANILHA DOS SANTOS', 'EZRAITA SIMÕES QUINTANILHA DOS SANTOS', 'Souza Cruz', 'RJ', NULL, '1ª VC Campo Grande - RJ/RJ', 'TJRJ', NULL, 'RJ', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('0027468-19.2009.8.19.0001', NULL, NULL, 'Geza Roberto Brandão Szilagyi', NULL, 'Geza Roberto Brandão Szilagyi', NULL, 'RJ', NULL, '1ª Vara de Família - RJ/RJ', 'TJRJ', NULL, 'RJ', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('17001003220000345', '3795', NULL, 'Souza Cruz', 'R & S Materiais Para Construção', 'R & S Materiais Para Construção', 'Souza Cruz', 'TO', NULL, 'Procon Araguaína', 'TJTO', NULL, 'TO', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('17001003220000080', '3818', NULL, 'Souza Cruz', 'BORGES COMERCIO DE PRODUTOS 
ALIMENTICIOS EIRELI', 'BORGES COMERCIO DE PRODUTOS 
ALIMENTICIOS EIRELI', 'Souza Cruz', 'TO', NULL, 'Procon Araguaína', 'TJTO', NULL, 'TO', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('0001052-23.2023.8.27.2742', '4112', NULL, 'Souza Cruz', 'RODRIGUES & SILVA MATERIAIS PARA CONSTRUCAO LTDA', 'RODRIGUES & SILVA MATERIAIS PARA CONSTRUCAO LTDA', 'Souza Cruz', 'TO', NULL, 'VU Xambioá', 'TJTO', NULL, 'TO', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('2305015503200114301', '4040', NULL, 'Souza Cruz', 'Alvaro Bernardo de Souza', 'Alvaro Bernardo de Souza', 'Souza Cruz', 'PE', NULL, 'Procon Estadual de PE - Olinda', 'TJPE', NULL, 'Administrativos', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('2505024300101525301', '4316', NULL, 'Souza Cruz', 'Francisco Albuquerque da Silva 07156346741', 'Francisco Albuquerque da Silva 07156346741', 'Souza Cruz', 'ES', NULL, 'Procon/ES', 'TJES', NULL, 'Administrativos', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('2510021300100050301', '4377', NULL, 'Souza Cruz', 'Walter Deon Lanches', 'Walter Deon Lanches', 'Souza Cruz', 'RS', NULL, 'Procon Caxias do sul/ RS', 'TJRS', NULL, 'Administrativos', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('202512039901144869', '4377', NULL, 'Souza Cruz', 'CIONE APARECIDA DA SILVA SOUZA', 'CIONE APARECIDA DA SILVA SOUZA', 'Souza Cruz', 'MG', NULL, 'Procon  Uberlândia/MG', 'TJMG', NULL, 'Administrativos', _pasta_id, 'BBS', 'ELV', 'ativo', _criador),
    ('2602036600100111301', '4408', NULL, 'Souza Cruz', 'Supermercado Paiva LTDA', 'Supermercado Paiva LTDA', 'Souza Cruz', 'MG', NULL, 'Procon Unaí/MG', 'TJMG', NULL, 'Administrativos', _pasta_id, 'BBS', 'ELV', 'ativo', _criador)
  ON CONFLICT (numero_cnj) DO UPDATE SET
    numero_interno = EXCLUDED.numero_interno,
    numero_antigo = COALESCE(EXCLUDED.numero_antigo, public.processos.numero_antigo),
    cliente = EXCLUDED.cliente,
    parte_contraria = EXCLUDED.parte_contraria,
    autor = EXCLUDED.autor,
    reu = EXCLUDED.reu,
    uf = COALESCE(EXCLUDED.uf, public.processos.uf),
    comarca = COALESCE(EXCLUDED.comarca, public.processos.comarca),
    vara = COALESCE(EXCLUDED.vara, public.processos.vara),
    tribunal = COALESCE(EXCLUDED.tribunal, public.processos.tribunal),
    sistema = COALESCE(EXCLUDED.sistema, public.processos.sistema),
    carteira = EXCLUDED.carteira,
    pasta_id = EXCLUDED.pasta_id,
    responsavel = EXCLUDED.responsavel,
    socio = EXCLUDED.socio;

  INSERT INTO public.movimentacoes
    (processo_id, data_movimentacao, descricao, fonte, created_by)
  SELECT proc.id, v.data_movimentacao, v.descricao, 'planilha', _criador
  FROM (VALUES
    ('0028546-16.2012.8.08.0012', '2026-05-20'::date, '20/05/2026 - Decisão publicada no DJEN
13/05/2026 - Decisão - Processo suspenso 
12/02/2026 - Conclusão 
10/02/2026 - Pet SC
28/01/2026 - Certidão - Informa que não foi possivel citar o réu 
30/12/2025 - Redistribuído em razão de alteração de competência do órgão 
28/11/2025 - Processo redistribuido em razão de alteração de competência do órgão
14/11/2025 - Juntada de certidão - Citação para execução de titulo extrajudicial. 
11/11/2025 - " Redistribuído por prevenção em razão de modificação da competência"
23/07/2025 - Petição Souza Cruz informando novo endereço
10/04/2025 - Intimação ao autor
08/04/2025 - Certidão - impossibilidade de citar o executado
11/02/2025 - Juntada de Certidão - execução de título extrajudicial. Guia de Remessa de Mandado
07/06/2024 - Despacho "Defiro o pedido de id 38551175. Expeça-se o respectivo mandado no endereço indicado. "
22/05/2024 - Concluso
23/02/2024 - Petição da SC.
10/07/2023 - Ato ordinatório praticado: PROCESSO VIRTUALIZADO NESTA DATA;  Convertidos os autos físicos em eletrônicos    CX 118.
27/01/23 - Recebidos os autos CARIACICA - 1ª VARA CÍVEL, ÓRFÃOS E SUCESSÕES;  Ato ordinatório praticado (DIGITALIZADOS 17/10 - 2 )
23/01/23 - Remetidos os Autos (outros motivos) para CARIACICA - 1ª VARA CÍVEL, ÓRFÃOS E SUCESSÕES 
11/10/22 - Recebidos os autos CARIACICA - CENTRAL DE DIGITALIZAÇÃO   
07/10/22 - Remetidos os Autos (outros motivos) para CARIACICA - CENTRAL DE DIGITALIZAÇÃO CARIACICA - CENTRAL DE DIGITALIZAÇÃO;
05/10/22 - Juntada de Petição de Petição (outras) 202200778717 ; Ato ordinatório praticado   (PET JUNT 1)
29/09/22 - Ato ordinatório praticado    THY
26/08/22 - Protocolizada Petição 202200778717; Petição recebida.
19/08/22 - Publicado ato ordinatório; Disponibilizado(a) ato ordinatório no Diário da Justiça Eletrônico em 18/08/2022.
22/06/22 - Ato ordinatório praticado - AGUARDANDO PUBLICAÇÃO
21/06/22 - Imprensa preparada - Lista do Diário nº 0108/2022
10/03/22 - Mandado devolvido não entregue ao destinatário; ato ordinatório 
29/11/21 - Expedição de mandado; recebido o mandado para cumprimento
23/11/21 - Expedição de mandado - citação penhora e avaliação(execução extrajudicial) 
03/08/21 - Processo inspecionado
29/04/21 - Ato ordinatório
24/03/21 - Despacho - Expedição de citação
24/02/21 - Conclusão; juntada de petição
03/02/21 - Petição recebida
21/01/21 - Despacho publicado
10/09/20 - Ato ordinatório
13/08/20 - Despacho
03/03/20 - Conclusos para despacho
09/12/2019 - Despacho                        
03/12/2019 - Imprensa preparada      
06/08/2019    Ato ordinatório praticado  EXPEDIÇÃO 02
05/08/2019 -  Proferido despacho de mero expediente - "Determino a realização de busca do endereço do requerido via INFOJUD. Sendo o resultado positivo, expeça-se o respectivo mandado, cientificando a parte autora que caso sejam encontrados mais de um endereço deverá juntar aos autos cópias da inicial e da emenda da inicial para possibilitar a citação da parte requerida, sob pena de extinção do feito. Em caso negativo, intime-se a parte autora para, com fulcro no artigo 240 do Novo CPC e no prazo de dez dias, informe o endereço correto do requerido, sob pena de extinção do feito. Diligencie-se."'),
    ('0026566-62.2012.8.08.0035', '2026-07-31'::date, '31/07/2026 - Petição DP
22/07/2026 - Pedido de providências 
21/07/2026: Decisão publicada no DJEN
11/07/2026: Proferida decisão saneadora determinando a intimação das partes em provas, no prazo de 15 dias.
27/02/2026 - Conclusão 
06/10/2025 - Petição SC
22/09/2025 - Manifestação DP - sem provas a produzir
16/09/2025 - Manifestação Cacilda Machado
15/09/2025 - Publicada a Intimação Souza Cruz
13/09/2025 - Disponibilizado o Despacho no DJ Eletrônico em 12/09
11/09/2025 - Expedição de Intimação - Diário
03/06/2025 - DESPACHO - INÉRCIA DAS PARTES
21/02/2025 - Conclusos para despacho
01/10/2024 - Manifestação da DP (somente concordando com a digitalização).
08/05/2024 - Despacho "Retifique-se a digitalização dos autos físicos ao PJE, para que nele conste às páginas 87,88,171,174,190,214,217,243 e 244."
15/09/2023 - Conclusos
08/08/2023 - Certidão de recebimento do processo digitalizado.'),
    ('5000260-24.2025.8.08.0064', '2026-07-08'::date, '08/07/2026 - Conclusos
16/03/2026 - Juntada AR Global
08/03/2026 - Certidão - Decurso de prazo autor 
11/02/2026 - Réplica 
05/02/2026 - Juntada decurso de prazo. 
20/01/2026 - Certidão informando a tempestividade da contestação 
09/12/2025 - Juntada de contestação Global
06/11/2025 - Juntada de petição
18/09/2025 - Citação Global 
10/09/2025 - Despacho - Global não foi citada
30/08/2025 - Petição autor 
30/04/2025 - Certidão contestação tempestiva
30/04/2025 - AR SC - devolvido
13/03/2025 - Contestação de SC
13/02/2025 - DECISÃO - medida liminar deferida, SC deve retirar o nome do autor do cadastro de indadimplentes
12/02/2025 - Distribuido'),
    ('5000607-56.2025.8.08.0032', '2026-03-30'::date, '30/03/2026 - Transito em julgado 
25/03/2026 - Petição SC
11/03/2026 - Petição - Ciência da parte autora sobre sentença 
06/03/2026 - Sentença - expedição de alvará
23/02/2026 - Conclusos 
19/02/2026 - Pet autora solicitando cumprimento de sentença 
11/02/2026 - Pet SC
09/02/2026 - Expedida intimação 
15/12/2025 - Processo evoluiu para classe de cumprimento de sentença. 
11/12/2025 - Transitado em julgado 
17/11/2025 - Despacho promovendo a evolução do feito para cumprimento de sentença 
11/11/2025 - Petição autora - Requer o cumprimento de sentença
07/11/2025 - Petição autora - Solci
20/10/2025 - Juntada de petição 
06/10/2025 - Sentença - Pedido julgado procedente 
08/09/2025 - Conclusos
20/08/2025 - Réplica
06/08/2025 - Autora intimada para apresentar réplica
25/07/2025 - Certidão de contestação tempestiva
22/07/2025 - Contestação de Souza Cruz
02/07/2025 - Termo de Audiência 
01/07/2025 - Habilitação de Souza Cruz
23/06/2025 - AR positivo de Souza Cruz
13/05/2025 - Petição de ciência parte autora
13/05/2025 - Expedida a citação
05/05/2025 - Decisão - concedida a tutela provisória
02/05/2025 - Audiência de conciliação designada para 01/07/2025, às 15h. 
02/05/2025 - Distribuição'),
    ('5000276-83.2025.8.08.0029', '2026-03-20'::date, '20/03/2026 - Trânsito em julgado e arquivamento 
10/03/2026 - Certidão - Decurso de prazo SC
26/01/2026 - Intimação sobre sentença expedida 
26/01/2026 - Sentença - Pedidos autorais julgados improcedentes
11/09/2025 - Conclusos
10/09/2025 - Termo de Audiência
10/09/2025 - Réplica
09/09/2025 - Contestação Souza Cruz
16/07/2025 - Certidão - ofício recebido pelo SERASA
01/07/2025 - Certidão - AR positivo SERASA
30/06/2025 - Certidão - AR ao SERASA
13/06/2025 - Publicada decisão em 09/06/2025
08/06/2025 - Disponibilizado no DJ Eletrônico em 06/06/2025.
05/06/2025 - Decisão interlocutória - Deferido parcialmente o pedido liminar, Serasa deve retirar a negativação da autora
02/06/2025 - Petição autora reiterando liminar
30/05/2025 - Audiência de conciliação designada para 10/09/2025, às 12h30, acesso virtual
21/05/2025 - Conclusos
19/05/2025 - Juntada de documento da parte
17/05/2025 - Redistribuição
16/05/2025 - Distribuição'),
    ('5000467-77.2025.8.08.0046', '2026-08-03'::date, '03/08/2026 - Certidão - Guia de mandado 
10/03/2026 - Despacho - Determina a intimação da parte autora e cobrança a Central de Mandados
12/02/2026 - Conclusão 
03/12/2025 - Petição SC - Informa que não tem mais provas a produzir
07/11/2025 - Expedição de intimação sobre o despacho 
09/10/2025 - despacho - "Intimem-se, no prazo de 15 dias para informar as provas que pretendem produzir e volte conclusos para deliberação sobre AIJ"
14/08/2025 - Petição Souza Cruz
12/08/2025 - Conclusos
12/08/2025 - Certidão - contestação tempestiva
12/08/2025 - Termo de audiência
12/08/2025 - Contestação
22/07/2025 - Expedida intimação eletrônica para Souza Cruz
22/07/2025 - Designada audiência para 12/08/2025, às 13h. Presencial ou por vídeo via Whatsapp
26/06/2025 - Certidão - despacho enviado ao CEJUSC
26/06/2025 - Despacho - seja designada a audiência
17/06/2025 - Distribuição'),
    ('5023309-45.2025.8.08.0048', '2026-05-15'::date, '15/05/2026 - CR autor 
24/03/2026 - Recurso inominado Global 
11/03/2026 - Intimação sobre ED publicado no DJEN
09/03/2026 - ED não acolhidos
20/02/2026 - ED global
10/02/2026 - Intimação sobre sentença expedida 
10/02/2026 - SENTENÇA - pedido autoral julgado parcialmente procedente.
20/01/2026 - Juntada AR global
05/12/2025 - Contestação global 
24/10/2025 - Expedição de citação para a global
26/09/2025 - Petição autor requerendo a citação da global
28/08/2025 - Certidão - Contestação tempestiva
06/08/2025 - Contestação Souza Cruz
06/08/2025 - AR positivo Souza Cruz
25/07/2025 - Certidão AR de Global
11/07/2025 - Expedida citação para Souza Cruz
09/07/2025 - Decisão - Deferida tutela de urgência e rés intimadas a apresentar contestação em 15 dias
09/07/2025 - Cancelada audiência una
08/07/2025 - Audiência Una designada para 19/08/2025, às 14h
08/07/2025 - Distribuição'),
    ('5023309-45.2025.8.08.0048', '2026-08-07'::date, '07/08/2026 - Pedido de inclusão em pauta 
21/05/2026 - Autos recebidos'),
    ('5029051-90.2025.8.08.0035', '2026-03-12'::date, '12/03/2026 - Arquivamento 
10/03/2026 - Sentença - Determinou o arquivamento por ausência do autor na AC
09/03/2026 - Requerimento autor 
04/03/2026 - ATA AC
26/11/2025 - Certidão - Feito aguardando realização de audiência 
28/08/2025 - Juntada AR da Souza Cruz
03/08/2025 - Certidão - expedida citação para Souza Cruz
31/07/2025 - Audiência de conciliação designada para 04/03/2025, às 16h, híbrida
31/07/2025 - Distribuição'),
    ('5000525-13.2025.8.08.0036', '2026-05-28'::date, '28/05/2026 - Arquivamento 
10/03/2026 - Intimação sobre homologação publicada no DJEN
21/01/2026 - Sentença - Homologação do acordo
13/10/2025 - Juntada de certidão 
29/08/2025 - Petição Souza Cruz - cumprimento do acordo
26/08/2025 - Instrumento particular de transação
19/08/2025 - Habilitação SC
05/08/2025 - Decisão - SC deve baixar as negativações
26/07/2025 - Distribuição'),
    ('5030108-07.2025.8.08.0048', '2026-07-30'::date, '30/07/2026 - Setença publicada no DJEN
17/07/2026 - Proferida sentença julgando improcedente os pedidos autorais.
09/06/2026 - Conclusos
08/06/2026 - ATA AC 
13/03/2026 - Mandado entregue ao destinatário 
13/02/2026 - Mandado de citação para a parte autora
11/02/2026 - ATA audiência 
19/12/2025 - Certidão informando o link para audiência 
07/10/2025 - Juntada de AR positivo SC
17/09/2025 - Expedida CARTA DE CITAÇÃO E INTIMAÇÃO PARA AUDIÊNCIA DE CONCILIAÇÃO
15/09/2025 - Despacho - AC designada para 11/02/2026 às 16:30
09/09/2025 - Conclusos
09/09/2025 - AR autor
25/08/2025 - Certidão - autor requer a redistribuição do processo
22/08/2025 - Processo deve ser redistribuído
21/08/2025 - Distribuição'),
    ('5012281-37.2025.8.08.0030', '2026-03-15'::date, '15/03/2026 - CR SC
08/03/2026 - Certidão - Decurso de prazo para manifestação SC sobre sentença
26/11/2025 - Pet autor - Recurso inominado
26/11/2025 - SENTENÇA - Pedidos autorais julgados parcialmente procedentes. 
06/11/2025 - ATA de audiência.
03/11/2025 - Réplica 
03/11/2025 - Contestação SC
17/10/2025 - Certidão ar prositivo SC. 
11/09/2025 - Audiência de Concliação designada para 03/11/2025, às 15h15, virtual
11/09/2025 - DECISÃO - deferida a liminar, Souza Cruz deve baixar a negativação
09/09/2025 - Petição autor
08/09/2025 - Despacho - Autora intimada
04/09/2025 - Distribuição'),
    ('5033660-77.2025.8.08.0048', '2026-05-04'::date, '04/05/2026 - Trânsito em julgado e arquivamento. 
09/03/2026 - Sentença publicada no DJEN
03/03/2026 - Sentença - Pedido julgado improcedente 
10/12/2025 - Conclusos 
10/12/2025 - Juntada de certidão 
18/11/2025 - Juntada de ATA de audiência
18/11/2025 - Juntada de contestação SC
10/10/2025 - Juntada de AR positivo SC
16/09/2025 - Não Concedida a Tutela Provisória e Publicada a INTIMAÇÃO ELETRONICA AUDIÊNCIA HÍBRIDA/DECISÃO em 18/09/2025'),
    ('5035420-61.2025.8.08.0048', '2026-06-23'::date, '23/06/2026 - Trânsito em julgado e arquivamento 
08/06/2026 - Sentença publicada no DJEN
02/06/2026 - Sentença - Extinto o cumprimento de sentença 
21/05/2026 - Conclusos 
20/05/2026 - Pet corréu - Requer seu descadastramento 
06/05/2026 - Pet SC - Cumprimento das condenações
28/04/2026 - Intimação sobre sentença publicada no DJEN 
28/04/2026 - Evoluída classe para cumprimento de sentença
23/04/2026 - Trânsito em julgado 
07/04/2026 - Pet autor - cumprimento de sentença
30/03/2026 - Sentença - Pedido julgado parcialmente procedente. 
11/02/2026 - Conclusos
11/02/2026 - ATA de AC
10/02/2026 - Réplica 
09/02/2026 - Contestação - SC 
06/02/2026 - Réplica 
04/02/2026 - Contestação - Global 
04/02/2026 - Contestação -  Osmar Nicolini
09/01/2026 - Juntada AR SC
28/11/2025 - Juntada de AR de Osmar Nicolini (réu)
24/11/2025 - Despacho - Reitera a decisão de manter a audiência presencial. 
/12/11/2025 - Juntada de AR positivo SC
10/11/2025 - Expedição no DJ sobre o despacho 
07/11/2025 - Despacho - Indeferimento do pedido de audiência híbrida solicitado pela parte autora. 
21/10/2025 - Deferimento de liminar 
14/010/2025 -  Certidão de cumprimento de mandado para SC
25/09/2025 - Despacho solicitando a citação dos réus'),
    ('5003893-60.2025.8.08.0026', '2026-05-11'::date, '11/05/2026 - Sentença - Pedidos autorais julgado procedente.
30/04/2026 - Conclusos 
30/04/2026 - ata AC
28/04/2026 - Pet SC - Carta de preposição
17/03/2026 - Mandado entregue ao destinário 
17/03/2026 - Certidão - Mandado para a parte autora sobre audiê#ncia 
10/03/2026 - Certidão - Dercurso de prazo SC sobre certidão informando sobre audiência 
19/02/2026 - Intimação para a parte autora 
09/02/2026 - Certidão informando a redesignação. 
09/02/2026 - AC redesignada para 29/04, às 16H. 
09/02/2026 - ATA de AC 
09/02/2026  - Contestação SC
17/12/2025 - Expedição de intimação sobre decisão no DJEN e citação SC 
11/12/2025 - Decisão - Deferimento de liminar e designação de AC para 09/02/2026, às 14h30'),
    ('5001551-84.2026.8.08.0012', '2026-07-22'::date, '22/07/2026 - Extinção publicada no DJEN 
20/07/2026 - Extinta execução 
30/06/2026 - Transito em julgado 
12/06/2026 - Petição SC
25/04/2026 - Sentença publicada no DJEN
20/04/2026 - Sentença - Pedidos julgados parcialmente procedentes
30/03/2026 - Conclusos 
25/03/2026 - Pet SC
13/03/2026 - Certidão - Juntada de documentos pela parte autora 
12/03/2026 - ATA de audiência - sem acordo 
12/03/2026 - Contestação SC 
23/02/2026 - Comprovante de intimação autor 
28/01/2026 - Expedida citação SC
22/01/2026 - AC designada para 12/03/2026, às 16:30'),
    ('5000073-29.2026.8.08.0016', '2026-08-03'::date, '03/08/2026 - Conclusos 
17/07/2026  - Contestação
26/06/2026 - Pet autor - Alegações finais 
23/06/2026 - Pet SC 
22/06/2026 - AIJ realizada 
23/04/2026 - Pet autor - Ciência de redesignação 
09/04/2026 - Intimação sobre despacho publicada no DJEN
07/04/2026 - Despacho - AIJ redesignada para 22 de junho, às 10h.
27/03/2026 - Retorno positivo AR SC 
23/03/2026 - Pet autor 
03/03/2026 - AIJ desginada para 29/04/2026, às 10h
03/03/2026 - Decisão - Indeferimento do depoimento pessoal solicitado pela SC e designação para AIJ em 29/04/2026, às 10h. 
26/02/2026 - ATA
26/02/2026 - Contestação SC
24/02/2026 - Pet autor ciente da AC
11/02/2026 - Comprovante de AR 
22/01/2026 -Despacho determinando AC para 25/02/2026, às 10:20'),
    ('5000341-47.2026.8.08.0028', '2026-05-08'::date, '08/05/2026 - ATA AC
06/05/2026 - Réplica 
22/04/2026 - Contestação - SC 
14/04/2026 - AR positivo SC
27/02/2026 - Publicada citação 
25/02/2026 - Expedida a citação e deferimento de liminar'),
    ('5000181-79.2026.8.08.0009', '2026-07-21'::date, '21/07/2026 - Petição SC 
13/07/2026: Expedida intimação eletrônica SC
23/06/2026: Expedida citação postal
20/03/2026 - Decurso de prazo - SC
05/03/2026 - Despacho - determina a citação da SC'),
    ('5127540-75.2016.8.13.0024', '2026-06-15'::date, '15/06/2026 - Intimação ao autor sem sucesso 
17/04/2026 - Pet SC - desabilitação Beatriz 
24/03/2026 - Despacho - determina a intimação pessoal da parte autora sob pena de extinção do feito 
19/12/2025 - Expedida a intimação 
09/12/2025  - Juntada de petição 
01/12/2025 - Intimação expedida para ciência da manifestação do perito. 
19/11/2025 - Petição perito - Informa que a parte autora não compareceu a reunião para coleta. 
17/11/2025 - Petição autor - Juntada do formulário de coleta para perícia
16/10/2025- Expedida intimação no DJ sobre a perícia 
14/10/2025 - Petição Perito
08/10/2025 - Petição SC
30/09/2025 - Disponibilizado no DJ
15/09/2025 - Manifestação perito 
02/09/2025 - DESPACHO - nomeação novo perito
26/08/2025 - Conclusos
27/05/2025 - Certidão - sem manifestação do perito
11/04/2025 - Perito intimado por e-mail
11/04/2025 - Despacho - reintime-se o perito.
26/03/2025 - Despacho - perito deve ser reintimado.
25/03/2025 - Conclusos
17/01/2025 - Proferido Despacho de mero expediente, no qual nomeia um novo perito do sistema AJG-TJMG para realizar a prova pericial, pois o inicialmente designado não se manifestou. A parte responsável pelo ônus da prova é beneficiária da gratuidade de justiça. O perito tem 10 dias para aceitar a designação e, após o aceite, 30 dias para concluir os trabalhos.
08/08/2024 - Concluso
16/07/2024 - Decorrido o prazo do perito
18/06/2024 - Despacho "Diante da manifestação do perito e sendo a parte incumbida do ônus processual relativo à prova pericial beneficiária da gratuidade da justiça, nomeio perito(a) em substituição, integrante do sistema AJG-TJMG, conforme termo de nomeação anexo e os termos da Portaria nº 6180/PR/2023. O sistema consignou o prazo de 10 dias para o perito aceitar a designação. Decorrido sem manifestação, retornem os autos para nomeação de outro profissional. Concedo, desde logo, 30 (trinta) dias para a conclusão dos trabalhos contados do aceite."
10/06/2024 - Petição do Perito (não aceitou o trabalho)
07/06/2024 - Despacho "Sendo a parte incumbida do ônus processual relativo à prova pericial beneficiária da gratuidade da justiça, nomeio perito(a) em substituição, integrante do sistema AJG-TJMG, conforme termo de nomeação anexo e os termos da Portaria nº 6180/PR/2023."
28/05/2024 - Petição (Exclusão da Bia).
01/12/2023 - Conclusos
25/08/2023 - Pet da SC
10/08/2023 - Manifestação da perita informando redução do valor para R$2.300,00 (dois mil e trezentos reais)
17/07/2023 - Despacho:"Vista à perita sobre manifestação das partes."
10/07/2023 - Conclusos
03/03/2023 - Pet da SC
16/03/2023 - Expedição de intimação referente a manifestação da perita
12/03/2023 -  Manifestação da perita
27/02/2023 - Expedição de comunicação
24/02/2023 - despacho: "Inexistente manifestação do perito(a) e sendo a parte incumbida do ônus processual relativo à prova pericial beneficiária da gratuidade da justiça, nomeio perito(a) em substituição, integrante do sistema AJG-TJMG, conforme termo de nomeação anexo e os termos da Resolução TJMG nº 832/18. O sistema consignou o prazo de 10 dias para o perito aceitar a designação. Decorrido sem manifestação, retornem os autos para nomeação de outro profissional.. Concedo, desde logo, 30 (trinta) dias para a conclusão dos trabalhos contados do aceite. Homologo os honorários periciais no valor indicado no termo de nomeação, por observância à tabela I anexa à Portaria da Presidência nº. 3491/16."
10/02/23 -  conclusos
24/11/22 - CERTIDÃO - DECURSO DE PRAZO: "Certifico e dou fé que decorreu o prazo legal sem qualquer manifestação da perita."
15/7/22 -  DECORRIDO PRAZO DE THAYS FRAGA LEAO PAGAN EM 14/07/2022
06/05/22 - Expedição de comunicação via sistema; Expedição de Certidão
02/05/22 - Proferido despacho de mero expediente
14/04/22 - Juntada de Petição 
23/3/22 - Conclusos para despacho
21/03/22 - Expedição de comunicação eletronica
17/04/2026 - Pet SC
18/03/22 - Despacho de mero expediente
16/03/22 - Conclusos para despacho
21/01/22 - Juntada de manifestação do autor de ciência do retorno dos autos
10/12/21 - despacho: "vista às parte sobre retorno dos autos"
06/11/21 - Juntada de petição
06/08/21 - Remessa ao TJMG
05/08/21 - Contrarrazões
13/07/21 - Comunicação via sistema
12/07/21 - Apelação - Autor
16/06/21 - Comunicação via sistema
14/06/21 - Sentença de improcedência
15/04/21 - Intimação
14/04/21 - EDs da Souza Cruz acolhidos
12/04/21 - Conclusão
18/08/20 - Decorrido prazo das partes
08/08/20 - Decorrido prazo
04/08/20 - Comunicação via sistema
03/08/20 - Juntada de EDs
29/07/20 - Comunicação eletrônica
24/07/20 - Despacho
22/07/20 - Conclusos para despacho
10/07/20 - Certidão de decurso de prazo
16/06/20 - Decorrido prazo da ré
06/06/20 - Decorrido prazo do autor
04/06/20 - Juntada de manifestação
25/05/20 - Expedição de comunicação
22/05/20 - Juntada de impugnação
13/04/20 - Despacho e comunicação via sistema
06/11/2019 - Decorrido prazo de SOUZA CRUZ S/A em 05/11/2019  31/10/2019 - Conclusos para julgamento            29/10/2019 - Juntada de petição de alegações finais 25/10/2019 - Juntada de petição de alegações finais                  08/10/2019 - Decorrido prazo  02/10/2019 - Proferido despacho de mero expediente 01/10/2019 - Juntada de petição de manifestação 26/09/2019 - Juntada de petição de petição  06/09/2019  - Expedição de comunicação via sistema. 
06/09/2019 - Proferido despacho de mero expediente 27/05/2019 Juntada de petição de petição 22/01/2019 18:01:33 - Decorrido prazo de UESLEI SOUSA PORTO em 21/01/2019'),
    ('0090713-64.2015.8.13.0452', '2026-07-08'::date, '08/07/2026: Expedida intimação p Fazenda
03/06/2026 - Despacho - Intimação para a Fazenda para possível impugnação; Homologação do cálculo 
01/06/2026 - Conclusos 
13/05/2026 - Processo reativado 
11/05/2026 - Pet autor - requer cumprimento de sentença 
29/04/2026 - Arquivamento 
29/04/2026 - Certidão de baixa
29/04/2026 - Pet ciência autor
17/04/2026 - Pet SC - Desabilitação 
10/04/2026 - Pet AGU - Ciência 
08/04/2026 - Intimação sobre trânsito em julgado publicada no DJEN
08/04/2026 - Trânsito em julgado
10/03/2026 - Manifestação ciência autor
19/02/2026 - Pet AGU 
11/02/2026 - Intimação Eds 
04/02/2026 - EDS acolhidos, afastando a condenação da SC
13/11/2025 - Mnaifestação solicitando o julgamento dos embargos
05/10/2025 -  Juntada de petição da AGE para juntada de documentação. 
11/08/2025 - Conclusos
23/04/2025 - Parte autora intimada para contraminutar os embargos
02/04/2025 - Manifestação da Advocacia Pública Estado MG
18/12/2024 - Embargos de Declaração opostos pela SC. E juntada de certidão atestando carta precatória negativa.
10/12/2024 - Proferida sentença que julgou parcialmente procedente os pedidos autorais.
05/12/2024 - Juntado aos autos a Ata de audiência realizada em 05/12 às 13:00. Após isso, os autos encontram-se conclusos para julgamento.
21/11/2024 - Juntada de Mandado de Intimação do Autor.
29/10/2024 - Audiência Instrução e Julgamento (12750) designada para 21/11/2024 14:00 1ª Vara Cível da Comarca de Nova Serrana
23/09/2024 - Concluso
18/09/2024 - Decisão "Designo audiência de instrução e julgamento para o dia  29/10/2024 às 14h30min. "
03/06/2024 - Concluso
28/05/2024 - Petição (Exclusão da Bia).
10/05/2024 - Pet da SC
15/04/2024 - Despacho "Em provas".
26/01/2024 - Juntada de apelação; pet do autor pedindo para desconsiderar apelação pois foi anexada equivocadamente
22/01/2024 - Conclusos
30/10/2023 - Juntada de pet. do autor
18/08/2023 - Juntada de manifestação do MP
19/07/2023 - Pet de manifestação do autor
05/07/2023 - "Não há que se falar em revelia do litisdenunciado Estado de Minas Gerais, eis que tempestiva sua contestação de ID9450527846. Em prosseguimento, antes de apreciar o pedido de realização de perícia técnica no veículo, necessário aferir-se acerca das informações apresentadas pelo Estado de Minas Gerais no ID9450506733. Informou o Estado réu que o veículo objeto da lide encontra-se apreendido no pátio Serranense, conforme Reds n° 2015-021385432-001, em razão de suspeita de adulteração de sinal identificador de veículo automotor. Informou, ainda, que o Inquérito Policial de nº 4290796, PCNET: 4290796, foi instaurado e encontra-se em andamento. As referidas informações foram prestadas em 04/05/2022, ou seja, há mais de um ano. Assim, considerando o longo período decorrido e, também, que as informações acerca do inquérito são de grande relevância para a apuração da situação discutida no caso dos autos, determino ao Estado réu que, no prazo de 15 dias, informe nos autos o andamento do Inquérito Policial de nº 4290796, PCNET: 4290796 e, caso tenha sido concluído, que junte cópia integral do referido inquérito neste processo. Intime-se. Com a resposta, intimem-se as partes para manifestação em 10 dias."
04/04/2023 - Conclusos
10/02/23 -  pet ão especificada
02/12/22 - expedida intimação referente ao despacho do dia 26.10
26/10/22 - Despacho: "Intime-se o denunciante, Mauro Severiano Vieira, para, no prazo de 15 (quinze) dias, apresentar resposta a contestação apresentada pelos denunciados."
02/09/22 - CONCLUSOS PARA DESPACHO
11/07/22 - Juntada de Petição
04/07/22 - Juntada de Petição
23/06/22 - Expedição de comunicação via sistema.
10/05/22 - Juntada de Petição de outros documentos
04/05/22 - Juntada de Petição de contestação
21/03/22 - Expedição de Certidão; Expedição decomunicação via sistema
16/11/21 - Proferido despacho de mero expediente (cadastramento do estado de MG no polo passivo e certificação de citação e contestação do mesmo)
06/10/21 - Petião de habilitação
01/09/21 - Conclusão
13/05/21 - Petição do autor
30/04/21 - Petição da ré
20/04/21 - Petição do autor
26/03/21 - Processo digitalizado
08/02/21 - Iniciada a virtualização do processo
22/05/20 - Decorrido prazo de recolhimento de custas
02/12/2019 - Publicado vista ao réu                     
16/10/2019 - Publicado despacho vista ao réu 
03/07/2019 -    JUNTADA DE PETIÇÃO DE MANIFESTAÇÃO'),
    ('5001253-71.2023.8.13.0105', '2026-02-26'::date, '26/02/2026 - Despacho - Verificação de custas 
09/02/2026 - Conclusão 
09/02/2026 - Autos retornados para o  1° grau 
18/10/2025 - Remetido os autos para turma recursal. 
19/05/2025 - Parte autora intimada para contrarrazoar
28/04/2025 - Recurso Inominado SC
06/04/2025 - Publicada a intimação
03/04/2025 - Sentença juiz leigo - procedentes os pedidos do autor
15/08/2024 - Concluso
08/07/2024 - Juntada da Gravação da AIJ
05/06/2024 - Ata da Audiência
11/08/2023 - Juntada de manifestação do autor dando ciência da AIJ
03/07/2023 - AIJ designada para 05/06/2024 as 13:00
06/06/2023 - Pet SC informando cumprimento liminar
29/05/2023 - LIMINAR CONCEDIDA
19/05/2023 - Conclusos
16/05/2023 - AC realizada em 15/05/2023; Ata disponibilizada
15/05/2023 - Juntada de Contestação
12/05/2023 - Juntagem de link de audiência
15/03/2023 - Juntada de AR da SC
23/02/2023 - Juntada de Petição não especificada
25/01/23 - Expedida intimação de audiência
23/01/23 - Conclusos
19/01/23 - Distribuição; AC designada para 15/05/2023 as 15h20'),
    ('5001253-71.2023.8.13.0105', '2026-02-09'::date, '09/02/2026 - Arquivado definitivamente
09/02/2026 - Trânsito em julgado
16/12/2025 - Juntada de certidão 
15/12/2025 -Acordão publicado no DJEN 
13/12/2025 - ácordão disponibilizado no DJEN
11/12/2025 - Ácordão - Dado provimento ao recurso interposto pela SC, reformulando a sentença e julgando os pedidos iniciais improcedentes 
11/11/2025 - Inclusão disponibilizada no DJEN
11/11/2025 - Inclusão de pauta para julgamento do mérito'),
    ('5008204-18.2023.8.13.0223', '2026-03-04'::date, '04/03/2026 - Ciência da sentença
26/02/2026 - Arquivamento 
19/02/2026 - Intimação sobre sentença disponibilizada no DJEN
10/02/2026 - Sentença - Homologação do acordo
02/02/2026 - Pet SC informando o cumprimento do acordo
28/01/2026 - Conclusos 
26/01/2026 - Pet autor informando a realização do acordo 
12/12/2025 - Disponibilizada sentença no DJEN
02/12/2025 - Sentença  - Pedido julgado procedente 
03/08/2025 - Conclusos
30/07/2025 - Memoriais Souza Cruz
07/07/2025 - SC intimada para apresentar alegações finais
15/04/2025 - Alegações finais parte autora
13/04/2025 - Manifestação - Ciente a perita
11/04/2025 - Certidão de juntada de ofício de pagamento de honorários assistência judiciária gratuita
11/03/2025 - Expedida intimação
28/03/2025 - Despacho - partes para manifestar produção de provas
14/01/2025 - Conclusos
02/01/2025 - Juntada manifestação da SC acerca do Laudo Pericial.
27/11/2024 - Laudo pericial juntado aos autos.
14/10/2024 - Autor "Ciente da data designada para a coleta do material grafotécnico."
30/09/2024 - Petição da Perita "REQUER a coleta de material gráfico por meio de  videoconferência, para o dia 04/11/2024, às 10:00 horas, devendo ser intimadas as partes, para efeito do art. 474 do CPC, inclusive com o comparecimento do periciando, 
munido de RG e CPF."
12/08/2024 - Decisão "Diante do ponto controvertido da presente demanda, entendo que a produção de perícia GRAFOTÉCNICA é matéria que se impõe, devendo a Sra. Escrivã da Secretaria do Juízo proceder à nomeação do competente perito junto ao sistema AJ, por sorteio, anotando prazo de 10 (dez) dias para aceite, inclusive os honorários periciais que fixo no importe de R$ 522,34 (quinhentos e vinte e dois reais e trinta e quatro centavos), conforme Portaria da Presidência n.º 6.607/2024, sendo que o valor será pago, oportunamente, através do Sistema Eletrônico de Assistência Judiciária Gratuita do Tribunal de Justiça do Estado de Minas Gerais – Sistema AJG/TJMG."
28/05/2024 - Petição (Exclusão da Bia) - Descadastrada
26/01/2024 -  Pet da SC
24/01/2024 - Pet do autor requerendo prova pericial
18/12/2023 - intimação para manifestação sobre provas (5 dias)
26/09/2023 - Juntada de Petição de impugnação
21/08/2023 - Juntada de contestação da SC
01/08/2023 - "A parte requerida foi cientificada quanto ao prazo de 15 (quinze) dias, a contar da data da audiência, para apresentar constestação"
31/07/2023 - AC realizada
19/06/2023 - Juntada de resposta do SERASA
12/06/2023 - Juntada de ciência do autor
02/06/2023 - Certidão expedida
29/05/2023 - AC agndada para 31/10/2023 as 15h30.
26/05/2323 - GJ concedida
19/05/2023 - Conclusos
18/05/2023 - Juntada de manifestação do autor apresentando os documentos.
09/05/2023 - Intimação para que autor apresente alguns documentos
08/05/2023 - Juntada de manifestação do autor; Conclusos
04/05/2023 - Distribuição'),
    ('476907007120202026', '2025-11-13'::date, '13/11/2025 - O processo encontra-se sobrestado.
02/10/2025 - Sem novas movimentações
07/07/2025 - Processo foi encaminhado para o Jurídico para cobrar a multa judicialmente
27/06/2025 - Sem movimentações.
30/05/2025 - Sem movimentações
07/03/2025 - Decisão em 20/02/2025: negou provimento ao Recurso de Souza Cruz
22/07/2024 - Aguardando Julgamento (Previsão para 29/10/2024), após o julgamento o processo é enviado para a regional para a comunicação da decisão
01/04/2024 - Liguei para lá e informaram que o processo chegou em outubro, mas ainda aguarda julgamento. Disseram, também, que talvez entre na pauta da próxima reunião, que será em maio.
13/07/2023 - Defesa da SC foi recebida e encaminhada ao plenário para ser analisada. A servidora informou que assim que for analisado o CRA enviará a a resposta para o e-mail cadastrado da empresa.'),
    ('476907007120202026', '2025-01-13'::date, '13/01/2025 - Processo encontra-se sobrestado
09/12/2025 - O processo encontra-se sobrestado
13/11/2025 - O processo encontra-se sobrestado.
02/10/2025 - Sem novas movimentações
07/07/2025 - Processo foi encaminhado para o Jurídico para cobrar a multa judicialmente
27/06/2025 - Sem movimentações.
30/05/2025 - Sem movimentações
07/03/2025 - Decisão em 20/02/2025: negou provimento ao Recurso de Souza Cruz
22/07/2024 - Aguardando Julgamento (Previsão para 29/10/2024), após o julgamento o processo é enviado para a regional para a comunicação da decisão
01/04/2024 - Liguei para lá e informaram que o processo chegou em outubro, mas ainda aguarda julgamento. Disseram, também, que talvez entre na pauta da próxima reunião, que será em maio.
13/07/2023 - Defesa da SC foi recebida e encaminhada ao plenário para ser analisada. A servidora informou que assim que for analisado o CRA enviará a a resposta para o e-mail cadastrado da empresa.'),
    ('5049887-53.2023.8.13.0702', '2026-08-03'::date, '03/08/2026 - Despacho - indeferimento da prova testemunhal
13/02/2026 - Conclusos 
29/08/2025 - Petição Souza  Cruz - sem provas
27/08/2025 - Petição autor - requer depoimento pessoal do requerido
07/08/2025 - Despacho - partes intimadas a se manifestar sobre produção de provas
16/01/2025 - Conclusos para despacho.
13/08/2024 - Réplica
22/07/2024 - Intimação para Réplica
17/07/2024 - Contestação da SC
10/01/2024 - CONCEDIDA A MEDIDA LIMINAR
03/01/2024 - JUNTADA DE PETIÇÃO DE RENÚNCIA DE MANDATO
21/12/2023 - conclusos
26/09/2023  - Juntada de Petição de petição
05/09/2023 - Distribuição'),
    ('5000932-46.2024.8.13.0155', '2026-07-09'::date, '09/07/2026 - Certidão de Migração disponibilizada no DJEN
08/07/2026 - Migrado para o eproc
18/05/2026 - AR global - devolução 
22/04/2026 - Certidão informando código de rastreamento
17/04/2026 - Pet SC 
30/03/2026 - Determinado o arquivamento 
30/03/2026 - Sentença - Pedido julgado improcedente
16/03/2026 - Conclusos
26/01/2026 - Pet SC
08/01/2026 - Despacho - "Requisite da empresa Souza Cruz S/A informações acerca de eventual cessão de crédito a favor da Precisão Global de Cobranças Ltda., bem como para juntar, se for o caso, o instrumento de cessão de crédito"
16/12/2024 - Conclusos para julgamento.
02/12/2024 - Juntada de petição da parte autora.
27/11/2024 - Juntada de Ata da Audiência sem Sentença.
14/10/2024 - Juntada de AR da Global
03/09/2024 - Audiência Conciliação (12740) designada para 27/11/2024 09:30 Juizado Especial da Comarca de Caxambu
27/08/2024 - Decisão "Ante o exposto, indefiro a tutela de urgência pleiteada na inicial."
01/08/2024 - Concluso
22/07/2024 - Réplica
23/07/2024 - Contestação da SC
29/07/2024 - AC sem acordo
24/07/2024 - Concluso
17/07/2024 - Petição requerendo citação da global em novo endereço
14/06/2024 - Concluso para Despacho.
12/06/2024 - Juntada de AR (Global)
20/05/2024 - Expedição da Citação (BN207964702 BR)
14/05/2024 - Distribuição'),
    ('5000918-09.2024.8.13.0205', '2026-03-03'::date, '03/03/2026 - SC  deixou de ser mencionada nos autos 
06/12/2025 - Intimação disponibilizada no DJEN
04/12/2025 - Intimação para as partes sobre o despacho 
04/12/2025 - Despacho - "Diante do retorno dos autos, intimem-se as partes para manifestação."
04/12/2025 - Certidão sobre trânsito em julgado do ácordão
12/08/2025 - Remetidos os autos para 2 grau 
12/08/2025 - Contrarrazões autor
30/07/2025 - Autor intimado a apresentar contrarrazões
29/07/2025 - Apelação Souza Cruz
07/07/2025 - Expedição de intimação da decisão
27/06/2025 - Embargos de Declaração não acolhidos
20/05/2025 - Conclusos
29/04/2025 - Petição de cumprimento de OBF SC
15/04/2025 - Autor intimado a se manifestar sobre os ED''s
15/04/2025 - Embargos de Declaração de Souza Cruz
04/04/2025 - Sentença - pedidos julgados parcialmente procedentes
24/02/2025 - Conclusos
24/02/2025 - Juntada de Alegações Finais autor
13/02/2025 - Juntada de petição de SC - alegações finais
20/01/2025 - Razões finais apresentadas pelo autor.
11/12/2024 - Petição pela SC informando a localização nos autos do documento de representação.
09/12/2024 - Juntada Ata de audiência.
04/12/2024 - Link da audiência disponibilizado nos autos.
03/12/2024 - Audiência de instrução designada para o dia 05/12/2024 às 13:30.
28/11/2024 - Expedição de Mandado de Intimação do Autor.
14/11/2024 - Juntada de Mandado, acerca da designação de audiência.
05/11/2024 - Audiência Instrução (12749) designada para 05/12/2024 13:30 Vara Única da Comarca de Cristina
17/10/2024 - Saneador "Defiro a produção de prova oral, consistente no depoimento pessoal das partes e a oitiva de testemunhas. À Serventia para designação de audiência de instrução."
01/10/2024 - Pet da SC (sem provas)
25/09/2024 - Petição do autor "para informar que pretende produzir prova testemunhal no intuito de comprovar fatos que de outra forma não seria possível, e também o depoimento pessoal do auto"
27/08/2024 - Contestação
06/08/2024 - Intimação "Aguardando Contestação"
06/08/2024 - Ata da audiência 
10/07/2024 - Intimação do autor
27/06/2024 - Audiência de conciliação designada para o dia 06/08/2024 às 13:00 horas.
13/06/2024 - Tutela "Assim, CONCEDO a tutela inibitória de urgência e determino que o requerido Marco Aurélio de Souza se abstenha de realizar compras utilizando o nome do requerente, sob pena de multa de R$ 1.000,00 (mil reais) por cada compra demonstrada"
27/05/2024 - Distribuição'),
    ('5000918-09.2024.8.13.0205', '2025-12-03'::date, '03/12/2025 - Baixa definitiva 
03/12/2025 - Transito em julgado
05/11/2025 -  Acordão publicado no DJEN
03/11/2025 - Ácordão - Dá-se provimento à apelação interposta por Souza Cruz, para afastar a condenação ao pagamento dos ônus sucumbenciais e condenar o autor ao pagamento dos honorários de sucumbência.
29/09/2025 - autos devolvidos. Sessão de julgamento virtual marcada para 03/11/2025.
19/08/2025 - Conclusos
16/08/2025 - Recebidos'),
    ('5002681-21.2024.8.13.0407', '2026-07-13'::date, '13/07/2026 - Migrado pro eproc
06/07/2026 - CR SC
11/06/2026 - Intimação sobre CR publicada no DJEN
08/06/2026 - Apelação autor 
16/05/2026 - Pet autor - Ciência da sentença e decisão sobre eds
11/05/2026 - EDs não acolhidos 
05/05/2026 - ED''s autor 
27/04/2026 - Intimação sobre sentença publicada no DJEN
24/04/2026 - Sentença - Pedido Julgado improcedente 
09/10/2025 - Conclusos 
07/10/2025 - Pet. Autora 
25/09/2025 - decisão solicitando intimação, no prazo de 10 dias,  da parte autora para comprovação de hipossuficiência  
14/05/2025 - Conclusos
03/04/2025 - Decisão autos conclusos
01/04/2025 - Conclusos
25/03/2025 - Petição autora - sem provas e requer julgamento antecipado da lide
11/03/2025 - Petição de manifestação de corré
26/02/2025 - Juntada de Impugnação à Contestação de SC
07/02/2025 - Parte autora intimada para apresentar Impugnação
04/02/2025 - Juntada de Petição de contestação SC.
30/01/2025 - Juntada de Petição de impugnação à contestação pela parte autora.
18/12/2024 - Juntada Ata de audiência.
12/12/2024 - Remetidos os Autos ao CEJUSC ou Centros de Conciliação/Mediação 1ª Vara Cível, Criminal e da Infância e da Juventude da Comarca de Mateus Leme.
05/12/2024 - Proferido Despacho que atestou a realização da audiência de conciliação via CISCO WEBEX, devendo as partes informarem nos autos os endereços de e-mail para envio do link para acesso à audiência dia 13/12.
27/11/2024 - Petição de habilitação aos autos da parte OESA COMERCIO E REPRESENTACOES S.A.
13/11/2024 - Juntada de resposta de AR positiva da SC.
29/10/2024 - Juntada de AR (OESA)
08/10/2024 - Juntada de AR (Trademaster)
18/09/2024 - Expedição da Citação
18/09/2024 - Audiência Conciliação/CEJUSC (12740) designada para 13/12/2024 13:00 1ª Vara Cível, Criminal e da Infância e da Juventude da Comarca de Mateus Leme
18/09/2024 - Decisão "Ante o exposto e de tudo mais que dos autos consta, por entender presentes nos documentos carreados aos autos a fumaça do bom direito (fumus boni juris) e o perigo na dilação temporal causado pela instrução (periculum in mora), concedo a antecipação da tutela para determinar a exclusão do nome do autor dos órgãos de proteção ao crédito SPC, bem como a suspensão de protesto, caso existente, lançados pelas rés, devendo ser expedido mandado diretamente para o órgão de proteção ao crédito e ao cartório de protestos."
13/09/2024 - Distribuição'),
    ('5002681-21.2024.8.13.0407', '2026-07-21'::date, '21/07/2026 -  Redistribuído por sorteio - (19CACIV-A4 para 21CACIV-A5)
17/07/2026 - Conclusos e proferida decisão declarando incompetência
14/07/2026 - Distribuído por sorteio'),
    ('5001758-59.2025.8.13.0439', '2026-02-19'::date, '19/02/2026 - Petição de ciência autor 
12/02/2026 - Arquivamento 
12/02/2026 - Intimação sobre alvará publicada 
12/02/2026 - Alvará 
02/02/2026 - Despacho - Determina a expedição de alvará 
02/02/2026 - Trânsito em julgado
27/01/2026 - Pet autora requerendo expedição de alvará 
17/12/2025 - Pet SC juntando comprovante
02/10/2025 - Remetidos os autos para turma recursal. 
30/09/2025 - Petição Souza Cruz - Contrarrazões ao RI
12/09/2025 - Intimação Souza Cruz - "Ao réu, no prazo legal, apresentar contrarrazões ao recurso, sob as penas da lei."
04/09/2025 - Recurso Inominado
12/08/2025 - SENTENÇA - pedidos parcialmente procedentes
02/08/2025 - Conclusos
21/05/2025 - Manifestação parte autora
08/05/2025 - Conclusos
06/05/2025 - Juntada de ata da audiência
05/05/2025 - Contestação SC
13/03/2025 - Juntada de AR positivo de SC
14/02/2025 - Audiência de Conciliação presencial no dia 05/05/2025, às 13:30; Publicada intimação.'),
    ('5001758-59.2025.8.13.0439', '2026-02-02'::date, '02/02/2026 - Arquivamento 
02/02/2026 - Expedição de depósito para a parte autora
02/02/2026 - Trânsito em julgado 
04/12/2025 - Intimação publicada sobre o acordão 
02/12/2025 - Expedida intimação sobre o ácordão
02/12/2025 - Ácordão - Recurso não provido 
02/12/2025 - Juntada de certidão de julgamento 
11/11/2025 - Publicação de intimação em 11/11
07/11/2025 - Incluso na pauta de julgamento do dia 27/11/2025
06/10/2025 - Conclusos'),
    ('5006408-27.2025.8.13.0027', '2026-08-06'::date, '06/08/2026 - Certidão - Ecxpedido alvará de levantamento 
15/07/2026 - Manifestação da parte autora
23/06/2026 - Manifestação da parte autora
19/06/2026 - Intimação não entregue ao autor
11/06/2026 - Despacho - intimação para a parte autora sobre impugnação 
03/06/2026 - SC - impugnação ao CS
14/05/2026 - Conclusos
13/05/2026 - Pet SC - Impugnação 
07/05/2026 - Pet sc - Cumprimento de condenação 
17/04/2026 - Intimação sobre despacho publicada no DJEN
14/04/2026 - Despacho - Determina a intimação da Souza Cruz para cumprimento 
14/04/2026 - Classe processual alterada para cumprimento de sentença 
31/03/2026 - Pet autor - Reitera com urgência o pedido de cumprimento de sentennça 
10/03/2026 - Despacho - Certifique-se do trânsito em julgado
06/02/2026 - Conclusos 
06/02/2026 - Juntada de trânsito em julgado 
15/12/2025 - Juntada de manifestação da parte autora 
09/12/2025 - Juntada de mandado devolvido. Não foi entregue ao autor
01/12/2025 - Manifestação de ciência autor 
24/11/2025 - Intimação SC
17/11/2025 - Homologação da sentença de juiz leigo
17/11/2025 - Sentença de juiz leigo - Pedidos julgados procedentes
21/10/2025 - Conclusão 
21/10/2025 - Despacho remetendo ao juíz leigo
19/09/2025 - Despacho - "Façam-se os autos conclusos para julgamento." ; e Conclusos
27/08/2025 - Conclusos
27/08/2025 - Certidão - mídia devolvida
21/08/2025 - Manifestação da Souza Cruz - áudio do autor
13/08/2025 - Despacho - Souza Cruz intimada a se manifestar sobre o conteúdo do pendrive
29/07/2025 - Certidão - comprovante de sincronização de audiência
29/07/2025 - Petição de juntada
30/06/2025 - Despacho - sincronizar pendrive para que Souza Cruz se manifeste sobre
29/05/2025 - Conclusos
29/05/2025 - Ata de Audiência
27/05/2025 - Contestação
10/04/2025 - AR positivo SC - SC citada
24/03/2025 - Juntado mandado de intimação ao autor
21/03/2025 - Expedida citação a Souza Cruz para comparecer à audiência de conciliação designada para o dia 27/05/2025 às 13h30min
11/03/2025 - Petição de manifestação do autor
27/02/2025 - expedida intimação ao Autor
26/02/2025 - Despacho de Mero Expediente - Não Concedida a Antecipação de tutela.
25/02/2025 - Expedida Citação para SC; Conclusos para decisão.
24/02/2025 - Audiência de conciliação designada para 27/05/2025 13:30 Unidade Jurisdicional Única - 1º JD da Comarca de Betim. Link disponibilizado nos autos.
24/02/2025 - Distribuido15'),
    ('5004621-85.2025.8.13.0439', '2026-08-07'::date, '07/08/2026 - Decisão - Extinção do cumprimento de sentença 
02/07/2026 - Conclusos
26/06/2026 - Pet autor - Requer prosseguimento do cumprimento de sentença
18/06/2026 - Classe alterada para cumprimento de sentença 
16/06/2026 - Pet sc - impugnação ao cumprimento de sentença 
21/05/2026 - Intimação publicada no Djen
21/05/2026 - "Ao réu para no prazo de quinze dias efetuar o pagamento voluntário da condenação ou impugnar a execução"
21/05/2026 - Trânsito em julgado 
08/05/2026 - Pet autor - Solicita o cumprimento da sentença 
17/04/2026 - Pet SC - Desabilitação Beatriz
31/03/2026 - Intimação sobre sentença publicada no DJEN 
31/03/2026 - Sentença  - pedidos autorais parcialmente procedentes
04/02/2026 - Concluso
04/02/2026 - ATA AC - Sem conciliação 
30/01/2026 - Pet SC
13/11/2025 - Juntada de AR positivo Global  
16/10/2025 - Publicação de intimação
13/10/2025 - Certidão informando a AC em 02/02/2026, às 13:30. 
22/09/2025 - Manifestação Autor indicando o endereço da Global
17/09/2025 - Despacho - intimando o autor a apresentar o endereço correto da Global
17/04/2026 - Pet SC - Desabilitação Beatriz
23/07/2025 - Conclusos
22/07/2025 - Manifestação Souza Cruz sobre o vídeo
21/07/2025 - Manifestação Global sobre o vídeo
09/07/2025 - Manifestação autora
04/07/2025 - Expedida intimação para as partes se manifestarem
30/06/2025 -Petição autora - link com vídeo
30/06/2025 - Decisão - Cancelo a audiência
30/06/2025 - Petição Souza Cruz
24/06/2025 - Manifestação - autora impugnou contestação e requereu o cancelamento da AIJ
23/06/2025 - Impugnação do autor a contestação
18/06/2025 - Despacho - indeferido pedido de audiência virtual
17/06/2025 - Audiência de instrução e julgamento designada para 01/07/2025
17/06/2025 - Ata de audiência 
16/06/2025 - Contestação Souza Cruz
12/06/2025 - Contestação Global
11/06/2025 - AR Global
14/05/2025 - Juntada AR de SC
12/05/2025 - Manifestação de ciência da parte autora
25/04/2025 - Expedida citação a SC
24/04/2025 - Decisão - não concedida a antecipação de tutela
23/04/2025 - Designada audiência de conciliação para o dia 16/06/2025, às 14h, presencial; Certidão de Triagem.
23/04/2025 - Distribuição'),
    ('6095855-67.2025.4.06.3800', '2026-07-02'::date, '02/07/2026 - Remetidos os autos para TRF6
05/06/2026 - Mandado cumprido 
01/06/2006 - Expedido o mandado 
28/05/2026 - Petição 
04/05/2026 - Certidão - cancelamento de suspensão de prazo
19/04/2026 - Confimada intimação 
13/04/2026 - Intimação sobre sentença publicada no DJEN
09/04/2026 - Sentença - Concedida a segurança
03/11/2025 - Conclusão 
03/11/2025 - Parecer MP - "limita-se o Ministério Público Federal a se manifestar pela continuidade do procedimento"
17/10/2025 - Petição. 
09/10/2025 - Conclusão 
07/10/2025 - Petição autora. 
05/09/2025 - Redistribuido 
16/07/2025 - Decisão - Liminar concedida
05/06/2025 - Petição Souza Cruz comprovando recolhimento das custas
29/05/2025 - Substabelecimento com reserva
29/05/2025 - Conclusos
29/05/2025 - Distribuição'),
    ('5007006-06.2025.8.13.0439', '2026-02-24'::date, '24/02/2026 - Arquivamento 
24/02/2026 - Trânsito em julgado 
27/01/2026 - Pet autor  - ciência de alvará 
27/01/2026 - Alvará 
23/01/2026 - Sentença - Julga extinta a fase de cumprimento de sentença 
20/01/2026 - Pet autora requerendo a transferência de valores 
20/12/2025  -Intimação disponibilizado no DJEN 
18/12/2025 - Expedida intimação 
17/12/2025 - Pet SC informando o pagamento 
15/12/2025 - Juntada de pet autor apresentando o cumprimento de sentença e planilha de cálculo atualizado
10/12/2025 - Expedida intimação para ciência do trânsito em julgado 
10/12/2025 - Certidão de trânsito em julgado 
19/11/2025 - Ciência autora 
18/11/2025 - Homologação de decisão por juiz leigo
18/11/2025 - Decisão de juiz leigo - Pedido julgado parcialmente procedente
10/09/2025 - Certidão - link do áudio da audiência
19/08/2025 - Conclusos
19/08/2025 - Ata da audiência
07/08/2025 - Audiência de Instrução e Jugamento designada para 19/08/2025, às 14h
06/08/2025 - AR positivo Souza Cruz
05/08/2025 - Ata de audiência
01/08/2025 - Contestação 
01/08/2025 - Remetidos os autos ao CEJUSC
26/06/2025 - Manifestação autora - ciente
25/06/2025 -  Expedida citação
25/06/2025 - Certidão - AC designada para o dia 04/08, às 15h30.
25/06/2025 - Intimação
25/06/2025 - Certidão - baixa da negativação
12/06/2025 - Despacho - SC deve baixar a negativação
10/06/2025 - Audiência de Conciliação designada para 04/08/2025, às 15h30
10/06/2025 - Distribuição'),
    ('5007047-70.2025.8.13.0439', '2026-05-20'::date, '20/05/2026 - Arquivamento 
14/05/2026 - Pet autor - Ciência de cumprimento 
17/04/2026 - Pet SC - Desabilitação Beatriz
08/04/2026 - Intimação publicada no DJEN
08/04/2026 - Despacho - Detetrmina a intimação das partes.
24/10/2025 - Autos remetidos a turma recursal
22/10/2025 - Contrarrazões
09/10/2025 - Publicação DJ. 
08/10/2025 - Recurso inominado SC 
26/09/2025 - AR positivo Souza Cruz 
25/09 /2025 - Ata de audiência com sentença (pedido julgado parcialmente procedente)
25/09/2025  - petição Souza Cruz - Contestação,
09/09/2025 - AR positivo Souza Cruz
29/08/2025 - Despacho - deferido o pedido de aditamento da inicial
21/08/2025 - Petição autora - novo endereço
15/08/2025 - AR negativo Souza Cruz
04/08/2025 - Petição autora oferecendo novo endereço
31/07/2025 - Expedida citação para Souza Cruz
31/07/2025 - AC designada para 25/09/2025, às 14h30
30/07/2025 - AC cancelada
30/07/2025 - AR negativo Souza Cruz
09/07/2025 - Expedida intimação para Souza Cruz
07/07/2025 - Petição autora com novo endereço
04/07/2025 - Expedida intimação para autora apresentar novo endereço da SC
04/07/2025 - AR negativo Souza Cruz
12/06/2025 - Publicada intimação em 16/06/2025, acerca da audiência.
12/06/2025 - Foi expedida intimação e citação da SC
12/06/2025 - Decisão - não concedida a tutela
11/06/2025 - AC designada para 04/08, às 14h30
11/06/2025 - Distribuição'),
    ('5007047-70.2025.8.13.0439', '2026-04-08'::date, '08/04/2026 - Trânsito e arquivamento 
10/03/2026 - Intimação publicada no DJEN
09/03/2026 - Acórdão disponibilizado no DJEN 
09/03/2026 - Acórdão - Recurso conhecido e provido em parte. 
09/02/2026 - Intimação sobre pauta publicada 
09/02/2026 - Processo incluso na pauta do dia 27/02/2026, às 12h. 
24/10/2025 - Conclusos para o gabinete'),
    ('5006892-28.2025.8.13.0452', '2026-03-12'::date, '12/03/2026 - Arquivamento 
12/03/2026 - Certidão de baixa 
26/01/2025 - Pet autor - Informa o recebimento do alvará 
19/12/2025 - Certidão informando a expedição do alvará judicial 
17/12/2025 - Certidão da contadoria informando que não há custas finais
16/12/2025 - Expedida intimação sobre sentença 
01/12/2025 - Pet autor - Requer expedição do alvará judicial.
25/11/2025 - Pet SC - Comprovante de depósito
20/11/2025 - Trânsito em julgado 
18/10/2025 - Intimação disponibilizada no DJ sobre a sentença 
15/10/2025 - Sentença julgando procedente os pedidos autorais 
03/10/2025 - Conclusão 
02/10/2025 - Pet SC informando que não tem provas a produzir 
24/09/2025 - Disponibilização em DJ a comunicação eletrônica.
23/09/2025 - Impugnação à Contestação
02/09/2025 - Autora intimada.
29/08/2025 - Contestação Souza Cruz
21/08/2025 - Petição Habilitação e Cumprimento da Liminar
20/08/2025 - Ofício enviado ao SPC
07/08/2025 - Expedida citação para a Souza Cruz
07/08/2025 - Expedida intimação sobre a decisão
07/08/2025 - Certidão - Decisão enviada ao SERASA
05/08/2025 - Decisão - Tutela de urgência deferida, SC deve baixar negativação
29/07/2025 - Conclusos
29/07/2025 - Petição autor 
25/07/2025 - Expedida intimação ao autor
25/07/2025 - Remetidos os autos para órgão julgador Núcleo 4.0
25/07/2025 - Intimação do despacho
24/07/2025 - Despacho - autos devolvidos a secretaria
21/07/2025 - Conclusos
21/07/2025 - Certidão de Triagem
18/07/2025 - Petição comprovando custas iniciais autora
17/07/2025 - Distribuição'),
    ('5181741-02.2025.8.13.0024', '2025-12-16'::date, '16/12/2025 - Arquivado definitivamente 
16/12/2025 - Certidão de trânsito em julgado 
24/11/2025 - Decisão disponibilizada no DJEN 
24/11/2025 - Decisão - Embargos não acolhidos
24/11/2025 - Petição Autor - Embargos de declaração 
12/11/2025 - Intimação sobre sentença disponibilizada no DJEN
11/11/2025 - Sentença - Pedido julgado improcedente
07/11/2025 - Juntada de ATA da audiência - Não obteve acordo. 
07/11/2025 - Petição autora - Impugnação à contestação apresentada
07/11/2025 - Juntada de contestação SC
10/09/2025 - Manifestação autora ciente.
08/09/2025 - Ofício CDL
03/09/2025 - Expedida citação para a Souza Cruz
03/09/2025 - Audiência designada para 07/11/2025, às 11h30, online
29/08/2025 - SERASA excluiu a negativação
28/08/2025 - Expedido ofício ao SERASA
28/08/2025 - EXpedida intimação para a Souza Cruz
28/08/2025 - Decisão - deferida a liminar, SC deve baixar a negativação
27/08/2025 - Petição autor juntando os documentos solicitados. 
21/08/2025 - Autor intimado
20/08/2025 - Decisão - redistribuição
20/08/2025 - AC cancelada
19/08/2025 - Audiência de Conciliação designada para 27/11/2025, às 13h30
19/08/2025 - Distribuição'),
    ('5003361-18.2025.8.13.0327', '2026-07-21'::date, '21/07/2026 - Expedida certidão de baixa e arquivado definitivamente
08/07/2026 - Certidão de trânsito em julgado
17/06/2026 - Intimação sobre sentença puiblicada no Djen 
17/06/2026 - Pedidos autorais julgados procedentes 
18/03/2026 - Conclusos
17/03/2026 - AIJ realizada - sem acordo 
10/03/2026 - Contestação e carta de preposição SC 
06/10/2025 - Petição SC
29/29/2025 - Manifestação autora ciente. 
25/09/2025 - AIJ designada para 10/03/2026, às 16 horas e Publicada intimação para Souza Cruz.  
18/09/2025 - Concedida a Medida Liminar
17/09/2025 - Distribuição'),
    ('5033549-36.2025.8.13.0701', '2026-01-12'::date, '12/01/2026 - Conclusos 
29/12/2025 - Juntada de petição 
18/12/2025 - Pet autora solictando o julgamento antecipado da lide 
16/12/2025 - Pet de réplica autora 
16/12/2025 - Juntada de contestação SC
27/11/2025 - Intimação para parte autora publicada 
26/11/2025 - Contestação SC
14/11/2025 - Constestação Global 
30/10/2025 - ED autoral não acolhidos 
28/10/2025 - Em  conclusão'),
    ('1107097-59.2025.8.13.0024', '2026-07-23'::date, '23/07/2026 - Expedição de carta pelo correio
26/5/2026 - Transito em julgado
06/05/2 -  - Extinção do processo
06/05/2026 - Conclusos 
17/04/2026 - Conclusos
14/04/2026 - Juntada - Justificativa de ausência da parte autora
13/04/2026 - AC realizada
13/04/2026 - Contestação SC
26/01/2026 - Confirmada citação 
20/01/2026 - Expedida citação'),
    ('1000126-50.2026.8.13.0239', '2026-06-09'::date, '09/06/2026 - Intimação publicada no DJEN
03/06/2026 - Ato ordinatório - Fica a parte Ré devidamente intimada para especificar as provas que pretende produzir
15/05/2026 - Certidão 
06/04/2026 - Contestação SC
19/03/2026 - Intimação para SC publicada no DJEN
17/03/2026 - Remetidos os autos para a vara de origem
17/03/2026 - Intimação disponibilizada no DJEN para SC
17/03/2026 - AC realizada - Sem acordo
10/02/2026 - Intimação para a parte autora sobre a AC confirmada 
03/02/2026 - Confirmada citação SC
28/01/2026 - AC designada para 16/03/2026, às 14h55'),
    ('1000938-36.2026.8.13.0290', '2026-07-01'::date, '01/07/2026 - Pet SC
23/06/2026 - Intimação publicada no DJEN
22/06/2026 - Despacho - intime-se a parte ré para, no prazo de 5 dias, apresentar todas as faturas referentes às quatro parcelas mencionadas, especialmente aquela que alega não ter sido quitada.
19/06/2026 - AC realizada 
16/06/2026 - Contestação 
02/06/2026 - Substabelecimento autor 
10/04/2026 - Intimação para a parte autora expedida e publicada no DJEN
07/04/2026 - Decisão - Não concedida a antecipação 
31/03/2026 - Pet autor - reconsideração da t. de urgência 
26/03/2026 - Expedida citação
26/03/2026 - Certidão - Citação SC 
26/03/2026 - Certidão - audiência de conciliação  designada para o dia 16/06/2026 às 14:30 horas
25/03/2026 - Não concedida a tutela 
19/03/2026 - Conclusos
17/03/2026 - Pet. Autor emendando à inicial 
06/03/2026 - Despacho determina a emenda à inicial
02/03/2026 - Conclusão 
28/02/2026 - Emenda à inicial 
20/02/2026 - Decisão - Cancelamento da AC e determina a emenda à inicial.'),
    ('5002675-25.2026.8.13.0704', '2026-07-08'::date, '08/07/2026 - Expedida citação por AR "... da data da audiência correrá o prazo de 15 (quinze) dias para apresentar contestação. ... "
26/06/2026 - ac designada para 16/09, às 17h
24/04/2026 - Despacho -  Determina o envio dos autos ao CEJUSC para designação de audiência de conciliação; requer a citação para a sessão de conciliação e estabelece que o prazo para contestação é de 15 dias, contados da data da audiência.
07/04/2026 - Pet autor - Juntada dos atos constitutivos
19/03/2026 - Intimação para o autor
17/03/2026 - Manifestação autor - pagamento de custas 
13/03/2026 - Distribuído por sorteio'),
    ('1044682-06.2026.8.13.0024', '2026-07-22'::date, '22/07/2026  - Petição autor 
25/06/2026 - Processo extinto 
17/06/2026 - Pet autor - Desistência 
31/05/2026 - JG não concedida a parte 
23/03/2026 - Ato ordinatório - Determina emenda à inicial para comprovar hipo
18/03/2026 - Distribuição'),
    ('1044670-89.2026.8.13.0024', '2026-07-27'::date, '27/07/2026 - JG não concedida a parte 
23/07/2026 - Pet autor apresentou documentos para hipo 
20/07/2026 - Ato ordinatório ao autor para comprovar os documentos requeridos
14/07/2026 - Petição autor
18/06/2026 - Despacho - Determina a intimação da parte autora para esclarecimentos sobre IR 
17/06/2026 - Pet autor - Esclarece sobre o 2° processo 
21/05/2026 -  Ato ordiatório -   determina a intimação da parte autora 
18/05/2026 - Remetidos os autos para o distribuidor
18/03/2026 - Distribuído por sorteio'),
    ('5014959-92.2025.8.13.0480', '2026-04-06'::date, '06/04/2026 - Pet autor
05/03/2026 - Expedida carta precatória 
15/12/2026 - Despacho - Deferimento da denunciação a lide 
07/11/2025 - AC realizada 
04/11/2026 - Manifestação - O Elmo promove a denunciação da lide em face da Souza Cruz.
14/10/2025 - Contestação ré elmo
14/08/2026 - Distribuído'),
    ('5007675-12.2026.8.13.0702', '2026-07-27'::date, '27/07/2026 - Pet corréu - Juntada de endereço da SC
16/07/2026 - Publicada intimação "Vistas a ré(denunciante à lide), no prazo de 5(cinco) dias, sobre certidão negativa oficial de justiça relativo ao ID 107104867890, para requerer o que de direito. ..."
08/07/2026 - Juntada de mandado sem cumprimento
01/06/2026 - Pet autor - distribuição da carta precatória 
17/05/2026 - Pet autor - Informa o pagamento das custas e requer a intimação para a parte autora 
06/04/2026 - Pagamento de custas pela parte autora 
31/03/2026 - Petição inicial'),
    ('0004411-95.2018.8.16.0079', '2026-07-29'::date, '29/07/2026 - Declarada extinta a falência
20/07/2026- Conclusos
0/307/2026 - Substabelecimento 
20/05/2026 - Autos recebidos
20/05/2026 - Redestribuição por competencia
12/05/2026 - Autos remetidos a redistribuição 
12/05/2026 - Ato ordinatório informa a decisão de transferir todos os processos de matéria empresarial para vara reservada.
20/04/2026 - Juntada de substabelecimento 
30/03/2026 - Juntada de cumprimento de diligencia
09/03/2026 - Petição perito 
02/03/2026 - Confirmada intimação autor
 perito
27/02/2026 - Expedição de carta de arrematação 
/8/02/2026 - expedida intimação perito 
18/02/2026 - Ato ordinatório - " intimo o Sr. leiloeiro para que informe se as
custas para expedição das carta de arrematação já foram recolhidas"
09/02/2026 - Expedida intimação SC 
09/02/2026 - Decisão - Homologação das arrematações
31/12/2025 - Pet de habilitação Caixa
19/12/2025 - Confirmada intimação do autor 
08/12/2025 - Intimação para para autor
7/12/2025 - Pet adm judicial 
7/12/2025 - Confirmada intimação administrador judicial 
27/11/2025 - Pet adm judicial (réu) -Requer que todas as intimações sejam feitas em nome do subscritor 
2025 - Juntada de cumprimento
  /1410/2025 - Juntada de desabilitação autora
14/10/2025 - Confirmada intimação eletrônica 
90/09/2025 - Confirmada a intimação eletrônica
18/09/2025 - Intimação para o Administrador Judicial
02/09/2025 - Confirmada a comunicação eletrônica
29/08/2025 - Petição de habilitação BRF
22/08/2025 - Certidão - processo parado há mais de 30 dias
12/07/2025 - Petição adm de empresa 
12/07/2025 - Confirmada a intimação
01/07/2025 - Expedida intimação
01/07/2025 - Certidão - conta de custas
01/07/2025 - Manifestação parte
21/06/2025 - Confirmada a intimação eletrônica do administrador judicial
18/06/2025 - Ato ordinatório - habilitação de parte
18/06/2025 - Petição de habilitação
10/06/2025 - Expedida intimação administrador 
judicial
03/06/2025 - Confirmada a intimação do autor e 
do administrador judicial
23/05/2025 - Expedida intimação ao autor e administrador judicial
22/05/2025 - Despacho - publique-se edital e ao Administrador Judicial
21/05/2025 - Juntada de petição de procuração
12/05/2025 - Desapensado do processo 0011627-48.2018.8.16.0131
20/02/2025 - Conclusos para decisão
14/02/2025 - Certidão - termo de registro de penhora + Recebidos os autos
07/02/2025 -Expedição de comunicação de ação vinculada
23/01/2025 - Juntada de manifestação pelo MP.
14/01/2025 - Expedição de termo de penhora da parte PASSARINI COMERCIO DE ALIMENTOS LTDA.
18/12/2024 - Juntada de comunicação de ação vinculada.
09/10/2024 - Juntada do Cumprimento
9/2024 - Despacho "Cumpra-se a decisão de evento 2630"
09/09/2024 - Petição do autor
14/08/2024 - Juntada de Custas
07/08/2024 - Petição do autor
22/07/2024 - Decisão "ACOLHIDA A EXCEÇÃO DE INCOMPETÊNCIA"
2/07/2024 - Concluso.
29/05/2024 - Despacho "1. Manifeste-se a Administradora sobre o pedido de habilitação inserto ao evento 2624.1."
27/03/2024 - Concluso
14/02/2024 - JUNTADA DE COMUNICAÇÃO DE AÇÃO VINCULADAR - Recebida Comunicação de Ação Vinculada - Tipo: Informação - Origem: Vara Cível de Dois Vizinhos - Dois Vizinhos. Processo: 0003258-27.2018.8.16.0079
09/02/2024 - JUNTADA DE OFÍCIO DE OUTROS ÓRGÃOS
07/02/2024 - APENSADO AO PROCESSO 0001182-58.2024.8.16.0131
05/02/2024 - APENSADO AO PROCESSO 0001099-42.2024.8.16.0131
26/01/2024 - Juntada de pet de cumprimento de intimação
10/01/2024 - Juntada de pet de cumprimento de intimação
04/01/2023 - Juntada de pet de cumprimento de intimação
27/12/2023 - JUNTADA DE PETIÇÃO DE REQUERIMENTO DE DESISTÊNCIA
24/11/2023 - Decisão: "Defiro o pedido retro. Intimem-se os credores acerca da manifestação do Administrador Judicial constante do evento 2565.1, para que, querendo, se manifestem."
08/11/2023 - JUNTADA DE PETIÇÃO DE MANIFESTAÇÃO DA PARTE
28/10/2023 - JUNTADA DE PENHORA REALIZADA
26/10/2023 - Juntada de subs; CONCLUSOS PARA DECISÃO
18/10/2023 - Juntada de pet. do autor
09/10/2023  - EXPEDIÇÃO DE COMUNICAÇÃO DE AÇÃO VINCULADA
02/10/2023 - JUNTADA DE COMUNICAÇÃO DE AÇÃO VINCULADA - Recebida Comunicação de Ação Vinculada - Tipo: Solicitação - Origem: Vara da Fazenda Pública de Dois Vizinhos - Dois Vizinhos. Processo: 0000665-83.2022.8.16.0079
05/09/2023 - "Intime-se o Administrador Judicial para que se manifeste sobre o pedido de ev. 2.537.1, conforme requerido."
25/07/2023 - Conclusos
20/07/2023 - JUNTADA DE PARECER; Recebido os autos do MINISTÉRIO PÚBLICO
06/06/2023 - JUNTADA DE PENHORA REALIZADA
18/07/2023 - AUTOS ENTREGUES EM CARGA PARA MINISTÉRIO PÚBLICO
05/06/2023 - APENSADO AO PROCESSO 0005200-59.2023.8.16.0131; 0005201-44.2023.8.16.0131 e 0005202-29.2023.8.16.0131
01/06/2023 - JUNTADA DE PETIÇÃO DE PROCESSO INCIDENTAL (aguardando distribuição); Juntada de manifestação das partes
12/05/2023 - JUNTADA DE PETIÇÃO DE OUTROS
09/05/2023 - JUNTADA DE PETIÇÃO DE MANIFESTAÇÃO DA PARTE
02/05/2023 - Atos cumpridos pelas partes
28/04/2023 - Decisão: "Habilite-se os procuradores da Nestlé S.A. e Café Três Corações S/A."
26/04/2023 - CONCLUSOS PARA DECISÃO
24/04/2023 - JUNTADA DE PETIÇÃO DE REQUERIMENTO DE HABILITAÇÃO
18/04/2023 - JUNTADA DE DECISÃO MONOCRÁTICA - AGRAVO DE INSTRUMENTO; expedição de intimações
12/04/2023 - RECEBIDOS OS AUTOS da instância superior. 
16/03/2023 - Pet de manifestação (visualização restrita)
14/03/2023 - Habilitação de parte - NESTLE
24/02/2023 - OUTRAS DECISÕES
05/01/23 - EXPEDIÇÃO DE OFÍCIO Referente ao evento (seq. 2342) 
20/12/22 - Juntada de petição do perito
01/12/22 -  Atos cumpridos pelas partes.
23/11/22 - CONCLUSOS PARA DECISÃO
21/12/22 - Atos cumpridos pelas partes
18/11/22 - UNTADA DE PETIÇÃO DE REQUERIMENTO DE HABILITAÇÃO
16/11/22 - JUNTADA DE OFÍCIO DE OUTROS ÓRGÃOS
14/11/22 - JUNTADA DE CERTIDÃO; EXPEDIÇÃO DE INTIMAÇÃO; ATOS CUMPRIDOS PELA PARTE OU INTERESSADO,
09/11/22 - JUNTADA DE PETIÇÃO DE REQUERIMENTO DE HABILITAÇÃO; MOVIMENTAÇÃO SEM VISIBILIDADE EXTERNA
06/10/22 - Juntada de petição - perito
03/10/22 - Juntada de petição de certidão
27/09/22 - CONCLUSOS PARA DECISÃO; JUNTADA DE PETIÇÃO DE CERTIDÃO
26/09/22 - JUNTADA DE MANIFESTAÇÃO DO PERITO
19/09/22 - Expedição de certidão de publicação; Juntada de petição de certidão
16/09/22 - JUNTADA DE PETIÇÃO DE CUMPRIMENTO DE INTIMAÇÃO
14/09/22 - JUNTADA DE OFÍCIO DE OUTROS ÓRGÃOS
13/09/22 - JUNTADA DE PETIÇÃO
02/09/22 - JUNTADA DE RESPOSTA DE OFÍCIO; EXPEDIÇÃO DE EDITAL DE HASTA PÚBLICA
23/08/22 - JUNTADA DE PETIÇÃO DE REQUERIMENTO DE HABILITAÇÃO - BCW
18/08/22 - JUNTADA DE MANIFESTAÇÃO DO PERITO
15/08/22 - ATOS ORDINATÓRIOS PRATICADOS; JUNTADA DE INTIMAÇÃO - CUSTAS PROCESSUAIS; JUNTADA DE PETIÇÃO DE MANIFESTAÇÃO DA PARTE
12/08/22 - CONCLUSOS PARA DECISÃO; JUNTADA DE PETIÇÃO DE MANIFESTAÇÃO DA PARTE.
11/08/22 - JUNTADA DE PETIÇÃO DE PROCURAÇÃO; JUNTADA DE MANIFESTAÇÃO
10/08/22 - JUNTADA DE MANIFESTAÇÃO DO PERITO; AUTOS ENTREGUES EM CARGA PARA MINISTÉRIO PÚBLICO
03/08/22 - CONCLUSOS PARA DECISÃO; DEFERIDO O PEDIDO
02/08/22 - JUNTADA DE MANIFESTAÇÃO; RECEBIDOS OS AUTOS
01/08/22 - JUNTADA DE CERTIDÃO
28/07/22 - JUNTADA DE PETIÇÃO DE OUTROS
27/07/22 - ATOS ORDINATÓRIOS PRATICADOS
26/07/22 - JUNTADA DE PETIÇÃO DE REQUERIMENTO DE HABILITAÇÃO
22/07/22 - JUNTADA DE MANIFESTAÇÃO DO PERITO
21/07/22 - AUTOS ENTREGUES EM CARGA PARA MINISTÉRIO PÚBLICO
21/07/22 - CONCLUSOS PARA DECISÃO
20/07/22 - JUNTADA DE CERTIDÃO
14/07/22 - JUNTADA DE RESPOSTA DE OFÍCIO
13/07/22 - JUNTADA DE PETIÇÃO DE CERTIDÃO; JUNTADA DE MANIFESTAÇÃO DO PERITO
08/07/22 - JUNTADA DE MANIFESTAÇÃO DO PERITO
07/07/22 - JUNTADA DE MANIFESTAÇÃO DO PERITO
06/07/22 - DEFERIDO O PEDIDO
05/07/22 - JUNTADA DE PETIÇÃO DE CUMPRIMENTO DE INTIMAÇÃO; JUNTADA DE TOMADA DE TERMO; CONCLUSOS PARA DECISÃO - PEDIDO DE URGÊNCIA
04/07/22 - JUNTADA DE INFORMAÇÃO
28/06/22 - JUNTADA DE INTIMAÇÃO CUMPRIDA
27/06/22 - JUNTADA DE COMPROVANTE; DEFERIDO O PEDIDO
24/06/22 - JUNTADA DE MANIFESTAÇÃO DO PERITO; MANDADO DEVOLVIDO; JUNTADA DE CERTIDÃO
22/06/22 - EXPEDIÇÃO DE CERTIDÃO PUBLICAÇÃO; EXPEDIÇÃO DE MANDADO; ATO ORDINATÓRIO PRATICADO
20/06/22 - EXPEDIÇÃO DE INTIMAÇÃO; EXPEDIÇÃO DE EDITAL DE HASTA PÚBLICA; JUNTADA DE CERTIDÃO;
15/06/22 - CONCLUSOS PARA DECISÃO; PROFERIDO DESPACHO DE MERO EXPEDIENTE; EXPEDIÇÃO DE INTIMAÇÃO; JUNTADA DE RESPOSTA DE OFÍCIO
14/06/22 - JUNTADA DE CERTIDÃO DE DECURSO DE PRAZO; AUTOS ENTREGUES EM CARGA PARA MINISTÉRIO PÚBLICO; JUNTADA DE MANIFESTAÇÃO; RECEBIDOS OS AUTOS MP
10/06/22 - Juntada de manifestação do perito
07/06/22 - JUNTADA DE INFORMAÇÃO; Expedição de intimação
03/06/22 - JUNTADA DE OFÍCIO DE OUTROS ÓRGÃOS; JUNTADA DE RESPOSTA DE OFÍCIO
31/05/22 - JUNTADA DE CERTIDÃO; EXPEDIÇÃO DE TERMO DE COMPROMISSO
26/05/22 - JUNTADA DE PETIÇÃO DE MANIFESTAÇÃO DA PARTE
25/05/22 - JUNTADA DE CERTIDÃO.
24/05/22 - JUNTADA DE MANIFESTAÇÃO DO PERITO
23/05/22 - EXPEDIÇÃO DE TERMO DE COMPROMISSO; JUNTADA DE INTIMAÇÃO ONLINE; EXPEDIÇÃO DE OFÍCIO; JUNTADA DE CERTIDÃO; REMETIDOS OS AUTOS PARA DISTRIBUIDOR; JUNTADA DE INFORMAÇÃO; RECEBIDOS OS AUTOS; JUNTADA DE CUMPRIMENTO DE DILIGÊNCIA
18/05/22 - JUNTADA DE MANIFESTAÇÃO DO PERITO
17/05/22 - JUNTADA DE PETIÇÃO DE REQUERIMENTO DE DILIGÊNCIA
16/05/22 - Ato cumprido pelas partes; Juntada de petição de substabelecimento
12/05/22 - ATO ORDINATÓRIO PRATICADO; EXPEDIÇÃO DE INTIMAÇÃO
11/05/22 - JUNTADA DE MANIFESTAÇÃO DO PERITO
06/05/22 - OUTRAS DECISÕES; Expedição de intimação às partes; AUTOS ENTREGUES EM CARGA PARA MINISTÉRIO PÚBLICO; Autos recebidos; Ato cumprido pelas partes
02/05/22 - Juntada de Substabelecimento; Ato cumprido pelas partes; Juntada de Petição de Cumprimento de Intimação
29/04/22 - Juntada de Informação
28/04/2 - JUNTADA DE PETIÇÃO DE CUMPRIMENTO DE INTIMAÇÃO
25/04/22 - CONCLUSOS PARA DECISÃO; ATO CUMPRIDO PELAS PARTES; JUNTADA DE MANIFESTAÇÃO DO PERITO
19/04/22 - JUNTADA DE PETIÇÃO DE CUMPRIMENTO DE INTIMAÇÃO
18/04/22- JUNTADA DE MANIFESTAÇÃO; RECEBIDOS OS AUTOS
14/04/22 - EXPEDIÇÃO DE INTIMAÇÃO; AUTOS ENTREGUES EM CARGA PARA MINISTÉRIO PÚBLICO
13/04/22 - Juntada de manifestação do perito
12/04/22 - Expedição de intimação; Confirmada a intimação
11/04/22 - Juntada de Petição de cumprimento de intimação
07/04/22 - Ato cumprido pela parte ou interessado
06/04/22 - Ato ordinatório praticado; juntada de intimação on-line; Expedida intimação e confirmada.
01/04/22 - JUNTADA DE PETIÇÃO DE CUMPRIMENTO DE INTIMAÇÃO; Ato cumprido pela parte
31/03/22 - Intimação confirmada; Juntada de petição de requerimento de diligência
29/03/22 - AUTOS ENTREGUES EM CARGA PARA MINISTÉRIO PÚBLICO; JUNTADA DE MANIFESTAÇÃO; Autos recebidos; Concluso para decisão; Pedido deferido; Intimação expedida; 
28/03/22 - JUNTADA DE MANIFESTAÇÃO DO PERITO
23/03/22 - JUNTADA DE PETIÇÃO DE MANIFESTAÇÃO DA PARTE
10/03/22 - PETIÇÃO DE REQUERIMENTO DE DILIGÊNCIA; EXPEDIÇÃO DE INTIMAÇÃO
09/03/22 - PETIÇÃO DE CUMPRIMENTO DE INTIMAÇÃO
23/02/22 - despacho sem possibilidade de visualização; intimação ao autor
17/02/22 - decretada a falência; intimação às partes; autos entregues ao MP; EVOLUÍDA A CLASSE DE RECUPERAÇÃO JUDICIAL PARA FALÊNCIA DE EMPRESÁRIOS, SOCIEDADES EMPRESÁRIAIS, MICROEMPRESAS E EMPRESAS DE PEQUENO PORTE; 
10/02/22 - Manifestação do adv Cassio Lisandro; habilitação de rosa maria 
07/02/22 - juntada de petição do perito 
03/02/22 - habilitação do adv da parte FRANCIS JULIANO
02/02/22 - conclusos para sentença
14/12/21 - juntada de manifestação
10/12/21 - juntada de manifestação; despacho "Diante do pedido de convolacao em falencia, manifeste-se a parte autora, em dez
dias. No mesmo prazo, apresente as certidoes de regularidade fiscal, como
requerido"
09/11/21 - conclusos para sentença
08/11/21 - juntada de manifestação do MP
29/10/21 - Juntada de manifestação do perito                       22/10/21 - Confirmada a intimação eletrônica para perito; Ato praticado - habilitação provisório de perito; Ato - habilitação de parte                                                                                  20/10/21 - Juntada de petição de cumprimento de intimação 09/09/21- Petição de habilitação
24/08/21 - Intimação à SC
13/08/21 - Despacho; Conclusão
12/08/21 - Juntada de acórdão - AI
09/08/21 - Autos recebidos
27/07/21 - Intimação do autor; Manifestação do MP
23/07/21 - Manifestação do perito
06/07/21 - Autos recebidos; Manifestação do MP
05/07/21 - Carga ao MP
28/06/21 - Petição - Habilitação
28/05/21 - Assunto alterado para administração judicial
21/05/21 - Conclusão
20/05/21 - Manifestação da parte
18/05/21 - Requerimento de habilitação
31/03/21 - Petição do perito
17/03/21 - Confirmada intimação do perito sobre petição do autor juntando o balancete de novembro e dezembro de 2020                                                                                                                    01/03/21 - Petição do autor
03/02/21 - Manifestação da parte
18/01/21 - Cumprimento de intimação pelo autor
11/01/21 - Manifestação do perito
17/12/20 - Intimação confirmada
16/12/20 - Manifestação da parte
07/12/20 - Juntada de petição
30/11/20 - Despacho
05/11/20 - Decurso de prazo
04/11/20 - Conclusos para decisão
03/11/20 - Cumprimento de intimação
30/10/20 - Autos recebidos
27/10/20 - Decurso de prazo
26/10/20 - Renúncia de prazo
20/10/20 - Renúncia de prazo
18/10/20 - Leitura de intimações
14/10/20 - Despacho e ato ordinatório
14/10/20 - Habilitação e manifestação
13/10/20 - Requerimento de habilitação
08/10/20 - Renúncia de prazo e intimações
07/10/20 - Intimações
25/09/20 - Juntada de acórdão de AI
02/09/20 - Manifestação da parte
28/08/20 - Conclusos para decisão
27/08/20 - Manifestação do MP
26/08/20 - Manifestação do perito
19/08/20 Despacho e manifestação da parte
27/07/20 - Juntada de petição
18/07/20 - Decorrido prazo das partes
15/07/20 - Conclusos para decisão
14/07/20 - Renúncia de prazo
11/07/20 - Leitura de intimação
09/07/20 - Decorrido prazo das partes
02/07/20 - Leitura de intimação e renúncia de prazo
24/06/20 - Manifestação da parte
22/06/20 - Leitura de intimações
19/06/20 - Juntada de petição
12/06/20 - Autos recebidos pelo MP e intimações
10/06/20 - Juntada de petição
09/06/20 - Despacho
03/06/20 - Conclusos para decisão
27/05/20 - Juntada de manifestação
22/05/20 - Leitura de intimação
12/05/20 - Juntada de manifestação
05/05/20 - Juntada de manifestação da parte
27/04/20 - Juntada de petição
23/04/20 - Leitura de Intimação 
20/04/20 - Autos remetidos e recebidos pelo MP
18/04/20 - Manifestação do perito
06/03/20 - Juntada de petição
02/03/20 -Renúncia de prazo do autor
17/02/2020 - Recebidos os autos                              29/01/2020 - Decorrido prazo                                   11/02/2020 - Renúnica de prazo                               04/02/2020 - Decorrido prazo                                    29/01/2020 - Juntad de petição                                 23/01/2020 - Renúncia de prazo                                20/01/2020 - Juntada de petição de manifestação da parte 15/01/2020 - Vista ao MP                                          14/01/2020 - Juntada de cumprimento lido                  18/12/2019 - Juntada de petição                                13/12/2019 - Conclusos para decisão                        12/12/2019 - Juntada de petição de outros                  11/12/2019 - Expedição de ofício                               04/12/2019 - Recebidos os autos                               20/11/2019 - Expedição de intimação                        19/11/2019 - Despacho de mero expediente                  07/11/2019 - Juntada de petição                               31/10/2019 - Renúncias de prazo                              28/10/2019 - Juntada de informação                            24/10/2019 - Intimaçãoes                                         23/10/2019 - Juntada de certidão                              22/10/2019 - Juntada de manifestação                       18/10/2019 - Juntada de manifestção do perito           17/10/2019 - Decorrido prazo de Banco do Brasil        14/10/2019 - Intimações expedidas                                           11/10/2019 - Despacho (está restrito em razão de pendência de ciência)                                                                   10/10/2019 - Juntada de manifestação                      08/10/2019 - Juntada de certisão                               07/10/2019 - Concedido o pedido                                     

03/10/2019 - Renúncia de prazos                              02/10/2019 - Remetidos os autos ao MP e recebidos e juntada de manifestação                                                      30/09/2019 - Juntada de petição de manifestação       26/09/2019 - Renúncia de parzo de Brustolim & Bergamaschi LTDA                                                                    20/09/02019 - Parte habilitada                                   19/09/2019 - Juntada de petição de requerimento de habilitação 18/09/2019 - Leitura de intimações                           16/09/2019 - Despacho de mero expediente               12/09/2019 - EXPEDIÇÃO DE INTIMAÇÃO 
Para advogados/curador/defensor de PASSARINI DOIS VIZINHOS COMERCIO DE ALIMENTOS LTDA com prazo de 5 dias úteis - Referente ao evento (seq. 675)                                 11/09/2019 - PROFERIDO DESPACHO DE MERO EXPEDIENTE e JUNTADA DE CERTIDÃO. JUNTADA DE REQUERIMENTO 
Cumprimento de intimação - Referente ao evento HOMOLOGADA A TRANSAÇÃO (04/09/2019)  HELCIO KRONBERG 
 Perito
  671 11/09/2019 16:39:02 LEITURA DE INTIMAÇÃO REALIZADA 
(Pelo Perito HELCIO KRONBERG) em 11/09/2019 com prazo de 5 dias úteis *Referente ao evento (seq. 667) JUNTADA DE PETIÇÃO DE MANIFESTAÇÃO DA PARTE (10/09/2019) e ao evento de expedição seq. 668.  HELCIO KRONBERG 
 Perito
  670 11/09/2019 16:32:39 LEITURA DE INTIMAÇÃO REALIZADA 
(Pelo advogado/curador/defensor de CAIXA ECONÔMICA FEDERAL) em 11/09/2019 com prazo de 30 dias úteis *Referente ao evento (seq. 601) HOMOLOGADA A TRANSAÇÃO (04/09/2019) e ao evento de expedição seq. 634.  LUCAS SCHENATO 
 Procurador
  669 10/09/2019 14:48:56 RENÚNCIA DE PRAZO DE SUIAVI ALIMENTOS LTDA – EM RECUPERAÇÃO JUDICIAL 
Referente ao evento HOMOLOGADA A TRANSAÇÃO (04/09/2019)  VANIA DAL BOSCO PEGORARO 
 Advogado
  668 10/09/2019 09:55:44 EXPEDIÇÃO DE INTIMAÇÃO 
Para Perito HELCIO KRONBERG com prazo de 5 dias úteis - Referente ao evento JUNTADA DE PETIÇÃO DE MANIFESTAÇÃO DA PARTE (10/09/2019)  Diego Francismar Roberti 
 Técnico Judiciário
  667 10/09/2019 08:48:24 JUNTADA DE PETIÇÃO DE MANIFESTAÇÃO DA PARTE09/09/2019 - RENÚNCIA DE PRAZO DE ISPL - INDUSTRIA SULAMERICANA DE PRODUTOS DE LIMPEZA LTDA      06/09/2019 - RENÚNCIA DE PRAZO DE MACRO DISTRIBUIDORA LTDA                                                                        07/09/2019 - RENÚNCIA DE PRAZO DE D. A ORLANDINI & IRMÃO LTDA ME                                                                 06/09/2019 - RENÚNCIA DE PRAZO DE JULIANO PARISOTTO - ME 06/09/2019 - RENÚNCIA DE PRAZO DE PASSARINI COMÉRCIO DE ALIMENTOS LTDA                                                    04/09/2019 - JUNTADA DE PETIÇÃO DE MANIFESTAÇÃO DA PARTE                                                                    03/09/2019 - PROFERIDO DESPACHO DE MERO EXPEDIENTE 27/08/2019 - habilitação de parte em processo.'),
    ('0000774-96.2024.8.16.0089', '2026-07-28'::date, '28/07/2026 - Sentença - declara extinção e determina arquivamento
15/04/2026 - Manifestação autor 
11/03/2026 - Expedido alvará de levantamento 
20/02/2026 - Decisão - Expedição de alvará 
18/02/2026 - Conclusos 
18/02/2026 - Cancelada movimentação processual (evento 74 e 75)
13/01/2026 - Atos recebidos pelo contador
13/01/2026 - Juntada de certidão - Visualização 
11/12/2025 - Autos remetidos ao contador 
12/11/2025 - Pet autor - Requerimento de alvará de levantamento de valores
03/11/2025- Confirmada intimação de SC
23/10/2025 - Trânsito em julgado. 
21/08/2025 - Depósito da condenação
20/08/2025 - Juntada de petição de pagamento da condenação
25/07/2025 - Confirmada a intimação eletrônica
14/07/2025 - Expedida intimação a Souza Cruz
08/07/2025 - SENTENÇA - Julgada procedente em parte a ação
03/06/2025 - Alegações finais SC
23/05/2025 - Confirmada a intimação eletrônica de SC
12/05/2025 - Expedição de Intimação a SC
24/04/2025 - Alegações finais do autor
04/04/2025 - Confirmada a intimação eletrônica do autor
24/03/2025 - Expedida intimação p/ Supermercado
19/02/2025 - Decisão - JULGAMENTO ANTECIPADO DO MÉRITO. Partes serão intimadas para apresentar alegações finais no prazo sucessivo de 15 dias
19/02/2025 - Conclusos para decisão
23/01/2025 - Parte autora juntou petição informando que não há mais provas a serem produzidas.
18/12/2024 - Juntada de petição de manifestação da parte SC.
02/12/2024 - Confirmada Intimação Eletrônica Referente ao evento (seq. 41) JUNTADA DE ATO ORDINATÓRIO (21/11/2024) e ao evento de expedição seq. 42.
21/11/2024 - Juntada de petição de impugnação à contestação e ato ordinatório praticado.
21/10/2024 - Juntada de Réplica
12/09/2024 - Contestação da Souza Cruz
22/08/2024 - AC sem acordo
26/06/2024 - Despacho "Diante da manifestação da parte autora em evento 25.1, instruída com documentos, intime-se a parte requerida, por meio de seu defensor cadastrado nos autos, para que se manifeste quanto ao alegado
descumprimento da medida liminar, devendo proceder a imediata a baixa
das restrições lançadas cf. determinado ao mov. 14.1, juntando
comprovação nos autos, sob pena de multa diária já fixada, bem como
majoração do valor diário. Prazo: 05 (cinco) dias."
20/03/2024 - Pet da SC
09/03/2024 -Audiência agendada para: 22 de agosto de 2024 às 09:45, em CEJUSC Ibaiti - PRO - Cível, Modalidade: Semipresencial)'),
    ('0000648-94.2025.8.16.0191', '2026-08-07'::date, '07/08/2026 - Expedida intimação para SC 
21/07/2026 - Conclusos 
23/06/2026 - Despacho - Remessa ao juiz leigo para projeto de sentença
22/06/2026 - Conclusos 
14/05/2026 - ATA AC 
13/05/2026 - Contestação 
29/04/2026 - Juntada pet autor - Contatos para intimação
14/04/2026 - Juntada de link da AC
26/03/2026  - Pet autor - requer link da audiência 
16/03/2026 - Confirmada intimação SC
11/03/2026 - Confirmada citação SC 
06/03/2026 - Expedida citação SC
06/03/2026 - Expedida intimação sobre AC 
06/03/2026 - AC designada para 13/05/26, às 13h
05/03/2026 - Decisão - pautar a ac 
11/02/2026 - Conclusos
09/02/2026 - Juntada emenda à inicial 
08/12/2025 - Intimação autor 
05/12/2025 - Decisão - Determina emenda à inicial
04/12/2025 - Pet autor - Informa que o nome da parte autora não se encontra negativado 
03/12/2025 - Despacho - Determina que a parte autora se manifeste para informar se seu nome ainda consta no cadastro de inadimplência 
01/12/2025 - Conclusos para decisão 
19/11/2025 - Juntada do ácordão onde informam o conflito de competência
06/11/2025 - Retorno dos autos da área recursal 
27/03/2025 - Remetidos os autos para área recursal
16/03/2025 - Petição da parte autora dando ciência sobre a incompetência do juízo
11/03/2025 - Confirmada a intimação do autor
28/02/2025 - Suscitado conflito de competência; Intimação expedida ao autor
25/02/2025 - Decisão - Declarada incompetência, audiência de conciliação cancelada
25/02/2025 - Conclusos para decisão - Liminar
24/02/2025 - Juntada de petição de cumprimento de intimação
18/02/2025 - Confirmada a intimação da parte autora, para esclarecer o bairro em que mora, dado que área fora da competência do fórum.
07/02/2025 - Audiência de Conciliação designada - agendada para o dia 27/03 às 15h, virtual.
07/02/2025 - Distribuido'),
    ('0013106-73.2025.8.16.0182', '2025-11-06'::date, '06/11/2025 - Baixa definitiva
06/11/2025 - Transitado em julgado em 01/09/2025
23/07/2025 - Petição do autor
23/07/2025 - Confirmada a intimação
23/07/2025 - Expedida intimação ao autor
23/07/2025 - Acórdão - competência é da 1ª Vara Descentralizada de Pinheirinho
21/07/2025 - Declaração de Competencia em conflito
17/06/2025 - Confirmada a intimação do autor
06/06/2025 - Proferido despacho de mero expediente 
06/06/2025 - Expedida intimação para Valter
06/06/2025 - Incluído em pauta para sessão virtual de 14/07/2025, até 18/07/2025. 
02/06/2025 - Confirmada a intimação do autor
22/05/2025 - Conclusos para despacho do Relator
22/04/2025 - Confirmada a intimação do autor
11/04/2025 - Despacho - análise do Relator concluída
11/04/2025 - INCLUÍDO EM PAUTA PARA SESSÃO VIRTUAL DE 19/05/2025 00:00 ATÉ 23/05/2025 23:59; Expedição de intimação ao autor.
08/04/2025 - Confirmada a intimação do autor
28/03/2025 -Certidão de que foi constatado que há pedido liminar não apreciado e, por isso, foi para conclusão
28/03/2025 - Conclusos para despacho inicial
28/03/2025 - Recebidos os autos'),
    ('0023810-19.2025.8.16.0030', '2026-01-02'::date, '02/01/2026 - Juntada de certidão de arquivamento
17/12/2025 - Baixa 
03/12/2025 - Confirmada intimação para parte autora 
28/11/2025 - Expedição de intimação para parte autora 
26/11/2025 - Processo extinto por ausência de autor à audiência 
18/11/2025 - AC realizada
17/11/2025 - Juntada de contestação SC
06/11/2025 - Petição autora -  informa meio de contato para intimação 
05/11/2025- - Juntada de procuração da parte autora 
27/08/2025 - AR negativo Souza Cruz
07/08/2025 - Expedida citação para a Souza Cruz
30/07/2025 - Expedição de intimação ao autor
28/07/2025 - Juntada de informação - passo a passo teams
25/07/2025 - Juntada de informação 
25/07/2025 - Confirmada a intimação do autor
25/07/2025 - Designada audiência de conciliação para o dia 18/11/2025, às 16h31, semipresencial
25/07/2025 - Distribuição'),
    ('0006790-03.2025.8.16.0034', '2026-01-26'::date, '26/01/2026 - Arquivado definitivamente 
26/01/2026 - Juntada de baixa definitva 
25/01/2026 - Trânsito em julgado 
09/12/2025 - Confirmada intimação para as partes 
28/11/2025 - Expedição de intimação para Souza Cruz 
25/11/2025 - Pedido julgado improcedente 
30/10/2025 - AC realizada
30/10/2025 - Contestação 
25/08/2025 - Confirmada a intimação do autor
19/08/2025 - Confirmada a citação
14/08/2025 - Expedida citação para a Souza Cruz
14/08/2025 - AC designada para 30/10/2025, às 14h20, virtual
07/08/2025 - Recebidos os autos
01/08/2025 - Distribuição'),
    ('0001442-51.2025.8.16.0180', '2026-06-19'::date, '19/06/2026 - Expedida intimação para a parte autora
26/05/2026 - Despacho - Intime-se a parte autora para efetiva quitação, com a advertência de que o não pagamento dos valores
gerará protesto da dívida, sem prejuízo de inscrição do nome dos devedores nos órgãos de protesto de crédito.
04/05/2026 - Conclusos 
17/04/2026 - Juntada de certidão 
04/03/2026 - Despacho - Determina a intimação do autor por meio eletrônico 
11/02/2026 - Conclusão
10/02/2026 - Certidão - Envio para conclusão 
06/02/2026 - Mandado devolvido 
30/01/2026 - Expedição de mandado para a parte autora 
30/01/2026  - Guia de recolhimento de custas
23/01/2026 - Trânsito em julgado em 16/12/2025. 
29/11/2025 - Confirmada a intimação para SC
19/11/2025 - Intimação expedida SC
11/11/2025 - Processo extinto por ausência do autor à audiência 
31/10/2025 - ATA de audiência
31/10/2025 - AC realizada 
30/10/2025 - Contestação 
18/09/2025 - AR Buzato positivo
19/08/2025 - Confirmada a citação da Souza Cruz
08/08/2025 - Expedição de carta 
08/08/2025 - Juntada de intimação cumprida
08/08/2025 - Expedição de intimação
07/08/2025 - Decisão - não concedida a antecipação de tutela
05/08/2025 - Conclusos
04/08/2025 - Expedição de citação para a Souza Cruz
04/08/2025 - Juntada de certidão - link da audiência
04/08/2025 - AC desiganda para 31/10/2025, às 12h15, semipresencial
04/08/2025 - Distribuição'),
    ('0001080-25.2025.8.16.0091', '2026-03-25'::date, '25/03/2026 - Arquivamanto 
25/03/2026 - Baixa definitiva 
13/03/2026 - Pet SC 
13/03/2026 - Certidão - intimação parte autora 
09/03/2026 - Trânsito em julgado em 10/03/2025
22/02/2026 - Confirmada intimação SC sobre sentença 
11/02/2026 - Intimação expedida sobre sentença 
10/02/2026 - Homologada decisão de juiz leigo
11/01/2026 - Projeto de sentença - Julga parcialmente procedentes os pedidos autorais
16/12/2025 - Certidão informa que a juíza leiga ainda não encaminhou o processo para conclusão, devido à remoção do juiz de direito, e que está aguardando a designação de um novo titular. Adicionalmente, a certidão informa que o juiz designado está priorizando apenas casos de maior urgência, em virtude do acúmulo de demandas.
14/11/2025 - Conclusão 
10/11/2025 - Pet. Autora - juntada de petição de impugnação à contestação
04/11/2025 - AC realizada
03/11/2025 - Juntada de contestação 
02/10/2025 - Confimada citação SC
25/09/2025 - Audiência em 04 de novembro de 2025 às 09:00
25/09/2025 - Concedida a antecipação de tutela'),
    ('0001220-86.2025.8.16.0082', '2026-06-24'::date, '24/06/2026 - Conclusos 
06/04/2026 - Confirmada intimação 
26/03/2026 - Expedida intimação para a parte autora 
23/03/2026 - Conclusos para despacho - Homologação de despacho de juiz leigo
23/03/2026 - Despacho - Determina a intimação da parte autora para comprovação da inscrição nos órgão de proteção de crédito 
04/03/2026 - Conclusos 
11/02/2026 - AIJ realizada 
24/01/2026 - Confirmada intimação SC
13/01/2026 - Expedida intimação 
13/01/2026 - AIJ designada para 04/02/2026, às 15h
09/12/2025 - AC realizada - Sem conciliação 
09/12/2025 - Pet autor - Carta de preposição 
08/12/2025 - Contestação SC
28/10/2025 - Petição de habilitação e cumprimento de liminar SC
10/10/2025 - Confirmada a intimação para SC
01/10/2025 - AC desginada para 09 de dezembro de 2025 às 10:30.
30/09/2025 - Concedida a medida liminar'),
    ('0001255-46.2025.8.16.0082', '2026-07-24'::date, '24/07/2026 - Confirmada intimação SC 
13/07/2026 - Expedida intimação
25/03/2026 - AIJ realizada 
22/02/2026 - Confirmada intimação da parte autora 
10/02/2026 - Expedida intimação sobre AIJ 
10/02/2026 - AIJ designada para 25/03/2026, às 15h
10/02/2026 - AC realizada - sem acordo 
10/02/2026 - Carta de preposição autor 
10/02/2026 - Contestação SC
05/01/2025 - Pet SC - Petição de cumprimento de liminar 
30/12/2025 - Pet SC - Habilitação e cumprimento de liminar 
06/11/2025 - Decurso de prazo SC
17/10/2025 - Expedição de citação SC
17/10/2025 - AC designada para 10 de fevereiro de 2026 às 11:00.
16/10/2025 - Liminar concedida'),
    ('0019910-25.2025.8.16.0031', '2026-07-28'::date, '28/07/2026 - AC realizada 
28/07/2026 - Contestação 
13/04/2026 - Ato ordinatório - orientrações para a AC
13/04/2026 - Decisão - AC redesignada para 28 de julho de 2026 às 14:30 
06/04/2026 - Pet autor - Solicita redesignação da AC
26/01/2026 - Confirmada citação SC
20/01/2026 - Expedida citação para SC
17/12/2025 - AC designada para 04/05/2025, às 16h30, na modalidade semipresencial.
17/12/2025 - Decisão - Liminar indeferida 
16/12/2025 - Juntada de cnpj autor 
07/12/2025 - Confirmada intimação para a parte autora 
26/11/2025 - Intimação para parte autora 
26/11/2025 - Determinada Emenda à inicial 
25/11/2025 - Pet autor- Comprovação de que é micro empresa 
09/11/2025 - Intimação para parte autora'),
    ('0040887-41.2025.8.16.0030', '2026-08-03'::date, '03/08/2026 - Confirmada intimação SC 
23/07/2026 - Expedida intimação sobre sentença para SC
22/07/2026 - Homologação da sentença
23/06/2026 - Sentença - Pedido improcedente. 
23/06/2026 - Conclusos para sentença 
15/05/2026 - Conclusos 
12/05/2026 - AIJ realizada 
11/05/2026 - Impugnação à contestação
17/04/2026 - pet autor - Requer produção de prova testemunhal
14/04/2026 - AC realizada e AIJ designada para  12 de maio de 2026 às 16:10,
13/04/2026 - Contestação SC
26/01/2026 - Confirmada citação 
20/01/2026 - Expedida citação SC
14/01/2026 - Juntada de informação - Visualização restrita
09/12/2025 - Autos recebidos 
03/12/2025 - Audiência de conciliação designada para 14/04/2025, às 10h30, modalidade virtual'),
    ('0006848-32.2026.8.16.0014', '2026-07-17'::date, '17/07/2026 - Confirmada intimação
06/07/2026 - A. ordinatório - “À parte exequente para dar regular prosseguimento ao feito, requerendo o que entender por direito”
02/06/2026 - Pedido de prazo deferido 
02/06/206 - Conclusos 
22/05/2026 - Pet autor - dilação do prazo para emenda à inicial 
22/04/2026 - Determinada emenda à inicial 
13/04/2026 - Pet autor - Juntada dos endereços dos reus 
23/03/2026 - Confirmada intimação da parte autora
11/03/2026 - Decisão - Determina emenda à inicial'),
    ('0000346-86.2026.8.16.0108', '2026-08-02'::date, '02/08/2026 - Confirmada intimação SC 
22/07/2026 - Expedida intimação para SC
21/07/2026 - Sentença - Pedidos autorais julgados parcialmente procedentes
/07/2026 - Conclusos para sentença
26/06/2026 - Ciência da juiza leiga 
31/05/2026 - decisão - Certifico que, diante do decurso do prazo para a devolução do projeto de sentença pela Juíza Leiga, intimo-a para que proceda à devolução dos autos, devidamente sentenciados.
22/04/2026 - Conclusos
22/04/2026 - Impugnação â contestação
27/03/2026 - AC realizada 
26/03/2026 - Contestação SC
26/03/2026 - Contestação Global 
09/03/2026 - Pet autor ciência da resposta SERASA 
24/02/2026 - Resposta SERASA
24/02/2026 - Pet. Autor 
23/02/2026 - Confirmada citação SC. 
19/02/2026 - Deferimento de liminar'),
    ('0010241-53.2026.8.16.0017', '2026-08-04'::date, '04/08/2026 - Subs localiza 
30/07/2026 - Habilitação SC
10/06/2026 - Certidão - custas pendentes 
10/06/2026 - Intimação eletronica negativa 
08/06/2026 - Juntada de habilitação localiza 
29/05/2026 - Expedida citação SC; AC designada para o DIA 05 de agosto de 2026 às 15:00
25/05/2026 - Autos remetidos ao cejusc 
22/05/2026 - Não concedida a tutela 
21/05/2026 - Emenda à inicial 
17/04/2026 - Determinada emenda à inicial
16/04/2026 -  Distribuição'),
    ('5001394-09.2015.8.21.0086', '2026-05-08'::date, '08/05/2026 - Baixa deifinitva 
08/05/2026 - Transitado em julgado
26/03/2026 - Pet autor
25/03/2026 - Extinto por pressupostos processuais
20/03/2026 - Conclusos
26/02/2026 - Pet réu Sina empreendimentos
11/12/2025 - Juntada de certidão - Suspensão de prazo 
09/12/2025 - Juntada de certidão - Suspensão de prazo 
26/11/2025 - Despacho publicado no DJEN
25/11/2025 - Despacho disponibilizado no DJEN
24/11/2025 - Despacho - Determina a intimação do procurador de Bruno para habilitação e prosseguimento do feito.
21/07/2025 - Conclusos
22/06/2025 - Juntada de mandado cumprido em parte; - Autora Vera intimada, autor Bruno é falecido. 
22/06/2025 - Expedição de mandado devolvido - autor; recebido o mandado para cumprimento pelo oficial de justiça. 
06/06/2025 - Publicado no DJEN
04/06/2025 - Expedida intimação aos autores
04/06/2025 - Despacho - autores devem impulsionar o feito
19/12/2024 - Conclusos para despacho.
05/09/2024 - Intime-se a parte autora para, no prazo de 15 dias, dizer sobre o prosseguimento do feito.
28/08/2024 - Concluso
02/08/2024 - Confirmada a intimação eletrônica - Refer. aos Eventos: 49 e 50
23/07/2024 - Expedição de Intimação Eletrônica (autores)
26/06/2024 - Expedição de AR (autores).
30/04/2024 - Despacho "Intime-se a parte autora, pessoalmente, para impulsionar o feito, no prazo de 5 dias, sob pena de extinção por abandono de causa, nos termos do art. 485, § 1º do CPC."
26/03/2024 - Despacho "Intime-se a autora".
19/02/2023 - Ato Ordinatório para a autora
04/12/2023 - Juntada de certidão - alteração do prazo - 05/12/2023 até 07/12/2023 - Motivo: SUSPENSÃO DE PRAZOS - Ato 376/2023-CGJ
22/11/2023 - Despacho: "Intime-se a parte autora para, no prazo de 15 dias, dizer sobre o prosseguimento do feito."
20/09/2023 - Despacho: Intime-se a parte autora para, no prazo de 15 dias, dizer sobre o prosseguimento do feito.
13/07/2023 - "Intime-se a parte autora para, no prazo de 15 dias, dizer sobre o prosseguimento do feito."
04/07/2023 - Conclusos
05/06/2023 - Pet Sina Empreendimentos
22/04/2023 - Intimações confirmadas
12/04/2023 - Intimações expedidas
12/12/22 - Ato ordinatório praticado: "Vista às partes da digitalização da presente ação, que passa a tramitar em meio eletrônico, dispondo de 30 (trinta) dias para manifestação em relação a peças faltantes ou ilegíveis."
11/05/22 - Juntada de íntegra do processo; Remetidos os Autos - NUCDIGLOC -> CHN2CIV
22/09/21 - Remetidos os Autos - CHN2CIV -> NUCDIGLOC
22/09/21 - Registrado para Cadastramento Eletrônico de processo físico'),
    ('5004435-77.2021.8.21.6001', '2026-08-04'::date, '04/08/2026 - Conclusos 
04/08/2026 - Pet SC
14/07/2026 - Publicado no DJEN - no dia 14/07/2026 - Refer. ao Evento: 74 (EXEQUENTE - SOUZA CRUZ LTDA)
02/06/2026 - pet SC
12/05/2026 - Intimação para SC disponibilizada no DJEN
11/05/2026 - Ato ordinatório - Levantada suspensão 
08/03/2026 - Levantada a suspensão 
07/03/25 - Cumprimento de suspensão ou sobrestamento
23/10/24 - Petição do executado
12/10/24 - Despacho
06/03/2024 - Concluso
16/02/2023 - Decorrido prazo.
19/10/2023 - Ato Ordinatório "intime-se a parte autora para fornecer endereço da parte ré"
24/12/2023 - Intimação confirmada pela SC
15/12/2023 - intimação para SC informar endereço da RÉ
29/10/2023 - Confirmada a intimação eletrônica - Refer. ao Evento: 42 (EXEQUENTE - SOUZA CRUZ LTDA)
05/10/2023 - Confirmada a intimação eletrônica - Refer. ao Evento: 36 (EXEQUENTE - SOUZA CRUZ LTDA)
03/10/2023 -PETIÇÃO - Refer. ao Evento: 37 (EXECUTADO - LUIS EDUARDO BARZ)
25/09/2023 - Proferido despacho de mero expediente - documento anexado ao processo 5003562-77.2021.8.21.6001/RS
14/08/2023 - Pet da SC; Conclusos
14/07/2023 - Despacho: "O executado, devidamente intimado (ev. 13) da penhora e avaliação dos imóveis, conforme evento 1, OUT5, fls.89/99, não embargou.  Assim, diga o exequente sobre o prosseguimento quanto aos atos expropriatórios - arts. 876 ss do CPC."
01/06/2023 - Conclusos
06/12/22 - suspensão do prazo nos dias 05 e 12 de dezembro
10/11/22 - suspensão do prazo - 09/11/2022 até 11/11/2022 Motivo: SUSPENSÃO DE PRAZOS - ATO CONJUNTO Nº 01/2022-P E CGJ - com lançamento no sistema de 08/11/2022 (parada) a 11/11/2022
04/11/22 - Juntada de certidão - suspensão do prazo - 28/11/2022 até 28/11/2022 Motivo: SUSPENSÃO DE PRAZOS - Ordem de Serviço n°003/2022-P
01/11/22 - Juntada de certidão - suspensão do prazo - 24/11/2022 até 24/11/2022 Motivo: SUSPENSÃO DE PRAZOS - Ordem de Serviço n°003/2022-P
04/10/22 - Despacho: "Dê-se vista à Defensoria Pública acerca das penhoras realizadas (fls.89/99 do ev. 1- OUT5), uma vez que o executado foi citado por edital. Após, voltem para demais determinações."; Expedição de intimação às partes.
29/09/22 - Conclusos para decisão
04/07/22 - Petição
03/06/22 - Ato ordinatório praticado
01/11/21 - réu intimado da digitalização dos autos'),
    ('5000040-32.2004.8.21.0086', '2026-07-30'::date, '30/07/2026 - Baixa definitiva 
30/06/2026 - Pet SC
25/06/2026-Juntada de certidão - Supensão dos prazos processuais
09/06/2026 - Intimação para a SC publicada no DJEN 
05/06/2026 - Certidão - Decurso de prazo para pagamento voluntário da dívida 
06/04/2026 - Pet autor SC 
11/03/2026 - Expedida e publicada intimação no DJEN para SC 
22/01/2026 - Intimação expedida e Publicada no DJEN
22/01/2026 - Despacho - Determina a expedição de certidão de crédito 
17/10/2025 - Conclusão
09/09/2025 - Petição Souza Cruz
03/09/2025 - Publicada intimação para a Souza Cruz
01/09/2025 - Expedida intimação para a Souza Cruz
01/09/2025 - Parte autora deve se manifestar sobre o prosseguimento do feito
13/08/2025 - Levantada a suspensão ou sobrestamento dos autos
22/08/2024 - Confirmada a intimação eletrônica
12/08/2024  - Cumprimento de suspensão ou sobrestamento; Decisão "1. Tendo em vista a não localização do executado,suspendo a execução pelo prazo de 01 (um) ano,  fulcro no artigo 921, inciso III, §§ 1° e 7º, do Código de Processo Civil,  o que equivale ao arquivamento administrativo (artigo 437 da CNCGJ), bem como suspendo o curso do prazo prescricional."
24/07/2024 - Concluso
18/07/2024 - Decorrido o prazo da SC.
16/05/2024 - SUSPENSÃO DE PRAZOS - Ato 004/2024-P e CGJ
22/04/2024 - Ato Ordinatório - "À parte autora para providências e prosseguimento do processo, sob pena de extinção (art. 485, inciso III e §1º do CPC), conforme art. 7º do Provimento n. 20/2023-CGJ."
11/03/2024 - Ato Ordinatório (Recolher Custas).
01/03/2024 - Juntada de AR
31/01/2024 - Expedição de mandado
25/01/2024 - Despacho: "Diante do retorno negativo da carta AR (evento 11), sob a justificativa "ausente", expeça-se mandado de intimação da parte devedora, nos termos do segundo parágrafo do despacho 8.  Ainda, intime-se a parte exequente pessoalmente para dizer sobre o prosseguimento do feito, no prazo de 15 dias, sob pena de extinção."
26/10/2023 - Conclusos para decisão/despacho
21/09/2023 - Confirmada a intimação eletrônica - Refer. ao Evento: 23
(EXEQUENTE - SOUZA CRUZ LTDA)
11/09/2023 -  Ato ordinatório praticado (não consegui visualizar o teor); intimação expedida para SC
14/05/2023 - Intimação confirmada pela SC
04/05/2023 - Ato ordinatório: "Deve a parte proceder o recolhimento das custas de condução para a expedição do mandado de intimação da parte ré, ficando ciente que deve ser recolhida 1 URC."; Intimação expedida para SC
03/10/22 - SUBSTABELECIMENTO BCW
24/06/22 - Ato ordinatório praticado; Expedida/certificada a intimação eletrônica a SC.
22/04/22 - Juntada de certidão; Expedição de Carta pelo Correio
19/04/22 - Proferido despacho de mero expediente
18/04/22 - SUBSTABELECIMENTO SEM RESERVA - (RS035577 - MICHELLE SARRAH STIEVEN MACHADO para RJ214627 - BARBARA ANDRE BRANDAO, RS121437A - ELIANE LEVE); PETIÇÃO; Conclusos para decisão/despacho
12/04/22 - Juntada de íntegra do processo; Remetidos os Autos - NUCDIGLOC -> CHN1CIV
27/08/21 - Remetidos os Autos - CHN1CIV -> NUCDIGLOC
09/12/20 - Registrado para Cadastramento Eletrônico de processo físico'),
    ('5000128-08.2007.8.21.0008', '2026-05-19'::date, '19/05/2026 - Conclusos
06/04/2026 - Pet autor SC 
20/02/2026 - Intimação disponibilizada e publicada no DJEN 
19/02/2026 - Ato ordinatório informando intimação SC 
30/01/2026 - Levantada a suspensão dos autos 
03/02/2025 - Cumprimento de Suspensão ou Sobrestamento.
16/12/2024 - Decisão Interlocutória que suspendeu o processo por convenção das partes.
09/10/2024 - Conclusos para decisão
01/10/2024 - Petição da SC requerendo suspensão
30/08/2024 - Intimação da SC para prosseguimento "Data inicial da contagem do prazo: 11/09/2024 - Data final: 02/10/2024"
30/03/2024 - Juntada de AR da SC (não entregue)
13/03/2024 - Expedição de AR.
27/02/2024 - Prosseguir com a execução.
22/01/2024 - conclusos
10/11/2023 - Juntada de certidão - alteração do prazo - 13/11/2023 até 14/11/2023 - Motivo: SUSPENSÃO DE PRAZOS - Ato 343/2023-CGJ
01/11/2023 - Juntada de certidão - alteração do prazo - 06/11/2023 até 08/11/2023 - Motivo: SUSPENSÃO DE PRAZOS - Ato 338/2023-CGJ
26/10/2023 -  Intimação recebida SC
16/10/2023 - Decisão interlocutória: "Diante da manifestação de evento 26, PET1, defiro o prazo de 15 dias à parte exequente, a fim de que se manifeste acerca do prosseguimento."; intimação expeida para SC.
04/10/2023 - Conclusos 
25/08/2023 -  Pet da SC
16/07/2023 - Intimação confirmada pela SC
06/07/2023 - Despacho "Intime-se a parte exequente para, no prazo de 30 (trinta) dias, manifestar-se sobre o prosseguimento, cumprindo a decisão da pág. 6 do evento 3, DOC8."; Intimação expedida para SC
31/05/2023 - Conclusos
14/03/2023 - Pet SC confirmando ciênca da digitalização dos autos
08/02/2023 - Expedida intimação eletrônica SC
04/10/22 - Petição do Autor
29/08/22 - Intimação expedida às partes; Proferido despacho de mero expediente: "Considerando a manifestação do evento 10, doc1, intime-se a executada Sonia para, no prazo de 30 (trinta) dias, proceder a juntada das fls. 146, 169 e 171, bem como das demais folhas eventualmente faltantes."
15/08/22 - Conclusos para decisão/despacho
30/05/22 - PETIÇÃO
18/05/22 - Juntada de certidão - suspensão do prazo - 17/05/2022 até 17/05/2022 Motivo: SUSPENSÃO DE PRAZOS - ORDEM DE SERVIÇO Nº 001/2022-P E CGJ
06/05/22 - Confirmada a intimação eletrônica
26/04/22 - Ato ordinatório praticado; Intimação expedida às partes
11/01/22 - juntada de íntegra do processo; Remetidos os Autos - NUCDIGLOC -> CAN5CIV'),
    ('5000322-08.2007.8.21.0008', '2026-08-11'::date, '11/08/2026 - Intimação disponibilizada para SC
07/07/2026 - Petição SC
12/06/2026 - Intimação publicada para a SC 
10/06/2026  - Levantada a suspensão dos autos 
04/07/2025 - Cumprimento de Suspensão ou Sobrestamento
04/07/2025 - Levantada a suspensão ou sobrestamento dos autos
23/06/2025 - Ciência, com renúncia ao prazo
19/06/2025 - Confirmada a intimação do executado
11/06/2025 - Publicado no DJEN
10/06/2025 - Arquivado provisoriamente
09/06/2025 - Expedida intimação a exequente - Souza Cruz
09/06/2025 - Expedida intimação aos executados
09/06/2025 - Despacho - deferido pedido de suspensão pelo prazo de um ano
11/02/2025 - Conclusos para decisão/despacho
10/02/2025 - Petição do exequente Souza Cruz
13/12/2024 - Petição juntada pelo executado.
10/12/2024 - Expedida intimação À SC, referento ao Despacho de mero expediente proferido no evento nº59.
08/11/204 - Conclusos para Decisão
05/11/2024 - Petição da CONFIANÇA COMPANHIA DE SEGUROS sobre penhora indevida
22/10/2024 - Remessa à URCAJUD
20/08/2024 - Despacho "Remeto os autos à URCAJUD, para lançamento de ordem de bloqueio, na modalidade "teimosinha"
17/06/2024 - Concluso
14/05/2024 - Petição da SC.
23/04/2024 - Ato Ordinatório para a SC "Prosseguir no feito".
27/02/2024 - Despacho "manifestar-se sobre o prosseguimento."
20/03/2024 - ATOORD - Ao exequente: junte planilha com o valor atualizado da dívida para análise do pedido de bloqueio de valores no Sisbajud
08/02/2024 - Pet. SC
22/01/2024 - intimação confirmada pela SC
12/01/2024 - expedida intimação pra SC sobre mov 32 (15 dias)
24/07/2023 - Carta de intimação para SC
15/05/2023 - Petição SC
21/04/20213 - Intimação confirmada pela SC
11/04/2023 -  expedida intimação para SC
24/03/2023 - Expedição de carta via correio
13/02/23 - pet da SC
23/12/22 - Intimação confirmada SC
13/12/22 - Expedida Intimação à SC; Carta devolvida pelo Correio sem cumprimento - Destinatário HIDRASUL INDUSTRIA
09/12/22 - Suspensão do prazo de 20/12/2022 até 20/01/2023.
06/12/22 - suspensão do prazo nos dias 05 e 09 de dezembro
28/11/22 - Classe Processual alterada - DE: PROCEDIMENTO COMUM CÍVEL PARA: CUMPRIMENTO DE SENTENÇA
18/11/22 - Proferido despacho de mero expediente: "Vistos. Ciente da digitalização dos autos físicos. Retifique-se a autuação para "Cumprimento de Sentença", considerando o teor da decisão do evento 3, PROCJUDIC10 (fl. 385, pág. 22). Defiro a intimação da executada HIDRASUL INDUSTRIA E COMERCIO DE FILTROS E ACESSORIOS P na pessoa do sócio indicado ao evento 3, PROCJUDIC10 (fl. 404, pág. 48). Tendo em vista que é imprescidível a intimação da parte para pagamento, postergo a análise do pedido apresentado no evento 3, PROCJUDIC10 (fl. 404, pág. 48), qual seja, de penhora no rosto dos autos do processo cadastrado sob nº 0010439-98.2012.8.21.1001."
22/08/22 - Conclusos para decisão/despacho
05/08/22 - PETIÇÃO
06/07/22 - Ato ordinatório praticado
27/05/22 - Juntada de íntegra do processo - Remetidos os Autos - NUCDIGLOC -> CAN4CIV
23/05/22 - Remetidos os Autos - CAN4CIV -> NUCDIGLOC
23/08/21 - Registrado para Cadastramento Eletrônico de processo físico'),
    ('5000343-68.2014.8.21.0030', '2026-01-07'::date, '07/01/2026 - Cumprimento de suspensão ou sobrestamento
10/12/2025 - Intimações publicadas no DJEN
09/12/2025 - Intimações disponibilizadas no DJEN
06/12/2025 - Expedida intimação para Souza Cruz 
06/12/2025 - Despacho - Deferimento da suspenção do feito pelo período de um ano 
28/11/2025 - Conclusos 
29/10/2025 - Petição SC
10/10/2025 - Petição  parte ré 
08/10/2025 - Disponibilizado no DJEN
07/10/2025 - Intimação SC
25/09/2025 - Petição apresentada pela parte ré solicitando desconsideração de evento 63.
7/0925 - Confirmada a intimação eletrônica (SC)
16/09/2025 - Despacho - Intimando a parte executada para se manifestar sobre os valores bloqueados SISBAJUD no prazo de 5 (cinco) dias.
12/09/2025 - Conclusos ; Juntada de Ordem Cumprida (CESAR IURI) ; e Remetidos os Autos
01/09/2025 - Petição da Souza Cruz
28/08/2025 - Publicado no DJEN
27/08/2025 - Disponibilizado no DJEN
26/08/2025 - Expedida intimação para o executado e para a Souza Cruz
15/08/2025 - Petição impugnação - executado
12/08/2025 - Publicado no DJEN
07/08/2025 - Disponibilizado no DJEN
06/08/2025 - Remetidos os autos
06/08/2025 - Expedida intimação para a Souza Cruz
06/08/2025 - Despacho - deferido o bloqueio de valores
16/07/2025 - Petição da Souza Cruz - impugnando o requerimento de extinção por abandono da causa
16/07/2025 - Substabelecimento sem reserva
11/07/2025 - Conclusos
23/04/2025 - Petição da parte ré requerendo a extinção da execução, devido a inércia da Souza Cruz (exequente).
26/03/2024 - Concluso
21/02/2024 - Petição do executado informando hipossuficiência
18/01/2024 - intimação ao autor - confirmada em 28/01
22/10/2023 - Remetidos os Autos - Custas - SJA3CIV -> CCALC
08/10/2023 - Juntada de Carta pelo Correio - devolvida sem cumprimento - Refer. ao Evento: 22
Destinatário: SOUZA CRUZ LTDA
05/09/2023 - Despacho: "1. Intime-se pessoalmente a parte autora para que diga sobre o prosseguimento, no prazo de 5 dias, sob pena de extinção. 2. Decorrido o prazo sem manifestação, desde já julgo extinto o feito pelo abandono com base no art. 485, III, CPC."
23/08/2023 - Conclusos
07/05/2023 - Intimação lida pela SC
27/04/2023 - Despacho: "Diga o exequente sobre o prosseguimento do feito, no prazo de 5 dias, sob pena de arquivamento."; Intimação expedida para SC
07/02/2023 - Conclusos para decisão/despacho
28/12/22 - Petição SC
09/12/22 -  suspensão do prazo de 20/12/2022 até 20/01/2023.
30/11/22 - Substabelecimento - Autor
25/11/22 - Juntada de peças digitalizadas
23/11/22 - Petição do Autor -  pedido de LEVANTAMENTO DO BLOQUEIO
22/11/22 - Procuração - Autor
10/11/22 - Juntada de íntegra do processo; Remetidos os Autos - NUCDIGLOC -> SJA3CIV'),
    ('5003402-11.2021.8.21.0033', '2026-07-07'::date, '07/07/2026 - Intimação para SC publicada no DJEN
03/07/2026 - Levantada suspensão 
27/05/2026 - cumprimento de suspensão 
27/09/2024 - Processo Suspenso ou Sobrestado Por Decisão Judicial
20/08/2024 - Despacho "Suspenda-se o feito até o julgamento do Incidente de Desconsideração da Personalidade Jurídica relacionado (5009672-56.2018.8.21.0033). Com a decisão, diga a parte exequente sobre o prosseguimento do feito.  Oportunamente, voltem conclusos. "
11/06/2024 - Concluso
02/05/2024 - Pet da SC.
04/04/2024 - Levantamento da Suspensão 
14/10/2023 - Decorrido prazo - Refer. ao Evento: 20 (EXEQUENTE - SOUZA CRUZ LTDA)
06/10/2023 - Cumprimento de Suspensão ou Sobrestamento
28/09/2023  - Juntada de certidão - alteração do prazo - 28/09/2023 - Motivo: SUSPENSÃO DE PRAZOS - Portaria 319/2023-DF
08/09/2023 - Despacho: "Diante do recebimento do incidente de desconsideração da personalidade jurídica, aguarde-se o julgamento do incidente. Registre-se o EVENTO suspensão/sobrestamento da presente, por 180 dias, no sistema e-proc"
01/06/2023 - Alteração de assunto processual para Cump. de sentença
02/05/2023 - Conclusos
01/03/2023 - Juntada de certidão
14/09/22 - RENUNCIA AO PRAZO - GUIA ASSESSORIA LTDA
26/08/22 - Juntada de certidão - suspensão de prazo
10/08/22 - Substabelecimento Sem Reserva
09/08/202 - Ato ordinatório praticado
19/07/22 - Juntada de íntegra do processo; Remetidos os Autos:  NUCDIGLOC -> SLE3CIV'),
    ('5009672-56.2018.8.21.0033', '2026-06-29'::date, '29/06/2026 - Transito em julgado e baixa
22/06/2026 - Agravo de instrumento 
29/05/2026 - Intimação sobre sentença publicada no djen
27/05/2026 - Sentença - Deferimento da desconsideração da personalidade juridica 
23/01/2026 - Conclusos 
03/11/2025 - Publicação no DJEN sobre o despacho
30/10/2025 - Despacho - Deferimento da gratuidade de justiça da parte autora 
17/09/2025 - Conclusos
15/08/2025 - Petição Claudir requerendo reconsideração do despacho
24/07/2025 - Publicado no DJEN
23/07/2025 - Disponibilizado no DJEN
22/07/2025 - Expedida intimação para Souza Cruz
22/07/2025 - Decisão Interlocutória - indeferida gratuidade judiciária
19/05/2025 - Conclusos
09/05/2025 - Alterada a parte - Marcos Daniel Feltraco excluído
08/05/2025 - Petição autor
07/05/2025 - Petição de SC
23/03/2025 - Confirmada a intimação de SC
13/03/2025 - Expedida intimação eletrônica para Souza Cruz
13/03/2025 - DESPACHO - pedido de desistência homologado e extinto o feito em relação ao suscitado Marcos Daniel Feltraco
16/12/2024 - Conclusos
24/11/2024 - Confirmação de Intimação Eletrônica (Suscitante: SC).
14/11/2024 - Contestação por CLAUDIR ALTMANN.'),
    ('5204934-14.2026.8.21.7000', '2026-07-21'::date, '21/07/2026 - Conclusos
20/07/2026 - Contrarrazões SC
23/06/2026 - Intimação publcada no DJEN
22/06/2026 - Despacho - Recebido recurso sem efeito suspensivo'),
    ('5000002-75.2010.8.21.0129', '2026-08-03'::date, '03/08/2026 - Petição Souza Cruz 
14/07/2026 - Publicado no DJEN
10/07/2026 - Levantada a suspensão e expedida intimação pra SC
17/06/2026 - Certidão - 1 ano de suspensão dos autos 
29/08/2025 - Cumprimento de suspensão ou sobrestamento
14/07/2025 - Publicado no DJEN
11/07/2025 - Disponibilizado no DJEN
10/07/2025 - Expedida intimação a SC
10/07/2025 - Decisão - determinada a suspensão da execução por 01 ano.
22/01/2025 - Conclusos.
09/12/2024 - Petição juntada por SC.
01/11/2024 - Expedição de Intimação para a SC sobre o retorno do mandado negativo (Prazo: 15 dias Status:AGUARD. ABERTURA - Domicílio Judicial Eletrônico: Enviado em 01/11/2024 16:20:58)
22/10/2024 - Mandado Cumprido Negativo
08/10/2024 - Expedição de Mandado
05/09/2024 - Pet da SC comprovando o recolhimento.
30/08/2024 - Ato cumprido pela parte ou interessado - Confirmação de pagamento de Custas - GUIA DE CUSTAS: 245709489 (Recolhimento de Condução)
13/08/2024 - Intimação para a SC "Intime-se a parte autora para recolher uma despesa de condução RURAL relativa ao Oficial de Justiça - São Pedro do Sul e a comprove nos autos.''
29/04/2024 - Juntada de peças digitalizadas
13/07/2023 - Pet da SC
28/06/2023 - DECISÃO: "1. Defiro o pedido de penhora (evento 30, PET1), constrição a ser inserida via sistema Renajud, relacionado no Evento 26, qual seja, GM/CARAVAN, DE PLACA IEQ1040, ANO/MODELO 1979. Servirá a presente decisão, em conjunto com o extrato do sistema Renajud, como termo de penhora em favor da exequente, independentemente de outra formalidade. 2. Por se tratar de veículo com preço médio de mercado divulgado pela FIPE, deverá a exequente juntar estimativa de avaliação, em 5 dias. 3. Com a juntada da respectiva avaliação, ao servidor reponsável para proceder a averbação da penhora por meio do sistema Renajud. 4. Após, intime-se a parte executada acerca da avaliação e da penhora, na pessoa de seu advogado (art. 841, do CPC). Não havendo advogado constituído, intime-se pessoalmente. 5. Por fim, intime-se a credora para dizer sobre o prosseguimento, devendo, na mesma oportunidade, juntar cáculo atualizado da dívida."; Intimação expedida para SC
19/05/2023 - Conclusos
12/05/2023 - Petição SC
20/04/2023 - Intimação confirmada pela SC (Refer. ao Evento: 27)
10/04/2023 - Juntada de peças digitalizadas; intimação da SC
25/03/2023 - Intimação confirmada SC
15/03/2023 - Despacho: "A parte exequente anexou certidão que comprova a existência de veículo em nome do executado, remaescendo a certidão atual do veículo.Assim, efetue-se consulta no sistema RENAJUD. Na sequência, com a resposta, intime-se a parte exequente para manifestação."
15/12/22 - Decurso de prazo da SC referente a intimação (evento 16)
09/12/22 - Conclusos 
08/12/22 - Petição da SC.
07/12/22 - suspensão do prazo nos dias 05 e 09 de dezembro
04/11/22 - Proferido despacho de mero expediente: "Em que pese o pedido retro, entendo ser necessária a comprovação da necessidade da medida, eis que relacionada à quebra do sigilo fiscal dos dados do devedor. Isso posto, intime-se a exequente para que se manifeste, devendo indicar, ainda, a existência de bens em nome do executado, hipótese em que, caso positiva, deverá anexar ao processo as certidões de registros dos bens. Diligências legais."
30/08/22 - Conclusos para decisão/despacho
06/07/22 - Petição
08/06/22 - Proferido despacho de mero expediente
03/05/22 - Conclusos para decisão/despacho
24/02/22 - intimação para a SC; subs para a ELV
27/01/22 -  Remetidos os Autos - NUCDIGLOC -> SPL1CIV'),
    ('5000550-54.2010.8.21.0015', '2026-07-23'::date, '23/07/2026 -  Levantada a suspensão ou sobrestamento dos autos
23/01/2026 - Cumprimento de Suspensão ou Sobrestamento
18/12/2025 - Levantada a suspensão ou sobrestamento dos autos
19/08/2025 - Cumprimento de Suspensão ou Sobrestamento
15/08/2025 - Levantada a suspensão ou sobrestamento dos autos
16/05/2025 - Cumprimento de Suspensão ou Sobrestamento
16/05/2025 - Levantada a suspensão ou sobrestamento 
14/02/2025 - Cumprimento de suspensão ou sobrestamento
18/09/2024 -  Levantada a suspensão ou sobrestamento dos autos
19/06/2024 - Cumprimento de Sobrestamento
28/03/2024 - Levantamento da Suspensão ou Dessobrestamento
29/09/2023 - Cumprimento de Suspensão ou Sobrestamento
18/06/2023 - Juntada de certidão - alteração do prazo - 16/06/2023 - Motivo: SUSPENSÃO DE PRAZOS - Portaria 90/2023-DF
04/06/2023 - Confirmada intimação da SC
25/05/2023 - Despacho determinando a suspensão da execuição devido a incidente de desconsideração da personalidade juridica
10/04/2023 - Conclusos
09/04/2023 - Petição da SC 
20/03/2023 - Intimação confirmada pela SC
10/03/2023 - Despacho: "Intime-se a parte exequente para dizer quanto o prosseguimento do feito, nos termos da fl. 88 (Processo Judicial 3, Evento 5), no prazo de 15 dias, sob pena de extinção."
02/01/23 - Despacho: " Considerando a digitalização do presente expediente, certifique-se a baixa dos autos físicos, a fim de evitar decisões conflitantes. Intime-se a parte exequente para dizer quanto o prosseguimento do feito, nos termos da fl. 88 (Processo Judicial 3, Evento 5), no prazo de 15 dias, sob pena de extinção."
26/12/22 - Conclusos
30/11/22 - Decurso de prazo da SC referente ao evento 8
21/11/22 - Petição SC
09/11/22 - Juntada de certidão - suspensão do prazo - 09/11/2022 até 11/11/2022 Motivo: SUSPENSÃO DE PRAZOS - ATO CONJUNTO Nº 01/2022-P E CGJ - recalculo no sistema de 08/11/2022 (parada) a 11/11/2022
26/10/22 - Ato ordinatório praticado; Intimação expedida a SC
03/10/22 - SUBSTABELECIMENTO SEM RESERVA - (RJ214627 - BARBARA ANDRE BRANDAO para RS121437A - ELIANE LEVE); Juntada de íntegra do processo; Remetidos os Autos - NUCDIGLOC -> GTI3CIV
16/09/22 - SUBSTABELECIMENTO SEM RESERVA - BCW
15/09/22 - Remetidos os Autos - GTI3CIV -> NUCDIGLOC'),
    ('5003058-26.2017.8.21.0015', '2026-07-14'::date, '14/07/2026 - Conclusos
07/07/2026 - petição SC
28/06/2026 - Suspensão dos prazos
16/06/2026 - Intimação publicada no Djen
12/06/2026 - Ato ordinatório - Pagamento de despesa de condução 
04/04/2026 - Juntada de carta devolvida Atocir 
22/03/2026 - Juntada de carta devolvida - Destinatário não retirou objeto na Unidade dos Correios
25/02/2026 - Expedida citação para o réu
22/01/2026 - Intimação disponibilizadae publicada  no DJEN 
09/01/2025 - Expedida intimação SC
09/01/2025 - Despacho sobre citação 
08/09/2025 - Conclusos
29/08/2025 - Petição Souza Cruz manifestação
14/08/2025 - Publicado no DJEN intimação da Souza Cruz
13/08/2025 - Disponibilizado no DJEN
12/08/2025 - Certidão disponibilizada no DJEN
12/08/2025 - Expedida intimação para a Souza Cruz
12/08/2025 - Certidão
16/07/2025 - Juntada de certidão
18/05/2025 - Confirmada a intimação de SC
08/05/2025 - Expedida a intimação a SC
08/05/2025 - Decisão Interlocutória - intimar SC
12/03/2025 - Conclusos para decisão
07/03/2025 - Petição Souza Cruz
13/02/2025 - confirmada a intimação eletrônica de SC
03/02/2025 - Expedida/certificada a intimação eletrônica
Refer. ao Evento 54 e ao Evento 56 (SUSCITANTE - SOUZA CRUZ LTDA)
14/10/2024 - Petição da SC
13/09/2024 - À parte autora: diga como pretende prosseguir, sob pena de extinção (art. 485, inciso III e §1º do CPC), conforme art. 7º do Provimento n. 20/2023-CGJ.
08/08/2024 - Intimação sobre resultados da pesquisa de endereços
01/08/2024 - Remetidos os Autos para consulta de endereços
18/07/2024 - Despacho "Considerando o retorno negativo das cartas enviadas para citação dos requeridos, bem como observando a petição colacionada pela parte suscitante no evento 38, PET1, determino a citação do suscitado ITACIR BORGES no endereço informado pela parte adversa na petição predita. "
23/04/2024 - Concluso.
18/03/2024 - Expedida intimação para SC.
08/02/2024 - Intimação cnfirmada pela SC
29/01/2024 - Despacho determinando que o autor se manifeste no prazo de 15 dias sobre o prosseguimento do feito
10/01/2024 - Conclusos para decisão/despacho
13/11/2023 - Confirmada a intimação eletrônica - Refer. ao Evento: 27
(SUSCITANTE - SOUZA CRUZ LTDA)
03/11/2023 - Expedida/certificada a intimação eletrônica
Refer. ao Evento 23 (SUSCITANTE - SOUZA CRUZ LTDA)
Prazo: 15 dias Status:AGUARD. ABERTURA
09/10/2023 - Confirmada intimação da SC
29/09/2023 - "Intime-se a parte autora para dizer sobre o prosseguimento do feito conforme retorno negativo das cartas expedidas anteriormente."
23/07/2023 - Juntada de Carta pelo Correio - devolvida sem cumprimento - Refer. ao Evento: 16 - Destinatário: HAMILTON DE SOUZA VASCO
21/07/2023 - Juntada de Carta pelo Correio - devolvida sem cumprimento - Refer. ao Evento: 15 - Destinatário: ITACIR BORGES
07/07/2023 - Cartas devolvidas sem leitura
19/06/2023 - Expedição de cartas pelos correios
30/03/2023 - Despacho determinando expedição de AR 
27/01/2023 - Conclusos para decisão/despacho
30/11/22 - Decurso de prazo da SC referente ao evento 8
21/11/22 - Petição SC.
09/11/22 - Juntada de certidão - suspensão do prazo - 09/11/2022 até 11/11/2022 Motivo: SUSPENSÃO DE PRAZOS - ATO CONJUNTO Nº 01/2022-P E CGJ - recalculo no sistema de 08/11/2022 (parada) a 11/11/2022
26/10/22 - Ato ordinatório praticado; Intimação expedida a SC
03/10/22 - SUBSTABELECIMENTO SEM RESERVA - (RJ214627 - BARBARA ANDRE BRANDAO para RS121437A - ELIANE LEVE); Juntada de íntegra do processo; Remetidos os Autos - NUCDIGLOC -> GTI3CIV
16/09/22 - SUBSTABELECIMENTO SEM RESERVA - (RS035577 - MICHELLE SARRAH STIEVEN MACHADO para RS121437A - ELIANE LEVE, RJ214627 - BARBARA ANDRE BRANDAO)
15/09/22 - Remetidos os Autos - GTI3CIV -> NUCDIGLOC'),
    ('5002267-11.2019.8.21.0040', '2026-07-08'::date, '08/07/2026 - Redistribuído por sorteio em razão de incompetência 
04/07/2026 - Remessa os autos - Dproc
04/07/2026 -  Remessa Externa - CPU2CIV -> TJRS
28/06/2026 - Autos remetidos para NUCDIGLOC e retornaram para a vara 
30/09/2025 - Publicado no DJEN
29/09/2025 - Intimação para a parte autora e ciência da mesma
19/09/2025- Disponibilidade no DJ
25/09/2025 - Expedição de alvará eletrônico.
21/09/2025 - Alterado o assunto processual - De: Coisas - Para: Inclusão Indevida em Cadastro de Inadimplentes
27/08/2025 - Publicado no DJEN
25/08/2025 - Despacho - expedição de alvará
19/08/2025 - Petição autor requerendo expedição de alvará
02/05/2025 - Contrarrazões SC
17/04/2025 - Petição de pagamento da condenação e cumprimento de OBF de SC
17/04/2025 - Substabelecimento sem reserva - Eliane Leve
08/04/2025 - Confirmada a intimação eletrônica
07/04/2025 - Confirmação de recolhimento - guia de depósito
29/03/2025 - Expedida intimação a SC
21/03/2025 - Apelação do autor
06/03/2025 - Confirmada a Intimação eletrônica
24/02/2025 - Expedida intimação para SC
24/02/2025 - SENTENÇA - Julgado parcialmente procedente. SC condenada a declarar inexistente o débito no valor de R$ 71,13. Parte autora e réu irão arcar com metade das custas processuais cada. Pedido de danos morais julgado improcedente.
19/04/2024 - Concluso.
08/02/2024 - pet do autor pedidndo para desconsiderar pet do evento 22
26/01/2024 - pet do autor indicando testemunha
23/10/2023 - Pet do autor e da SC
19/09/2023 - Despacho: "Intimem-se as partes para que, em 15 dias, manifestem-se sobre as provas que pretendem produzir, justificando-as.
17/04/2023 - Conclusos para julgamento
22/09/22 - Conclusos para decisão/despacho 
05/09/22 - Petição do Reu
23/08/22 - PETIÇÃO 
05/08/22 - Ato ordinatório praticado; SUBSTABELECIMENTO SEM RESERVA
17/06/22 - Remetidos os Autos - CPU2CIV -> NUCDIGLOC
07/06/22 - Remetidos os Autos - NUCDIG -> NUCDIGLOC; Juntada de íntegra do processo; Remetidos os Autos - NUCDIGLOC -> NUCDIG'),
    ('5002320-41.2018.8.21.0132', '2026-05-06'::date, '06/05/2026 - Baixa definitiva 
12/03/2026 - Intimação publicada no DJEN
10/03/2026 - Expedida intimação para SC 
28/01/2026 - Autos recebidos
28/01/2026 - Baixa definitiva 
28/01/2026 - Trânsito em julgado
04/12/2025 - Publicado no DJEN
02/12/2025 - Expedida intimação para Souza cruz sobre ácordão
02/12/2025 - Recurso Especial não admitido. 
12/10/2025 - Conclusos 
19/09/2025 - Disponibilidade no DJ  para contrarrazões da Souza Cruz 
16/09/2025 - Alterado o assunto processual
10/06/2025 - Remetidos os autos
09/06/2025 - Remetidos os autos
29/05/2025 - Contrarrazões de Souza Cruz
08/05/2025 - Confirmada a intimação
28/04/2025 - Expedida Intimação SC
28/04/2025 - Apelação - Autora
04/04/2025 - Confirmada a intimação eletrônica de SC
25/03/2025 - Expedida intimação para SC
25/03/2025 - SENTENÇA - Julgado improcedente o pedido
10/06/2024 - Conclusos para julgamento
03/06/2024 - Memoriais da Souza Cruz.
16/05/2024 - SUSPENSÃO DE PRAZOS - Ato n. 04/2024-P e CGJ
11/04/2024 - Intimação da SC para apresentar memoriais (fatal em 10/05).
09/04/2024 - Memoriais da Autora.
06/03/2024 - Despacho "Considerando que as partes não postularam a realização de outras provas, declaro encerrada a instrução, conferindo às partes o prazo sucessivo de 15 (quinze) dias para apresentação de memoriais na forma escrita, nos termos do artigo 364, §2º, do CPC, a começar pela parte autora."
20/06/2023 - Conclusos
19/06/2023 - Pet SC
26/05/2023 - Intimação confirmada pela SC
16/05/2023 - Intimação expedida para SC
20/04/2023 - Confirmada a intimação eletrônica SC
10/04/2023 - Decisão: "Intime-se a parte ré, nos termos da decisão do evento 3, PROCJUDIC5 p. 12"; Intimação expedida a SC
11/01/23 - Conclusos
23/11/22 - Petição SC
12/11/22 - Juntada de certidão - suspensão do prazo - 09/11/2022 até 11/11/2022 Motivo: SUSPENSÃO DE PRAZOS - ATO CONJUNTO Nº 01/2022-P E CGJ - recalculo no sistema de 08/11/2022 (parada) a 11/11/2022
22/10/22 - Proferido despacho de mero expediente: " 1.- Face aos princípios do contraditório e da ampla defesa, intime-se a parte ré sobre o EVENTO 8. 2.- Após, retornem os autos conclusos para deliberação."
20/06/22 - Conclusos para decisão/despacho
15/02/22 - petição do autor
17/01/22 - expedidas intimações às partes
16/12/2021 - Remetidos os Autos - NUCDIGLOC -> SPG3CIV
16/12/2021 - Juntada de íntegra do processo
03/09/2021 - Remetidos os Autos - SPG3CIV -> NUCDIGLOC
15/12/2020 -  Registrado para Cadastramento Eletrônico de processo físic'),
    ('5002320-41.2018.8.21.0132', '2026-01-28'::date, '28/01/2026 - Trânsito em julgado e baixa definitiva 
04/12/2025 - Intimação publicada no DJEN
02/12/2025 - Expedida intimação para Souza cruz sobre ácordão
02/12/2025 - Recurso Especial não admitido. 
21/10/2025 - Conclusão 
10/10/2025 - Contrarrazões sc
22/09/2025- Publicado no DJEN
11/09/2025 - Remetidos os autos para a Secretaria de Recursos
10/09/2025 - Recurso Especial
20/08/2025 - Publicado no DJEN
18/08/2025 - Expedida intimação para a Souza Cruz
13/08/2025 - Acórdão - conhecido o recurso e desprovido
31/07/2025 - Disponibilizado no Diário Eletrônico
30/07/2025 - Expedida intimação
30/07/2025 - Inclusão em pauta de julgamento - dia 13/08/2025, às 14h
10/06/2025 - Redistribuído em sorteio em razão de incompetência
09/06/2025 - Distribuídos'),
    ('5004032-07.2022.8.21.0074', '2025-10-30'::date, '30/10/2025 - Baixa definitiva
29/10/2025 - Remetido aos autos. 
29/10/2025 - Trânsito em julgado 
23/09/2025 - Publicado no DJEN a intimação eletrônica (SC)
19/09/2025 - Embargos de Declaração Acolhidos
30/06/2025 - Conclusos
08/03/2025 - Conclusos
31/01/2025 - Resposta autora
15/01/2025 - Expedida/certificada a intimação eletrônica
15/01/2025 - Decisão Interlocutória - intime-se autora'),
    ('5005230-74.2025.8.21.0074', '2026-07-21'::date, '21/07/2026 - Petição exequente
25/06/2026 - Ato ordinatório - Intime-se a parte autora para informar seus dados bancários 
12/06/2026 - Intimação para sc publicada no DJEN 
12/06/2026 - Decisão -  expeça-se alvará, desde já, de R$ 261,81, correspondente ao reembolso das custas inicias - em favor do procurador da parte autora/2026 - Conclusos 
03/06/2026 - Pet autor - Alvará de honorários. 
02/06/2026 - Pet SC 
11/05/2026 - Intimação publicada para SC para que se manifeste no prazo de 15 (quinze) dias sobre o pedido de ressarcimento das custas
11/05/2026 - Ato - certidão de pagamento do autor. 
28/04/2026 - Pet autor 
22/04/2026 - Despacho - Determinações para a parte autora e SC
11/11/2025 - Conclusos 
/10/11/2025 - Pet autor - Solicita reembolso pelas custas iniciais 
06/11/2025 - Despacho - Expeça-se o alvará. 
05/11/2025 - Despacho - "Intime-se o executado para adimplir o débito "'),
    ('5004446-10.2022.8.21.0040', '2026-02-13'::date, '13/02/2026 - Baixa definitiva 
21/01/2026 - Disponibilizada no DJEN
13/01/2026 - Expedida intimação sobre a baixa do 2° grau
01/12/2025 - Baixa definitiva 
01/12/2025 - Trânsito em julgado 
10/11/2025 - Ciência - parte autora 
07/11/2025 - Intimação para SC confirmada 
04/11/2025 - Expedida intimação para SC
30/10/2025 - Não provimento de recurso 
21/10/2025 - Disponibilizado no DJEN
20/10/2025 - Inclusão em pauta de julgamento pelo relator. 
07/10/2025- Remetido os Autos com revisão de autuação 
25/09/2025 - Petições de Contrarrazões de Souza Cruz e Global
04/09/2025 - Publicado no DJEN
03/09/2025 - Disponibilizado no DJEN
02/09/2025 - Expedida intimação eletrônica para a Souza Cruz
30/08/2025 - Apelação autora
08/08/2025 - Publicado no DJEN
07/08/2025 - Disponibilizado no DJEN
06/08/2025 - Expedida intimação para Souza Cruz
06/08/2025 - SENTENÇA - Julgado improcedente o pedido
23/07/2024 - Concluso
28/06/2024 - Confirmada a Intimação da SC.
18/06/2024 - Não havendo necessidade de outras provas, voltem os autos conclusos para julgamento antecipado, na forma do artigo 355, inciso I, do Código de Processo Civil.
19/04/2024 - Conclusão
14/02/2024 - Pet da global
08/02/2024 - Pet da Sc sobre produção de provas
11/01/2024 - pet autora
09/01/2024 - Despacho determinando intimação das partes para se manifestaram sobre produção de provas
04/01/2023 - Conclusos
05/12/2023 - RÉPLICA
23/10/2023 - Pet SC e autor
02/10/2023 - Remetidos os Autos - CASCEJUSC -> CPU2CIV
29/09/2023 - Ac realizada
28/09/2023 - Pet SC
15/09/2023 - Juntada de peças digitalizadas
20/07/2023 - AC desiganada para 29/09/2023 - SEX 14:00; Cartas expedidas pelo Correios
14/07/2023 "Recebo a inicial e defiro a AJG."
07/07/2023 - Conclusos
10/02/23 -  pet autora
11/01/23 - Despacho determinando que o autor comprove que não tem recursos para que a gratuidade de justiça seja concedida.
23/11/22 - Distribuído; Conclusos'),
    ('5000094-82.2023.8.21.0069', '2025-01-12'::date, '12/01/2025 - Baixa definitiva 
26/11/2025 - Transito em julgado 
15/10/2025 - Publicado no DJEN 
13/10/2025 - SENTENÇA -Pedidos julgados parcialmente procedentes
27/01/2025 - Conclusos para julgamento
05/03/2024 - Concluso.
23/02/2024 - Pet da SC
26/01/2024 - Ato ordinatorio confirmando análise das petições juntadas pela SC e pelo autor
22/11/2023 - Pet. da SC e do autor
13/10/2023 - Juntada de certidão - alteração do prazo - 19/10/2023 até 20/10/2023 - Motivo: SUSPENSÃO DE PRAZOS - Ato n.º 312/2023-CGJ
07/10/2023 - intimações confirmadas
27/09/2023 - Despacho determinando intimação das partes e manifestação sobre designação de AC
26/06/2023 - Pet autor
27/09/2023 - Despacho : "Preliminarmente, recebo o aditamento à inicial do evento 12, EMENDAINIC1, nos termos do art. 303, §1º, I, do CPC. À parte ré para que, querendo, manifeste-se, em 30 dias, quanto aos documentos juntados nos eventos 17 e 19. No mais, sem prejuízo ao que dispõe o art. 357 do CPC, determino a intimação das partes para que, em 30 dias, digam se têm provas a produzir, justificada e especificamente, ratificando eventuais provas já requeridas, sob pena de ser presumida a desistência. Ainda, havendo interesse em audiência conciliatória, deverá vir manifestação expressa, no mesmo prazo. Caso seja postulada prova oral, desde logo devem ser arroladas testemunhas para fins de organização da pauta. Postergo a análise acerca de eventuais preliminares para a sentença."
09/05/2023 - Conclusos
08/05/2023 - Petição do autor
04/04/2023 - Intimação expedida para autora referente a defesa da SC
28/03/2023 - Defesa SC
20/03/2023 - pet SC
16/03/2023 - PETIÇÃO - EMENDA A INICIAL
22/02/2023 - Juntada de Carta pelo Correio - Comprovante de entrega - Refer. ao Evento: 7 Destinatário: SOUZA CRUZ LTDA Entregue em: 10/02/2023
01/02/2023 - Expedição de Carta pelo Correio 
31/01/2023 - Concedida a Antecipação de tutela
26/01/2023 - PETIÇÃO - PEDIDO DE LIMINAR/ANTECIPAÇÃO DE TUTELA
21/01/2023 - Ato cumprido pela parte ou interessado - Confirmação de pagamento de Custas - GUIA DE CUSTAS: 235027466
20/01/23 - Distribuído por sorteio; Concluso
s'),
    ('5004209-78.2025.8.21.0069', '2026-02-23'::date, '23/02/2026 - Baixa definitva 
23/02/2026 - Trânsito em julgado 
21/01/2026 - Intimação para a parte autora publicada no DJEN
12/01/2026 - Confirmada intimação SC
12/01/2026 - Autos remetidos para central de custas
12/01/2025 - Intimação para a parte autora 
09/01/2025 - Expedição de alvará 
19/12/2025 - Intimação SC
19/12/2025 - Despacho - Expedição de alvará para a parte autora 
02/12/2025 - Pet autor - Requer a expedição dos alvarás;
24/11/2025 - Pet SC - juntada do comprovante de depósito.'),
    ('5006480-07.2024.8.21.0001', '2026-03-13'::date, '13/03/2026 - Baixa definitiva
05/03/2026 - Intimação sobre transito publicada no DJEN
25/02/2026 - Autos remetidos ao órgão de origem
25/02/2026 - Trânsito em julgado 
15/10/2025 - Conclusão 
14/10/2026 - CR SC
10/10/2025 - Certidão - Suspensão de prazo 
30/09/2025 - Petição da parte autora e processo suspenso por decisão judicial 
26/09/2025 - Reconhecimento e provimento do recurso. 
11/09/2025 - Disponibilizado no Diário Eletrônico a Pauta de julgamento
10/09/2025 - Inclusão em pauta de julgamento - dia 24/09/2025 a 26/09/2025, às 15h
18/02/2025 - Conclusos para decisão/despacho
17/02/2025 - Remetidos os autos em grau de recurso para TR
14/02/2025 - Contrarrazões de recorrido
10/02/2025 - Petição de SC (recorrente)
03/02/2025 - Recurso Inominado SC
17/01/2024 - Confirmada a intimação eletrônica para Souza Cruz.
07/01/2025 - Ato ordinatório praticado, no qual atesta a confecção de guia de custas para Recurso Inominado a ser realizado pela SC.
18/12/2024 - Homologada decisão do Juiz Leigo.
11/12/2024 - Conclusos para julgamento.
07/11/2024 - Remetidos ao juiz leigo.
11/10/2024 - Audiência de instrução designada - Local CARLOS - 07/11/2024 18:30
12/09/2024 - Certidão "Certifico que o Cartório tentou contato com o juiz leigo Carlos Teixeira, a partir das 18h06, solicitando informações sobre a realização da audiência de instrução aprazada para hoje (ev. 32), sem retorno. Informo também que ambas as partes fizeram contato através do telefone e balcão virtual, e que estavam aguardando a solenidade. Por fim, em razão da ausência de resposta, a audiência será cancelada e posteriormente remarcada, e as partes, devidamente intimadas. "
20/08/2024 - Designação de AIJ "Ficam as partes cientes da AUDIÊNCIA DE INSTRUÇÃO por videoconferência, em sala virtual no dia 12.09 – 18h, que será pelo sistema Cisco Webex, com uso de smartphone, tablet ou computador que possua áudio e vídeo, conforme instruções abaixo."
04/06/2024 - Certidão "Certifico que, diante do Ato conjunto 006/2024 da Presidência do TJRS e da Corregedoria-Geral da Justiça, bem como da Portaria 68/2024 da Direção do Foro Central de Porto Alegre, ficam suspensas as audiências e sessões de julgamento em todas as suas modalidades, inclusive virtuais (ressalvados os casos de urgência), designadas para o mês de junho de 2024."
22/04/2024 - Audiência de instrução designada - Local FABIANE P - 05/06/2024 15:00
27/02/2024 - Audiência de conciliação designada - Local FABIANE P - 22/04/2024 14:40
09/02/2024 - Pet da SC confirmando cumprimento liminar;
07/02/2024 - Citação expedida para SC
15/01/2024 - Liminar deferida
11/01/2024 - Distribuição'),
    ('5012150-58.2025.8.21.9000', '2026-02-25'::date, '25/02/2026 - Trânsito e baixa 
29/01/2026 - Intimação publicada no DJEN
28/01/2026 - Disponibilização no DJEN 
27/01/2026 - Expedida intimação para SC 
27/01/2026 - Decisão - Não admitido pedido de uniformização 
10/10/2026 - Juntada de certidão 
30/09/2026 - Processo sobrestado
30/09/2025 - Expedida a intimação para Souza Cruz e disponibilização no diário eletrônico'),
    ('5017094-89.2020.8.21.0008', '2026-08-10'::date, '10/08/2026 - Mandado recebido por OJ
26/06/2026 - Pet autor - endereço 
01/06/2026 - Juntada de mandado negativo 
30/04/2026 - Mandado devolvido
16/04/2026 - Expedida comunicação eletrônica
11/02/2026 - Mandado recebido pelo pelo OJ
11/02/2026 - Expedição de mandado para um dos réus
11/01/2026 - Pet autor - Solicita a intimação de um dos réus via mandado
19/12/2025 - Intimação para a parte autora publicada no DJEN 
17/12/2025 - Intimação para a parte autora disponibilizada no DJEN 
17/12/2025 - Expedida intimação para a parte autora 
20/11/2025 - Certidão -  Frustrada a notificação de CASSIA SUSANA DA SILVEIRA.
03/11/2025  - Recebimento do mandado pelo OJ
03/11/2025 - Expedição de mandado 
25/09/2025 - Petição parte autora 
04/09/2025 - Publicado
03/09/2025 - Disponibilizado no DJEN
02/09/2025 - Expedida intimação para a autora
01/08/2025 - Juntada de mandado cumprido em parte
06/06/2025 - Recebido o mandado para cumprimento pelo OJ
06/06/2025 - Expedição de mandado
25/05/2025 - Petição autora
05/05/2025 - Confirmada a intimação da autora
25/04/2025 - Expedida intimação ao autor
07/04/2025 - Juntada de Carta pelo Correio, devolvida sem cumprimento
25/03/2025 - Expedição de carta pelo correio para corré
12/03/2025 - Petição da autora
17/02/2025 - confirmada a intimação eletrônica
07/02/2025 - Expedida/ certificada a intimação eletronica da autora; ciência, com renúncia ao prazo
07/02/2025 - Remetidos os autos
16/01/2025 - Ciência com renúncia ao prazo pela SC.
13/12/2024 - Proferido despacho de mero expediente, no qual determinou que seja indeferido o pedido de citação por edital formulado no evento 78, PET1.
21/11/2024 - Conclusos para decisão.
13/09/2024 - Expedição do mandado de citação para Cassia
04/08/2024 - Petição da autora requerendo a citação da Cassia
05/07/2024 - Em réplica
03/04/2024 - Contestação.
12/03/2024 - Juntada de Citação Positiva (SC).
06/11/2024 - Distribuição'),
    ('5000730-82.2024.8.21.0014', '2026-07-28'::date, '28/07/2026 - Expedida citação para o autor 
28/07/2026 - INTIME-SE a parte autora para que diga acerca do prosseguimento do feito, no prazo da intimação
27/07/2026 - Termo de AC 
02/04/2026 - Intimação publicada no DJEN
30/03/2026 - Despacho - Orientações para audiência
30/03/2026 - AC agendada para a 27/07/2026 às 13:30
24/03/2026 - Intimação sobre despacho publicada no DJEN
21/03/2026 - Despacho remete autos ao CESJUSC para conciliação 
26/11/2025 - Conclusão para julgamento 
26/08/2025 - Conclusos
29/07/2025 - Petição Souza Cruz sem provas
09/07/2025 - Publicado no DJEN; ciência da autora, com renúncia ao prazo
08/07/2025 - Disponibilizado no DJEN
07/07/2025 - Expedida intimação para a Souza Cruz
06/07/2025 - Despacho - especificar provas
19/06/2024 - Concluso
19/06/2024 - Réplica
06/06/2024 - Em réplica
16/05/2024 - SUSPENSÃO DE PRAZOS - Ato conjunto 004/2024-P e CGJ
15/04/2024 - Juntada de AR (Data inicial da contagem do prazo: 16/04/2024 -
Data final: 07/05/2024)
02/04/2024 - Expedição da Citação para a SC.
02/04/2024 - Deferida a tutela
30/01/2024 - Distribuído por sorteio'),
    ('5017200-27.2024.8.21.0003', '2026-04-06'::date, '06/04/2026 - Trânsito em julgado e baixa 
04/02/2026 - Despacho - Determina a parte autora para iniciar o cumprimento de sentença como nova ação. 
28/01/2026 - - Pet autor solicitando o cumprimento de sentença 
12/12/2025 - Intimação para o autor publicada no DJEN 
10/12/2025 - Expedida intimação para Souza Cruz 
10/12/2025 - Decisão - Embargos acolhidos 
01/12/2025 - Autos remetidos ao juiz leigo 
12/11/2025 - Autos remetidos ao juiz leigo 
07/11/2025 - Conclusos para julgamento 
07/11/2025 - Proferida decisão por juiz leigo
02/09/2025 - Remetidos os autos ao juiz leigo
19/08/2025 - Embargos de Declaração  Souza Cruz
12/08/2025 - Publicada no DJEN
10/08/2025 - Expedida intimação para Souza Cruz
10/08/2025 - SENTENÇA - pedidos parcialmente procedentes
22/07/2025 - Conclusos
18/07/2025 - Proferida decisão por juiz leigo
05/05/2025 - Remetidos os autos ao juiz leigo
25/03/2025 - Audiência de conciliação realizada - juntada da ata
25/03/2025 - Contestação de SC
12/09/2024 - Petição da SC cumprindo liminar
11/09/2024  - Intimação das partes sobre audiência (virtual) que será realizada pela Plataforma Cisco Webex em 25/03/2025 19:00:00
29/08/2024 - Juntada de AR da SC "Data inicial da contagem do prazo em 30/08/2024 - Final em 12/09/2024 - AR Entregue em: 21/08/2024
13/08/2024 - Expedição de Intimação
15/08/2024 - Tutela - Ante o exposto DEFIRO o pedido liminar, e determino à demandada que providencie a retirada da parte autora do SPC/SERASA, em cinco dias, a contar da intimação, sob pena de multa diária de R$ 350,00, limitada em 10 dias.
09/08/2024 - Distribuição'),
    ('5002476-47.2026.8.21.0003', '2026-07-15'::date, '15/07/2026 - Determinado o arquivamento e baixa definitiva
22/06/2026 - Conclusos 
18/05/2026 - Ato ordinatório - À autora: informe se a dívida foi paga, possibilitando a extinção do feito.
08/04/2026 - Ato ordinatório - Expedição de alvará
02/04/2026 - Juntada de pagamento SC 
01/04/2026 - Pet autor requer expedição do alvará
10/03/2026 - Despacho - "Remetam-se os autos à CCAL para atualização do cálculo"
09/02/2026 - Distribuição'),
    ('5001152-08.2025.8.21.0019', '2026-05-04'::date, '04/05/2026 - Petição autor - Informa que não tem provas a produzir
09/04/2026 - Intimação publicada no djen
07/04/2026 - Decisão - Determina a intimação para as partes informarem a produção de provas 
29/09/2025 - Concluso
26/08/2025 - Petição autor
05/08/2025 - Certidão - alteração do prazo - 07/08/2025 até 08/08/2025
01/08/2025 - Publicado no DJEN
31/07/2025 - Disponibilizado no DJEN
30/07/2025 - Ato ordinatório - comprovante de entrega Global
30/07/2025 - Expedida intimação Supermercado
31/05/2025 - Juntada de carta Global
13/05/2025 - Expedição de citação a SC para apresentar contestação
24/04/2025 - Conclusos
24/04/2025 - Réplica do autor
27/03/2025 - Confirmada a intimação do autor
17/03/2025 - Expedida intimação ao autor
17/03/2025 - Contestação de Souza Cruz
26/02/2025 - Petição de Souza Cruz - cumprimento de liminar
22/02/2025 - Juntada de Certidão - ausência de confirmação de citação de corré
20/02/2025 - Confirmada a citação eletrônica de SC.
18/02/2025 - expedida citação eletrônica para SC
18/02/2025 - Despacho - Tutela de urgência DEFERIDA para cessar as cobranças indevidas e se abster de escrever a autora nos órgãos de proteção de crédito.
08/02/2025 - Ato cumprido pela parte - confirmação de pagamento de custas
30/01/2025 - Confirmada a intimação eletrônica - Refer. ao Evento: 4 (AUTOR - SUPERMERCADO HP LTDA)
20/01/2025 - Expedida/certificada a intimação eletrônica
Refer. ao Evento 3 (AUTOR - SUPERMERCADO HP LTDA) Prazo: 15 dias Status:AGUARD. ABERTURA
17/01/2025 - Processo distribuído.'),
    ('5000550-38.2025.8.21.0109', '2026-06-12'::date, '12/06/2026 - Ato cumprido - Confirmação de pagamento de custas 
20/05/2026 - Baixa definitiva 
15/04/2026 - Retorno dos autos 
18/03/2026 - Autos remetidos a central de calculo 
09/03/2026 - Ato ordinatrório - informa a expedição do alvará 
12/02/2026 - Expedição de alvará 
21/01/2026 - Disponibilizada no DJEN
20/01/2026 - Expedida intimação par SC
20/01/2026 - Despacho determinando expedição de alvará
13/01/2026 - Pet autor - informa dados bancários 
19/12/2025 - Pet SC - Informa o pagamento da condenação 
08/12/2025 - Pet autor - Solicita o trânsito em julgado do feito 
11/11/2025 - Publicação DJEN sobre a sentença
07/11/2025 - Intimação expedida para SC
07/11/2025 - Sentença - Pedido julgado procedente 
25/07/2025 - Conclusos
25/07/2025 - Petição Goldbrasil
22/07/2025 - Publicado no DJEN intimação
18/07/2025 - Expedida intimação para Goldbrasil
17/06/2025 - Certidão - alteração de prazo de 01/07 paea 03/07
11/06/2025 - Publicado no DJEN
09/06/2025 - Expedida intimação a SC
06/06/2025 - Petição Souza Cruz sem provas a produzir
27/05/2025 - Petição Goldbrasil
18/05/2025 - Confirmada a intimação
08/05/2025 - Despacho; Expedida intimação a SC.
22/04/2025 - Conclusos
20/03/2025 - Réplica do autor
09/03/2025 - Confirmada intimação para GOLDBRASIL
27/02/2025 - Expedida intimação para corré
26/02/2025 - Contestação de SC
23/02/2025 - Juntada de carta, comprovante de entrega a SC
16/02/2025 - Confirmada a intimação eletrônica de SC
13/02/2025 - Petição de Souza Cruz - cumprimento de decisão liminar
06/02/2025 - Confirmada Citação Eletrônica SC.
06/02/2025 - Concedida Antecipação de Tutela.
30/01/2025 - Conclusos.
30/01/2025 - Distribuído.'),
    ('5162780-78.2026.8.21.7000', '2026-06-12'::date, '12/06/2026 - Comunicação - pagamento de custas 
25/05/2026 - Intimação publicada para SC
25/05/2026 - Expedida intimação para SC
21/05/2026 - A. ordinatório pagamento de custas'),
    ('5081602-89.2025.8.21.0001', '2025-12-19'::date, '19/12/2025 - Baixa definitiva 
17/12/2025 - Alvará expedido em favor do autor 
17/12/2025 - Expedida intimação para  Souza Cruz 
17/12/2025 - Decisão -" Expeça-se alvará do valor depositado pelo réu"
09/12/2025 - Pet SC - Cumprimento de acordo 
05/12/2025 - Pet autor informando seus dados bancários 
02/12/2025 - Termo de acordo 
25/11/2025- Pet autor - Embargos de declaração 
24/11/2025 - Intimação publicada no DJEN 
20/11/2025 - Expedida intimação sobre o parecer para a  SC
20/11/2025 - Parecer Juiz Leigo - Acolhimento dos embargos,  excluindo a condenação ao pagamento da multa pelo descumprimento da tutela. 
11/11/2025 - Remetidos os autos ao juiz leigo 
10/11/2025 - Petição autor - Resposta ao ED
05/11/2025 - Despacho publicado no DJEN
03/11/2025 - Despacho - "intime-se a parte autora"
23/10/2025 - Embargos de declaração SC
13/10/2025 - Remetidos os autos a Vara 
13/10/2025 - Proferida decisão por juiz leigo
29/09/2025 - Remetidos os autos ao Juiz Leigo
29/09/2025 - Alterada a parte 
29/09/2025 - remetidos os autos a Vara
17/09/2025 - Conclusos
12/09/2025 - PETIÇÃO - PEDIDO DE LIMINAR/ANTECIPAÇÃO DE TUTELA
07/08/2025 - Resposta autor
06/08/2025 - AC realizada
06/08/2025 - Contestação Souza Cruz
05/07/2025 - Juntada de carta pelo correio da SC
17/06/2025 - Confirmada a citação eletrônica de Souza Cruz
16/06/2025 - Publicado no DJEN
13/06/2025 - Disponibilizado no DJEN
12/06/2025 - Expedida citação e intimação a SC
12/06/2025 - Expedição de carta pelo correio
28/05/2025 - Publicado no DJEN
26/05/2025 - Expedida intimação eletrônica do autor
23/05/2025 - Procuração SC; Petição SC
16/05/2025 - Confirmada a intimação de SC
06/05/2025 - Designada audiência de conciliação para o dia 06/08/2025, às 15h30, virtual
06/05/2025 - Expedida citação a Souza Cruz
05/05/2025 - Concedida a medida liminar - SC deve cessar as ligações de cobrança
11/04/2025 - Conclusos
11/04/2025 - Petição Autor 
10/04/2025 - Despacho para a autora
09/04/2025 - Conclusos para decisão
27/03/2025 - Distribuído'),
    ('5002247-50.2025.8.21.0156', '2026-05-08'::date, '08/05/2026 - Autos remetidos a 2° instância
06/03/2026 - Contrarrazões de apelação SC
11/02/2026 - Intimação publicada no DJEN
10/02/2026 - Intimação disponibilizada no DJEN
09/02/2026 - Expedida intimação para SC
09/02/2026 - Apelação - autor 
17/12/2025 - Intimação publicada no DJEN
15/12/2025 - Intimação expedida e publicada para Souza Cruz 
15/12/2025 - Sentença - Pedido julgado parcialmente procedente 
07/10/2025 - Conclusão
30/09/2025 - Petição Autora 
09/09/2025 - Publicado no DJEN
05/09/2025 - Expedida intimação a autora
29/08/2025 - Petição Souza Cruz - cumprimento do despacho
19/08/2025 - Publicada Intimação no DJEN
15/08/2025 - Decisão de saneamento e de organização do processo 
28/07/2025 - Conclusos
28/07/2025 - Réplica Autora
10/07/2025 - Publicado no DJEN
09/07/2025 - Disponibilizado no DJEN
08/07/2025 - Expedida intimação a autora
25/06/2025 - Contestação Souza Cruz
03/06/2025 - Confirmada a citação eletrônica de SC
29/05/2025 - Expedida a citação eletrônica
29/05/2025 - Proferido despacho - deixa de designar audiência e intime-se a parte ré para apresentar a defesa
23/05/2025 - Conclusos
21/05/2025 - Distribuição'),
    ('5002247-50.2025.8.21.0156', '2026-05-17'::date, '17/05/2026 - Remetidos os Autos com revisão de autuação
17/05/2026 - Redistribuído por sorteio em razão de incompetência'),
    ('5001384-25.2025.8.21.0082', '2026-04-23'::date, '23/04/2026 - Baixa definitiva 
23/04/2026 - Transito em julgado
27/11/2025 - Pet SC - Informa o pagamento por depósito judicial 
25/11/2025 - Expedida intimação para SC
25/11/2025 - Despacho - Deferimento de levantamento de valores 
25/11/2025 - Pet autor - Requer expedição de alvará
17/11/2025 - Pet autor - Reconhece o depósito de Futarom e solicita intimação da SC
14/11/2025 - Petição Futarom - Juntada de comprovante de pagamento
27/10/2025 - Sentença - Pedido julgado parcialmente procedente 
07/10/2025 - Conclusão
30/09/2025 - Petição Autora 
09/09/2025 - Publicado no DJEN
05/09/2025 - Expedida intimação a autora
29/08/2025 - Petição Souza Cruz - cumprimento do despacho
19/08/2025 - Publicada Intimação no DJEN
15/08/2025 - Decisão de saneamento e de organização do processo 
28/07/2025 - Conclusos
28/07/2025 - Réplica Autora
10/07/2025 - Publicado no DJEN
09/07/2025 - Disponibilizado no DJEN
08/07/2025 - Expedida intimação a autora
25/06/2025 - Contestação Souza Cruz
03/06/2025 - Confirmada a citação eletrônica de SC
29/05/2025 - Expedida a citação eletrônica
29/05/2025 - Proferido despacho - deixa de designar audiência e intime-se a parte ré para apresentar a defesa
23/05/2025 - Conclusos
21/05/2025 - Distribuição'),
    ('5014702-58.2025.8.21.0023', '2026-07-28'::date, '28/07/2026 - Intimação para SC sobre apelação publicada no DJEN
27/07/2026 - Apelação autor 
06/07/2026 - Intimação publicada no DJEN
02/07/2026 - Sentença de improcedência 
26/03/2026 - Concluso
10/02/2026 - Pet SC
22/01/2026 - Intimação publicada no DJEN
21/01/2026 - Disponibilização no DJEN
09/01/2026 - Expedida intimação para SC
09/01/2026 - Despacho - Mantém-se a inversão do ônus da prova e determina que as partes informem, no prazo de 15 dias, se possuem provas a produzir. 
09/09/2025 - Conclusos
09/09/2025 - Réplica
22/08/2025 - Publicado no DJEN
21/08/2025 - Disponibilizado no DJEN
20/08/2025 - Expedida intimação para o autor
20/08/2025 - Contestação Souza Cruz
19/08/2025 - Procuração Souza Cruz
30/07/2025 - Confirmada a citação eletrônica da Souza Cruz
29/07/2025 - Publicada intimação do autor
25/07/2025 - Expedida citação para Souza Cruz
25/07/2025 - Despacho - deferida a gratuidade de justiça, sem AC
16/07/2025 - Publicado no DJEN
15/07/2025 - Conclusos
14/07/2025 - Petição autor sem interesse na AC
14/07/2025 - Despacho - deve manifestar interesse na AC
30/06/2025 - Distribuiçãoi'),
    ('5021329-30.2025.8.21.0039', '2026-05-18'::date, '18/05/2026 - Trânsito e baixa
20/04/2026 - Intimação sobre despacho expedida e publicada no JDEN
16/04/2026 - Despacho - Processo extinto por desistência
16/04/2026 - Conclusos para julgamento 
24/02/2026 - Conclusos
27/01/2026 - Pet SC
26/01/2026 - Pet autora - Reitera o pedido de desistência do processo
09/12/2025 - Intimação publicada no DJEN
04/12/2025 - Expedida intimação para SC
04/12/2025 - "Intimem-se as partes para dizerem, em quinze dias: (a) se ainda pretendem produzir novas provas, especificando o fato a ser provado; (b) se têm interesse na realização de audiência de conciliação/mediação."
17/09/2025 - Autora requerendo a homologação da desistência do processo
12/09/2025 - Conclusos e Réplica
25/08/2025 - Publicado no DJEN
21/08/2025 - Expedida intimação para a autora
21/08/2025 - Contestação
31/07/2025 - Confirmada a citação eletrônica da Souza Cruz
30/07/2025 - Publicada no DJEN a intimação a autora
28/07/2025 - Expedida citação para a Souza Cruz
28/07/2025 - Despacho - Sem AC, cite-se a Souza Cruz para contestar
25/07/2025 - Distribuição'),
    ('5005684-81.2025.8.21.0065', '2026-07-10'::date, '10/07/2026 - Publicada no DJEN
08/07/2026 - Expedida intimação ao autor
 07/05/2026 - Pet SC
30/04/2026 - Intimação publicada no DJEN
28/04/2026 - expedida intimação sc 
28/04/2026 - Decisão - Tutela concedida 
06/04/2026 - Concluso
10/03/2026 - Intimação sobre o despacho publicado no DJEN
06/03/2026 - Despacho -  "Intime-se a parte contrária para que, querendo, manifeste-se sobre a petição retro e documentos juntados, no prazo legal, em observância ao princípio do contraditório."
23/01/2026 - Alterado assunto processual 
22/01/2026 - Conclusão 
09/01/2025 - Réplica 
29/12/2025 - Contestação SC
26/12/2025 - Procuração SC
02/12/2025 - Confirmada citação da SC 
27/11/2025 - Expedida citação SC 
27/11/2025 - Despacho - Posterga o julgamento da tutela de urgência e determina que as partes especifiquem e justifiquem o tipo de provas que pretendem produzir. 
29/09/2025 -Concluso 
16/09/2025 - Custas iniciais recolhidas
26/08/2025 - Publicado no DJEN
22/08/2025 - Expedida intimação; Publicada intimação.
22/08/2025 - Despacho - autor intimado a comprovar pagamento de custas
21/08/2025 - Distribuição'),
    ('5001089-29.2025.8.21.0036', '2026-01-29'::date, '29/01/2026 - Trânsito em julgado e baixa definitiva 
21/01/2026 - Intimação publicada no DJEN
19/12/2025 - Intimação para a parte autora Expedida e disponibilizada no DJEN
18/12/2025 - Sentença - Pedido autoral julgado parcialmente procedente 
02/12/2025 - Conclusos 
02/12/2025 - Autos remetidos a vara 
02/12/2025 - Proferida decisão por juiz leigo 
24/11/2025 - Autos remetidos ao Juíz leigo 
10/11/2025 - AIJ realizada 
10/11/2025 - Contestação SC
06/10/2025 - AC realizada'),
    ('2510021300100050000', '2025-11-11'::date, '11/11/2025 - Defesa apresentada SC'),
    ('5000015-62.2026.8.21.0081', '2026-08-05'::date, '05/08/2026 - Conclusos 
13/07/2026 - Petição  HNK BR
20/06/2026 - Despacho - Intimação para HNK BR
20/05/2026 - Conclusos 
18/04/2026 - Réplica 
04/04/2026 - Ato ordinatório - À parte autora para réplica.
13/03/2026 - Pet HNK
09/03/2026 - Contestação SC
23/02/2026 - Pet réu Florestal
23/02/2026  - Pet Réu HNK
13/02/2026- Confirmada citação SC 
10/02/2026 - Expedida citação 
10/02/2026 - Expedida a antecipação de tutela
08/01/2026 - Autos inclusos no Juízo.'),
    ('5000782-38.2026.8.21.0134', '2026-07-28'::date, '28/07/2026 - Intimação para SC sobre sentença publicada no DJEN
24/07/2026 - Homologada a decisão do juiz leigo
23/07/2026 - Proferida decisão por juiz leigo - procedente 
10/07/2026 - Proferida decisão por juiz leigo e conclusos para julgamento
22/06/2026 - Despacho - Afastamento da revelia 
2/06/2026 - Autos remetidos ao juiz leigo 
11/06/2026 - Réplica 
26/05/2026 - Intimação publicada no DJEN
22/05/2026 - Decisão - Acolhimento da impugnação a revelia 
21/05/2026  - Pet SC 
20/05/2026 - AIJ realizada 
06/05/2026 - Juntada de carta SC
05/05/2026 - AIJ designada para 20/05, 18h.
04/05/2026 - Pet autor - redesignação de aij
28/04/2026 - Réplica autor
22/04/2026 - AC realizada e AIJ designada para 06/05, às 18h
20/04/2026 - Contestação SC
17/04/2026 - Despacho - Defere redesignação
16/04/2026 - Pet autor - Solicita redesignação de AC 
19/03/2026 - expedida e disponibilizada intimação Sc
19/03/2026 - AC designada para 22/04/2026, às 18h35
18/03/2026 - Distribuido'),
    ('5008704-57.2026.8.21.0029', '2026-07-29'::date, '29/07/2026 - Certidão - Oautor juntou sua justificativa para a ausência na AC 
29/07/2026 - ac realizada
29/07/2026 - Procuração SC 
08/07/2026 - Mandado cumprido para Yuri Almeida
30/06/2026 - Confirmada citação SC
19/06/2026 - AC designada para 29/07, à 15H15 
01/06/2026 - Conclusos 
01/06/2026 - Despacho - Orientações sobre divergência cadastral'),
    ('5001343-68.2026.8.21.0132', '2026-07-29'::date, '29/07/2026 - Contestação SC (Cristiano carvalho)
08/07/2026 - Audiência Conciliação Realizada para 08/07/2026 - QUA. 14:00
06/07/2026 - Pet reu - Foco aluguel - subs
25/06/2026 - Petição réu foco aluguel - Interesse na audiência 
17/06/2026 - Autora informa que não tem interesse de audiência. 
02/04/2026 - AC realizada.'),
    ('0024359-74.2023.8.17.2001', '2024-04-29'::date, '29/04/2024 - Remessa ao 2º Grau.
04/04/2024 - Certidão informando erro na Remessa ao 2º Grau.
09/04/2024 - Remessa ao 2º Grau.
26/03/2024 - Contrarrazões da SC.
15/03/2024 - Contrarrazões da Global.
08/03/2024 - Contrarrazões do Bradesco.
12/02/2024 - Juntada de apelação
18/12/2023 - sentença de improcedência
14/12/2023 - Juntada de pet do autor
07/12/2023 -  Pet. da global
04/12/2023 - Pet da global
01/11/2023 -  Decisão Saneadora: "indefiro e as preliminares suscitadas pela parte demandada. Fixo o ponto controvertido conforme o item 2 acima especificado. Defiro a produção das provas úteis requeridas tempestivamente e assinalo o prazo de 15 (quinze) dias para que as partes especifiquem as provas que pretendem produzir, justificando a necessidade de produzi-las. Caso pretendam realizar a oitiva de testemunhas, o rol deverá ser apresentado nos autos no prazo de 10(dez) dias, consoante dispõe artigo 450 do CPC. Advirto as partes que as testemunhas arroladas deverão comparecer à audiência independente de intimação.Decorrido o prazo, cumprida a determinação supra, nada sendo requerido, o que deverá ser certificado pela secretaria, voltem-me os autos conclusos para sentença"; Despacho expedido em 14/11
25/09/2023 - Juntada de Petição de contestação
18/08/2023 - AC não realizada
20/06/2023 - Contestação da SC
13/06/2023 - Contestação do autor
25/05/2023 - Juntada de contestação da global; Remessa dos autos para CEJUSC
12/05/2023 - Juntada de petição
10/05/2023 - Juntada de petições; Expedição de certidão
05/05/2023 - Juntada de petição
19/04/2023 - Docs de representação SC
14/04/2023 - Docs de habilitação da parte
12/04/2023 - Docs de habilitação do autor
03/04/2023 - AC designada para 29/05/2023
27/03/2023 - Tutela indeferida
13/03/2023 - Distribuição'),
    ('0024359-74.2023.8.17.2001', '2026-06-16'::date, '16/06/2026 - Redistribuído por competência exclusiva em razão de sucessão
28/10/2025 - Conclusão 
07/01/2025 - Redistribuído por criação de nova unidade judiciária em razão de criação de unidade judiciária.
05/11/2024 - Redistribuído por criação de nova unidade judiciária em razão de criação de unidade judiciária
29/04/2024 - Concluso.
29/04/2024 - Remessa ao 2º Grau.'),
    ('2305015503200110000', '2025-04-04'::date, '04/04/2025 - Aguardando julgamento
21/11/2024 - Aguardando julgamento
18/11/2024 - Aguardando julgamento
19/07/2024 - Correspondente informou que o processo já possui decisão. Então, os autos foram remetidos para a assistência jurídica do município para verificação, se será ou não aplicada multa administrativa, o que, segundo o atendente do Procon, não tem prazo para que ocorra. 
12/07/2023 - Aguardando julgamento
26/06/2023 - Audiência realizada
01/06/2023 - Reclamação recebida; ac agendada para 26/06/23'),
    ('2204015500100713301', '2025-04-04'::date, '04/04/2025 - Aguardando julgamento
21/11/2024 - Aguardando Julgamento
18/11/2024 - Aguardando Julgamento
19/07/2024 - Aguardando Julgamento
13/04/2023 - Aguardando julgamento
21/03/23 - Aguardando julgamento'),
    ('2204015500100713301', '2026-07-07'::date, '07/07/2026 - Aguardando julgamento 
12/05/2026 - Aguardando julgamento 
09/04/2026 - Aguardando julgamento. 
03/03/2026 - Aguardando julgamento 
13/01/2025 - Aguardando julgamento. 
09/12/2025 - Aguardando julgamento. 
11/11/2025 - Aguardando julgamento 
14/10/2025 - Aguardando Julgamento. 
12/09/2025 - Aguardando julgamento
01/08/2025 - Aguardando julgamento
25/06/2025 - Aguardando julgamento
22/05/2025 - Aguardando julgamento
04/04/2025 - Aguardando julgamento
21/11/2024 - Aguardando Julgamento
18/11/2024 - Aguardando Julgamento
19/07/2024 - Aguardando Julgamento
13/04/2023 - Aguardando julgamento
21/03/23 - Aguardando julgamento'),
    ('52627001781201912', '2025-05-16'::date, '16/05/25 - Aguardando julgamento
25/07/2024 - Conforme informação por e-mail o processo se encontra em análise de recurso, realizada pela comissão de recurso do Inmetro.
07/07/2023 - Habilitação do BCW e cópia integral do processo enviada pelo correspondente.'),
    ('52627001781201912', '2025-11-26'::date, '26/11/2025 - Processo encontra-se na Comissão Pertinente aguardando homologação do recurso. 
11/11/2025 -  O processo está no Inmetro/RJ, o IPEM/PE entrará em contato para verificar seu andamento.
21/10/2025 - Aguardando julgamento
12/09/2025 - Aguardando julgamento
29/07/2025 - Aguardando julgamento
20/06/2025 - Aguardando julgamento
16/05/25 - Aguardando julgamento
25/07/2024 - Conforme informação por e-mail o processo se encontra em análise de recurso, realizada pela comissão de recurso do Inmetro.
07/07/2023 - Habilitação do BCW e cópia integral do processo enviada pelo correspondente.'),
    ('52627003852201911', '2026-04-16'::date, '16/04/2026 - Insubsistência 
16/05/25 - Aguardando julgamento
25/07/2024 - Conforme informação por e-mail o processo se encontra em análise de recurso, realizada pela comissão de recurso do Inmetro.
21/07/2023 - Habilitação do BCW e cópia integral do processo enviada pelo correspondente.'),
    ('52627003852201911', '2025-11-11'::date, '11/11/2025 - O processo será arquivado por insubsistência.
21/10/2025 - Aguardando julgamento
12/09/2025 - Aguardando julgamento
29/07/2025 - Aguardando julgamento
20/06/2025 - Aguardando julgamento
16/05/25 - Aguardando julgamento
25/07/2024 - Conforme informação por e-mail o processo se encontra em análise de recurso, realizada pela comissão de recurso do Inmetro.
21/07/2023 - Habilitação do BCW e cópia integral do processo enviada pelo correspondente.'),
    ('52627007372201831', '2026-04-16'::date, '16/04/2026 - Insubsistência
16/05/25 - Aguardando julgamento
25/07/2024 - Conforme informação por e-mail o processo se encontra em análise de recurso, realizada pela comissão de recurso do Inmetro.
07/07/2023 - Habilitação do BCW e cópia integral do processo enviada pelo correspondente.'),
    ('52627007372201831', '2025-10-21'::date, '21/10/2025 - Aguardando arquivamento após julgamento pela insubsistência do auto 
12/09/2025 - Em 11/09 houve notificação da decisão, será arquivado em alguns dias (notificação no IM)
29/07/2025 - Comissão Recursal do Inmetro decidiu pela Insubsistência do Auto.
20/06/2025 - Aguardando julgamento
16/05/25 - Aguardando julgamento
25/07/2024 - Conforme informação por e-mail o processo se encontra em análise de recurso, realizada pela comissão de recurso do Inmetro.
07/07/2023 - Habilitação do BCW e cópia integral do processo enviada pelo correspondente.'),
    ('52627001924201805', '2025-05-16'::date, '16/05/25 - Aguardando julgamento
25/07/2024 - Conforme informação por e-mail o processo se encontra em análise de recurso, realizada pela comissão de recurso do Inmetro.
07/07/2023 - Habilitação do BCW e cópia integral do processo enviada pelo correspondente.'),
    ('52627001924201805', '2025-11-26'::date, '26/11/2025 - Processo encontra-se na Comissão Pertinente aguardando homologação do recurso.
11/11/2025 - Encaminhado para o Rio de Janeiro 
21/10/2025 - Aguardando julgamento
12/09/2025 - Aguardando julgamento
29/07/2025 - Aguardando julgamento
20/06/2025 - Aguardando julgamento
16/05/25 - Aguardando julgamento
25/07/2024 - Conforme informação por e-mail o processo se encontra em análise de recurso, realizada pela comissão de recurso do Inmetro.
07/07/2023 - Habilitação do BCW e cópia integral do processo enviada pelo correspondente.'),
    ('0001012-65.2024.8.17.2360', '2026-05-07'::date, '07/05/2026 - Arquivamento 
14/04/2026 - Expedido alvará 
04/03/2026 - Certidão sobre alvará 
26/02/2026 - Pet SC sobre custas finais 
19/02/2026 - Despacho - Determina expedição do alvará 
12/02/2026 - Pet SC
06/02/2026 - Decisão determina evolução da classe processual.
27/01/2026 - Pet autor requerendo cumprimento de sentença 
23/01/2026 - Intimação disponibilizada DJEN
21/01/2026 - Autos devolvidos 
21/01/2026  - Realizado cálculo de custas
19/12/2026 - Expedição de intimação DJEN
19/12/2025 - Autos remetidos a 6° contadoria de custa para apurar custas finais 
14/11/2025 - Ácordão - ED parcialmente acolhido
19/09/2025 - Embargos de declaração. 
26/08/2025 - Relatório
15/05/2025 - Remetidos os autos para a instância superior
15/05/2025 - Certidão - SC não se manifestou
10/04/2025 - Expedida intimação da sentença
04/04/2025 - APELAÇÃO parte autora
24/02/2025 - SENTENÇA - Pedidos da pet inicial julgados IMPROCEDENTES. 
27/12/2024 - Juntada de petição pela SC indicando que não há mais provas a serem produzidas.
06/12/2024 - Ato ordinatório praticado, no qual intimou as partes para, no prazo de 05 (cinco) dias, informarem se pretendem produzir outras provas, especificando-as em caso positivo.
21/11/2024 - Juntada réplica pelo autor.
30/09/2024 - Contestação
09/09/2024 - AC sem acordo
27/08/2024 - Manifestação - MP não atua.
21/08/2024 - Certidão "Registro, para os devidos fins, que houve ciência expressa de citação/intimação por meio do Domicílio Judicial Eletrônico."
20/08/2024 - Citação
25/07/2024 - Decisão determinando a citação
25/07/2024 - Designada AC - Designo o dia 09 de setembro de 2024, às 10:20h, para realização de audiência de tentativa de conciliação. Citem-se/intimem-se as partes para o comparecimento no dia e horário no Fórum local.  
10/07/2024 - Distribuição'),
    ('0001012-65.2024.8.17.2360', '2025-12-19'::date, '19/12/2025 - Arquivado definitivamente 
19/12/2025 - Baixa definitiva 
19/12/2025 - Autos remetidos para instância de origem
26/11/2025 - Intimação publicada no DJEN
24/11/2025 - Expedida publicação sobre o ácordão no DJEN
14/11/2025 - Ácordão - ED parcialmente acolhido
28/10/2025 - Conclusão 
11/10/2025 - Disponibilizado no DJ. 
19/09/2025 - Juntada EDs Souza Cruz
12/09/2025 - Publicação da Intimação
10/09/2025 - Expedição de publicação
09/09/2025 - Acórdão - Souza Cruz condenada ao pagamento de R$ 10.000,00
08/09/2025 - Memoriais Souza Cruz
28/08/2025 - Inclusão em pauta para julgamento de mérito
26/08/2025 - Relatório
15/05/2025 - Conclusos para admissibilidade recursal
15/05/2025 - Recebidos os autos'),
    ('0000336-54.2025.8.17.8222', '2026-07-20'::date, '20/07/2026 - Arquivado definitivamente
23/06/2026 - Expedição de Alvará 
12/06/2026 - AR para Williams entregue  
02/06/2026 - Certidão 
25/05/2026 - Processo reativado.
25/05/2026 - Petição SC 
20/03/2026 - Trânsito e arquivamento 
19/03/2026 - AR Williams
26/02/2026 - Intimação sobre sentença publicada 
13/02/2026 - Sentença - Pedidos julgados parcialmente procedentes 
09/09/2025 - Conclusos
20/08/2025 - Termo de Audiência
20/08/2025 - Contestação SC
18/03/2025 - Ciência da citação de SC
16/03/2025 - Expedida Citação para Souza Cruz
22/01/2025 - Distribuído.'),
    ('0000485-50.2025.8.17.8222', '2026-06-08'::date, '08/6/2026 - Juntada de CR autor 
26/05/2026 - Decisão publicada no djen
19/05/2026 - Decisão - Recurso recebido 
08/05/2026 - Conclusos 
06/04/2026 - RI Global
28/04/2026 - Pet autor - Ciência da sentença de ED
23/04/2026 - Intimação sobre sentença publicada no DJEN 
19/04/2026 - Sentença - ED''s Global não acolhidos 
17/03/2026 - Conclusão 
12/03/2026 - Contrarrazões autor em resposta dos ED global
03/03/2026 - Intimação sobre a resposta dos ED
23/02/2026 - RI autor 
13/09/2026 - ED global
05/02/2026 - Intimação sobre senteça publicada no DJEN
30/01/2026 - SENTENÇA - Pedido julgado parcialmente procedente 
27/08/2025 - Contestação Souza Cruz
26/08/2025 - Manifestação autor
25/08/2025 - Petição Global
21/08/2025 - Contestação Global
20/08/2025 - Petição autor requerendo audiência virtual
31/03/2025 - Ciência da citação
27/03/2025 - Ciência da citação
26/03/2025 - Expedida Citação para SC acerca de audiência designada para o dia 27/08/2025, às 13:30, presencial.
31/01/2025 - Distribuído'),
    ('0000485-50.2025.8.17.8222', '2026-06-17'::date, '17/06/2026 - Autos recebidos'),
    ('0000641-48.2025.8.17.3110', '2026-08-03'::date, '03/08/2026 - Pet autor - Requer liberação do alvará e honorários 
13/07/2026 - Publicado Despacho\Intimação\Intimação (Outros) em 13/07/2026.
22/06/2026 - Despacho - Orientações sobre cumprimento de sentença 
21/05/2026 - Conclusos 
21/05/2026 - Classe evoluida para cumprimento de sentença 
20/05/2026  - Juntada da parte autora apresentando a planilha de calculo 
15/05/2026 - Pet autor - Execução 
15/05/2026 - Pet SC
28/04/2026 - Intimação publicada no DJEN
27/04/2026 - Expedição de publicação no DJEN 
30/03/2026 - Autos remetidos para a secretaria 
30/03/2026 - Cálculo realizado
18/03/2026 - Autos remetidos a contadoria de custas
11/12/2025 - Autos remetidos a instância superior
27/11/2025 - Contrarrazões Souza Cruz 
31/10/2025 - Intimação informando sobre o despacho 
30/09/2025 - Apelação
19/09/2025 - Julgado improcedente o pedido
08/08/2025 - Conclusos
29/07/2025 - Petição Souza Cruz sem provas
20/07/2025 - Petição autor - não tem provas a produzir
16/07/2025 - Publicado despacho
14/07/2025 - Despacho - partes intimadas a se manifestar sobre produção de provas
12/07/2025 - Réplica à Contestação
08/07/2025 - Expedição de publicação ao Diário de Justiça Eletrônico Nacional
30/05/2025 - Contestação SC
10/05/2025 - Certidão de que não houve ciência da citação
06/05/2025 - Expedida citação a SC
27/03/2025 - Pet parte autora concordando com o auto digital
24/03/2025 - DECISÃO - pedido de tutela antecipada de urgência indeferido.
19/03/2025 - Distribuição'),
    ('0000641-48.2025.8.17.3110', '2026-03-20'::date, '20/03/2026 - Transitado em julgado em 17/03 e arquivamento 
23/02/2026 - Intimação publicada 
19/02/2026 - Acórdão publicado no DJEN
09/02/2026 - Acórdão - Parcial provimento 
15/12/2025 - Conclusos'),
    ('2504015505000037301', '2026-07-07'::date, '07/07/2026 - Aguardando Assinatura do juridíco 
12/05/2026 - Aguardando assinatura do jurídico para o julgamento 
08/04/2026 - Aguardando assinatura do jurídico para o julgamento 
11/12/2025 - Aguardando julgamento
11/11/2025 - Aguardando julgamento
22/10/2025 - Aguardando julgamento no Procon de Recife 
06/08/2025 - Será enviada para o Procon de Recife para julgamento
03/07/2025 - Fundamentada e não atendida 
18/06/2025 - Audiência de Conciliação
17/06/2025 - Defesa enviada'),
    ('0074820-79.2025.8.17.2001', '2026-07-14'::date, '14/07/2026 - Petição autor pugnando pelo julgamento antecipado
13/07/2026 - Disponibilizado no DJEN
19/06/2026 - Despacho - Produção de provas 
04/05/2026 - Juntada docs autor 
01/05/2026 - Juntada de réplica 
04/04/2026 - Conclusão 
17/03/2026 - Contestação SC
23/02/2026  - Autos recebidos pela vara de origem
23/02/2026 - Autos enviados a vara de origem
23/02/2026 - ATA AC 
23/02/2026 - Pet SC 
13/02/2026 - Remetidos os Autos para Central de Audiências da Capital23
19/01/2026 - Expedida citação e disponibilizada no DJEN
30/12/2025 - Despacho - Redesignação de AC para 23/02/2025, às 10h. 
05/12/2025 - Juntada de petição 
04/12/2025 - Juntada de certidão 
01/12/2025 - Conclusos
26/11/2025 - Certidão -AC  será reagendada 
14/10/2025 - Expedida citação SC
08/10/2025 - Despacho determinando a remarcação da audiência para 10/12/2025, às 10h. 
01/10/2025 - conclusão 
22/09/2025 - Juntada de Pedido de Assistência Jurídica
11/09/2025 - Publicado o Despacho
09/09/2025 - Expedida intimação a parte autora
05/09/2025 - Despacho - autor deve emendar a inicial
03/09/2025 - Conclusos
02/09/2025 - Distribuição'),
    ('0006225-83.2025.8.17.8223', '2025-12-15'::date, '15/12/2025 - Arquivamento 
15/12/2025 - Trânsito em julgado
27/11/2025 - Intimação sobre sentença publicada
25/11/2025 - Expedida a publicação sobre a sentença 
25/11/2025 - Sentença - Indeferimento dos pedidos da inicial e julga extinto sem resolução do mérito 
19/11/2025 -  Certidão - Inércia da parte autora 
30/10/2025 - Intimação para parte autora.'),
    ('0050337-82.2025.8.17.2001', '2026-07-28'::date, '28/07/2026 - Intimação publicada 
24/07/2026 - Expedida intimação para SC sobre a produção de provas 
13/07/2026 - conclusos
01/07/2026 - Réplica
02/06/2026 - Pet - Sem provas a produzir 
18/05/2026 - Despacho - provas 
28/04/2026 - Conclusos 
22/04/2026 - Contestação SC
30/03/2026 - Certidão sobre citação 
25/03/2026 - Expedida citação SC
18/03/2026 - Pet autor informando o pagamento de custas 
20/02/2026 - Ato ordinatório publicado no DJEN 
20/02/2026 - Ato ordinatório 
20/02/2026 - AR não recebido SC 
14/11/2025 - Citação expedida
04/11/2025 - Pet autor - Juntada de custas AR
09/10/2025 - Intimação parte autora'),
    ('0300281-52.2018.8.24.0083', '2024-04-11'::date, '11/04/2024 - Baixa
02/10/2023 - Recebidos os autos - TJSC -> KPOUN
28/09/2023 - Pet SC confirmando pg
13/09/2023 - Juntada de guia de pg de custas finais
18/08/2023 - Remetidos os Autos à Contadoria (Custas) - KPOUN -> DCJE; Intimação expedida para SC
11/08/2023 - Transitado em Julgado - Data: 28/06/2023
26/05/2023 - Ato ordinatorio: "As partes ficam intimadas para, no prazo de 15 (quinze) dias, manifestarem-se sobre o retorno dos autos da segunda instância."; intimação expedida para SC.
23/05/2023 - Recebidos os autos - TJSC -> KPOUN
03/04/2023 - Julgado apelação
29/06/21 - Remessa ao TJSC
27/05/21 - Contrarrazões
28/04/21 - Intimação; Ato ordinatório - Apresentar contrarrazões
06/04/21 - Recurso adesivo e contrarrazões do autor
12/03/21 - Confirmada intimação das partes sobre juntada de Apelação                                                                                                                                                                                                                                      02/03/21 - Intimações expedidas
19/02/21 - Apelação recebida
31/08/20 - Conclusos para decisão
21/07/20 - Substabelecimento
11/07/20 - Decurso de prazo
06/07/20 - Registro de pagamento
03/07/20 - Apelação
01/07/20 - Certidão de suspensão de prazo
19/06/20 - Intimação eletrônica
18/06/20 - Intimação eletrônica
10/06/20 - Renúncia ao prazo e intimação
09/06/20 - Renúncia ao praco e intimação
08/06/20 - Intimação eletrônica
27/05/20 - Sentença de procedência
08/05/20 - Certificada a publicação do advogado
06/05/20 - Processo migrado para o eproc
20/11/2019 - Conclusos para sentença                           26/06/2019   Conclusos para despacho'),
    ('5000930-29.2023.8.24.0083', '2026-08-03'::date, '03/08/2026 - Intimação sobre pauta publicada no djen
31/07/2026 - Intimação expedida sobre a sessão 
31/07/2026 - Inclusão na pauta do relator
19/05/2026 - Conclusos 
22/04/2026 - Expedida e publicada intimação para SC no DJEN para contrarrazões 
20/04/2026 - Apelação autor 
20/04/2026 - Pet SC - Requer expedição de alvará
27/03/2026 - Expedida e publicada intimação no DJEN
27/03/2026 - Extinta a execução - Acolhe a impugnação no excesso de execução e extingue 
25/06/2025 - Conclusos
11/06/2025 - Petição de manifestação SC
06/06/2025 - Publicado no DJEN
04/06/2025 - Confirmada intimação do autor
03/06/2025 - Expedida intimação para SC
03/06/2025 - Publicadas as intimações
03/06/2025 - Petição do autor
19/05/2025 - Expedida intimação de Souza Cruz
19/05/2025 - Despacho - intime-se a exequente'),
    ('2504030900100506301', '2025-05-12'::date, '12/05/2025 - Protocolada Defesa'),
    ('2504030900100506301', '2026-04-09'::date, '09/04/2026 - Foi proferida decisão final, determinando a reclamante buscar o poder judiciário. 
17/03/2026 - Encontra-se na ánalise técnica 
13/01/2026 - Encontra-se na ánalise tecnica (essa fase ocorre entre a defesa e o julgamento). Foi informado pelo telefone que o autor não possui mais interesse no caso. 
09/12/2025 - Aguardando julgamento na analise tecnica  
11/11/2025 - Aguardando julgamento 
21/10/2025 - Aguardando julgamento
01/08/2025 - Aguardando julgamento
27/06/2025 - Aguardando julgamento 
23/05/2025 - Aguarda manifestação de North Side, ainda não foi encaminhado a decisão
12/05/2025 - Protocolada Defesa'),
    ('5003572-79.2025.8.24.0058', '2026-08-03'::date, '03/08/2026 - Conclusos para despacho
03/08/2026 - CR SC
27/07/2026 - CR mapfre
13/07/2026 - Publicado no DJEN prazo 03/08/2026
09/07/2026 - Expedida intimação para contrarrazões SC
08/07/2026 - apelação autor
16/06/2026 - Intimação publicada no DJEN para SC
15/06/2026 - Declarada a prescrição 
08/06/2026 - Conclusos 
04/05/2026 - Comunicação eletrônica de baixa de AI recebida
30/04/2026 - Conmunicação eletrôncia de trânsito em julgado recebida 
31/03/2026 - Comunicação eletrônica da decisão recebida
06/03/2026 - Conclusos
24/02/2026 - Cancelamento de movimentação processual 
12/02/2026 - Pedido de suspensão dos autos 
12/02/2026 - Distribuição de Agravo de instrumento 
22/01/2026 - Intimação para a parte autora disponibilizada no DJEN
21/01/2026 - Disponibilização no DJEN
09/01/2026 - Juntada de custas para o autor 
09/01/2025 - Expedida intimação para SC
09/01/2025 - Despacho - Revogação da JG
05/12/2025 - Conclusão
11/11/2025 - Petição autora - Juntada de documentos para a comprovação da Hipossuficiência 
20/10/2025 - Publicado no DJEN
14/10/2025 - Juntada de certidão - Prazo prorrogado 
19/09/2025 - Publicado no DJEN a intimação eletrônica SC
17/09/2025 - Despacho - Determinada a intimação do autor para comprovar a hipossuficiência sob pena de revogação do benefício
01/09/2025 - Conclusos
31/08/2025 - Petição corréu Rafael Jung
29/08/2025 - Réplica autor
25/08/2025 - Publicada intimação do autor no DJEN
22/08/2025 - Ofício - "foi procedida a anotação da penhora no rosto dos autos em epígrafe (certidão anexa), conforme despacho oriundo dos autos n. 0000736-69.2020.5.12.0030, em trâmite nessa unidade."
21/08/2025 - Certidão - penhora
21/08/2025 - Expedida intimação ao autor
20/08/2025 - Juntada de mandado cumprido - Rafael Jung
19/08/2025 - Juntada de peças digitalizadas
14/08/2025 - Expedido mandado para Rafael Jung
12/08/2025 - Expedição de carta para corréu
08/08/2025 - Publicada intimação do autor
07/08/2025 - Disponibilizado no DJEN intimação do autor
05/08/2025 - Contestação Souza Cruz
05/08/2025 - Procuração Eliane
30/07/2025 - Contestação Corré
30/07/2025 - Procuração corré
18/07/2025 - Ciência do autor, com renúncia ao prazo
15/07/2025 - Confirmada a citação eletrônica de Souza Cruz
10/07/2025 - Expedição de ofício a corréu
10/07/2025 - Expedida intimação para Souza Cruz
09/07/2025 - Publicação de intimação do autor
08/07/2025 - Petição autor - não tem outras contas bancárias
07/07/2025 - Despacho - ao autor para anexar extratos de suas contas
03/07/2025 - Conclusos
02/07/2025 - Petição autor comprovando hipossudiciência
11/06/2025 - Publicado no DJEN
09/06/2025 - Expedida intimação ao autor
09/06/2025 - Despacho - autor intimada para comprovar hipossuficiência
04/06/2025 - Conclusos
03/06/2025 - Petição autor
23/05/2025 - Publicado no DJEN intimação ao autor
19/05/2025 - Expedida a comunicação eletrônica autor
19/05/2025 - Distribuição'),
    ('5011024-86.2026.8.24.0000', '2026-05-04'::date, '04/05/2026 - Baixa definitiva 
04/05/2026 - Custas Satisfeitas
30/04/2026 - Remetidos os autos para contadoria 
30/04/2026 - Trânsito em julgado
07/04/2026 - Expedida e publicada intimação SC 
31/03/2026 - Acórdão - Recurso provido 
11/03/2026 - Conclusos 
09/03/2026 - CR Mafre
19/02/2026 - Intimação publicada no DJEN
13/02/2026 - Expedida intimação SC
13/02/2026 - Concedida liminar 
12/02/2026 - Distribuição'),
    ('5002905-98.2025.8.24.0024', '2025-12-04'::date, '04/12/2025 - Baixa definitiva 
04/12/2025 - Expedida a comunicação eletronica 
04/12/2025 - Atos da Contadoria
02/12/2025 - Alvará assinado no SIDEJUD
28/11/2025 - Transito em julgado 
25/11/2025 -  Intimação SC
25/11/2025 - Decisão - Extinta a execução e intimação para a parte autora informar seus dados bancários 
24/11/2025 - Pet SC
18/11/2025  - Intimação para SC publicada no DJEN
17/11/2025 - Petição autora - Requer a intimação da SC para  o pagamento da condenação
10/11/2025 - Publicado no DJEN
06/11/2025 - Autos remetidos à contadoria para custas 
06/11/2025 - Transitado em julgado (1° instância)
06/11/2025 - Transitado em julgado e baixa definitiva (recurso) 
14/10/2025 - Publicado no DJEN
10/10/2025 - Comunicação eletrônica recebida e julgado Apelação
03/10/2025 - Conclusos 
29/09/2025 - Expedida a comunicação eletronica 
29/09/2025 - Distribuído por sorteio 
29/09/2025 - Contrarrazões apresentadas pela Souza Cruz
09/09/2025 - Publicada intimação da Souza Cruz
03/09/2025 - Expedida intimação para a Souza Cruz
03/09/2025 - Apelação
03/09/2025 - Publicada no DJEN
01/09/2025 - Expedida intimação para a Souza Cruz
01/09/2025 - SENTENÇA - Julgado procedente o pedido
31/08/2025 - Petição Souza Cruz
27/08/2025 - Expedida intimação para a Souza Cruz
27/08/2025 - Despacho - intime-se a ré para se manifestar
26/08/2025 - Conclusos
26/08/2025 - Petição autor - testemunha
21/08/2025 - Petição SC sem provas
05/08/2025 - Intimações publicadas no DJEN
31/07/2025 - Expedida intimação para Souza Cruz
31/07/2025 - Decisão interlocutória - partes devem se manifestar sobre provas
31/07/2025 - Réplica
14/07/2025 - Publicado no DJEN
11/07/2025 - Disponibilizado no DJEN
10/07/2025 - Expedida intimação ao autor
10/07/2025 - Autor deve se manifestar sobre a contestação
09/07/2025 - Procuração e Contestação Souza Cruz
18/06/2025 - Confirmada a intimação eletrônica da Souza Cruz
11/06/2025 - Publicado no DJEN
09/06/2025 - Expedida intimação para SC
09/06/2025 - Despacho - tutela de urgência indeferida
04/06/2025 - Petição autor requerendo prosseguimento do feito
03/06/2025 - Publicado no DJEN
30/05/2025 - Expedida intimação para autor
30/05/2025 - Distribuído'),
    ('5002332-43.2025.8.24.0159', '2026-07-30'::date, '30/07/2026 - Baixa definitiva
29/07/2026 - Transitado em julgado 
08/07/2026 - Sentença Publicada no DJEN
07/07/2026 - Intimação sobre sentença disponibilizada no DJEN
06/07/2026 - sentença parcialmente procedente
05/03/2026 - Conclusos 
05/03/2026 - ATA AC
05/03/2026 - Réplica 
05/03/2026 - Petição SC 
22/12/2025 - Confirmada citação SC
18/12/2025 - Intimação e citação publicada no DJEN
17/12/2025 - Expedida intimação e citação para SC
15/12/2025 - Decisão - Liminar concedida 
15/12/2025 - Audiência designada para 05/03/2026, às 16h, por meio de videoaudiência.
12/12/2025 - Pet autor anexando documentos 
21/11/2025 - Substabelecimento autor
18/11/2025 - Intimação autora disponibilizada no DJEN
17/11/2025 - Intimação para a parte autora'),
    ('5022875-39.2025.8.24.0039', '2026-08-05'::date, '05/08/2026 - Transito em julgado
21/07/2026 - Publicado no DJEN
16/07/2026 - Proferida sentença julgando parcialmente procedente
13/05/2026 - Conclusos
12/05/2026 - Réplica
28/01/2026 - Contestação SC
27/01/2026 - Procuração SC
17/12/2025 - Juntada
12/12/2025 - Pet autor - Requer cumprimento da liminar'),
    ('5000074-88.2026.8.24.0009', '2026-07-16'::date, '16/07/2026 - Baixa definitiva
08/07/2026 - Trânsito em julgado
16/06/2026 - Intimação sobre acordão publicado no DJEN
12/06/2026 - Acórdão - Conhecido e provido o recurso 
25/06/2026 - Intimação sobre pauta disponibilizada no DJEN
22/05/2026 - Inclusão em pauta no dia 11/06/2026.
04/05/2026 - Conclusos
30/04/2026 - Juntada - Boleto pago 
24/04/2026 - Juntada de guia para a parte autora
24/04/2026 - Decisão - Determina intimação para o autor realizar o pagamento
22/04/2026 - Conclusos
22/04/2026 - Pet autor - Opta pelo processo regular recursal e requer recolhimento de custas 
13/04/2026 - Decisão - Requer que a parte autora comprove hipossuficiência
10/04/2026 - Autos remetidos para o 2° grau
08/04/2026 - CR SC
24/03/2026 - Intimação sobre RI disponibilizada no DJEN 
23/03/2026 - Ato ordinatório - Contrarrazões em 10 dias 
20/03/2026 - RI autor 
04/03/2026 - Intimação sobre Sentença publicada no DJEN
04/03/2026 - Sentença - Pedido julgado procedente 
04/03/2026 - Contestação SC 
23/02/2026 - AR enviado SC
06/02/2026 - Pet SC 
30/01/2026 - Confirmada intimação SC'),
    ('5000179-65.2026.8.24.0009', '2026-08-10'::date, '10/08/2026 - Intimação publicada no DJEN
10/08/2026 - inclusão no período entre 26/08/2026 00:00 a 02/09/2026 23:59
15/05/2026 - Conclusos 
12/05/2026 - Boleto pago pela parte autora 
27/04/2026 - Juntada de guia para a parte autora
27/04/2026 - Decisão - Determina intimação para o autor realizar o pagamento
15/04/2026 - Contrarrazões SC
01/04/2026 - Intimação para SC disponibilizada no DJEN sobre CR
31/03/2026 - Expedida a intimação eletrônica SC
31/03/2026 - Ato ordinatório - Contrarrazões em 10 dias 
31/03/2026 - Recurso inominado 
23/03/2026 - Intimação publicad no DJEN
19/03/2026 - Sentença  - Pedido julgado procedente 
18/03/2026 - AC - sem acordo 
18/03/2026 - Réplica 
18/03/2026 - Contestação Sc 
25/02/2026 - Enviada carta para SC 
12/02/2026 - Confirmada  intimação SC
03/02/2026 - Expedição de oficio 
03/02/2026 - Expedida citação SC 
03/02/2026 - Concedida a tutela 
03/02/2026 - AC designada para 18/03/2026, às 17h30'),
    ('5007439-57.2026.8.24.0022', '2026-06-17'::date, '17/06/2026 - Conclusos
16/06/2026 - Pet - Autor especifica provas a produzir 
08/06/2026 - carta enviada via correios.
03/06/2026 - Intimação para SC publicada no DJEN e 
03/06/2026 - Intimação publicada para SC 
03/06/2026 - Despacho - Produção de provas 
20/05/2026 - Conclusos 
20/05/2026 -Petição autor 
08/05/2026 - Ato ordinatório - Fica intimada a parte autora para apresentar manifestação sobre a contestação
08/05/2026 - Contestação 
20/04/2026 - Confirmada intimação SC
14/04/2026 - Intimação publicada no DJEN
10/04/2026 - Expedida a citação e intimação Souza Cruz 
10/04/2026 - Concedida Liminar 
10/04/2026 - Distribuído'),
    ('5011108-67.2026.8.24.0039', '2026-08-11'::date, '11/08/2026 - Expedição de oficio 
03/08/2026 - Despacho - determino ao Cartório Judicial que proceda à retificação do cadastro processual da Souza Cruz
16/07/2026 - Despacho - emenda à inicial
15/07/2026 - Petição autor
07/07/2026 - Despacho - Emenda à inicial 
15/05/2026- Conclusos'),
    ('0023654-22.2016.8.19.0205', '2026-07-13'::date, '13/07/2026 - Remessa à central de arq
14/05/2026 - Evolução de classe processual 
09/03/2026 - Despacho publicado no DJEN 
07/03/2026 - Despacho - Remete os autos para a central de arquivamento 
19/01/2026 - Conclusão 
20/10/2025 - Enviado para publicação 
17/10/2025 - Despacho - "Considerando o alegado pelo para embargada, ao cartório para certificar se assiste razão à parte." 
23/09/2025 - Conclusos; e Certificado o recolhimento correto das custas para desarquivamento
28/08/2025 - Petição Souza Cruz 
28/08/2025 - Desarquivado o processo'),
    ('0027468-19.2009.8.19.0001', '2026-03-06'::date, '06/03/2026 - Arquivamento 
18/12/2025 - Ato enviado para publicação 
16/12/2025 - Ato ordinatório - " À parte interessada para impulsionar o feito, no prazo de 10 (dez) dias, sob pena de retorno dos autos ao arquivo."
31/08/2025 - Juntada de petição'),
    ('17001003220000345', '2025-04-04'::date, '04/04/2025 - Aguardando decisão
13/02/2025 - o último andamento ocorreu em 31/01/2025, estão aguardando o AR do despacho administrativo de 16/11/2023
19/07/2024 - Segundo informações da correspondente na Superintendência não foi disponibilizada certidão, mas a última movimentação do processo foi que a decisão foi disponibilizada às partes, ainda em 2023 e não há a juntada de comprovantes de pagamento ou certidão de arquivamento.
31/10/2023 - Processo ainda está aguardando julgamento devido a alta demanda.
13/07/23 - em 29/06/23 o processo foi devolvido para o procon de Aragaína aos cuidados do funcionário Frankllin para que seja julgado.
10/04/2023 - Aguardando análise para julgamento
22/03/23 - Aguardando análise para julgamento
AC 09/03/22 às 15:20h'),
    ('17001003220000345', '2026-05-12'::date, '12/05/2026 - Se encontra no setor de notificação 
09/04/2026 - Se encontra no setor de notificação 
17/03/2026 - A servidora informou que já houve julgamento e está aguardando assinatura. Disse que em breve seremos notificados. 
19/02/2026 - Aguardando distribuição para julgamento.
13/01/2025 - Aguardando distribuição para julgamento 
18/12/2025 - Juntada de AR
11/11/2025 - Juntada de AR
11/06/2025 - Houve decisão, sendo que já havia sido enviada via AR
30/05/2025 - A atendente me informou que já teve decisão, porém não me enviou
04/04/2025 - Aguardando decisão
13/02/2025 - o último andamento ocorreu em 31/01/2025, estão aguardando o AR do despacho administrativo de 16/11/2023
19/07/2024 - Segundo informações da correspondente na Superintendência não foi disponibilizada certidão, mas a última movimentação do processo foi que a decisão foi disponibilizada às partes, ainda em 2023 e não há a juntada de comprovantes de pagamento ou certidão de arquivamento.
31/10/2023 - Processo ainda está aguardando julgamento devido a alta demanda.
13/07/23 - em 29/06/23 o processo foi devolvido para o procon de Aragaína aos cuidados do funcionário Frankllin para que seja julgado.
10/04/2023 - Aguardando análise para julgamento
22/03/23 - Aguardando análise para julgamento
AC 09/03/22 às 15:20h'),
    ('17001003220000080', '2025-04-04'::date, '04/04/2025 - Aguardando decisão
19/07/2024 - Neste caso, como o processo foi encaminhado para o setor de notificação, haverá o envio para as partes para a intimação do último despacho.
31/10/2023 - Processo está aguradando julgamento.
13/07/2023 - Processo foi encaminhado para gerencia do júridico e está aguardando julgamento.
10/04/2023 - Aguardando análise para julgamento
22/03/23 - Aguardando análise para julgamento
AC realizada em 25/04/22.'),
    ('17001003220000080', '2026-04-09'::date, '09/04/2026 - A reclamação aguarda assinatura do julgamento pelo jurídico 
17/03/2026 - A reclamação está aguardando julgamento na superintendencia de Palmas/TO
13/01/2026 - Aguardando julgamento 
09/12/2025 - Aguardando julgamento. 
11/11/2025 - Aguardando análise
29/10/2025 - A reclamação aguarda a análise de termo de julgamento. 
10/09/2025 - A reclamação ainda aguarda pela análise do termo de julgamento
06/08/2025 - A reclamação aguarda pela análise do termo de julgamento
25/06/2025 - Aguardando julgamento
02/06/2025 - Aguarda decisão (comprovante no IM)
04/04/2025 - Aguardando decisão
19/07/2024 - Neste caso, como o processo foi encaminhado para o setor de notificação, haverá o envio para as partes para a intimação do último despacho.
31/10/2023 - Processo está aguradando julgamento.
13/07/2023 - Processo foi encaminhado para gerencia do júridico e está aguardando julgamento.
10/04/2023 - Aguardando análise para julgamento
22/03/23 - Aguardando análise para julgamento
AC realizada em 25/04/22.'),
    ('0001052-23.2023.8.27.2742', '2026-02-25'::date, '25/02/2026 - Remessa ao juizado de origem
25/02/2026 - Trânsito em julgado 
18/02/2026 - Situação da parte SOUZA CRUZ LTDA - EXCLUÍDA
09/02/2026 - Certidão informando feriado em 16/02. 
22/01/2026 - Publicado no DJEN 
21/01/2026 - Disponibilizado no DJEN
20/01/2026 - Expedida intimação para SC
20/01/2026 - Homologação do acordo e processo declarado extinto com resolução do mérito para a SC
12/01/2026 - Conclusão 
16/12/2025 - Termo de acordo 
10/11/2025 - Conclusão para despacho 
10/11/2025 - Remessa a Turma Recursal
24/10/2025 - Contrarrazões (Rodrigues e Silva)
13/10/2025 - Contrarrazões.
09/10/2025 - Disponibilizado no DJEN
22/09/2025 - Interposição de recurso Bradesco
05/09/2025 - Publicado no DJEN
03/09/2025 - Expedida intimação para a Souza Cruz
02/09/2025 - SENTENÇA - acolhidos os ED''S
09/06/2025 - Conclusão
23/05/2025 - Despacho - conversão julgamento em diligência.
09/04/2025 - Conclusão
07/04/2025 - Pet Bradesco
26/03/2025 - Pet Banco do Brasil
18/03/2025 - Pet Bradesco
24/02/2025 - Pet Banco do Brasil
21/02/2025 - Embargos autor
19/02/2025 - Intimação SC
19/02/2025 - Sentença - Acordo homologado'),
    ('2305015503200114301', '2026-07-07'::date, '07/07/2026 - Aguardando julgamento
12/05/2026 - Aguardando julgamento 
09/04/2026 - Aguardando julgamento 
19/02/2026 - Aguardando julgamento
13/01/2026 - Aguardando julgamento 
09/12/2025 - Aguardando julgamento 
11/11/2025 - Aguardando julgamento
21/10/2025 - Aguardando julgamento 
16/09/2025 - Aguardando julgamento
12/09/2025 - Aguardando julgamento
01/08/2025 - Aguardando julgamento
25/06/2025 - Aguardando julgamento
22/05/2025 - Aguardando julgamento
04/04/2025 - Aguardando julgamento
21/11/2024 - Aguardando julgamento
18/11/2024 - Aguardando julgamento
19/07/2024 - Correspondente informou que o processo já possui decisão. Então, os autos foram remetidos para a assistência jurídica do município para verificação, se será ou não aplicada multa administrativa, o que, segundo o atendente do Procon, não tem prazo para que ocorra. 
12/07/2023 - Aguardando julgamento
26/06/2023 - Audiência realizada
01/06/2023 - Reclamação recebida; ac agendada para 26/06/23'),
    ('2505024300101525301', '2026-05-12'::date, '12/05/2026 - Reclamação não atendida 
09/04/2026 - Aguardando julgamento. 
17/03/2026 - Aguardando julgamento
19/02/2026 - Aguardando julgamento. 
09/12/2025 - Aguardando julgamento.
11/11/2025 - Aguardando julgamento 
14/10/2025 - Aguardando julgamento
10/09/2025 - Aguardando julgamento
07/07/2025 - Aguardando julgamento
18/06/2025 - Defesa enviada'),
    ('2510021300100050301', '2025-12-18'::date, '18/12/2025 - Caso encerrado
11/11/2025 - Defesa apresentada SC'),
    ('202512039901144869', '2026-05-12'::date, '12/05/2026 - Arquivado definitivamente
17/03/2026 - O processo encontra-se momentaneamente arquivado por ausência de contato da parte autora com o órgão. Foi informado que, caso não haja manifestação no prazo de até 3  meses, a reclamação será arquivado definitivamente.
19/02/2026 - Aguardando resposta do consumidor. A parte autora foi notificada para se manifestar até o dia 18/02, porém não entrou em contato até o momento. O Procon fará uma nova tentativa de contato com a autora.
13/01/2025 - Aguardando ánalise da resposta enviada'),
    ('2602036600100111301', '2026-04-15'::date, '15/04/2026 - Caso arquivado.')
  ) AS v(numero_cnj, data_movimentacao, descricao)
  JOIN public.processos proc ON proc.numero_cnj = v.numero_cnj
  ON CONFLICT (processo_id, data_movimentacao, md5(descricao)) DO NOTHING;

END $$;

-- Importação: Planilha JGV Agosto
-- 70 processo(s), pasta 'JGV' dentro de Equipe Souza Cruz, responsável 'JGV', sócio não definido.

DO $$
DECLARE
  _criador uuid := (SELECT id FROM auth.users WHERE email = 'bdr@bcw.com.br');
  _pasta_id uuid := (SELECT p.id FROM public.pastas p JOIN public.grupos g ON g.id = p.grupo_id WHERE g.nome = 'Equipe Souza Cruz' AND p.nome = 'JGV');
BEGIN
  IF _pasta_id IS NULL THEN
    RAISE EXCEPTION 'Pasta JGV de Equipe Souza Cruz não encontrada';
  END IF;

  INSERT INTO public.processos
    (numero_cnj, numero_interno, numero_antigo, cliente, parte_contraria, autor, reu,
     uf, comarca, vara, tribunal, sistema, carteira, pasta_id, responsavel, socio,
     status, created_by)
  VALUES
    ('5007462-14.2022.8.21.0026', '3851', NULL, 'SOUZA CRUZ LTDA', 'INACIO KOLBERG', 'INACIO KOLBERG', 'SOUZA CRUZ LTDA', 'RS', 'Santa Cruz do Sul', '3ª Vara Cível', 'TJRS', 'eProc', 'SOUZA CRUZ', _pasta_id, 'JGV', NULL, 'ativo', _criador),
    ('0124775-16.2024.8.17.2001', '4238', NULL, 'SOUZA CRUZ LTDA', 'GENSAN DISTRIBUIDORA DE CIGARROS LTDA', 'GENSAN DISTRIBUIDORA DE CIGARROS LTDA', 'SOUZA CRUZ LTDA', 'PE', 'Capital', 'Seção B da 28ª Vara Cível', 'TJPE', 'Pje', 'SOUZA CRUZ', _pasta_id, 'JGV', NULL, 'ativo', _criador),
    ('5006866-66.2023.8.24.0008', '4175', NULL, 'Souza Cruz S.A.', 'Geneses Sousa Lima', 'Geneses Sousa Lima', 'Souza Cruz S.A.', 'SC', 'Blumenau', '1ª Vara Cível', 'TJSC', 'eProc', 'SOUZA CRUZ', _pasta_id, 'JGV', NULL, 'ativo', _criador),
    ('5003011-38.2025.8.21.0026', '4276', NULL, 'Souza Cruz S.A.', 'William Spengler', 'William Spengler', 'Souza Cruz S.A.', 'RS', 'Santa Cruz do Sul', '2ª Vara Cível', 'TJRS', 'eProc', 'SOUZA CRUZ', _pasta_id, 'JGV', NULL, 'ativo', _criador),
    ('5153294-97.2025.8.09.0029', '4277', NULL, 'Souza Cruz Ltda', 'Tabacaria Hollywood Ltda.', 'Souza Cruz Ltda', 'Tabacaria Hollywood Ltda.', 'GO', 'Catalão', '1ª Vara Cível', 'TJGO', 'PROJUDI', 'SOUZA CRUZ', _pasta_id, 'JGV', NULL, 'ativo', _criador),
    ('5003854-71.2025.8.24.0041', '4188', NULL, 'Souza Cruz Ltda', 'MSTC Engenharia Ltda.', 'Souza Cruz Ltda', 'MSTC Engenharia Ltda.', 'SC', 'Mafra', '1ª Vara Cível', 'TJSC', 'eProc', 'SOUZA CRUZ', _pasta_id, 'JGV', NULL, 'ativo', _criador),
    ('5003853-86.2025.8.24.0041', '4188', NULL, 'Souza Cruz Ltda', 'Tropical Rio Comércio e Transportes Ltda.', 'Souza Cruz Ltda', 'Tropical Rio Comércio e Transportes Ltda.', 'SC', 'Mafra', '1ª Vara Cível', 'TJSC', 'eProc', 'SOUZA CRUZ', _pasta_id, 'JGV', NULL, 'ativo', _criador),
    ('3005735-28.2025.8.06.0071', '4369', NULL, 'Souza Cruz Ltda', 'Maria do Socorro Lobo Gonçalves', 'Maria do Socorro Lobo Gonçalves', 'Souza Cruz Ltda', 'CE', 'Crato', '2ª Vara Cível', 'TJCE', 'PJe', 'SOUZA CRUZ', _pasta_id, 'JGV', NULL, 'ativo', _criador),
    ('0801842-49.2025.8.19.0212', NULL, NULL, 'TROPICAL RIO COMERCIO E TRANSPORTES LTDA', 'PORTO SEGURO SEGURO SAUDE S A', 'TROPICAL RIO COMERCIO E TRANSPORTES LTDA', 'PORTO SEGURO SEGURO SAUDE S A', 'RJ', NULL, '7º Núcleo de Justiça 4.0 - Saúde Privada', 'TJRJ', 'PJe', 'SOUZA CRUZ', _pasta_id, 'JGV', NULL, 'ativo', _criador),
    ('5001430-61.2020.8.21.0026', '3560', NULL, 'Souza Cruz S.A.', 'Cerealista Robilson LTDA', 'Cerealista Robilson LTDA', 'Souza Cruz S.A.', 'RS', 'Santa Cruz do Sul', '1ª Vara Cível', 'TJRS', 'eProc', 'SOUZA CRUZ', _pasta_id, 'JGV', NULL, 'ativo', _criador),
    ('0008972-30.2026.8.16.0194', '36', NULL, 'Souza Cruz Ltda.', 'Tradener', 'Tradener', 'Souza Cruz Ltda.', 'PR', 'Curitiba', '2ª Vara de Falências e RJ', 'TJPR', 'Projudi', 'SOUZA CRUZ', _pasta_id, 'JGV', NULL, 'ativo', _criador),
    ('0005433-56.2026.8.16.0194', '36', NULL, 'Souza Cruz Ltda.', 'Tradener', 'Tradener', 'Souza Cruz Ltda.', 'PR', 'Curitiba', '2ª Vara de Falências e RJ', 'TJPR', 'Projudi', 'SOUZA CRUZ', _pasta_id, 'JGV', NULL, 'ativo', _criador),
    ('0010241-53.2026.8.16.0017', '4426', NULL, 'SOUZA CRUZ', 'LUCAS SANCHES TROVO', 'LUCAS SANCHES TROVO', 'SOUZA CRUZ', 'PR', 'Maringá', '5ª Vara Cível', 'TJPR', 'PROJUDI', 'SOUZA CRUZ', _pasta_id, 'JGV', NULL, 'ativo', _criador),
    ('5028067-51.2018.8.13.0702', '3265', NULL, 'PAULO SERGIO GARDIM', 'FASC', 'PAULO SERGIO GARDIM', 'FASC', 'MG', 'Uberlândia', '3ª Vara Cível', 'TJMG', 'PJe', 'FASC', _pasta_id, 'JGV', NULL, 'ativo', _criador),
    ('5038704-22.2022.8.13.0702', '3252', NULL, 'MARIA OLIVEIRA DOS SANTOS', 'FASC', 'MARIA OLIVEIRA DOS SANTOS', 'FASC', 'MG', 'Uberlândia', '4ª Vara Cível', 'TJMG', 'pje', 'FASC', _pasta_id, 'JGV', NULL, 'ativo', _criador),
    ('5002222-07.2019.8.13.0015', '3578', NULL, 'HELOISA ROCHA PINHO', 'FASC', 'HELOISA ROCHA PINHO', 'FASC', 'MG', 'Além Paraíba', '1ª Vara Cível, Criminal e de Execuções Penais', 'TJMG', 'PJE', 'FASC', _pasta_id, 'JGV', NULL, 'ativo', _criador),
    ('5027728-24.2020.8.13.0702', '3652', NULL, 'JOSÉ ROBERTO SILVA SEVERINO', 'FASC', 'JOSÉ ROBERTO SILVA SEVERINO', 'FASC', 'MG', 'Uberlândia', '7ª Vara Cível', 'TJMG', 'PJe', 'FASC', _pasta_id, 'JGV', NULL, 'ativo', _criador),
    ('5009738-78.2024.8.13.0702', '4149', NULL, 'ANAHITA MARIA SILVA', 'FASC', 'ANAHITA MARIA SILVA', 'FASC', 'MG', 'Uberlândia', '4ª Vara Cível', 'TJMG', 'PJe', 'FASC', _pasta_id, 'JGV', NULL, 'ativo', _criador),
    ('0006029-34.2025.8.05.0080', '4270', NULL, 'RAMALHO DE OLIVEIRA SANTOS', 'FASC', 'RAMALHO DE OLIVEIRA SANTOS', 'FASC', 'BA', 'Feira de Santana', '5ª Vara do Sistema de Juizados', 'TJBA', 'PROJUDI', 'FASC', _pasta_id, 'JGV', NULL, 'ativo', _criador),
    ('0000048-02.2026.8.05.9000', '4270', NULL, 'FASC', 'JUÍZO DA 5ª VARA DO SISTEMA DOS JUIZADOS DA COMARCA DE FEIRA DE SANTANA/BA', 'FASC', 'JUÍZO DA 5ª VARA DO SISTEMA DOS JUIZADOS DA COMARCA DE FEIRA DE SANTANA/BA', 'BA', 'Feira de Santana', '3ª Turma Recursal', 'TJBA', 'PROJUDI', 'FASC', _pasta_id, 'JGV', NULL, 'ativo', _criador),
    ('0821986-92.2025.8.19.0002', NULL, NULL, 'Sandra Cristina Coutinho', 'FASC', 'Sandra Cristina Coutinho', 'FASC', 'RJ', 'Niterói', '4ª Vara Cível', 'TJRJ', 'PJe', 'FASC', _pasta_id, 'JGV', NULL, 'ativo', _criador),
    ('0731194-75.2018.8.07.0001', '4401', NULL, 'MARIA AUXILIADORA NASCIMENTO VIOLATTI', 'FASC', 'MARIA AUXILIADORA NASCIMENTO VIOLATTI', 'FASC', 'DF', 'Brasília', '4ª Vara Cível', 'TJDF', 'PJe', 'FASC', _pasta_id, 'JGV', NULL, 'ativo', _criador),
    ('0713944-51.2026.8.07.0000', '4401', NULL, 'MARIA AUXILIADORA NASCIMENTO VIOLATTI', 'FASC', 'MARIA AUXILIADORA NASCIMENTO VIOLATTI', 'FASC', 'DF', 'Brasília', '1º Câmara Cível', 'TJDF', 'PJE 2º grau', 'FASC', _pasta_id, 'JGV', NULL, 'ativo', _criador),
    ('0013271-15.2018.8.17.2001', '6', NULL, 'Galindo Distribuidores', 'Merck S.A.', 'Galindo Distribuidores', 'Merck S.A.', 'PE', 'Recife', '25ª Vara Cível', 'TJPE', 'PJE', 'MERCK', _pasta_id, 'JGV', NULL, 'ativo', _criador),
    ('0032762-89.2009.8.19.0021', '11', NULL, 'Athos Farma', 'Merck S.A.', 'Athos Farma', 'Merck S.A.', 'RJ', 'Duque de Caxias', '4ª Vara Cível', 'TJRJ', 'TJRJ', 'MERCK', _pasta_id, 'JGV', NULL, 'ativo', _criador),
    ('0063895-52.2009.8.19.0021', '11', NULL, 'Merck S.A.', 'Athos Farma', 'Merck S.A.', 'Athos Farma', 'RJ', 'Duque de Caxias', '4ª Vara Cível', 'TJRJ', 'TJRJ', 'MERCK', _pasta_id, 'JGV', NULL, 'ativo', _criador),
    ('0535934-20.2000.8.06.0001', '18', NULL, 'Prontoplástica', 'Merck S.A.', 'Prontoplástica', 'Merck S.A.', 'CE', 'Fortaleza', '4ª Vara Cível', 'TJCE', 'pje', 'MERCK', _pasta_id, 'JGV', NULL, 'ativo', _criador),
    ('0043259-57.2016.8.19.0203', '26', NULL, 'Merck S.A.', 'Star Distribuidora', 'Merck S.A.', 'Star Distribuidora', 'RJ', 'Taquara', '6ª Vara Cível', 'TJRJ', 'TJRJ', 'MERCK', _pasta_id, 'JGV', NULL, 'ativo', _criador),
    ('0023368-45.2019.8.19.0203', '26', NULL, 'Merck S.A.', 'Roberto Calça Junior e outro', 'Merck S.A.', 'Roberto Calça Junior e outro', 'RJ', 'Taquara', '6ª Vara Cível', 'TJRJ', 'TJRJ', 'MERCK', _pasta_id, 'JGV', NULL, 'ativo', _criador),
    ('1000990-38.2018.8.26.0100', '31', NULL, 'Merck S.A.', 'Big Benn Pharma e Outros', 'Merck S.A.', 'Big Benn Pharma e Outros', 'SP', 'Foro Central', '2ª Vara de Falências e Recuperações Judiciais', 'TJSP', 'e-SAJ', 'MERCK', _pasta_id, 'JGV', NULL, 'ativo', _criador),
    ('1003359-68.2018.8.26.0564', '2', NULL, 'Ferticare Comercio de Medicamentos Especiais Ltda-epp', 'Merck S.A.', 'Ferticare Comercio de Medicamentos Especiais Ltda-epp', 'Merck S.A.', 'SP', 'São Bernardo do Campo', '2ª Vara Cível', 'TJSP', 'e-SAJ', 'MERCK', _pasta_id, 'JGV', NULL, 'ativo', _criador),
    ('1002490-45.2020.8.26.0529', '26', NULL, 'Pedro Fontana', 'Merck S.A. e outra', 'Pedro Fontana', 'Merck S.A. e outra', 'SP', 'São Paulo', '43ª Vara Cível do Foro Central Cível', 'TJSP', 'e-SAJ', 'MERCK', _pasta_id, 'JGV', NULL, 'ativo', _criador),
    ('0045029-93.2025.8.26.0100', NULL, NULL, 'Brandão Couto, Wigderowitz e Pessoa Advogados', 'Pedro Fontana', 'Brandão Couto, Wigderowitz e Pessoa Advogados', 'Pedro Fontana', 'SP', 'São Paulo', '43ª Vara Cível do Foro Central Cível', 'TJSP', 'e-SAJ', 'MERCK', _pasta_id, 'JGV', NULL, 'ativo', _criador),
    ('0865623-67.2023.8.19.0001', '33', NULL, 'Merck S.A.', 'Gerar Scuritizadora', 'Merck S.A.', 'Gerar Scuritizadora', 'RJ', 'Jacarepaguá', '2ª Vara Cível', 'TJRJ', 'Eproc', 'MERCK', _pasta_id, 'JGV', NULL, 'ativo', _criador),
    ('5154206-22.2023.8.09.0011', '34', NULL, 'Merck S.A.', 'Santa Marta', 'Merck S.A.', 'Santa Marta', 'GO', 'Goiânia', '5ª Vara Cível', 'TJGO', 'projudi', 'MERCK', _pasta_id, 'JGV', NULL, 'ativo', _criador),
    ('0835616-92.2023.8.19.0001', '35', NULL, 'Merck S.A.', 'Grupo  Petrópolis', 'Merck S.A.', 'Grupo  Petrópolis', 'RJ', 'Capital', '5ª Vara Empresarial', 'TJRJ', 'pje', 'MERCK', _pasta_id, 'JGV', NULL, 'ativo', _criador),
    ('0823764-89.2024.8.19.0210', '38', NULL, 'Green Brasil', 'Sigma', 'Green Brasil', 'Sigma', 'RJ', 'Leopoldina', '5ª Vara Cível', 'TJRJ', 'pje', 'MERCK', _pasta_id, 'JGV', NULL, 'ativo', _criador),
    ('1005496-16.2025.8.26.0002', '39', NULL, 'Merck S.A.', 'Miranda & Mendelsohn Adm de Bens Ltda.', 'Merck S.A.', 'Miranda & Mendelsohn Adm de Bens Ltda.', 'SP', 'Santo Amaro', '16ª Vara Cível', 'TJSP', 'eProc', 'MERCK', _pasta_id, 'JGV', NULL, 'ativo', _criador),
    ('4000097-43.2025.8.26.0587', NULL, NULL, 'Samuel Coelho de Faria', 'Sigma', 'Samuel Coelho de Faria', 'Sigma', 'SP', NULL, '7º turma recursal', 'TJSP', 'eProc', 'MERCK', _pasta_id, 'JGV', NULL, 'ativo', _criador),
    ('1036446-68.2026.8.13.0702', '42', NULL, 'Leandro José da Costa', 'Merk', 'Leandro José da Costa', 'Merk', 'MG', NULL, NULL, 'TJMG', 'eProc', 'MERCK', _pasta_id, 'JGV', NULL, 'ativo', _criador),
    ('1004209-15.2025.8.13.0702', '42', NULL, 'Leandro José da Costa', 'Merck', 'Leandro José da Costa', 'Merck', 'MG', 'Uberlância', '2o JEC', 'TJMG', 'eProc', 'MERCK', _pasta_id, 'JGV', NULL, 'ativo', _criador),
    ('0802312-64.2017.8.10.0001', '4', NULL, 'Associação Brasileira da Indústria da Cerveja (CervBrasil)', 'SECRETÁRIOS MUNICPAIS', 'Associação Brasileira da Indústria da Cerveja (CervBrasil)', 'SECRETÁRIOS MUNICPAIS', 'MA', NULL, '3ª Câmara de Direito Público', 'TJMA', 'PJE', 'DIVERSOS', _pasta_id, 'JGV', NULL, 'ativo', _criador),
    ('0072927-29.2018.8.19.0001', '1', NULL, 'Paula Araújo Advogados', 'Santa Casa de Misericórdia', 'Paula Araújo Advogados', 'Santa Casa de Misericórdia', 'RJ', 'Capital', '20ª Vara Cível', 'TJRJ', 'TJRJ', 'DIVERSOS', _pasta_id, 'JGV', NULL, 'ativo', _criador),
    ('0086599-63.2025.8.19.0000', '1', NULL, 'Santa Casa de Misericórdia', 'Paula Araújo Advogados', 'Santa Casa de Misericórdia', 'Paula Araújo Advogados', 'RJ', 'Agravo de Instrumento', '2ª Câmara de Direito Privado', 'TJRJ', 'TJRJ', 'DIVERSOS', _pasta_id, 'JGV', NULL, 'ativo', _criador),
    ('0333898-59.2019.8.19.0001', '3', NULL, 'ANTONIO DE PÁDUA COIMBRA TAVARES PAIS E OUTROS', 'PAULO EDUARDO FERREIRA TAVARES PAIS', 'ANTONIO DE PÁDUA COIMBRA TAVARES PAIS E OUTROS', 'PAULO EDUARDO FERREIRA TAVARES PAIS', 'RJ', 'Capital', '30ª Vara Cível', 'TJRJ', 'TJRJ', 'DIVERSOS', _pasta_id, 'JGV', NULL, 'ativo', _criador),
    ('0174117-59.2023.8.19.0001', '7', NULL, 'EXPRESSO CENTER POIT BAR LTDA', 'ANTONIO DE PÁDUA COIMBRA TAVARES PAES', 'EXPRESSO CENTER POIT BAR LTDA', 'ANTONIO DE PÁDUA COIMBRA TAVARES PAES', 'RJ', 'Capital', '23ª Vara Cível', 'TJRJ', 'TJRJ', 'DIVERSOS', _pasta_id, 'JGV', NULL, 'ativo', _criador),
    ('0400194-15.2009.8.19.0001', '5', NULL, 'BLATTER E GALVÃO SIDOU WHITAKER ADVOCACIA', 'COMPANHIA ESTADUAL DE HABITAÇÃO DO RIO DE JANEIRO', 'BLATTER E GALVÃO SIDOU WHITAKER ADVOCACIA', 'COMPANHIA ESTADUAL DE HABITAÇÃO DO RIO DE JANEIRO', 'RJ', 'Capital', '8ª Vara de Fazenda Pública', 'TJRJ', 'TJRJ', 'DIVERSOS', _pasta_id, 'JGV', NULL, 'ativo', _criador),
    ('0398439-14.2013.8.19.0001', '2212', NULL, 'BCW', 'Hermes', 'BCW', 'Hermes', 'RJ', 'Capital', '7ª Vara Empresarial', 'TJRJ', 'TJRJ', 'DIVERSOS', _pasta_id, 'JGV', NULL, 'ativo', _criador),
    ('0094991-28.2021.8.19.0001', '3', NULL, 'Olympus Optical do Brasil LTDA', 'Endo Medical Rio Comercial LTDA', 'Olympus Optical do Brasil LTDA', 'Endo Medical Rio Comercial LTDA', 'RJ', 'Capital', '32ª Vara Cível', 'TJRJ', 'TJRJ', 'DIVERSOS', _pasta_id, 'JGV', NULL, 'ativo', _criador),
    ('0237185-56.2018.8.19.0001', '2', NULL, 'MINISTÉRIO PÚBLICO', 'Mederi Editora de Especialidades Médicas Ltda', 'MINISTÉRIO PÚBLICO', 'Mederi Editora de Especialidades Médicas Ltda', 'RJ', 'Capital', '7ª Vara Empresarial', 'TJRJ', 'TJRJ', 'DIVERSOS', _pasta_id, 'JGV', NULL, 'ativo', _criador),
    ('0037807-22.2020.8.17.2001', '4', NULL, 'Olympus Optical do Brasil Ltda', 'Endo Medical Rio Comercial Ltda', 'Olympus Optical do Brasil Ltda', 'Endo Medical Rio Comercial Ltda', 'PE', 'Capital', '34ª Vara Cível', 'TJPE', 'PJe', 'DIVERSOS', _pasta_id, 'JGV', NULL, 'ativo', _criador),
    ('0007791-44.2008.4.03.6103', '1', NULL, 'MPF', 'AMBEV, Brasil Kirin e Kaiser', 'MPF', 'AMBEV, Brasil Kirin e Kaiser', 'SP', 'São Paulo', '4ª Vara Cível Federal', 'TJSP', 'PJE', 'DIVERSOS', _pasta_id, 'JGV', NULL, 'ativo', _criador),
    ('0022099-97.2020.8.27.2729', '9', NULL, 'FLAMMA OLEOS E DERIVADOS LTDA', 'BONA FIDE CONSULTORIA EMPRESARIAL LTDA', 'FLAMMA OLEOS E DERIVADOS LTDA', 'BONA FIDE CONSULTORIA EMPRESARIAL LTDA', 'TO', 'Palmas', '6ª Vara Cível', 'TJTO', 'eProc', 'DIVERSOS', _pasta_id, 'JGV', NULL, 'ativo', _criador),
    ('0969445-38.2024.8.19.0001', NULL, NULL, 'VANESSA ROSA RODRIGUES DE FREITAS AGUIAR', 'CONCESSIONARIA REVIVER S.A.', 'VANESSA ROSA RODRIGUES DE FREITAS AGUIAR', 'CONCESSIONARIA REVIVER S.A.', 'RJ', 'Capital', '29ª Vara Cível', 'TJRJ', 'eProc', 'DIVERSOS', _pasta_id, 'JGV', NULL, 'ativo', _criador),
    ('0181924-43.2017.8.19.0001', '19', NULL, 'RUBEN FINEBERG CHINDLER', 'Paulo Rogério', 'RUBEN FINEBERG CHINDLER', 'Paulo Rogério', 'RJ', 'Embargos à Execução', '32ª Vara Cível', 'TJRJ', 'TJRJ', 'BAIXADOS', _pasta_id, 'JGV', NULL, 'ativo', _criador),
    ('5251618-25.2025.8.09.0029', '4277', NULL, 'Souza Cruz Ltda.', 'Tabacaria Hollywood Ltda.', 'Souza Cruz Ltda.', 'Tabacaria Hollywood Ltda.', 'GO', 'Agravo de Instrumento', '5ª Câmara Cível', 'TJGO', 'PROJUDI', 'BAIXADOS', _pasta_id, 'JGV', NULL, 'ativo', _criador),
    ('2023984-08.2025.8.26.0000', '39', NULL, 'Miranda & Mendelsohn Adm de Bens Ltda.', 'Merck S.A.', 'Miranda & Mendelsohn Adm de Bens Ltda.', 'Merck S.A.', 'SP', 'Agravo de Instrumento', '26ª Câmara de Direito Privado', 'TJSP', 'e-saj', 'BAIXADOS', _pasta_id, 'JGV', NULL, 'ativo', _criador),
    ('0260234-29.2018.8.19.0001', '1', NULL, 'Santa Casa de Misericórdia', 'Paula Araújo Advogados', 'Santa Casa de Misericórdia', 'Paula Araújo Advogados', 'RJ', 'Capital', '24ª Vara Cível', 'TJRJ', 'TJRJ', 'BAIXADOS', _pasta_id, 'JGV', NULL, 'ativo', _criador),
    ('5005932-72.2024.8.24.0041', '4188', NULL, 'Souza Cruz Ltda.', 'MSTC Engenharia Ltda.', 'Souza Cruz Ltda.', 'MSTC Engenharia Ltda.', 'SC', 'Mafra', '1ª Vara Cível', 'TJSC', 'eProc', 'BAIXADOS', _pasta_id, 'JGV', NULL, 'ativo', _criador),
    ('5044350-71.2025.8.24.0000', '4188', NULL, 'Souza Cruz Ltda.', 'MSTC Engenharia Ltda.', 'MSTC Engenharia Ltda.', 'Souza Cruz Ltda.', 'SC', 'Agravo de Instrumento', '2ª Câmara de Direito Civil', 'TJSC', 'eProc', 'BAIXADOS', _pasta_id, 'JGV', NULL, 'ativo', _criador),
    ('5195442-32.2025.8.21.7000', '3851', NULL, 'Souza Cruz Ltda.', 'INACIO KOLBERG', 'Souza Cruz Ltda.', 'INACIO KOLBERG', 'RS', 'Agravo de Instrumento', '12ª Câmara Cível', 'TJRS', 'eProc', 'BAIXADOS', _pasta_id, 'JGV', NULL, 'ativo', _criador),
    ('0311518-13.2017.8.19.0001', '28', NULL, 'João José Jallad', 'Marco Antonio Herling', 'João José Jallad', 'Marco Antonio Herling', 'RJ', 'Capital', '39ª Vara Cível', 'TJRJ', 'TJRJ', 'PRC', _pasta_id, 'JGV', NULL, 'ativo', _criador),
    ('0078544-43.2013.8.19.0001', '19', NULL, 'Paulo Rogério', 'Administradora União dos Condomínios Ltda', 'Paulo Rogério', 'Administradora União dos Condomínios Ltda', 'RJ', 'Capital', '32ª Vara Cível', 'TJRJ', 'TJRJ', 'PRC', _pasta_id, 'JGV', NULL, 'ativo', _criador),
    ('0287342-04.2016.8.19.0001', '24', NULL, 'EDUARDO DE SOUZA CAMPOS', 'Point 88 Cris-car e Outro', 'EDUARDO DE SOUZA CAMPOS', 'Point 88 Cris-car e Outro', 'RJ', 'Capital', '26ª Vara Cível', 'TJRJ', 'TJRJ', 'PRC', _pasta_id, 'JGV', NULL, 'ativo', _criador),
    ('0092133-97.2016.8.19.0001', '27', NULL, 'Paulo Rogério', 'Jorge de Carvalho Selem', 'Paulo Rogério', 'Jorge de Carvalho Selem', 'RJ', 'Capital', '32ª Vara Cível', 'TJRJ', 'TJRJ', 'PRC', _pasta_id, 'JGV', NULL, 'ativo', _criador),
    ('0007200-95.1996.8.19.0001', NULL, NULL, 'Massa Falida Bancorp', 'Reinaldo Mansur e Outro', 'Massa Falida Bancorp', 'Reinaldo Mansur e Outro', 'RJ', 'Capital', '6ª Vara Empresarial', 'TJRJ', 'TJRJ', 'PRC', _pasta_id, 'JGV', NULL, 'ativo', _criador),
    ('0003096-93.2015.8.19.0001', NULL, NULL, 'MINISTERIO PUBLICO DO ESTADO DO RIO DE JANEIRO', 'REINALDO MANSUR', 'MINISTERIO PUBLICO DO ESTADO DO RIO DE JANEIRO', 'REINALDO MANSUR', 'RJ', 'Capital', 'DECIMA QUARTA CAMARA DE DIREITO PRIVADO (ANTIGA 9ª CÂMARA CÍVEL)', 'TJRJ', 'TJRJ', 'PRC', _pasta_id, 'JGV', NULL, 'ativo', _criador),
    ('0306835-52.2019.8.24.0023', NULL, NULL, 'BCW', 'Becker & Becker LTDA', 'BCW', 'Becker & Becker LTDA', 'SC', 'Florianópolis', '5ª Vara Cível', 'TJSC', 'eProc', 'PRC', _pasta_id, 'JGV', NULL, 'ativo', _criador),
    ('0112625-42.2018.8.19.0001', '3', NULL, 'Ian de Porto Alegre Muniz', 'Ramiro de Porto Alegre Muniz (falecido)', 'Ian de Porto Alegre Muniz', 'Ramiro de Porto Alegre Muniz (falecido)', 'RJ', 'Capital', '6ª Vara de Órfãos e Sucessões', 'TJRJ', 'TJRJ', 'PRC', _pasta_id, 'JGV', NULL, 'ativo', _criador),
    ('0025889-07.2020.8.26.0114', NULL, NULL, 'Portservice Serviços de Portaria e Limpeza Ltda', 'RUBEN FINEBERG CHINDLER', 'Portservice Serviços de Portaria e Limpeza Ltda', 'RUBEN FINEBERG CHINDLER', 'SP', 'Campinas', '5ª Vara Cível', 'TJSP', 'Esaj', 'PRC', _pasta_id, 'JGV', NULL, 'ativo', _criador)
  ON CONFLICT (numero_cnj) DO UPDATE SET
    numero_interno = EXCLUDED.numero_interno,
    numero_antigo = COALESCE(EXCLUDED.numero_antigo, public.processos.numero_antigo),
    cliente = EXCLUDED.cliente,
    parte_contraria = EXCLUDED.parte_contraria,
    autor = EXCLUDED.autor,
    reu = EXCLUDED.reu,
    uf = COALESCE(EXCLUDED.uf, public.processos.uf),
    comarca = COALESCE(EXCLUDED.comarca, public.processos.comarca),
    vara = COALESCE(EXCLUDED.vara, public.processos.vara),
    tribunal = COALESCE(EXCLUDED.tribunal, public.processos.tribunal),
    sistema = COALESCE(EXCLUDED.sistema, public.processos.sistema),
    carteira = EXCLUDED.carteira,
    pasta_id = EXCLUDED.pasta_id,
    responsavel = EXCLUDED.responsavel,
    socio = EXCLUDED.socio;

  INSERT INTO public.movimentacoes
    (processo_id, data_movimentacao, descricao, fonte, created_by)
  SELECT proc.id, v.data_movimentacao, v.descricao, 'planilha', _criador
  FROM (VALUES
    ('5007462-14.2022.8.21.0026', '2026-07-03'::date, 'Informo que o Serviço de Distribuição do Departamento Processual realizou a revisão de autuação e de distribuição do presente feito, mantendo inalteradas a classificação e a distribuição na subclasse (competência) "Transporte'''''),
    ('5007462-14.2022.8.21.0026', '2026-08-11'::date, '10.08: Decisão monocrática: ''''..Assim, a desconstituição, ex officio, da sentença é medida que se impõe, devendo retornar os autos à origem para que seja prolatada nova decisão, com observância ao disposto no art. 489, do CPC.
Destarte, desconstituo, ex officio, a sentença, nos termos supramencionados.
Intimem-se. .''''
11.08: Disponibilizado no DJEN'),
    ('5007462-14.2022.8.21.0026', '2025-11-13'::date, '10/11 - Retirado de pauta - Sessão Virtual Assíncrona
Período da sessão: 18/11/2025 00:00 a 21/11/2025 17:00 ; 11/11 - Homologada a Desistência do Recurso ; 13/11 - Publicado no DJEN a intimação eletrônica - Julgamento
Refer. ao Evento 26
(AGRAVANTE - SOUZA CRUZ S/A)'),
    ('0124775-16.2024.8.17.2001', '2026-08-05'::date, 'Ato: Em cumprimento ao disposto no Provimento do Conselho da Magistratura do Tribunal de Justiça de Pernambuco nº 08/2009, publicado no DOPJ de 09/06/2009, e nos termos do art. 152, VI, e do art. 203, § 4º ambos da Lei nº 13.105, de 16 de março de 2015, intimo a parte apelada para, no prazo de 15 (quinze) dias, apresentar contrarrazões. Apresentadas as contrarrazões ou transcorrido o prazo, remetam-se os autos ao Egrégio Tribunal de Justiça de Pernambuco. // Expedida a publicação no DJEN'),
    ('5006866-66.2023.8.24.0008', '2026-08-11'::date, '04.08: Petição Learte(pedido de AIJ em formato híbrido); 11/08: Juntada de AR'),
    ('5003011-38.2025.8.21.0026', '2026-08-11'::date, 'Decisão: ''''..indefiro o pedido subsidiário do autor, de designação de audiência para a produção de prova testemunhal e depoimento pessoal do preposto da parte demandada, haja vista tal ato processual já ter sido realizado no E1, OUT - INST PROC6, p. 38...''''/ disponibilizado no DJEN'),
    ('5153294-97.2025.8.09.0029', '2026-07-28'::date, '23.07 - Petição SC; 28.07 - Alvará cumprido'),
    ('5003854-71.2025.8.24.0041', '2026-07-28'::date, '22.07 - Despacho: ''''...Remetam-se os autos ao Egrégio Tribunal de Justiça de Santa Catarina, com as cautelas de praxe...''''; 24/07 - Publicado no DJEN'),
    ('5003853-86.2025.8.24.0041', '2026-08-07'::date, '28.07 - Alvará assinado; Confirmado o pagamenro do alvará (R$ 27.236,67 e R$ 193.589,16); 07/08: Publicado no DJEN'),
    ('3005735-28.2025.8.06.0071', '2026-07-29'::date, 'Conclusos para despacho'),
    ('0801842-49.2025.8.19.0212', '2026-08-10'::date, 'Conclusos ao juiz'),
    ('5001430-61.2020.8.21.0026', '2026-07-24'::date, 'Agravo de decisão denegatória de rec. Especial'),
    ('0008972-30.2026.8.16.0194', '2026-08-04'::date, '04.08 - Juntada de decisão monocrática - agravo de instrumento; juntada de petições'),
    ('0005433-56.2026.8.16.0194', '2026-08-11'::date, 'Recebidos os autos, juntada de petição de habilitação'),
    ('0010241-53.2026.8.16.0017', '2026-08-07'::date, 'Recebido os autos, juntada de AR e ato ordinatório'),
    ('5028067-51.2018.8.13.0702', '2026-08-05'::date, 'Manifestação do perito'),
    ('5038704-22.2022.8.13.0702', '2026-06-23'::date, 'Petição - intimação do perito'),
    ('5002222-07.2019.8.13.0015', '2026-06-22'::date, 'Conclusos para despacho'),
    ('5027728-24.2020.8.13.0702', '2026-07-31'::date, '10.07 - Despacho: ciência do retorno dos autos; dê-se vista as partes; não havendo requerimento requerimentos arquiva-se / 31.07: expedida  certidão eletrônica'),
    ('5027728-24.2020.8.13.0702', '2026-07-03'::date, 'Certidão de trânsito em julgado e baixa definitiva'),
    ('5009738-78.2024.8.13.0702', '2026-04-08'::date, 'Petição SC'),
    ('0006029-34.2025.8.05.0080', '2026-03-17'::date, 'Processo sobrestado e disponibilizado no DJEN'),
    ('0000048-02.2026.8.05.9000', '2026-07-25'::date, 'Citação expedida: NILDETE DE SOUZA SANTIAGO VALLADARES;  RAMALHO DE OLIVEIRA SANTOS;  decorrido o prazo SC'),
    ('0821986-92.2025.8.19.0002', '2026-08-04'::date, 'Certidão- Às partes:
sessão de mediação virtual, agendada para o dia 09/09/2026 às 13:00 horas. / Publicado a intimação'),
    ('0731194-75.2018.8.07.0001', '2026-05-06'::date, 'Publicada a decisão'),
    ('0713944-51.2026.8.07.0000', '2026-08-04'::date, '29.07 - Despacho: ''''..Intime-se a parte autora para que se manifeste, no prazo de 15 (quinze) dias , das contestações apresentadas pelas requeridas..'''' 04.08: Publicado no DJEN'),
    ('0013271-15.2018.8.17.2001', '2026-07-29'::date, 'Decisão: ''''.. Assim posto, acolho o pronunciamento da Administradora Judicial para determinar à Diretoria Cível, com urgência, que:
a) proceda à retificação do polo passivo para excluir a Sra. HILDÊNIA PATRÍCIA LOPES DE LIMA, CPF 030.251.324-85, permanecendo apenas como terceira interessada, já constante no cadastro do PJe;
b) após a retificação, a expedição de certidão atestando que a Sra. HILDÊNIA PATRÍCIA LOPES DE LIMA, CPF 030.251.324-85 jamais integrou o polo passivo da presente ação falimentar, figurando exclusivamente na condição de credora trabalhista, para que possa utilizá-la perante terceiros, caso necessário...'''' / Petição Galindo distribuidora'),
    ('0032762-89.2009.8.19.0021', '2026-08-06'::date, 'Ato ordinatório: Certifico que nesta data, cadastrei estes autos principais aos autos apensados nº 0011661-34.2025.8.19.0021 , em cumprimento ao Despacho naquele feito, fls. 303'),
    ('0063895-52.2009.8.19.0021', '2026-04-28'::date, 'Petição - parecer MP'),
    ('0535934-20.2000.8.06.0001', '2026-08-04'::date, 'Conclusos para julgamento'),
    ('0043259-57.2016.8.19.0203', '2025-09-04'::date, 'Manifestação requerendo exclusão de 2 advogados dos autos por não representarem mais a parte.'),
    ('0023368-45.2019.8.19.0203', '2024-02-02'::date, 'Desapenso do processo n° 0043259-57 para encaminhar os presentes ao arquivamento. Certfico que a r. sentença transitou em julgado e que as partes já foram intimadas da remessa para Central de Arquivamento conforme parte final da sentença.'),
    ('1000990-38.2018.8.26.0100', '2026-08-11'::date, 'Certidões juntada, pedido de habilitação, ato ordinatório'),
    ('1003359-68.2018.8.26.0564', '2026-08-05'::date, 'Petições juntadas'),
    ('1002490-45.2020.8.26.0529', '2025-10-20'::date, 'Certidão - "Certifico e dou fé que houve a instauração de novo incidente decumprimento de sentença dependente a estes autos através docadastramento no sistema SAJ"'),
    ('0045029-93.2025.8.26.0100', '2026-06-10'::date, 'Pedido de expedição de alvará juntado'),
    ('0865623-67.2023.8.19.0001', '2026-06-25'::date, 'Arquivado definitivamente e remetido os autos para divisão de calculo de custas'),
    ('5154206-22.2023.8.09.0011', '2026-08-11'::date, 'Juntada de petições'),
    ('0835616-92.2023.8.19.0001', '2026-08-11'::date, 'Juntada de petição; ato ordinatório(JUCESP); desentrado documentos, juntada de petição'),
    ('0823764-89.2024.8.19.0210', '2026-08-07'::date, 'Petição SC'),
    ('1005496-16.2025.8.26.0002', '2026-02-05'::date, 'Trânsito em julgado e arquivo definitivo'),
    ('4000097-43.2025.8.26.0587', '2026-07-21'::date, 'Processo 40000974320258260587 distribuído para:
7ª Turma Recursal Cível; Publicado no DJEN'),
    ('4000097-43.2025.8.26.0587', '2026-07-17'::date, 'Processo 40000974320258260587 distribuído para:
7ª Turma Recursal Cível; Publicado no DJEN'),
    ('1036446-68.2026.8.13.0702', '2026-08-10'::date, 'Petição - Movido Locação de veículos'),
    ('1004209-15.2025.8.13.0702', '2026-07-24'::date, 'Conclusos para julgamento'),
    ('0802312-64.2017.8.10.0001', '2026-06-02'::date, 'Conclusos'),
    ('0072927-29.2018.8.19.0001', '2026-06-26'::date, 'Petição SC'),
    ('0086599-63.2025.8.19.0000', '2026-05-20'::date, 'Arquivamento definitivo'),
    ('0333898-59.2019.8.19.0001', '2026-04-28'::date, 'Remessa a central de arquivamento'),
    ('0174117-59.2023.8.19.0001', '2026-05-13'::date, 'Contrarrazões SC'),
    ('0400194-15.2009.8.19.0001', '2026-07-31'::date, '30.07: Expedido os ofícios; 31/07: Enviado a publicação e arquivamento'),
    ('0398439-14.2013.8.19.0001', '2026-08-11'::date, 'Juntada de petições e conclusos'),
    ('0094991-28.2021.8.19.0001', '2026-06-18'::date, 'Apelação: Remessa do escrivão para 3 vice presidência 
RE: publicação do ato ordinatório'),
    ('0094991-28.2021.8.19.0001', '2026-08-06'::date, 'Agravo em recurso especial - Olympus optical'),
    ('0237185-56.2018.8.19.0001', '2026-07-24'::date, 'Eds MP'),
    ('0037807-22.2020.8.17.2001', '2022-09-25'::date, 'Remetidos os autos ao 2 grau'),
    ('0037807-22.2020.8.17.2001', '2026-07-17'::date, 'Recurso especial não admitido; Publicado no DJEN'),
    ('0007791-44.2008.4.03.6103', '2026-05-15'::date, 'Despacho de Inspeção'),
    ('0022099-97.2020.8.27.2729', '2026-06-30'::date, 'Petição SC'),
    ('0969445-38.2024.8.19.0001', '2026-08-06'::date, 'Inclusão em pauta de sessão virtual para julgamento pelo relator - Sessão Virtual
Período da sessão: 18/08/2026 00:00 a 25/08/2026 23:59 // disponibilizado no DJEN'),
    ('0181924-43.2017.8.19.0001', '2025-05-12'::date, 'Arquivado Definitivamente'),
    ('0181924-43.2017.8.19.0001', '2024-12-13'::date, 'baixa definitiva'),
    ('0181924-43.2017.8.19.0001', '2024-12-13'::date, 'recebido do STJ; baixa definitiva'),
    ('5251618-25.2025.8.09.0029', '2025-07-15'::date, 'Arquivado Definitivamente'),
    ('2023984-08.2025.8.26.0000', '2025-05-31'::date, 'Arquivado Definitivamente'),
    ('0260234-29.2018.8.19.0001', '2025-04-30'::date, 'Remessa - Central de Arquivamento'),
    ('0260234-29.2018.8.19.0001', '2025-04-07'::date, 'Trânsito em julgado; baixa definitiva e autos remetidos à origem'),
    ('5005932-72.2024.8.24.0041', '2025-10-24'::date, 'baixa definitiva'),
    ('5044350-71.2025.8.24.0000', '2025-10-07'::date, 'baixa definitiva'),
    ('5195442-32.2025.8.21.7000', '2025-12-09'::date, 'baixa definitiva'),
    ('0311518-13.2017.8.19.0001', '2026-08-10'::date, 'Ato: Certifico que as partes se manifestaram sobre a certidão da Central de Cálculos, réu (ID 554) e autor (ID 557). Juarez  e conclusos'),
    ('0078544-43.2013.8.19.0001', '2026-07-30'::date, 'Petição - Ruben - juntada de depósito judicial'),
    ('0287342-04.2016.8.19.0001', '2026-05-08'::date, 'Petição'),
    ('0092133-97.2016.8.19.0001', '2026-07-29'::date, 'Ato ordinatório:  Certifico que foi expedido AR com o seguinte número de rastreio: BN641291939BR; e Publicado no DJEN'),
    ('0007200-95.1996.8.19.0001', '2026-07-10'::date, 'Ato ordinatório: ao MP e após conclusos. Juntada de petições'),
    ('0003096-93.2015.8.19.0001', '2026-03-04'::date, 'Certidão Processo Suspenso'),
    ('0306835-52.2019.8.24.0023', '2025-05-28'::date, 'Processo Suspenso por Execução Frustrada'),
    ('0112625-42.2018.8.19.0001', '2026-07-21'::date, 'Petição SC'),
    ('0025889-07.2020.8.26.0114', '2026-08-11'::date, 'Certidões do cartório expedida e juntada de petição')
  ) AS v(numero_cnj, data_movimentacao, descricao)
  JOIN public.processos proc ON proc.numero_cnj = v.numero_cnj
  ON CONFLICT (processo_id, data_movimentacao, md5(descricao)) DO NOTHING;

END $$;
