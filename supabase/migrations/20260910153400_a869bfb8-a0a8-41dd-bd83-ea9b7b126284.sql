update public.processos
set fase = 'Encerramento'
where regexp_replace(numero_cnj, '\D', '', 'g') in (
  '50003155120098210006',
  '00037805820118050256',
  '50034058720238210067',
  '50228753920258240039',
  '03002815220188240083',
  '00068483220268160014',
  '50008101820238210067',
  '50008093320238210067'
);

insert into public.processos (
  numero_cnj, cliente, autor, reu, parte_contraria, numero_cliente,
  numero_interno, uf, vara, comarca, classe, fase, responsavel, socio,
  status
)
select
  '2208015801200178301',
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
where not exists (
  select 1 from public.processos
  where regexp_replace(numero_cnj, '\D', '', 'g') = '2208015801200178301'
);