-- Migracao pontual: preenche o link manual do tribunal (campo
-- link_tribunal_manual) com os links especificos de cada processo
-- coletados na planilha "PLANILHA MLV 19.08.2026" (a coluna "PROCESSO"
-- tinha hyperlink direto pro processo em varios casos, em varias abas
-- por UF).
--
-- So atualiza processo que ainda NAO tem link manual definido -- quem
-- ja foi ajustado manualmente antes fica como esta, sem sobrescrever.
-- Ignorados de proposito os hyperlinks que eram so a pagina generica de
-- consulta do tribunal (sem id/hash do processo), porque nao melhoram
-- nada em relacao ao link automatico que ja existe.

begin;

create temporary table links_planilha_mlv (cnj text primary key, link text) on commit drop;

insert into links_planilha_mlv (cnj, link) values
  ('00003078320068050080', 'https://pje.tjba.jus.br/pje/Processo/ConsultaProcesso/Detalhe/listAutosDigitais.seam?idProcesso=3716562&ca=fb2b962e34f1690666c8251cb1b9019d82ea2abde4e84bc0d1c1d6c0e88132ccc3c9a9ec1b30e90e56b3125ec920eee4d6c24b927bc1b01d&aba='),
  ('05034789620188050103', 'https://pje.tjba.jus.br/pje/Processo/ConsultaProcesso/Detalhe/listAutosDigitais.seam?idProcesso=10953265&ca=1199ca050c96909d11ba024c833bd7c98731ecd7bdc58208dbe97ea99511ad7805d866c30341043f5b0950e6a0d9ec08e3de927dab0de466&aba='),
  ('80139453120228050001', 'https://pje.tjba.jus.br/pje/Processo/ConsultaProcesso/Detalhe/listAutosDigitais.seam?idProcesso=7815660&ca=69f3904a788b3e8666c8251cb1b9019d82ea2abde4e84bc0d1c1d6c0e88132ccc3c9a9ec1b30e90e56b3125ec920eee4d6c24b927bc1b01d&aba='),
  ('80021978520228050038', 'https://pje.tjba.jus.br/pje/Processo/ConsultaProcesso/Detalhe/listAutosDigitais.seam?idProcesso=9598385&ca=9a7ec16c2a0423bb66c8251cb1b9019d82ea2abde4e84bc0d1c1d6c0e88132ccc3c9a9ec1b30e90e56b3125ec920eee4d6c24b927bc1b01d&aba='),
  ('80006116420238050139', 'https://pje.tjba.jus.br/pje/Processo/ConsultaProcesso/Detalhe/listAutosDigitais.seam?idProcesso=12856515&ca=ba22aab972f2c38411ba024c833bd7c98731ecd7bdc58208dbe97ea99511ad7805d866c30341043f5b0950e6a0d9ec08e3de927dab0de466&aba='),
  ('80034280620238050203', 'https://pje.tjba.jus.br/pje/Processo/ConsultaProcesso/Detalhe/listProcessoCompletoAdvogado.seam?id=14275918&ca=378fb629a160c5be11ba024c833bd7c98731ecd7bdc58208dbe97ea99511ad7805d866c30341043f5b0950e6a0d9ec08e3de927dab0de466&aba='),
  ('80021160420248050124', 'https://pje.tjba.jus.br/pje/Processo/ConsultaProcesso/Detalhe/listProcessoCompletoAdvogado.seam?id=15257476&ca=de12c7bc1b80dfb96cf8ce9d3b4215668933ee03d8cfacaf5d350a4ed5cef6aaf366f5d06c8ac43c56d4463902c7508b51ed18836eefda26&aba='),
  ('00377177620118060112', 'https://pje.tjce.jus.br/pje1grau/Processo/ConsultaProcesso/Detalhe/listProcessoCompletoAdvogado.seam?id=2280782&ca=17284e5648d0237858244f3cf836097e936ca29ad99322f865c77510fb6e0d4386c0d9543eabde691721047cbc2f365ef6468c29edd64ddb&aba='),
  ('08007406420258150321', 'https://pje.tjpb.jus.br/pje/Processo/ConsultaProcesso/Detalhe/listProcessoCompletoAdvogado.seam?id=3040391&ca=1d17e4321d749373f739a973b2b0e8798e722468fa5874fcefb84ce0b1b3d774d6194acda2baf7a935f960cb2e3103e519a858d24851bd20&aba='),
  ('08013509620258150041', 'https://pje.tjpb.jus.br/pje/Processo/ConsultaProcesso/Detalhe/listProcessoCompletoAdvogado.seam?id=3298949&ca=97c88f912b72f39a700aff0bb47e5bdd69219689697c202e52f6526b378d5acd522f0b88437e4ee5be7431a89a4949d319a858d24851bd20&aba='),
  ('08044108920258150231', 'https://pje.tjpb.jus.br/pje/Processo/ConsultaProcesso/Detalhe/listProcessoCompletoAdvogado.seam?id=3299658&ca=8aef7928036d5176700aff0bb47e5bdd69219689697c202e52f6526b378d5acd522f0b88437e4ee5be7431a89a4949d319a858d24851bd20&aba='),
  ('08037067920268150251', 'https://pje.tjpb.jus.br/pje/Processo/ConsultaProcesso/Detalhe/listProcessoCompletoAdvogado.seam?id=3408357&ca=967eae67ded00206700aff0bb47e5bdd69219689697c202e52f6526b378d5acd522f0b88437e4ee5be7431a89a4949d319a858d24851bd20&aba='),
  ('08011173320188100058', 'https://pje.tjma.jus.br/pje/Processo/ConsultaProcesso/Detalhe/listProcessoCompletoAdvogado.seam?idProcesso=529685&ca=6b474d65929f8d46ad29a3903ab22f5708db3cf059539a64897c9bb4064d7760ebd12650eabe9387a14b4b193b15aa93&aba='),
  ('08006094820238100079', 'https://pje.tjma.jus.br/pje/Processo/ConsultaProcesso/Detalhe/listProcessoCompletoAdvogado.seam?idProcesso=3200634&ca=20490ccd00ec4a752027a1a7d30aa1f298d9de307acc60f5d9fab829633d7d9da8e2f0c94fefff1f76b255e9ab6701c3211570214b705186&aba='),
  ('10132981820238260008', 'https://esaj.tjsp.jus.br/cpopg/show.do?processo.codigo=0800192QE0000&processo.foro=21&processo.numero=1013298-18.2023.8.26.0008'),
  ('00004078920168180059', 'https://pje.tjpi.jus.br/1g/Processo/ConsultaProcesso/Detalhe/listProcessoCompletoAdvogado.seam?id=373848&ca=2e61f493a5f1a45aed723cc898fb68d6c3deb057c1d48c3e2483dc4132519eaa36583a27e67288fd1bdd6049228837f6&aba='),
  ('00020346620128180028', 'https://pje.tjpi.jus.br/1g/Processo/ConsultaProcesso/Detalhe/listProcessoCompletoAdvogado.seam?id=1436907&ca=66d909292e941a5fa20f9bac8737ba4a6cb7eae80bfc3abbb10c2b6005b641dd6656711f91312ca6448444f6d02651c638a31b8b499d8dd1&aba=');

update public.processos p
set link_tribunal_manual = lp.link
from links_planilha_mlv lp
where regexp_replace(p.numero_cnj, '\D', '', 'g') = lp.cnj
  and p.link_tribunal_manual is null;

-- resumo
select count(*) as processos_atualizados
from public.processos p
join links_planilha_mlv lp
  on regexp_replace(p.numero_cnj, '\D', '', 'g') = lp.cnj
where p.link_tribunal_manual = lp.link;

commit;
