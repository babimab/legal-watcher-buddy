-- Processos da BBS que têm número de protocolo de órgão administrativo
-- (Procon, INMETRO) em vez de número CNJ, e por isso estavam classificados
-- errado (carteira "Cobrança Indevida" ou lixo de importação "Sheet1").
-- Conferido um a um contra a aba "Administrativos" da planilha da BDR --
-- número de protocolo bate exatamente com o que está no FaroLex.
update public.processos
set carteira = 'Administrativos'
where id in (
  'b85ddb17-8411-43bd-b87b-43321bf768a9', -- Procon/DF (caso 3927)
  'd10a141f-001e-4d3b-8fa1-e58dc4aa2a7a', -- Procon Araguaína/TO (caso 3818)
  '16c8941d-0cb5-42b1-8e86-71514f8d2fce', -- Procon Araguaína/TO (caso 3795)
  '4d12200a-956c-4666-8970-2ab803967cda', -- Procon PE/Recife (caso 3848)
  '00da40c8-0d3d-4e80-9241-9b7938b2a37b', -- Procon/PE (caso 4314)
  '7edcaa28-b6f1-4b01-ad42-a15c1a91ac27', -- Procon Goiás/GO (caso 4333)
  '53098c2f-3a18-4eea-bd9e-a845262f6d30', -- Procon Visconde do Rio Branco/MG (caso 4416)
  'f23902f7-e17c-46df-9b90-089fe12682d3', -- Procon Itaúna/MG (caso 4437)
  '3b348a98-174e-4cec-9312-6f5647b47129', -- INMETRO/PE (caso 4052)
  'eadc3def-53c2-45a6-bf29-e01b710d1fb5', -- INMETRO/PE (caso 4058)
  'bb7d9ea0-cf75-45cf-9e7c-8e161421e31c'  -- INMETRO/PE (caso 4054)
);
