-- Le o detalhamento_objeto e reclassifica processos cujo objeto (classe)
-- nao reflete a natureza real do caso, quando se trata de PDV - Cobranca
-- Indevida (negativacao/cobranca indevida) ou Acidente de Transito. Lista
-- de numero_cnj definida manualmente apos leitura do texto de cada
-- detalhamento_objeto (pedido da BDR em 2026-09-01).

-- Casos de negativacao/cobranca indevida em pasta BDR -> Fumicultor
-- (mesma regra ja usada nas normalizacoes anteriores).
update public.processos
set classe = 'Fumicultor'
where numero_cnj in (
    '5000406-76.2022.8.21.0042',
    '5001365-28.2023.8.21.0134',
    '5003179-94.2022.8.21.0042',
    '5003405-87.2023.8.21.0067',
    '50064031920268210036',
    '5004759-23.2026.8.24.0015'
);

-- Casos de negativacao/cobranca indevida fora da pasta BDR -> PDV.
update public.processos
set classe = E'PDV - Cobran\u00e7a Indevida'
where numero_cnj in (
    '2204015500100713301',
    '0024359-74.2023.8.17.2001',
    '17001003220000080',
    '0074820-79.2025.8.17.2001',
    '0124163-40.2000.8.05.0001',
    '8002197-85.2022.8.05.0038',
    '50102243420268210035',
    '1011401-44.2026.8.13.0223',
    '0068424-52.2026.8.17.2001',
    '0300281-52.2018.8.24.0083',
    '5127540-75.2016.8.13.0024',
    '5000015-62.2026.8.21.0081',
    '0037717-76.2011.8.06.0112'
);

-- Casos de acidente de transito (qualquer pasta) -- inclui tambem
-- unificar a grafia dos que ja estavam corretos mas com variacao de
-- maiusculas/minusculas ("Acidente De Transito", "Acidente de transito").
update public.processos
set classe = E'Acidente de Tr\u00e2nsito'
where numero_cnj in (
    '0050337-82.2025.8.17.2001',
    '5001343-68.2026.8.21.0132',
    '5001377-26.2026.8.24.0143',
    '5000782-38.2026.8.21.0134',
    '5003572-79.2025.8.24.0058',
    '5003402-11.2021.8.21.0033',
    '5000322-08.2007.8.21.0008',
    '00037805820118050256',
    '3096511-46.2013.8.13.0024',
    '5000466-75.2021.8.21.0077',
    '0000854-63.2008.8.05.0239',
    '54128677920268090051',
    '0503478-96.2018.8.05.0103'
)
or classe ilike E'acidente de tr\u00e2nsito';
