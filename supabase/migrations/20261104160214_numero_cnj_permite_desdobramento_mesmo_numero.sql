-- O número CNJ era UNIQUE no banco, mas um desdobramento (recurso,
-- cumprimento de sentença etc.) às vezes mantém o mesmo número do
-- processo principal -- depende do recurso, o tribunal não emite um
-- número novo. Isso travava o cadastro do desdobramento. A proteção
-- contra duplicata de verdade (cadastro repetido por engano, sem
-- relação de desdobramento) passa a ser feita no app, que permite o
-- mesmo número dentro da família (processo pai + seus desdobramentos)
-- e continua bloqueando fora dela.
ALTER TABLE public.processos DROP CONSTRAINT processos_numero_cnj_key;
