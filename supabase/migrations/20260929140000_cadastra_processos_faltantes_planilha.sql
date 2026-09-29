-- 7 processos que estavam na planilha "PROCESSOS_29_09_2026" mas não
-- existiam no FaroLex (conferido por número, batendo digito a digito) --
-- casos 4440, 4441, 4442, 4443, 3982, 1519 e 3326. Todos Souza Cruz S.A.,
-- sócia ELV, estagiária LTV (confirmado com a BDR), vinculados às pastas
-- BBS/MLV (Equipe Souza Cruz) conforme quem é o responsável de cada um.
insert into public.processos
  (numero_cnj, cliente, numero_cliente, autor, reu, parte_contraria, comarca, uf, vara, classe, carteira, responsavel, socio, estagiario, status, pasta_id)
values
(
    '2026323723', 'Souza Cruz S.A.', '4608', 'Conselho Regional de Administração do Estado do Rio de Janeiro', 'Souza Cruz S.A.', 'Conselho Regional de Administração do Estado do Rio de Janeiro',
    'Rio de Janeiro', 'RJ', 'Procon', 'Processo Administrativo', 'Administrativos',
    'BBS', 'ELV', 'LTV', 'ativo',
    (select id from public.pastas where nome = 'BBS' and grupo_id = (select id from public.grupos where nome = 'Equipe Souza Cruz'))
  ),
(
    '2605049900100116301', 'Souza Cruz S.A.', '4608', 'Edna da Silva', 'Souza Cruz S.A.', 'Edna da Silva',
    'Corumbá', 'MS', 'Procon', 'Processo Administrativo', 'Administrativos',
    'BBS', 'ELV', 'LTV', 'ativo',
    (select id from public.pastas where nome = 'BBS' and grupo_id = (select id from public.grupos where nome = 'Equipe Souza Cruz'))
  ),
(
    '26050651001000103', 'Souza Cruz S.A.', '4608', 'Jean Victor Rosa da Silva', 'Souza Cruz S.A.', 'Jean Victor Rosa da Silva',
    'Raul Soares', 'MG', 'Vara Única', 'Processo Administrativo', 'Administrativos',
    'BBS', 'ELV', 'LTV', 'ativo',
    (select id from public.pastas where nome = 'BBS' and grupo_id = (select id from public.grupos where nome = 'Equipe Souza Cruz'))
  ),
(
    '2606076200100007301', 'Souza Cruz S.A.', '4608', 'Graziele de Souza Paula', 'Souza Cruz S.A.', 'Graziele de Souza Paula',
    'Guaçuí', 'ES', '1ª Vara', 'Procedimento Administrativo Procon', 'Administrativos',
    'BBS', 'ELV', 'LTV', 'ativo',
    (select id from public.pastas where nome = 'BBS' and grupo_id = (select id from public.grupos where nome = 'Equipe Souza Cruz'))
  ),
(
    '0002182-46.2023.8.05.0063', 'Souza Cruz S.A.', '4608', 'Samuel Santos Brito', 'Souza Cruz S.A.', 'Samuel Santos Brito',
    'Conceição do Coité', 'BA', 'Vara do Sistema dos Juizados', 'Declaratória com indenização', null,
    'MLV', 'ELV', 'LTV', 'ativo',
    (select id from public.pastas where nome = 'MLV' and grupo_id = (select id from public.grupos where nome = 'Equipe Souza Cruz'))
  ),
(
    '0057801-18.2010.8.21.0015', 'Souza Cruz S.A.', '4608', 'Tabacaria Estrela Ltda', 'Souza Cruz S.A.', 'Tabacaria Estrela Ltda',
    null, null, null, 'Execução de Título Extrajudicial', null,
    'BBS', 'ELV', 'LTV', 'ativo',
    (select id from public.pastas where nome = 'BBS' and grupo_id = (select id from public.grupos where nome = 'Equipe Souza Cruz'))
  ),
(
    '51019001190000746', 'Souza Cruz S.A.', '4608', 'Claudio da Fonseca', 'Souza Cruz S.A.', 'Claudio da Fonseca',
    null, null, 'Procon', 'Procedimento Administrativo Procon', 'Administrativos',
    'BBS', 'ELV', 'LTV', 'ativo',
    (select id from public.pastas where nome = 'BBS' and grupo_id = (select id from public.grupos where nome = 'Equipe Souza Cruz'))
  );

-- Caso 4121 (Ricardo Diegues da Silva, Procon SP) já estava cadastrado,
-- só com o número errado/truncado -- corrige pro número certo da planilha.
update public.processos
set numero_cnj = '2311003500100044302'
where id = 'ad267943-f29d-4954-9597-0a9314c8830a';
