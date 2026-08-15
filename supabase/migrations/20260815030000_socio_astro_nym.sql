-- A sócia responsável por todos os processos da Astromarítima é a NYM
-- (ficaram sem sócio no import original).
UPDATE public.processos
SET socio = 'NYM'
WHERE cliente = 'Astromaritima' AND socio IS DISTINCT FROM 'NYM';
