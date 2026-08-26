-- Migracao pontual: preenche o link manual do tribunal (campo
-- link_tribunal_manual) com os links especificos de cada processo
-- coletados na planilha "Copia de Planilha JGV Agosto" (a coluna
-- "Numero CNJ" tinha hyperlink direto pro processo em alguns casos).
--
-- So atualiza processo que ainda NAO tem link manual definido -- quem
-- ja foi ajustado manualmente antes fica como esta, sem sobrescrever.
-- Ignorados de proposito os hyperlinks que eram so a pagina generica de
-- consulta do tribunal (sem id/hash do processo), porque nao melhoram
-- nada em relacao ao link automatico que ja existe.

begin;

create temporary table links_planilha_jgv (cnj text primary key, link text) on commit drop;

insert into links_planilha_jgv (cnj, link) values
  ('50074621420228210026', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50074621420228210026&hash=d41b543cb72a40ebcc936e3b18be4a15'),
  ('50068666620238240008', 'https://eproc1g.tjsc.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=50068666620238240008&hash=93b7418d51bb44a7312c3325f72389d3'),
  ('52310734820268210001', 'https://eproc1g.tjrs.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=52310734820268210001&hash=6cede08a57bdc4ddb60b1291a842847a'),
  ('05359342020008060001', 'https://pje.tjce.jus.br/pje1grau/Processo/ConsultaProcesso/Detalhe/listProcessoCompletoAdvogado.seam?id=2215263&ca=e45123bd296d70eafe613604affeee17fd4fed3c5080e628cf0028e14da7d7cf6b2f4716019d32becbf5d4ffc34803baf6468c29edd64ddb&aba='),
  ('00233684520198190203', 'http://www4.tjrj.jus.br/consultaProcessoWebV2/consultaProc.do?v=2&FLAGNOME=&back=1&tipoConsulta=publica&numProcesso=2019.203.023302-9'),
  ('10009903820188260100', 'https://esaj.tjsp.jus.br/cpopg/show.do?processo.codigo=2S000T5540000&processo.foro=100&processo.numero=1000990-38.2018.8.26.0100&uuidCaptcha=sajcaptcha_0605adfb00e643d38b18166bc1857513'),
  ('10033596820188260564', 'https://esaj.tjsp.jus.br/cpopg/show.do?processo.codigo=FO0008UAH0000&processo.foro=564&processo.numero=1003359-68.2018.8.26.0564&uuidCaptcha=sajcaptcha_5254394ccc874793b4ad9c95a0204e54'),
  ('10024904520208260529', 'https://esaj.tjsp.jus.br/cpopg/show.do?processo.codigo=EP0004HUM0000&processo.foro=529&processo.numero=1002490-45.2020.8.26.0529&uuidCaptcha=sajcaptcha_92be2e846564492e993d9cd81c08365b'),
  ('08656236720238190001', 'https://eproc1g.tjrj.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=08656236720238190001&hash=80c7d340db8f366323a01e804aec3903'),
  ('08237648920248190210', 'https://eproc1g.tjrj.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=08237648920248190210&hash=c43bf10ffa1dde7582b6c80f2604deee'),
  ('10054961620258260002', 'https://esaj.tjsp.jus.br/cpopg/show.do?processo.codigo=02002M34E0000&processo.foro=2&processo.numero=1005496-16.2025.8.26.0002'),
  ('40000974320258260587', 'https://eproc1g.tjsp.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=40000974320258260587&hash=572b5d34bf29f3f2e6ecd9a2bab89f8f'),
  ('10364466820268130702', 'https://eproc1g.tjmg.jus.br/eproc/controlador.php?acao=processo_selecionar&acao_origem=processo_selecionar&acao_retorno=processo_consultar&num_processo=10364466820268130702&hash=6833fb08b65d0ed20c86eae4d59fa4dd'),
  ('00077914420084036103', 'https://pje1g.trf3.jus.br/pje/Processo/ConsultaProcesso/Detalhe/listProcessoCompletoAdvogado.seam?id=1322053&ca=cb82f7252efe621663c1e3be15752e7131c173ee4b8e715eb1e26bce5477467ffd7452b7d2b8467e1b9b65c77a7a4c7dc95cfc6d14a0d231&aba='),
  ('00220999720208272729', 'https://eproc1.tjto.jus.br/eprocV2_prod_1grau/controlador.php?acao=processo_selecionar&num_processo=00220999720208272729&hash=68dcfa8089bffc61211f8d74525f7cab'),
  ('09694453820248190001', 'https://eproc2g.tjrj.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=09694453820248190001&hash=2479265fea9e2d4c3b7531fac13ce821'),
  ('03068355220198240023', 'https://eproc1g.tjsc.jus.br/eproc/controlador.php?acao=processo_selecionar&num_processo=03068355220198240023&hash=942e905a97bdc746b532fe5c6418a93e');

update public.processos p
set link_tribunal_manual = lp.link
from links_planilha_jgv lp
where regexp_replace(p.numero_cnj, '\D', '', 'g') = lp.cnj
  and p.link_tribunal_manual is null;

-- resumo
select count(*) as processos_atualizados
from public.processos p
join links_planilha_jgv lp
  on regexp_replace(p.numero_cnj, '\D', '', 'g') = lp.cnj
where p.link_tribunal_manual = lp.link;

commit;
