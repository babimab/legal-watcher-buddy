-- Padroniza o nome do cliente ("nosso lado" do processo) para um único
-- texto por cliente, independente de como veio escrito na planilha de
-- origem (ex.: "Souza Cruz", "SOUZA CRUZ LTDA", "Souza Cruz S.A." viram
-- todos "Souza Cruz LTDA."). Só afeta a coluna cliente, não autor/reu
-- (que devem continuar fiéis ao que está no processo judicial).

UPDATE public.processos
SET cliente = 'Souza Cruz LTDA.'
WHERE cliente ~* 'souza\s*cruz' AND cliente IS DISTINCT FROM 'Souza Cruz LTDA.';

UPDATE public.processos
SET cliente = 'Astromaritima'
WHERE cliente ~* 'astro' AND cliente IS DISTINCT FROM 'Astromaritima';
