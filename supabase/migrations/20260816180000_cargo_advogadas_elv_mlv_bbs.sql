-- Confirma o cargo "Advogado" pra ELV, MLV e BBS (ja cadastradas antes do
-- campo Cargo existir).

UPDATE public.profiles
SET cargo = 'Advogado'
WHERE sigla IN ('ELV', 'MLV', 'BBS');
