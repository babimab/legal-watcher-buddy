-- Migracao pontual: preenche o link manual do tribunal (campo
-- link_tribunal_manual) com os links especificos de cada processo
-- coletados nas planilhas "Planilha BDR GFC Agosto" e "Planilha BDR ELV
-- Agosto" (colunas PROCESSO/Numero CNJ com hyperlink direto pro
-- processo em varios casos).
--
-- So atualiza processo que ainda NAO tem link manual definido -- quem
-- ja foi ajustado manualmente antes fica como esta, sem sobrescrever.
-- Ignorados de proposito os hyperlinks que eram so a pagina generica de
-- consulta do tribunal (sem id/hash do processo), porque nao melhoram
-- nada em relacao ao link automatico que ja existe.

begin;

create temporary table links_planilha_bdr (cnj text primary key, link text) on commit drop;

insert into links_planilha_bdr (cnj, link) values
  ('00316711019928050001', 'https://pje.tjba.jus.br/pje/Processo/ConsultaProcesso/Detalhe/listProcessoCompletoAdvogado.seam?id=6606809&ca=e9e2b25d223c840def1ec2fe41d974a877e40b5e8d8dab101c696df412616aa135666a1c7e5d605fc39cb586d6695739d6c24b927bc1b01d&aba='),
  ('00073362420138050248', 'https://pje.tjba.jus.br/pje/Processo/ConsultaProcesso/Detalhe/listProcessoCompletoAdvogado.seam?id=1943279&ca=1192020e3cb4ecf9ef1ec2fe41d974a877e40b5e8d8dab101c696df412616aa135666a1c7e5d605fc39cb586d6695739d6c24b927bc1b01d&aba='),
  ('50000106820178240082', 'https://eproc1g.tjsc.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50000106820178240082&hash=a505944fb48719ca3684f34e5e4fa926'),
  ('50386612220208240000', 'https://eproc2g.tjsc.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50386612220208240000&hash=6bb0e58eb4c5c00c665e3dcebaca6e96'),
  ('50395844820208240000', 'https://eproc2g.tjsc.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50395844820208240000&hash=b7c93e3bb61a7291f5fc477590b15c6a'),
  ('50053683820228240082', 'https://eproc1g.tjsc.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50053683820228240082&hash=f9cc56d423baadac76a672e3043c9a98'),
  ('50342243020238240000', 'https://eproc2g.tjsc.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50342243020238240000&hash=9596108a84ee2f25bef3d66eb5b3aee1'),
  ('50505682320228240000', 'https://eproc2g.tjsc.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50505682320228240000&strUfOrigem=SC&hash=98932ea84f3df891488e64e7b051baf4'),
  ('05016625520128240008', 'https://eproc1g.tjsc.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=05016625520128240008&hash=ac03de0bb503b849192a32047a70cb89'),
  ('50265620920248240023', 'https://eproc1g.tjsc.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50265620920248240023&hash=ea5c17475a8f45f09918ed1d743939cb'),
  ('08060020520248190002', 'https://tjrj.pje.jus.br/1g/Processo/ConsultaProcesso/Detalhe/listProcessoCompletoAdvogado.seam?id=3408082&ca=e8fecb5fdfbfd719d14234262dc31d2427872dc056f1b32226dca2115c0d0c63940a4106470cce6e4aa8328d9ffd8712b1f59d11394696f7&aba='),
  ('50000427620098210134', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50000427620098210134&hash=cb8c2e522cb34e07f2d4d8ffab68bd89'),
  ('50002096220108210036', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50002096220108210036&hash=ed07eda686d0ef21ec01bf56b565d0af'),
  ('50004231220118210006', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50004231220118210006&hash=42c20ab0ee7f7c4d61ff8afd888f8753'),
  ('50004249420118210006', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50004249420118210006&hash=99795e07fd0a25b4116f904673073890'),
  ('50004222720118210006', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50004222720118210006&hash=cb7984a6bf67d5b583d5abb786d2292d'),
  ('50012555420198240047', 'https://eproc1g.tjsc.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50012555420198240047&hash=21b48e7cb1535d75b95288a6185cd3e5'),
  ('00008470720128240141', 'https://eproc1g.tjsc.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=00008470720128240141&hash=3c838047d267ecce5ea03f9f12a46581'),
  ('00016066720148240054', 'https://eproc1g.tjsc.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=00016066720148240054&hash=2a0cf0f022a1791f546aaaedf56560ef'),
  ('50651956620218240000', 'https://eproc2g.tjsc.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50651956620218240000&hash=21f4d2af32b0485320eaf2d946c461fc'),
  ('50000939120178210042', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50000939120178210042&hash=5d5bb1c49089a75436f36d4b00867c7d'),
  ('50011786820148210026', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50011786820148210026&hash=1d877ea82eea2e106f656f2f0bcc6927'),
  ('50001494320138210082', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50001494320138210082&hash=e9cd5e1f6eb06f3fcd10b0929394b0b4'),
  ('50024625920228210082', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50024625920228210082&hash=3796aa317ab749ea65878ed78fd63611'),
  ('50002554320138210134', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&acao_origem=pesquisa_processo_por_nome_parte&acao_retorno=pesquisa_processo_por_nome_parte&num_processo=50002554320138210134&hash=e411d910a10ba20efe38d9cfcb8fd6bd'),
  ('50005174920148210007', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50005174920148210007&hash=865376f62ee35398a82c35e4a9ef1fac'),
  ('50003155120098210006', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50003155120098210006&hash=5906798ed3f7d4bdc2b92a29b7eb395e'),
  ('50016359120198210134', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50016359120198210134&hash=987b90abb1d68a93d35d9f45e1e39331'),
  ('50011345920188210042', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50011345920188210042&hash=56a1ebe93a67c96b16d5794c73c4c72d'),
  ('50001502720178210134', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50001502720178210134&hash=bb305ec78e31a2040a220c09fb37af39'),
  ('50001410220168210134', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50001410220168210134&hash=33bd0be18702bcd7e042880f8971823a'),
  ('50102379320218210007', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50102379320218210007&hash=66be1f143d74c787d266e07e3f1f7d8d'),
  ('50074923820248210007', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&acao_origem=processo_selecionar&acao_retorno=processo_consultar&num_processo=50074923820248210007&hash=62bd7608208be077025e631c07819cbb'),
  ('50019919720218210140', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50019919720218210140&hash=29e64da908596b772424ae12f85a48cb'),
  ('50018085420218210067', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50018085420218210067&hash=c7c748afb7b49ceedd29d29bbad438e4'),
  ('50055343120248210067', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&acao_origem=processo_selecionar&acao_retorno=processo_consultar&num_processo=50055343120248210067&hash=9480507bc739065c9e32de12ab28811e'),
  ('50015279020228210026', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50015279020228210026&hash=c6bd2311279753b15b935d4b12eefd02'),
  ('50116715520248210026', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&acao_origem=&acao_retorno=processo_consultar&num_processo=50116715520248210026&hash=19f7a1fd44cbfc34bd2d693be9870d37'),
  ('50043048520238210067', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50043048520238210067&hash=d6b342f5e7be3fea3facc5d82f5e4a06'),
  ('50004067620228210042', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50004067620228210042&hash=04914cee7a490eb9cc12ce948bf8a7d4'),
  ('50027433320258210042', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&acao_origem=processo_selecionar&acao_retorno=processo_consultar&num_processo=50027433320258210042&hash=948445b2f49cde72d53da3535302cedf'),
  ('50024739020228210049', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50024739020228210049&hash=1409442759642880b71d1ec12c7dfea2'),
  ('50091636720228210007', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50091636720228210007&hash=8043375a3a3849d12c621a3bd82c5143'),
  ('50013089520268210007', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50091636720228210007&hash=8043375a3a3849d12c621a3bd82c5143'),
  ('50091653720228210007', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50091653720228210007&hash=4a2aaf38cc995c6c925a08f6f8f41845'),
  ('50019333220268210007', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50091653720228210007&hash=4a2aaf38cc995c6c925a08f6f8f41845'),
  ('50031799420228210042', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50031799420228210042&hash=d381a54cba5180ed7665d8a3f5574131'),
  ('50014387720268210042', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&acao_origem=processo_selecionar&acao_retorno=processo_consultar&num_processo=50014387720268210042&hash=943d9e486fdbea6b8ffd265ca0146d2c'),
  ('50020371020228210154', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50020371020228210154&hash=123239b87928f9ad9f66f59893d8eca7'),
  ('50039932520228240042', 'https://eproc1g.tjsc.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50039932520228240042&hash=29ce255e5a0961dada0be13e7e7a66f5'),
  ('50041554920248240042', 'https://eproc1g.tjsc.jus.br/eproc/controlador.php?acao=processo_selecionar&acao_origem=processo_selecionar&acao_retorno=processo_consultar&num_processo=50041554920248240042&hash=60dfc818b966cc1fc3ec386549dbb16a'),
  ('50037211520228210042', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50037211520228210042&hash=de62fca9a2c4ad81f21c7ef285ec78db'),
  ('50008101820238210067', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50008101820238210067&hash=bd10d1961dc46f6e663fc89f018049b1'),
  ('50002617120248210067', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50002617120248210067&hash=852988549fee4a7fd5e47539aa5983eb'),
  ('50008093320238210067', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50008093320238210067&hash=ba4ad815e0c1508df09a7e255313bef5'),
  ('50004444220248210067', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&acao_origem=processo_selecionar&acao_retorno=processo_consultar&num_processo=50004444220248210067&hash=f6703fbf352755fd9548d9383e15f43a'),
  ('50010127620238210137', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50010127620238210137&hash=7aaf269706416f955cbbd95f04725747'),
  ('50005727520238240144', 'https://eproc1g.tjsc.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50005727520238240144&hash=2a6631860ae3d5d4ccd8a683b7aa4086'),
  ('50015017420248240144', 'https://eproc1g.tjsc.jus.br/eproc/controlador.php?acao=processo_selecionar&acao_origem=processo_selecionar&acao_retorno=processo_consultar&num_processo=50015017420248240144&hash=11ecfb12dfcaf5772e84166b983b13e1'),
  ('50050633520238210007', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50050633520238210007&hash=550c03681688daa56cacfc77eba4b988'),
  ('50013652820238210134', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50013652820238210134&hash=b610ac0993145e79f765d7d6aef4da47'),
  ('53546814320238217000', 'https://eproc2g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=53546814320238217000&strUfOrigem=RS&hash=d41e4752d6b6914db8f2138ec3cc0430'),
  ('50060946120238210049', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50060946120238210049&hash=17acf6475b3cf18585f71e91b26d2758'),
  ('50034058720238210067', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50034058720238210067&hash=532fb078e6d9b4859ded931f078b319d'),
  ('50028647420238240001', 'https://eproc1g.tjsc.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50028647420238240001&hash=1cb019190e177ce8d0b2f6137fa5f475'),
  ('52142479620268217000', 'https://eproc2g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=52142479620268217000&strUfOrigem=RS&hash=50723317a9164d4f79a476b2fc00bb15'),
  ('50053441320238210032', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50053441320238210032&hash=ceb2ff2677e042bf330b280c479c1d37'),
  ('50031008120238210042', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50031008120238210042&hash=827b2827e18e71dfe1894d754e33256c'),
  ('50034463220238210042', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50034463220238210042&hash=dcb8e5b2e2203b7452a84129b3dfb1ca'),
  ('50030384020248240004', 'https://eproc1g.tjsc.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50030384020248240004&hash=223c38cfc94d4de4c19f3dbb309142be'),
  ('50042501720238240074', 'https://eproc1g.tjsc.jus.br/eproc/controlador.php?acao=processo_selecionar&acao_origem=processo_consultar&acao_retorno=processo_consultar&num_processo=50042501720238240074&num_chave=540848812823&hash=373b24c1212f60d7a08ea5471c5338b7'),
  ('50020571520248240035', 'https://eproc1g.tjsc.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50020571520248240035&hash=13155c893abf9a1c80ebe979db11b6ca'),
  ('50199218920248210022', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50199218920248210022&hash=634f1d79fffd98234d5ac0cdcf570221'),
  ('50322697120268210022', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&acao_origem=processo_selecionar&acao_retorno=processo_consultar&num_processo=50322697120268210022&hash=570d98ec204087068120fe47c6a61e91'),
  ('50199123020248210022', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50199123020248210022&hash=58d5d70d1fc96a690f847df4e21bb65a'),
  ('52058574020268217000', 'https://eproc2g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=52058574020268217000&strUfOrigem=RS&hash=be40309fe8c256776a09e1e88170e15e'),
  ('50024518220248210042', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50024518220248210042&hash=d04c8fa3d46fcc4977a01386d2d8a96a'),
  ('50015012220248240032', 'https://eproc1g.tjsc.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50015012220248240032&hash=1643d7cca8029d71f6a3a7f52983558f'),
  ('50017385620248240032', 'https://eproc1g.tjsc.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50017385620248240032&hash=d49e42e2b976db0b638d4207388f8ec9'),
  ('50038591120248210042', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50038591120248210042&hash=86a5795a46e6c92777086f54effd7ba4'),
  ('50046015820248210067', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50046015820248210067&hash=3d6e2741ad7c2ebbdecc885ab1331db4'),
  ('50023162420268210067', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50023162420268210067&hash=5fb4442b5a67823b22b390993cbf88d5'),
  ('50024598120248210067', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50024598120248210067&hash=c3b71964ff8d28c7d8ffcb1fd6c851ac'),
  ('50027603220258210022', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50027603220258210022&hash=0b2064d5ff9d111fb5ef380a81077b6b'),
  ('50027525520258210022', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50027525520258210022&hash=a32bea946b252f39b82e1814b812bc45'),
  ('50003370320258240027', 'https://eproc1g.tjsc.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50003370320258240027&hash=a9d801e3731cc76ed5d933de57a97d06'),
  ('50028202220258240054', 'https://eproc1g.tjsc.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50028202220258240054&hash=b8307e413ce229939c06fe7f4fe4803e'),
  ('50091088320258240054', 'https://eproc1g.tjsc.jus.br/eproc/controlador.php?acao=processo_selecionar&acao_origem=processo_selecionar&acao_retorno=processo_consultar&num_processo=50091088320258240054&hash=515dabab1bf6aee84ef3b735f435c65f'),
  ('50003200720258240143', 'https://eproc1g.tjsc.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50003200720258240143&hash=77cc702c908c1173bfff679e264291ff'),
  ('50001408820258240143', 'https://eproc1g.tjsc.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50001408820258240143&hash=5c615f911cc2636ba1463fb928f14ddd'),
  ('50012415920258210042', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50012415920258210042&hash=8b9dd0570398df9b79498ee097b54fce'),
  ('50004750520258210107', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50004750520258210107&hash=b429382c04f21d172b4db40c8e4f9e98'),
  ('50029350320258240035', 'https://eproc1g.tjsc.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50029350320258240035&hash=df4bf4291b8e3b5d1cca156fa5fa1fa1'),
  ('50040416020258240015', 'https://eproc1g.tjsc.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50040416020258240015&hash=77f427754a08520a6b996c4f2ff4be98'),
  ('50025920420268240057', 'https://eproc1g.tjsc.jus.br/eproc/controlador.php?acao=processo_selecionar&acao_origem=processo_selecionar&acao_retorno=processo_consultar&num_processo=50025920420268240057&hash=0427dd00eeb498d2fcdc61adff8d3ce7'),
  ('50038851220258240035', 'https://eproc1g.tjsc.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50038851220258240035&hash=dbe665a9a11ebdcc07c4315cdd7cc785'),
  ('50027174120258210137', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50027174120258210137&hash=7ac55fe0a1e7883648847d342396c27d'),
  ('52813939120258217000', 'https://eproc2g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=52813939120258217000&strUfOrigem=RS&hash=eb2b88d143be012810347b364f368784'),
  ('50062711520258240035', 'https://eproc1g.tjsc.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50062711520258240035&hash=8a96be7f9a78caf7f50b576af0fd4d4d'),
  ('50022064320268210158', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50022064320268210158&hash=5ad3bdcf71ed97522ea4587ec7c51fa3'),
  ('50013868720218210032', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50013868720218210032&hash=54b3916dbd872c3ab56497511a9fb093'),
  ('50000421220098210026', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50000421220098210026&hash=15b2683cdb70036395794c99395ae577'),
  ('50002450920218210137', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50002450920218210137&hash=c5d8305be1a7eb791758589366ad1333'),
  ('50020099220198210042', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50020099220198210042&hash=c1aa5a9d443577b0aa1bb866a2f4e555'),
  ('50001202920208210120', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50001202920208210120&hash=3614194f7da21571dacc4c2e7451df14'),
  ('50000337820178210120', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50000337820178210120&hash=9b1640f7330045e08dd0c111f07a534d'),
  ('03072915220168240008', 'https://eproc1g.tjsc.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=03072915220168240008&hash=8bef3b7d01d1f6b547c50549a42bf68e'),
  ('50132342320258240008', 'https://eproc1g.tjsc.jus.br/eproc/controlador.php?acao=processo_selecionar&acao_origem=processo_selecionar&acao_retorno=processo_consultar&num_processo=50132342320258240008&hash=d273aa8bb319d3eaf737791c70056bf2'),
  ('50004667520218210077', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50004667520218210077&hash=e0244ec6ec2506e431497e61ca193d75'),
  ('50827746620258210001', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50827746620258210001&hash=daffda04c725f895529a9fd4d2974d08'),
  ('51442600720258217000', 'https://eproc2g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=51442600720258217000&strUfOrigem=RS&hash=61f511fade116dd7741fc12cfdd59090'),
  ('50014306120208210026', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50014306120208210026&hash=14d0199e34ae86a04076807810f1e40b'),
  ('50074621420228210026', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50074621420228210026&hash=d41b543cb72a40ebcc936e3b18be4a15'),
  ('50346170420228210022', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50346170420228210022&hash=29b342aeb26a6585055daad5a51ce8b2'),
  ('51559489720248217000', 'https://eproc2g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=51559489720248217000&strUfOrigem=RS&hash=26a0373bd889492f8eb4534cf49335e7'),
  ('00156657620208179000', 'https://pje.cloud.tjpe.jus.br/2g/Processo/ConsultaProcesso/Detalhe/listProcessoCompletoAdvogado.seam?id=277610&ca=cb859cdf45947f5e997097ed84dd1354cd8fa8c8c1bc62aeeb3e0e44c3ef1c4eb2c8bef34734e05af3f9e3ed2cfe7fe7&aba='),
  ('50010519120188210026', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50010519120188210026&hash=ab049ffec9d6403b9bd89e43775a8ef2'),
  ('50170861920248210026', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&acao_origem=processo_selecionar&acao_retorno=processo_consultar&num_processo=50170861920248210026&hash=74dd248b4ee63d17d8ea19b56bd1a15a'),
  ('50070344920188210001', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50070344920188210001&hash=3c26e977d7f7aca22e49609a6760f165'),
  ('00040538320188172640', 'https://pje.cloud.tjpe.jus.br/1g/Processo/ConsultaProcesso/Detalhe/listProcessoCompletoAdvogado.seam?id=1847819&ca=e94373efe65caddf3153734f9c01f693e6dc8b956d452fc39242b7d05545e9747a1dde0ed7d95db60a7b2e0fc4a7cdbb5dc27b270d04f9a8&aba='),
  ('00189129020114025101', 'https://eproc.jfrj.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=00189129020114025101&hash=947cedc4bda84f882bbc26456b75dfda'),
  ('00189137520114025101', 'https://eproc.jfrj.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=00189137520114025101&hash=610c25b398f7f0cf7687f723d3d4e298'),
  ('00125247920084025101', 'https://eproc.jfrj.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=00125247920084025101&hash=fd7a9b7deaff741a336abe7dd633bf07'),
  ('00429142319944025101', 'https://eproc.jfrj.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=00429142319944025101&hash=e4c349b6f67f7ad49145c39c3ebb4795'),
  ('00188660420114025101', 'https://eproc.jfrj.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=00188660420114025101&hash=0c5cd26e8006e9c3cc66ae2f3b84659b'),
  ('50135265420228210086', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50135265420228210086&hash=20764b980f694e55a826c2677d26f4a8'),
  ('50394266620248210022', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50394266620248210022&hash=4485f1d26a9de052c0c71977cf18817b');

update public.processos p
set link_tribunal_manual = lp.link
from links_planilha_bdr lp
where regexp_replace(p.numero_cnj, '\D', '', 'g') = lp.cnj
  and p.link_tribunal_manual is null;

-- resumo
select count(*) as processos_atualizados
from public.processos p
join links_planilha_bdr lp
  on regexp_replace(p.numero_cnj, '\D', '', 'g') = lp.cnj
where p.link_tribunal_manual = lp.link;

commit;
