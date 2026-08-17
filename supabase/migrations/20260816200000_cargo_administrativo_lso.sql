-- Marca lso@bcw.com.br como Administrativo.

UPDATE public.profiles
SET cargo = 'Administrativo'
WHERE lower(email) = 'lso@bcw.com.br';
