-- Migracao pontual: preenche o link manual do tribunal (campo
-- link_tribunal_manual) com os links especificos de cada processo
-- coletados nas planilhas "Planilha BBS.GFC 18.08.2026" e "Planilha
-- BBS.ELV 18.08.2026" (a coluna "PROCESSO" tinha hyperlink direto pro
-- processo em varios casos, em varias abas por UF).
--
-- So atualiza processo que ainda NAO tem link manual definido -- quem
-- ja foi ajustado manualmente antes fica como esta, sem sobrescrever.
-- Ignorados de proposito os hyperlinks que eram so a pagina generica de
-- consulta do tribunal (sem id/hash do processo), porque nao melhoram
-- nada em relacao ao link automatico que ja existe.

begin;

create temporary table links_planilha_bbs (cnj text primary key, link text) on commit drop;

insert into links_planilha_bbs (cnj, link) values
  ('10884683420234013400', 'https://pje1g.trf1.jus.br/pje/Processo/ConsultaProcesso/Detalhe/listProcessoCompletoAdvogado.seam?id=10440366&ca=48f31a8bbea61c77d3b2e0121ebc1ad5e5c6b8fce6338b041b31bdb980c7abe0fc1236a2c6202754cb18c5e651dcb2abe9cb664beed48e47&aba='),
  ('01247571520078120001', 'https://esaj.tjms.jus.br/cpopg5/show.do?processo.codigo=01000AI0O0000&processo.foro=1&processo.numero=0124757-15.2007.8.12.0001&uuidCaptcha=sajcaptcha_e357f92e489d45c0b572aee353aa54d9'),
  ('08020849520238120010', 'https://esaj.tjms.jus.br/cpopg5/show.do?processo.codigo=0A0002NAK0000&processo.foro=10&processo.numero=0802084-95.2023.8.12.0010&uuidCaptcha=sajcaptcha_3608ee9c50fe4cf49fdf3604a0632650'),
  ('00037212620128140049', 'https://pje.tjpa.jus.br/pje/Processo/ConsultaProcesso/Detalhe/listProcessoCompletoAdvogado.seam?id=4549095&ca=80e803aea6e4bb785e4e0080f5a429e0e2fdd20cae14038a895b7120243c7e030bcad304a08c88fe63c5c50512701e17faef3ce069d128fa&aba='),
  ('08005427320238140111', 'https://pje.tjpa.jus.br/pje/Processo/ConsultaProcesso/Detalhe/listProcessoCompletoAdvogado.seam?id=6238331&ca=3f93bc3f8788ccd15e4e0080f5a429e0e2fdd20cae14038a895b7120243c7e030bcad304a08c88fe63c5c50512701e17faef3ce069d128fa&aba='),
  ('08020251520258140097', 'https://pje.tjpa.jus.br/pje/Processo/ConsultaProcesso/Detalhe/listProcessoCompletoAdvogado.seam?id=7870252&ca=11e8fb4234f11ebb36fcb79861f62b0719125e8c372c7b8ba38df4673f18a8ab647076cd1794c4851e1e4bffc18b29b9faef3ce069d128fa&aba='),
  ('08028798720198205129', 'https://pje1g.tjrn.jus.br/pje/Processo/ConsultaProcesso/Detalhe/listProcessoCompletoAdvogado.seam?id=1988411&ca=be6975c25ab7bdb87328776122a323f075516827a0ae8108ca840cffeb587b61d97e8c5739350c8a3c4cf9e3f08d85590ca2c3ce4359c419&aba='),
  ('08002287720198205163', 'https://pje1g.tjrn.jus.br/pje/Processo/ConsultaProcesso/Detalhe/listProcessoCompletoAdvogado.seam?id=1856522&ca=6a78f738f5a079437328776122a323f075516827a0ae8108ca840cffeb587b61d97e8c5739350c8a3c4cf9e3f08d85590ca2c3ce4359c419&aba='),
  ('08168784920248205124', 'https://pje1g.tjrn.jus.br/pje/Processo/ConsultaProcesso/Detalhe/listProcessoCompletoAdvogado.seam?id=3641535&ca=8471ac220d368a957328776122a323f075516827a0ae8108ca840cffeb587b61d97e8c5739350c8a3c4cf9e3f08d85590ca2c3ce4359c419&aba='),
  ('00285461620128080012', 'https://pje.tjes.jus.br/pje/Processo/ConsultaProcesso/Detalhe/listProcessoCompletoAdvogado.seam?id=860340&ca=3b9bd16c17e83a82ff201591e6861b23e77b4b7b7a5685c839fadb71f078e54737b36c9897cec1b65e3180ace8e7b0ba&aba='),
  ('00265666220128080035', 'https://pje.tjes.jus.br/pje/Processo/ConsultaProcesso/Detalhe/listProcessoCompletoAdvogado.seam?id=5776865&ca=7b616411f0a5a2f8e2c3e0c3d119f6d4a87dfeecafec33338d59bf18f3dacabb43bfdf29855a7701d5db9c71bdd6754387e569ce49daf892&aba='),
  ('50002602420258080064', 'https://pje.tjes.jus.br/pje/Processo/ConsultaProcesso/Detalhe/listProcessoCompletoAdvogado.seam?id=14298716&ca=5f4c0ece8238a6a618ac5bbc138aad9a4151868552843edc95fe41f1b60c9ff3838feca9333b3bdd75c816644ceb5f82ddddba344689a47e&aba='),
  ('50006075620258080032', 'https://pje.tjes.jus.br/pje/Processo/ConsultaProcesso/Detalhe/listProcessoCompletoAdvogado.seam?id=14413467&ca=712fabdb18656f4bedb28527cfb08c79a522b17ec7fd8460f588f8720c38cbd863a4c4753bbebbfcf0607c0d22a2005eddddba344689a47e&aba='),
  ('50002768320258080029', 'https://pje.tjes.jus.br/pje/Processo/ConsultaProcesso/Detalhe/listProcessoCompletoAdvogado.seam?id=14434992&ca=df47a6c00639405ea649a390cba3a653beaebcd511462f7f6d17178562cd8d91ed2bdb583acca5c8937bb65f27e6e4e80f262db8e9804786&aba='),
  ('50004677720258080046', 'https://pje.tjes.jus.br/pje/Processo/ConsultaProcesso/Detalhe/listProcessoCompletoAdvogado.seam?id=14489740&ca=1248eb1b46a09b5f4ce9cd6d37095ece340674d1b4f80a42133e42323c9a01ade6e4d6e214eb1abb04ad41d122dba66e883e156f1f7976f6&aba='),
  ('50233094520258080048', 'https://pje.tjes.jus.br/pje/Processo/ConsultaProcesso/Detalhe/listProcessoCompletoAdvogado.seam?id=14522896&ca=fcfbfa73ec5670f24ce9cd6d37095ece340674d1b4f80a42133e42323c9a01ade6e4d6e214eb1abb04ad41d122dba66e883e156f1f7976f6&aba='),
  ('50336607720258080048', 'mailto:http://pje.tjes.jus.br/pje/ng2/dev.seam%23/autos-digitais/14636078?ca=5f538473215ee949ed297c9c6149985027fd03cb8207e5ac14ed66fc7f4745d4bf13c6d9fd5ef95fe6b031d191eb58bc6c7a1f34335ad8bc&aba='),
  ('50354206120258080048', 'mailto:https://pje.tjes.jus.br/pje/ng2/dev.seam%23/autos-digitais/14655753?ca=94ae453587be39eced297c9c6149985027fd03cb8207e5ac14ed66fc7f4745d4bf13c6d9fd5ef95fe6b031d191eb58bc6c7a1f34335ad8bc&aba='),
  ('50038936020258080026', 'mailto:https://pje.tjes.jus.br/pje/ng2/dev.seam%23/autos-digitais/14747742?ca=2c4f52f26d8fea33ed297c9c6149985027fd03cb8207e5ac14ed66fc7f4745d4bf13c6d9fd5ef95fe6b031d191eb58bc6c7a1f34335ad8bc&aba='),
  ('50015518420268080012', 'mailto:https://pje.tjes.jus.br/pje/ng2/dev.seam%23/autos-digitais/14818665?ca=75b2c68350de7cc6ed297c9c6149985027fd03cb8207e5ac14ed66fc7f4745d4bf13c6d9fd5ef95fe6b031d191eb58bc6c7a1f34335ad8bc&aba='),
  ('51275407520168130024', 'https://pje.tjmg.jus.br/pje/Processo/ConsultaProcesso/Detalhe/listAutosDigitais.seam?idProcesso=747215&ca=dd759a90786580692cb15eba643e7b6ecf65d90820c400474e769ae7063690ba5c26847d7157505d2922669a88301ceb&aba='),
  ('00907136420158130452', 'https://pje.tjmg.jus.br/pje/Processo/ConsultaProcesso/Detalhe/listAutosDigitais.seam?idProcesso=170907669&ca=4fbe5fd4f6e428014a26bc41d32fbae40fc316416c2d54eec841276466a80fc0ef745d40c72ea3a095cb734d4a7788b4f9e6928070aaed18&aba='),
  ('50012537120238130105', 'https://pje.tjmg.jus.br/pje/Processo/ConsultaProcesso/Detalhe/listProcessoCompletoAdvogado.seam?id=595986959&ca=5d6ff58a86b74dd7b2a805ee06c75de07e141747f346d33840fafa70376853edd665e4dd353e5ed85c7eefb6572c4421bc8d24322db91586&aba='),
  ('50082041820238130223', 'https://pje.tjmg.jus.br/pje/Processo/ConsultaProcesso/Detalhe/listAutosDigitais.seam?idProcesso=618331561&ca=3382b0997742d9aa4aaf3624c27db7120fc316416c2d54eec841276466a80fc0ef745d40c72ea3a095cb734d4a7788b4f9e6928070aaed18&aba='),
  ('50498875320238130702', 'https://pje.tjmg.jus.br/pje/Processo/ConsultaProcesso/Detalhe/listAutosDigitais.seam?idProcesso=645754862&ca=a7df61bd1cf76f6f2e4379031791fb900fc316416c2d54eec841276466a80fc0ef745d40c72ea3a095cb734d4a7788b4f9e6928070aaed18&aba='),
  ('50009324620248130155', 'https://pje.tjmg.jus.br/pje/Processo/ConsultaProcesso/Detalhe/listProcessoCompletoAdvogado.seam?id=698385773&ca=caa355b60d8ab2f71ae5c33d5aaeeb5c0fc316416c2d54eec841276466a80fc0ef745d40c72ea3a095cb734d4a7788b4f9e6928070aaed18&aba='),
  ('50009180920248130205', 'https://pje.tjmg.jus.br/pje/Processo/ConsultaProcesso/Detalhe/listAutosDigitais.seam?idProcesso=702992425&ca=309a63d52f5748aa11b05696ae94911d0fc316416c2d54eec841276466a80fc0ef745d40c72ea3a095cb734d4a7788b4f9e6928070aaed18&aba='),
  ('50026812120248130407', 'https://pje.tjmg.jus.br/pje/Processo/ConsultaProcesso/Detalhe/listAutosDigitais.seam?idProcesso=725041024&ca=c0b3bfd8c980447443b441ffe7e5e5bb0fc316416c2d54eec841276466a80fc0ef745d40c72ea3a095cb734d4a7788b4f9e6928070aaed18&aba='),
  ('60958556720254063800', 'https://eproc1g.trf6.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=60958556720254063800&hash=68dad76acdd0747760081e67cfc556c4'),
  ('11070975920258130024', 'https://eproc1g.tjmg.jus.br/eproc/controlador.php?acao=processo_selecionar&acao_origem=processo_consultar&acao_retorno=processo_consultar&num_processo=11070975920258130024&hash=5590488014fd6035a213f53262229c64'),
  ('10001265020268130239', 'https://eproc1g.tjmg.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=10001265020268130239&hash=99bf29e08a4ba37771b1d63e7a4e47cc'),
  ('10009383620268130290', 'https://eproc1g.tjmg.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=10009383620268130290&hash=53681ce235b6961275690a2deb19754d'),
  ('50013940920158210086', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&acao_origem=processo_consultar&acao_retorno=processo_consultar&num_processo=50013940920158210086&hash=ce519867c3819fe20bfdeef8e7999414'),
  ('50044357720218216001', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50044357720218216001&hash=ffc90570fcf43cb7eac3380f522a9cc0'),
  ('50000403220048210086', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&acao_origem=processo_consultar&acao_retorno=processo_consultar&num_processo=50000403220048210086&hash=5044b285f21e8a90d0c4aaa64b7daa44'),
  ('50001280820078210008', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&acao_origem=processo_consultar&acao_retorno=processo_consultar&num_processo=50001280820078210008&hash=3fb0ff0931419923ebc82e0b588110d2'),
  ('50003220820078210008', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&acao_origem=processo_consultar&acao_retorno=processo_consultar&num_processo=50003220820078210008&hash=e4423d13855100c2e75f5222ee900255'),
  ('50003436820148210030', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&acao_origem=processo_consultar&acao_retorno=processo_consultar&num_processo=50003436820148210030&hash=673d8a693b9245b0f7103dc2badbeda0'),
  ('50034021120218210033', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&acao_origem=processo_consultar&acao_retorno=processo_consultar&num_processo=50034021120218210033&hash=5f51bf03a8e6a847f1843aea26224397'),
  ('50096725620188210033', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&acao_origem=processo_consultar&acao_retorno=processo_consultar&num_processo=50096725620188210033&hash=da3273a8d35cff015dd387332bd769ea'),
  ('52049341420268217000', 'https://eproc2g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=52049341420268217000&strUfOrigem=RS&hash=c27a30c5f081a2f817aa44def9fe7858'),
  ('50000027520108210129', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&acao_origem=processo_consultar&acao_retorno=processo_consultar&num_processo=50000027520108210129&hash=1e597aeeb544df024609da8e2e81e461'),
  ('50005505420108210015', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&acao_origem=processo_consultar&acao_retorno=processo_consultar&num_processo=50005505420108210015&hash=a80e4ac1545aee58f2fcf82a3ceaa390'),
  ('50030582620178210015', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&acao_origem=processo_consultar&acao_retorno=processo_consultar&num_processo=50030582620178210015&hash=67e62f26bd67549e58fc1a9e069ef496'),
  ('50022671120198210040', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&acao_origem=processo_consultar&acao_retorno=processo_consultar&num_processo=50022671120198210040&hash=48de4297da285490b8217857bd5fab07'),
  ('50023204120188210132', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&acao_origem=processo_consultar&acao_retorno=processo_consultar&num_processo=50023204120188210132&hash=4a26f751c71a621b832d78abd4fedeb6'),
  ('50040320720228210074', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&acao_origem=processo_consultar&acao_retorno=processo_consultar&num_processo=50040320720228210074&hash=84aa181c8aae232e4b94cbe32a683a35'),
  ('50052307420258210074', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&acao_origem=processo_consultar&acao_retorno=processo_consultar&num_processo=50052307420258210074&hash=024dcdcbd5a74b980b641b1d4eb8dbfa'),
  ('50044461020228210040', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&acao_origem=processo_consultar&acao_retorno=processo_consultar&num_processo=50044461020228210040&hash=ebbb53b738712d64c9c924619bb514f7'),
  ('50000948220238210069', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&acao_origem=processo_consultar&acao_retorno=processo_consultar&num_processo=50000948220238210069&hash=ee707d5220987470a703efd7c0beb432'),
  ('50042097820258210069', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&acao_origem=processo_consultar&acao_retorno=processo_consultar&num_processo=50042097820258210069&hash=5e46e1d4930f67221e35bd0a6a35e452'),
  ('50064800720248210001', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&acao_origem=processo_consultar&acao_retorno=processo_consultar&num_processo=50064800720248210001&hash=ab0688ccac31795b4f13134b599c70db'),
  ('50121505820258219000', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&acao_origem=processo_selecionar&acao_retorno=processo_consultar&num_processo=50121505820258219000&hash=4399d12bf80202fb74f8963a816eea1f'),
  ('50170948920208210008', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&acao_origem=processo_consultar&acao_retorno=processo_consultar&num_processo=50170948920208210008&hash=de6ece2cf4d629da24efc3fa88d8f090'),
  ('50007308220248210014', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&acao_origem=processo_consultar&acao_retorno=processo_consultar&num_processo=50007308220248210014&hash=a945e03e6a7db8eed2c86e9453e03092'),
  ('50172002720248210003', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&acao_origem=processo_consultar&acao_retorno=processo_consultar&num_processo=50172002720248210003&hash=509608741b4c8c0a1c47f8395a837480'),
  ('50024764720268210003', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&acao_origem=processo_selecionar&acao_retorno=processo_consultar&num_processo=50024764720268210003&hash=ab74e28c77b50adeba1765828cda6e45'),
  ('50011520820258210019', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50011520820258210019&hash=39085eb0568ccfc536e6b23919bb976e'),
  ('50005503820258210109', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50005503820258210109&hash=42fd514132910454c169e9c6f1d4fccb'),
  ('51627807820268217000', 'https://eproc2g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=51627807820268217000&strUfOrigem=RS&hash=db5d5cfb641d9eefede76c7cb0ce301b'),
  ('50816028920258210001', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50816028920258210001&hash=9027ba0a0ce0fb03b99e0115f0c1502f'),
  ('50022475020258210156', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50022475020258210156&hash=bad7f47e348a64fc482749a150430555'),
  ('50013842520258210082', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50013842520258210082&hash=443f7bd4f201734d5dae6916d8f27dfe'),
  ('50147025820258210023', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50147025820258210023&hash=673b12d42fdf173092f77df3a7b98cec'),
  ('50213293020258210039', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50213293020258210039&hash=3382e5109d2a7128ea5cea75ef69f71a'),
  ('50056848120258210065', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50056848120258210065&hash=4a5f226c4347756109d7a32c5012de6d'),
  ('50000156220268210081', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&acao_origem=processo_consultar&acao_retorno=processo_consultar&num_processo=50000156220268210081&hash=3da7fddad0590571ba68180d3adc938c'),
  ('50007823820268210134', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&acao_origem=processo_consultar&acao_retorno=processo_consultar&num_processo=50007823820268210134&hash=020e6b1ad9b2a6ea52542dc89c76698f'),
  ('50087045720268210029', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&acao_origem=processo_consultar&acao_retorno=processo_consultar&num_processo=50087045720268210029&hash=304b661b7500857ce76072c5d42016af'),
  ('50013436820268210132', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&acao_origem=processo_consultar&acao_retorno=processo_consultar&num_processo=50013436820268210132&hash=cc1ccdbb76420e94f857f4777f2d5163'),
  ('00243597420238172001', 'https://pje.cloud.tjpe.jus.br/1g/Processo/ConsultaProcesso/Detalhe/listProcessoCompletoAdvogado.seam?id=5160983&ca=b5dff9cc32704b5dc94ad4ba5f5ff10f39ba65f111bec35d76a2f6c8b872412940703f44013a86ab59caa36b1a6ff7225dc27b270d04f9a8&aba='),
  ('00010126520248172360', 'https://pje.cloud.tjpe.jus.br/1g/Processo/ConsultaProcesso/Detalhe/listProcessoCompletoAdvogado.seam?id=6382882&ca=62046a8c315fa6cfb409a7bd364461d43b77d2a7fecac3f1f2fb0dc6841c29445c9ecca819709b79b2af3d9afdaa38625dc27b270d04f9a8&aba='),
  ('00003365420258178222', 'https://pje.cloud.tjpe.jus.br/1g/Processo/ConsultaProcesso/Detalhe/listProcessoCompletoAdvogado.seam?id=6759999&ca=fa5743a969c17988b409a7bd364461d43b77d2a7fecac3f1f2fb0dc6841c29445c9ecca819709b79b2af3d9afdaa38625dc27b270d04f9a8&aba='),
  ('03002815220188240083', 'https://eproc1g.tjsc.jus.br/eproc/controlador.php?acao=processo_selecionar&acao_origem=processo_consultar&acao_retorno=processo_consultar&num_processo=03002815220188240083&hash=2a209c487a841f7603c0ef7e28fee11b'),
  ('50009302920238240083', 'https://eproc1g.tjsc.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50009302920238240083&hash=41ba78abc39f7f1bf83a295323b4f589'),
  ('50035727920258240058', 'https://eproc1g.tjsc.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50035727920258240058&hash=e5cd5e938f989944a1abf0ccb9d04272'),
  ('50110248620268240000', 'https://eproc2g.tjsc.jus.br/eproc/controlador.php?acao=processo_selecionar&acao_origem=processo_consultar&acao_retorno=processo_consultar&num_processo=50110248620268240000&hash=c555985c6fdfa6cecefd93102623c09d'),
  ('50029059820258240024', 'https://eproc1g.tjsc.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50029059820258240024&hash=8eca87f93346228feda2a1bb5f45f62e'),
  ('50023324320258240159', 'https://eproc1g.tjsc.jus.br/eproc/controlador.php?acao=processo_selecionar&acao_origem=processo_consultar&acao_retorno=processo_consultar&num_processo=50023324320258240159&hash=6bd5f3837b9662ed220064424c3ef218'),
  ('50228753920258240039', 'https://eproc1g.tjsc.jus.br/eproc/controlador.php?acao=processo_selecionar&acao_origem=processo_consultar&acao_retorno=processo_consultar&num_processo=50228753920258240039&hash=2983589efa32b04c53cd591d773d10f7'),
  ('50000748820268240009', 'https://eproc1g.tjsc.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50000748820268240009&hash=2618a6b2e33697e951c6b145b6d5a82f'),
  ('50001796520268240009', 'https://eproc1g.tjsc.jus.br/eproc/controlador.php?acao=processo_selecionar&acao_origem=processo_consultar&acao_retorno=processo_consultar&num_processo=50001796520268240009&hash=209039678c2f0de637ef8fac037e7f52'),
  ('50074395720268240022', 'https://eproc1g.tjsc.jus.br/eproc/controlador.php?acao=processo_selecionar&acao_origem=processo_consultar&acao_retorno=processo_consultar&num_processo=50074395720268240022&hash=344c153fb361bca31d6e851751b13aed'),
  ('50111086720268240039', 'https://eproc1g.tjsc.jus.br/eproc/controlador.php?acao=processo_selecionar&acao_origem=processo_consultar&acao_retorno=processo_consultar&num_processo=50111086720268240039&hash=3769569093b8788f25a2bc4f99d56c20'),
  ('00010522320238272742', 'https://eproc1.tjto.jus.br/eprocV2_prod_1grau/controlador.php?acao=processo_selecionar&num_processo=00010522320238272742&hash=70dab9b40ee3c1ad566d77ea62337eb4');

update public.processos p
set link_tribunal_manual = lp.link
from links_planilha_bbs lp
where regexp_replace(p.numero_cnj, '\D', '', 'g') = lp.cnj
  and p.link_tribunal_manual is null;

-- resumo
select count(*) as processos_atualizados
from public.processos p
join links_planilha_bbs lp
  on regexp_replace(p.numero_cnj, '\D', '', 'g') = lp.cnj
where p.link_tribunal_manual = lp.link;

commit;
