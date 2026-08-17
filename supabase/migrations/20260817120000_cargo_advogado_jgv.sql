-- Confirma o cargo "Advogado" pro JGV.

UPDATE public.profiles
SET cargo = 'Advogado'
WHERE lower(email) = 'jgv@bcw.com.br';
