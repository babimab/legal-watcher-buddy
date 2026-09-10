-- Fluxo de encerramento (cliente 4608 / Souza Cruz): a BDR conferiu a
-- base do LegalDesk (fonte externa do cliente) contra a base do FaroLex
-- e achou 8 processos que o LegalDesk já marca como fase "Encerramento"
-- mas que no FaroLex ainda estavam com uma fase antiga, além de 1
-- processo do Procon (número fora do padrão CNJ) que nem estava
-- cadastrado ainda.

update public.processos
set fase = 'Encerramento'
where regexp_replace(numero_cnj, '\D', '', 'g') in (
  '50003155120098210006', -- caso 3457
  '00037805820118050256', -- caso 1783
  '50034058720238210067', -- caso 4086
  '50228753920258240039', -- caso 4383
  '03002815220188240083', -- caso 3153
  '00068483220268160014', -- caso 4405
  '50008101820238210067', -- caso 3977
  '50008093320238210067'  -- caso 3976
);

insert into public.processos (
  numero_cnj, cliente, autor, reu, parte_contraria, numero_cliente,
  numero_interno, uf, vara, comarca, classe, fase, responsavel, socio,
  status
) values (
  '2208015801200178301', -- Procon, não é CNJ padrão -- caso 3927
  'Souza Cruz S.A.',
  'Ronivon da Silva Nunes',
  'Souza Cruz S.A.',
  'Ronivon da Silva Nunes',
  '4608',
  '3927',
  'DF',
  'Procon',
  'Brasília (DF)',
  'Cobrança',
  'Encerramento',
  'BBS',
  'GFC',
  'ativo'
);
