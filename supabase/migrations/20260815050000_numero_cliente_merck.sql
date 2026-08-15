-- Número do cliente da Merck, linha a linha (não é um número único —
-- a planilha "MERCK" traz 8228 ou 7347 dependendo do caso). Comparação
-- por dígitos do CNJ pra não depender de como o traço/ponto ficou salvo.

DO $$
DECLARE
  m RECORD;
  mapa jsonb := '{
    "00132711520188172001": "8228",
    "00327628920098190021": "7347",
    "00638955220098190021": "7347",
    "05359342020008060001": "7347",
    "00432595720168190203": "7347",
    "00233684520198190203": "7347",
    "10009903820188260100": "7347",
    "10033596820188260564": "8228",
    "10024904520208260529": "8228",
    "08656236720238190001": "8228",
    "51542062220238090011": "8228",
    "08356169220238190001": "8228",
    "08237648920248190210": "8228",
    "10054961620258260002": "8228",
    "40000974320258260587": "8228",
    "10364466820268130702": "8223",
    "10042091520258130702": "8228"
  }'::jsonb;
BEGIN
  FOR m IN SELECT id, numero_cnj FROM public.processos WHERE cliente = 'Merck S.A.'
  LOOP
    UPDATE public.processos
    SET numero_cliente = mapa ->> regexp_replace(m.numero_cnj, '\D', '', 'g')
    WHERE id = m.id
      AND mapa ? regexp_replace(m.numero_cnj, '\D', '', 'g');
  END LOOP;
END $$;

-- O processo 0045029-93.2025.8.26.0100 (Brandão Couto x Pedro Fontana)
-- não tem número de cliente na planilha da Merck, fica sem por enquanto.
-- O caso 1036446-68.2026.8.13.0702 aparece como 8223 na planilha (não
-- 8228), numa linha em que o réu está grafado "Merk" em vez de "Merck" —
-- pode ser erro de digitação da planilha original, vale conferir.
