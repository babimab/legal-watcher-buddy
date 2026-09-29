-- Casos com "Tipo de Ação" = Procon na planilha PROCESSOS_29_09_2026 que
-- já existiam no FaroLex mas não estavam com carteira "Administrativos"
-- (alguns tinham a carteira em branco, ou o número tinha ficado errado
-- numa importação antiga e por isso escapou da reclassificação anterior
-- de 20260929120000). Casamento por número (dígitos, ignorando pontuação).
update public.processos
set carteira = 'Administrativos'
where regexp_replace(numero_cnj, '\D', '', 'g') in (
  '2606076200100007301', -- Graziele de Souza Paula, Procon Guaçuí/ES (4443)
  '2608001400300138301', -- Fátima Garcia da Silva, Procon/RO (4446)
  '51019001190000746',   -- Claudio da Fonseca, Procon Cuiabá/MT (3326)
  '2208015801200178301', -- Ronivon da Silva Nunes, Procon/DF (3927)
  '2305015503200114301', -- Alvaro Bernardo de Souza, Procon Olinda/PE (4040)
  '2311003500100044302', -- Ricardo Diegues da Silva, Procon SP (4121)
  '2504015505000037301', -- Jailson Correa Neto, Procon/PE (4314)
  '2505024300101525301', -- Francisco Albuquerque da Silva, Procon/ES (4316)
  '26030665001001123'    -- Ana Carolina Maia Bicalho, Procon Visconde do Rio Branco/MG (4416)
)
and coalesce(carteira, '') <> 'Administrativos';
