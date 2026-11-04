-- "Souza Cruz" aparecia de várias formas na coluna cliente ("Souza
-- Cruz", "Souza Cruz LTDA", "Souza Cruz Ltda", "Souza Cruz S.A.",
-- "souza cruz", "Souza Cruz S.A - Casos Específicos", etc.). "Souza
-- Cruz LTDA." já é a forma padrão usada em CLIENTES_CONHECIDOS
-- (src/lib/processos.ts) -- padroniza todo mundo pra essa. O caso
-- "...Casos Específicos" (consultoria, numero_cliente 5939) continua
-- identificado pelo número do cliente em categoriaCliente, não pelo
-- texto, então não quebra a categorização.
UPDATE public.processos
SET cliente = 'Souza Cruz LTDA.'
WHERE cliente ILIKE '%souza%cruz%'
  AND cliente <> 'Souza Cruz LTDA.';
