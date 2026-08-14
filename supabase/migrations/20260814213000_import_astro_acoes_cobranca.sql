-- Importação: Planilha Astro - Ações de Cobrança
-- 60 processo(s), pasta 'Perfis MLV (acoes de cobranca)' dentro de Equipe Astro, responsável 'MLV'.

DO $$
DECLARE
  _criador uuid := (SELECT id FROM auth.users WHERE email = 'bdr@bcw.com.br');
  _pasta_id uuid := (SELECT p.id FROM public.pastas p JOIN public.grupos g ON g.id = p.grupo_id WHERE g.nome = 'Equipe Astro' AND p.nome = 'Perfis MLV (acoes de cobranca)');
BEGIN
  IF _pasta_id IS NULL THEN
    RAISE EXCEPTION 'Pasta Perfis MLV (acoes de cobranca) de Equipe Astro não encontrada';
  END IF;

  INSERT INTO public.processos
    (numero_cnj, numero_interno, numero_antigo, cliente, parte_contraria, autor, reu,
     uf, comarca, vara, tribunal, sistema, classe, fase, observacoes, carteira,
     pasta_id, responsavel, socio, status, created_by)
  VALUES
    ('0244382-57.2021.8.19.0001', '55', NULL, 'Astromarítima', 'Metal Scrap Comércio de Resíduos LTDA', 'Astromarítima', 'Metal Scrap Comércio de Resíduos LTDA', 'RJ', 'Capital', '3ª Vara Cível', 'TJRJ', NULL, 'Ação de cobrança objetivando a condenação da Metal Scrap dos valores não pagos pela sucata da venda do aço do casco do Astro Lara.', 'Sentença preferida/Aguarda trânsito em julgado ou recurso', 'Crédito está na RJ?: NÃO
Observação: Sentença de procedência decretando a revelia - fls. 410', 'Ações de Cobrança', _pasta_id, 'MLV', NULL, 'ativo', _criador),
    ('3101758-55.2026.8.19.0001', NULL, NULL, 'Astromaritima', 'ACCESS GESTÃO DE DOCUMENTOS LTDA', 'ACCESS GESTÃO DE DOCUMENTOS LTDA', 'Astromaritima', 'RJ', 'Capital', '30º Vara Cível', 'TJRJ', NULL, 'Cumprimento de Sentença', NULL, NULL, 'Ações de Cobrança', _pasta_id, 'MLV', NULL, 'ativo', _criador),
    ('0810654-68.2024.8.19.0001', '50', NULL, 'Astromaritima', 'ACCESS GESTÃO DE DOCUMENTOS LTDA', 'ACCESS GESTÃO DE DOCUMENTOS LTDA', 'Astromaritima', 'RJ', 'Capital', '30º Vara Cível', 'TJRJ', NULL, 'Ação de Rescisão Contratual por culpa exclusiva da Astro cumulada com cobrança.', 'Aguardando decisão/despacho.', 'Crédito está na RJ?: NÃO
Observação: Juntada de contestação da Astro em 04/06/2024 (revel)', 'Ações de Cobrança', _pasta_id, 'MLV', NULL, 'ativo', _criador),
    ('0809611-96.2024.8.19.0001', '31', NULL, 'Astromarítima', 'AMERICAN BUREAU OF SHIPPING', 'AMERICAN BUREAU OF SHIPPING', 'Astromarítima', 'RJ', 'Capital', '39ª Vara Cível', 'TJRJ', NULL, 'Ação de cobrança objetivando a condenação da Astro dos valores não pagos pela  para manutenção de classe e certificação estatutária de
embarcações conforme regulamentos e regras de classificação do ABS e classificações da
OMI.', 'Aguardando decisão/despacho.', 'Crédito está na RJ?: NÃO
Observação: Em 01/11/24 - Juntada de Contestação da Astromarítima', 'Ações de Cobrança', _pasta_id, 'MLV', NULL, 'ativo', _criador),
    ('0810891-55.2023.8.19.0028', '21', NULL, 'Astromarítima', 'APROAR ELETRONICA NAVAL LTDA', 'APROAR ELETRONICA NAVAL LTDA', 'Astromarítima', 'RJ', 'Macaé', '1ª Vara Cível', 'TJRJ', NULL, 'Ação de cobrança objetivando a condenação da Astromarítima dos valores não pagos pelo serviço de manutenção de sistema.', 'Aguardando deferimento de gratuidade de justiça', 'Crédito está na RJ?: NÃO
Observação: 24/02/25 - Apelação da Astromarítima', 'Ações de Cobrança', _pasta_id, 'MLV', NULL, 'ativo', _criador),
    ('0881112-47.2023.8.19.0001', '33', NULL, 'Astromarítima', 'Atlantec Sistemas de Medição e Controle Ltda.', 'Atlantec Sistemas de Medição e Controle Ltda.', 'Astromarítima', 'RJ', 'Capital', '52ª Vara Cível', 'TJRJ', NULL, 'Ação de cobrança objetivando a condenação da Astromarítima dos valores não pagos pelo contrato de locação de equipamentos.', 'Aguardando apreciação da petição da Astro (juntando o plano de Recuperação) e Atlantec (informando ser intempestiva a manifestação da Astro).', 'Crédito está na RJ?: NÃO
Observação: Astromarítima foi intimada na peça em que protocolou nomeada de embargos e também de pré-executividade : Caso insista em os embargos à execução, os mesmos  tem que ser distribuídos por dependência. O cartório não tem como proceder a distribuição por dependência como no processo físico. O executado deve distribuir os embargos por dependência à execução. Faculto ao embargante o ajuizamento da ação de embargos à execução, no prazo máximo de 48 horas, a contar da publicação, desde que por dependência, sob pena de rejeição liminar dos embargos, cabendo ao embargante a obtenção das cópias devidas. Astromarítima não cumpriu o prazo de 48 hrs.', 'Ações de Cobrança', _pasta_id, 'MLV', NULL, 'ativo', _criador),
    ('0872542-72.2023.8.19.0001', '35', NULL, 'Astro Navegação', 'Avante Reparos Navais EIRELI', 'Avante Reparos Navais EIRELI', 'Astro Navegação', 'RJ', 'Capital', '34ª Vara Cível', 'TJRJ', NULL, 'Ação de cobrança objetivando a condenação da Astromarítima dos valores não pagos pelos serviços realizados. Pagto parcial: OS 3622 - R$ 206.247,00.
Além disso, prestou o serviços das OS 3747,3763,3778,3758,3762 e 3737, valor total: R$ 189.717,27 e não foi liberada PO para  emissão da NF.', 'Em 17/01/2025 a Astro Navegação foi intimada para interpor CR ED com prazo até 17/02/2025. 
Astro não interpôs CR. 
Aguardando julgamento de EDs.', 'Crédito está na RJ?: SIM
Observação: Acompanhar julgamento de EDs.', 'Ações de Cobrança', _pasta_id, 'MLV', NULL, 'ativo', _criador),
    ('0890071-70.2024.8.19.0001', '32', NULL, 'Astro Navegação', 'Bunker One Combustíveis e Lubrificantes Ltda', 'Bunker One Combustíveis e Lubrificantes Ltda', 'Astro Navegação', 'RJ', 'Capital', '41ª Vara Cível', 'TJRJ', NULL, 'Trata-se de ação de execução de título extrajudicial referente aos não pagamentos na venda de combustíveis e lubrificantes.', 'Aguardando juntada AR.', 'Crédito está na RJ?: SIM', 'Ações de Cobrança', _pasta_id, 'MLV', NULL, 'ativo', _criador),
    ('0955453-73.2025.8.19.0001', '32', NULL, 'Astro Navegação', 'Bunker One Combustíveis e Lubrificantes Ltda', 'Astro Navegação', 'Bunker One Combustíveis e Lubrificantes Ltda', 'RJ', 'Capital', '41ª Vara Cível', 'TJRJ', NULL, 'Embargos à Execução relativo à ação 0890071-
70.2024.8.19.0001', NULL, NULL, 'Ações de Cobrança', _pasta_id, 'MLV', NULL, 'ativo', _criador),
    ('0938028-04.2023.8.19.0001', '31', NULL, 'Astro Navegação', 'CITYCON COMERCIO DE VALVULAS E CONEXOES LTDA', 'CITYCON COMERCIO DE VALVULAS E CONEXOES LTDA', 'Astro Navegação', 'RJ', 'Capital', '27ª Vara Cível', 'TJRJ', NULL, 'Trata-se de ação monitória em virtude do não pagamentos da Astro na compra de materiais junto ao autor', 'Aguardando sentença.', 'Crédito está na RJ?: SIM', 'Ações de Cobrança', _pasta_id, 'MLV', NULL, 'ativo', _criador),
    ('5015328-70.2024.4.02.5101', '25', NULL, 'Astromarítima', 'Companhia de Docas do RJ', 'Companhia de Docas do RJ', 'Astromarítima', 'RJ', 'Capital', '7ª Vara Federal', 'TJRJ', NULL, 'Ação de cobrança dos não pagamentos das faturas
oriundas de utilização de infraestrutura portuária para atracação de embarcações na área de fundeio nos
Portos do Estado do Rio de Janeiro.', 'transitado em julgado em 25/02/2025. O crédito já está habilitado. Aguardar arquivamento.', 'Crédito está na RJ?: SIM
Observação: Astro condenada em honorários sucumbenciais no importe de 10% sobre o valor da condenação', 'Ações de Cobrança', _pasta_id, 'MLV', NULL, 'ativo', _criador),
    ('0240056-46.2023.8.06.0001', '45', NULL, 'Astro Navegação', 'Corenav Reparos Navais Ltda.', 'Corenav Reparos Navais Ltda.', 'Astro Navegação', 'CE', 'Fortaleza', '20ª Vara Cível', 'TJCE', NULL, 'Ação de execução de títulos extrajudiciais referentes ao serviço de atracação das embarcações Diana Tide e Karen Tide, com fornecimento de energia, água e reparos navais.
NFs. 211, 212, 214, 215, 216, 217, 218, 219, 220, 221, 222, 223, 224, 225, 226, 229, 230, 231, 232 e 233.', 'Aguardando apreciação da petição do autor requerendo o prosseguimento do feito com a realizção de penhora.', 'Crédito está na RJ?: SIM
Observação: Astro revel', 'Ações de Cobrança', _pasta_id, 'MLV', NULL, 'ativo', _criador),
    ('0006909-13.2016.8.19.0028', '58', NULL, 'Astromarítima', 'Del Comércio e Serviços Offshore Ltda.', 'Del Comércio e Serviços Offshore Ltda.', 'Astromarítima', 'RJ', 'Macaé', '1ª Vara Cível', 'TJRJ', NULL, 'Ação de Cobrança por meio da qual a autora objetiva o pagamento do valor de R$354.297,96, atualizados, decorrente de 6 (seis) notas fiscais e de 90 orçamentos que alega dizerem respeito a serviços que teriam sido prestados à requerida.', 'Aguarda processamento do cumprimento de sentença', 'Crédito está na RJ?: NÃO', 'Ações de Cobrança', _pasta_id, 'MLV', NULL, 'ativo', _criador),
    ('0871505-44.2022.8.19.0001', '27', NULL, 'Astromarítima', 'Focus Health Solutions Serviços de Saúde Ltda.', 'Focus Health Solutions Serviços de Saúde Ltda.', 'Astromarítima', 'RJ', 'Capital', '8ª Vara Cível', 'TJRJ', NULL, 'Parte autora atua na área de Medicina do Trabalho, Saúde Ocupacional e Emergência. Prestou serviços para a Astro que não foram pagos. Pleiteia pelo pagamento do débito de R$ 36.154,58 + honorários advocatícios 10% = R$ 39.770,04', 'Aguarda sentença', 'Crédito está na RJ?: NÃO', 'Ações de Cobrança', _pasta_id, 'MLV', NULL, 'ativo', _criador),
    ('0871519-28.2022.8.19.0001', '59', NULL, 'Astro Navegação', 'Focus Health Solutions Serviços de Saúde Ltda.', 'Focus Health Solutions Serviços de Saúde Ltda.', 'Astro Navegação', 'RJ', 'Capital', '42ª Vara Cível', 'TJRJ', NULL, 'Parte autora atua na área de Medicina do Trabalho, Saúde Ocupacional e Emergência. Prestou serviços para a Astro que não foram pagos. Pleiteia pelo pagamento do débito de R$  64.981,91 + honorários advocatícios 10% = R$ 71.480,10', 'Aguarda apreciação do pedido de suspensão da Astro / ainda em fase de instrução', 'Crédito está na RJ?: NÃO
Observação: Em 06/02 decorreu o prazo para a Astro pagar a taxa judiciária
Questionamentos: Iremos pagar a taxa?', 'Ações de Cobrança', _pasta_id, 'MLV', NULL, 'ativo', _criador),
    ('0946416-90.2023.8.19.0001', '26', NULL, 'Astro Navegação', 'Golf Ship Solutions Manutenção e Supimentos Marítimos Ltda.', 'Golf Ship Solutions Manutenção e Supimentos Marítimos Ltda.', 'Astro Navegação', 'RJ', 'Capital', '41ª Vara Cível', 'TJRJ', NULL, 'Ação Monitória na qual a Autora alega ser credora da quantia de R$ 7.700,00 correspondentes à realização dos serviços de instalação de revestimento em piso e
serviços de contrapiso e regularização na embarcação ASTRO BARRACUDA– IMO 9207613_x000D_', 'Ainda em fase de instrução', 'Crédito está na RJ?: SIM', 'Ações de Cobrança', _pasta_id, 'MLV', NULL, 'ativo', _criador),
    ('5119222-59.2023.8.13.0024', '60', NULL, 'Astromarítima
Astro Navegação', 'Iinovi Agência de Viagens e Turismo Ltda.', 'Iinovi Agência de Viagens e Turismo Ltda.', 'Astromarítima
Astro Navegação', 'MG', 'Belo Horizonte', '26ª Vara Cível', 'TJMG', NULL, 'Trata-se de ação de cobrança na qual a autora alega ser credora da quantia de R$ 51.480,30 correspondente ao serviço de agenciamento de viagens,
reservas e outros serviços relacionados ao turismo prestado a Astro', 'Em cumprimento de sentença', 'Crédito está na RJ?: NÃO
Questionamentos: Iremos pagar? Risco de penhora da Astro', 'Ações de Cobrança', _pasta_id, 'MLV', NULL, 'ativo', _criador),
    ('0938013-35.2023.8.19.0001', '16', NULL, 'Astromarítima', 'Indnav Acessórios Industriais Ltda', 'Indnav Acessórios Industriais Ltda', 'Astromarítima', 'RJ', 'Capital', '18 ª Vara Civel', 'TJRJ', NULL, 'Ação de cobrança na qual a autora alega ser credora da quantia de R$ 15.070,07 correspondente à venda de materias inadimplidos pela Astro', 'Aguarda citação da Astro', 'Crédito está na RJ?: NÃO
Observação: (AR ainda não retornou)', 'Ações de Cobrança', _pasta_id, 'MLV', NULL, 'ativo', _criador),
    ('0969984-38.2023.8.19.0001', '22', NULL, 'Astro Navegação', 'Lapsol Vedações Industriais Soc. Unipessoal Ltda.', 'Lapsol Vedações Industriais Soc. Unipessoal Ltda.', 'Astro Navegação', 'RJ', 'Capital', '41a Vara Cível RJ', 'TJRJ', NULL, 'Ação de Cobrança na qual a autora alega ser credora da quantia de R$ 3.900,00 pelo serviçoi de reparo de bomba de engrenagem inadimplido pela Astro', 'Prazo para manifestação em provas em curso', 'Crédito está na RJ?: SIM', 'Ações de Cobrança', _pasta_id, 'MLV', NULL, 'ativo', _criador),
    ('0865865-89.2024.8.19.0001', '20', NULL, 'Astro Navegação', 'Lógica Tecnologia EIRELI', 'Lógica Tecnologia EIRELI', 'Astro Navegação', 'RJ', 'Capital', 'EPROC
51ª Vara Civel', 'TJRJ', NULL, 'Ação de execução de título extrajudicial na qual o autor alega ser credor da quantia total de R$ 56.744,05 referente ao inadimplemento da Astro em face do contrato de prestação dos serviços de suporte técnico nível II para produtos Microsoft, VMWare, Veritas e Symantec e locação de equipamentos de informática da Exequente.', 'Em fase de instrução', 'Crédito está na RJ?: NÃO', 'Ações de Cobrança', _pasta_id, 'MLV', NULL, 'ativo', _criador),
    ('0846952-90.2023.8.19.0002', '19', NULL, 'Astro Navegação', 'LOGNAV Logística Naval, Imp. e Exp. Ltda.', 'LOGNAV Logística Naval, Imp. e Exp. Ltda.', 'Astro Navegação', 'RJ', 'Niterói', '7ª Vara Cível', 'TJRJ', NULL, 'Ação de cobrança na qual a autora alega ser credora da quantia de R$ 4.800,00 correspondente a serviços prestados e discriminados nas NFs 202300000000007 e 202300000000008', 'Em fase de instrução', 'Crédito está na RJ?: SIM', 'Ações de Cobrança', _pasta_id, 'MLV', NULL, 'ativo', _criador),
    ('0907531-07.2023.8.19.0001', '14', NULL, 'Astro Navegação', 'MapaMar Comércio e Serviços Ltda.', 'MapaMar Comércio e Serviços Ltda.', 'Astro Navegação', 'RJ', 'Capital', '45ª Vara Cível', 'TJRJ', NULL, 'Ação monitória na qual o autor alega ser credor da quantia de R$  83.470,00 correspondente a serviços prestados e discriminados nas NFs 4358, 4367, 4402, 4385 e 4414', 'Aguarda expedição de citação da Astro', 'Crédito está na RJ?: SIM', 'Ações de Cobrança', _pasta_id, 'MLV', NULL, 'ativo', _criador),
    ('0870978-58.2023.8.19.0001', '13', NULL, 'Astro Navegação', 'N&G Works Manutenção e Reparação de Embarcações Navais Ltda.', 'N&G Works Manutenção e Reparação de Embarcações Navais Ltda.', 'Astro Navegação', 'RJ', 'Capital', '23ª Vara Cível', 'TJRJ', NULL, 'Ação monitória na qual o autor alega ser credor da quantia de R$ 1.553.917,38 correspondente aos serviços de reparações navais nas embarcações ASTRO ANCHOVA, ASTRO BARRACUDA e REBOCADOR MILAN TIDE inadimplidos', 'Aguarda pagamento das parcelas dos honorários do perito para que seja realizada a perícia', 'Crédito está na RJ?: NÃO
Observação: ATENÇÃO! Parcelamento da perícia em 5 vezes de maneira mensal e consecutiva. Pagamento de fevereiro em aberto ainda
Questionamentos: O pagamento já está programado ou devemos pedir mensalmente?', 'Ações de Cobrança', _pasta_id, 'MLV', NULL, 'ativo', _criador),
    ('0873988-47.2022.8.19.0001', '63', NULL, 'Astro Navegação', 'Oliveira e Carvalho Auditoria e Consultoria Empresarial Ltda.', 'Oliveira e Carvalho Auditoria e Consultoria Empresarial Ltda.', 'Astro Navegação', 'RJ', 'Capital', '16ª Vara Cível', 'TJRJ', NULL, 'Contrato de Honorários de êxito de Consultoria.', NULL, 'Observação: NÃO LOCALIZEI', 'Ações de Cobrança', _pasta_id, 'MLV', NULL, 'ativo', _criador),
    ('0074121-25.2022.8.19.0001', '15', NULL, 'Astromarítima', 'Onixtec Serviços Tecnológicos Ltda.', 'Onixtec Serviços Tecnológicos Ltda.', 'Astromarítima', 'RJ', 'Capital', '18ª Vara Cível', 'TJRJ', NULL, 'Ação de Cobrança de multa rescisória no valor de R$ 436.800,00 do contrato de sete instalações de antenas e prestação de serviços de dados para embarcações.', 'Aguardando a homologação dos honorários', 'Crédito está na RJ?: NÃO
Observação: Após a homologação, pedir o parcelamento ou suspensão do pagamento dos honorários periciais até o final da RJ', 'Ações de Cobrança', _pasta_id, 'MLV', NULL, 'ativo', _criador),
    ('0848534-94.2024.8.19.0001', '12', NULL, 'Astromarítima', 'Satguru Travel Et Tours Services Ltda.', 'Satguru Travel Et Tours Services Ltda.', 'Astromarítima', 'RJ', 'Capital', '1ª Vara Cível', 'TJRJ', NULL, 'Ação de cobrança na qual o autor alega ser credor da quantia de R$ 563.830,95 correspondente à prestação dos serviços de consultoria de viagens e turismo inadimplidos pela Astro', 'Em fase de instrução', 'Crédito está na RJ?: NÃO
Observação: sem manifestação de provas da Astro. Prazo decorreu', 'Ações de Cobrança', _pasta_id, 'MLV', NULL, 'ativo', _criador),
    ('0840696-37.2023.8.19.0001', '49', NULL, 'Astromarítima
Astro Navegação', 'Ship Marine Navegação Ltda.', 'Ship Marine Navegação Ltda.', 'Astromarítima
Astro Navegação', 'RJ', 'Capital', '12ª Vara Cível', 'TJRJ', NULL, 'Ação Monitória na qual a Autora alega ser credora da quantia de R$ 170.400,00 correspondentes à realização do serviço de apoio marítimo e portuário às Rés inadimplidos', 'Fase recursal', 'Crédito está na RJ?: SIM - ASTRO NAVEGAÇÃO', 'Ações de Cobrança', _pasta_id, 'MLV', NULL, 'ativo', _criador),
    ('0946064-35.2023.8.19.0001', '11', NULL, 'Astro Navegação', 'Sotreq S A', 'Sotreq S A', 'Astro Navegação', 'RJ', 'Capital', '33ª Vara Cível', 'TJRJ', NULL, 'Ação Monitória na qual a Autora alega ser credora da quantia de R$ 120.884,00 correspondentes à realização de serviços discriminados nas NFs de nº 000406729; 000406730; 000406820; 000407080 e 000408288', 'Em fase de instrução', 'Crédito está na RJ?: NÃO', 'Ações de Cobrança', _pasta_id, 'MLV', NULL, 'ativo', _criador),
    ('0030742-78.2016.8.08.0024', '61', NULL, 'Astromarítima', 'Terra Mar Serviços Marítimos Ltda.', 'Terra Mar Serviços Marítimos Ltda.', 'Astromarítima', 'ES', 'Vitória', '5ª Vara Cível', 'TJES', NULL, 'Ação Monitória para cobrança de diferenças de valores de pagamentos de agenciamento de embarcação.', 'Em discussão acerca de honorários dos advogados dos autores', 'Crédito está na RJ?: Não
Observação: Processo ainda em curso apenas por discussão de honorários do antigo advogado.', 'Ações de Cobrança', _pasta_id, 'MLV', NULL, 'ativo', _criador),
    ('5007321-94.2026.8.08.0000', '61', NULL, 'Astromarítima', 'Terra Mar Serviços Marítimos Ltda.', 'Terra Mar Serviços Marítimos Ltda.', 'Astromarítima', 'ES', 'Vitória', '5ª Vara Cível', 'TJES', NULL, 'Agravo de Instrumento', NULL, NULL, 'Ações de Cobrança', _pasta_id, 'MLV', NULL, 'ativo', _criador),
    ('0852264-50.2023.8.19.0001', '10', NULL, 'Astromarítima
Astro Navegação', 'Tomazeli Engenharia e Consultoria Ltda.', 'Tomazeli Engenharia e Consultoria Ltda.', 'Astromarítima
Astro Navegação', 'RJ', 'Capital', '21ª Vara Cível', 'TJRJ', NULL, 'Ação Monitória na qual a Autora alega ser credora da quantia de R$ 79.427,66 correspondentes à realização de serviços discriminados nas NFs de nº 001, 002, 003 e 004 inadimplidos', 'Em cumprimento de sentença', 'Crédito está na RJ?: NÃO
Observação: Decorrido o prazo para pagamento voluntário
Questionamentos: Vamos pagar?', 'Ações de Cobrança', _pasta_id, 'MLV', NULL, 'ativo', _criador),
    ('0818232-19.2023.8.19.0001', '9', NULL, 'Astro Navegação', 'WL Marine Services Ltda', 'WL Marine Services Ltda', 'Astro Navegação', 'RJ', 'Capital', '50ª Vara Cível', 'TJRJ', NULL, 'Ação de execução de título extrajudicial na qual a exequente alega ser credora da quantia de R$ 16.800,00 correspondente ao serviço de transporte de lancha p/ troca de tripulação da embarcação Astro Barracuda no Porto de Mucuripe, Fortaleza, CE.', 'Arquivado provisoriamente', 'Crédito está na RJ?: SIM
Observação: Suspenso por 1 ano (22/01/26)', 'Ações de Cobrança', _pasta_id, 'MLV', NULL, 'ativo', _criador),
    ('0813708-58.2024.8.19.0028', '4', NULL, 'Astro Navegação', 'OFFSHORE LINK SAT LTDA', 'OFFSHORE LINK SAT LTDA', 'Astro Navegação', 'RJ', 'Macaé', '1ª Vara Cível', 'TJRJ', NULL, 'Ação de execução de título extrajudicial na qual o autor alega ser credor da quantia total de R$ 43.956,18 referente ao inadimplemento da Astro em face dos serviços prestados nas NFs 1576, 1577 e 1578', 'Aguardando citação', 'Crédito está na RJ?: NÃO
Observação: Subsídios solicitado // AR ainda não juntado', 'Ações de Cobrança', _pasta_id, 'MLV', NULL, 'ativo', _criador),
    ('0276688-37.2024.8.06.0001', '5', NULL, 'Astro Navegação', 'LUCIVAN VITAL DE SOUSA', 'LUCIVAN VITAL DE SOUSA', 'Astro Navegação', 'CE', 'Fortaleza', '11ª Vara Cível', 'TJCE', NULL, 'Ação de cobrança na qual o autor alega ser credor da quantia de R$ 16.275,00 referente ao serviço de  transporte de materiais e tripulação Astro Navegação no Porto do Mucuripe em Fortaleza/CE', 'Fase instrutória', 'Crédito está na RJ?: SIM', 'Ações de Cobrança', _pasta_id, 'MLV', NULL, 'ativo', _criador),
    ('0287987-24.2019.8.19.0001', NULL, NULL, 'ASTROMARITIMA NAVEGACAO SA', 'PETRÓLEO BRASILEIRO S/A', 'PETRÓLEO BRASILEIRO S/A', 'ASTROMARITIMA NAVEGACAO SA', 'RJ', 'Capital', '52ª Vara Cível', 'TJRJ', NULL, 'Ação de cobrança gerada pelo contrato nº 2050.0067093.11.2 tendo como objeto o afretamento de embarcação. Quebra contratual da HORNBECK LLC - Petrobras alega solidariedade da Astro', NULL, NULL, 'Ações de Cobrança', _pasta_id, 'MLV', NULL, 'ativo', _criador),
    ('0100913-48.2024.8.19.0000', NULL, NULL, 'ASTROMARITIMA NAVEGACAO SA', 'PETRÓLEO BRASILEIRO S/A', 'PETRÓLEO BRASILEIRO S/A', 'ASTROMARITIMA NAVEGACAO SA', 'RJ', 'Capital', '22ª CÂMARA DE DIREITO PRIVADO', 'TJRJ', NULL, NULL, NULL, NULL, 'Ações de Cobrança', _pasta_id, 'MLV', NULL, 'ativo', _criador),
    ('0087228-68.2024.8.19.0001', '64', NULL, 'ASTRO NAVEGAÇÃO LTDA', 'LÓGICA TECNOLOGIA LTDA', 'LÓGICA TECNOLOGIA LTDA', 'ASTRO NAVEGAÇÃO LTDA', 'RJ', 'Capital', '3ª Vara Empresaral da Comarca da Capital', 'TJRJ', NULL, 'Objetos de informática que estão em posse da Astro', NULL, NULL, 'Ações de Cobrança', _pasta_id, 'MLV', NULL, 'ativo', _criador),
    ('0938031-56.2023.8.19.0001', '68', NULL, 'ASTROMARITIMA NAVEGACAO SA', 'CITYCON COMERCIO DE VALVULAS E CONEXOES LTDA', 'CITYCON COMERCIO DE VALVULAS E CONEXOES LTDA', 'ASTROMARITIMA NAVEGACAO SA', 'RJ', 'Capital', '52ª Vara Cível da Comarca da Capital', 'TJRJ', NULL, 'Compras de materiais fornecidos, a autora alega que não foram pagos', NULL, NULL, 'Ações de Cobrança', _pasta_id, 'MLV', NULL, 'ativo', _criador),
    ('0300880-47.2019.8.19.0001', '67', NULL, 'ASTROMARITIMA NAVEGACAO SA', 'PETROBRAS', 'PETROBRAS', 'ASTROMARITIMA NAVEGACAO SA', 'RJ', 'Capital', '39ª Vara Cível da Comarca da Capital', 'TJRJ', NULL, 'AÇÃO DE COBRANÇA DE MULTA CONTRATUAL MORATÓRIA', NULL, NULL, 'Ações de Cobrança', _pasta_id, 'MLV', NULL, 'ativo', _criador),
    ('0494824-53.2015.8.19.0001', '6', NULL, 'EISA ESTALEIRO', 'X', 'EISA ESTALEIRO', 'X', 'RJ', 'Capital', '1ª Vara Empresarial da Comarca da Capital', 'TJRJ', NULL, 'PROCESSO DE RECUPERAÇÃO JUDICIAL DA EISA', NULL, NULL, 'Ações de Cobrança', _pasta_id, 'MLV', NULL, 'ativo', _criador),
    ('0835836-14.2024.8.19.0209', '70', NULL, 'ASTRO NAVEGAÇÃO LTDA', 'NAUTICAL TRAINING CENTER CONSULTORIA E TREINAMENTO LTDA', 'NAUTICAL TRAINING CENTER CONSULTORIA E TREINAMENTO LTDA', 'ASTRO NAVEGAÇÃO LTDA', 'RJ', 'Capital', '6ª Vara Cível da Regional da Barra da Tijuca', 'TJRJ', NULL, '4 propostas de serviços não pagas: 
1) MC 05-23, em 05/04/2023, no valor de R$
42.188,00 
2) , MC 21-23, em 05/06/2023, no
valor de R$ 8.798,00 
3)MC 16-23, em 17/06/2023,
no valor de R$ 41.234,00
4)  MC 23-23, em
22/06/2023 no valor de R$ 43.142,00 
perfazendo um
total de R$ 135.362,00', 'aguardando citação', NULL, 'Ações de Cobrança', _pasta_id, 'MLV', NULL, 'ativo', _criador),
    ('0971644-33.2024.8.19.0001', '72', NULL, 'ASTROMARITIMA NAVEGACAO SA', 'WSB ADVISORS S.A', 'WSB ADVISORS S.A', 'ASTROMARITIMA NAVEGACAO SA', 'RJ', 'Capital', '5ª Vara Empresarial da Comarca da Capital', 'TJRJ', NULL, 'Serviços de apoio comercial - Shipbrocker
Alega possuir 80 notas fiscais em aberto - Objeto da ação', NULL, NULL, 'Ações de Cobrança', _pasta_id, 'MLV', NULL, 'ativo', _criador),
    ('0902410-61.2024.8.19.0001', '74', NULL, 'ASTRO NAVEGAÇÃO LTDA', 'NORTH STAR SERVICOS MARITIMOS LTDA', 'NORTH STAR SERVICOS MARITIMOS LTDA', 'ASTRO NAVEGAÇÃO LTDA', 'RJ', 'Capital', '5ª Vara Empresarial da Comarca da Capital', 'TJRJ', NULL, 'Cobrança de sete serviços realizados para astro navegação em Alagoas, no ano de 2023', NULL, NULL, 'Ações de Cobrança', _pasta_id, 'MLV', NULL, 'ativo', _criador),
    ('0892972-74.2025.8.19.0001', '75', NULL, 'ASTRO NAVEGAÇÃO LTDA', 'VISION MARINE REPRESENTACOES E SERVICOS LTDA', 'VISION MARINE REPRESENTACOES E SERVICOS LTDA', 'ASTRO NAVEGAÇÃO LTDA', 'RJ', 'Capital', '34ª Vara Cível da Comarca da Capital', 'TJRJ', NULL, 'contrato de locação de bens móveis para utilização na embarcação Astro Enchova', NULL, NULL, 'Ações de Cobrança', _pasta_id, 'MLV', NULL, 'ativo', _criador),
    ('0955959-49.2025.8.19.0001', '76', NULL, 'ASTROMARITIMA NAVEGACAO SA', 'CROW SERVICO, COMERCIO E LOCACAO DE EQUIPAMENTOS ELETRONICOS E ELETRICOS LTDA', 'CROW SERVICO, COMERCIO E LOCACAO DE EQUIPAMENTOS ELETRONICOS E ELETRICOS LTDA', 'ASTROMARITIMA NAVEGACAO SA', 'RJ', 'Capital', '8ª Vara Cível da Comarca da Capital', 'TJRJ', NULL, 'serviços de calibragem de detectores, inspeção corretiva e preventiva,
e a realização de testes operacionais entre outras funções realizados em 2022 e 2023 - NF-e 0201, 0202 e 0203', NULL, NULL, 'Ações de Cobrança', _pasta_id, 'MLV', NULL, 'ativo', _criador),
    ('0001785-05.2004.8.20.0105', NULL, NULL, 'ASTROMARITIMA NAVEGACAO SA', 'MUNICIPIO DE GUAMARE', 'MUNICIPIO DE GUAMARE', 'ASTROMARITIMA NAVEGACAO SA', 'RN', 'Macau', '2ª Vara da Comarca de Macau', 'TJRN', NULL, NULL, NULL, NULL, 'Ações de Cobrança', _pasta_id, 'MLV', NULL, 'ativo', _criador),
    ('00023197020258250008202590301334', '17', NULL, 'ASTRO NAVEGACAO SA', 'APERIPÊ LOCAÇÕES TRANSPORTE E TURISMO LTDA', 'APERIPÊ LOCAÇÕES TRANSPORTE E TURISMO LTDA', 'ASTRO NAVEGACAO SA', 'SE', NULL, NULL, 'TJSE', NULL, NULL, NULL, NULL, 'Ações de Cobrança', _pasta_id, 'MLV', NULL, 'ativo', _criador),
    ('0200530-09.2024.8.06.0140', '78', NULL, 'ASTROMARITIMA NAVEGACAO SA', 'HEITOR LUIS ALBUQUERQUE BARBOSA', 'HEITOR LUIS ALBUQUERQUE BARBOSA', 'ASTROMARITIMA NAVEGACAO SA', 'CE', 'Ceará', NULL, 'TJCE', NULL, NULL, NULL, NULL, 'Ações de Cobrança', _pasta_id, 'MLV', NULL, 'ativo', _criador),
    ('3023997-45.2026.8.19.0001', '78', NULL, 'ASTROMARITIMA NAVEGACAO SA', 'HEITOR LUIS ALBUQUERQUE BARBOSA', 'HEITOR LUIS ALBUQUERQUE BARBOSA', 'ASTROMARITIMA NAVEGACAO SA', 'RJ', 'Capital', '36ª Vara Cível da Comarca da Capital', 'TJRJ', NULL, 'Carta precatória', NULL, NULL, 'Ações de Cobrança', _pasta_id, 'MLV', NULL, 'ativo', _criador),
    ('0802520-68.2024.8.19.0028', '79', NULL, 'ASTRO NAVEGAÇÃO LTDA', 'LOCONTAINER ARMAZENS GERAIS LTDA', 'LOCONTAINER ARMAZENS GERAIS LTDA', 'ASTRO NAVEGAÇÃO LTDA', 'RJ', 'Macaé', '3ª Vara Cível da Comarca de Macaé', 'TJRJ', NULL, NULL, NULL, NULL, 'Ações de Cobrança', _pasta_id, 'MLV', NULL, 'ativo', _criador),
    ('0901174-74.2024.8.19.0001', NULL, NULL, 'ASTRO NAVEGAÇÃO LTDA', 'RIOMAR SUPPLY LTDA', 'RIOMAR SUPPLY LTDA', 'ASTRO NAVEGAÇÃO LTDA', 'RJ', 'Capital', '8ª Vara Cível da Comarca da Capital', 'TJRJ', NULL, NULL, NULL, NULL, 'Ações de Cobrança', _pasta_id, 'MLV', NULL, 'ativo', _criador),
    ('5008187-29.2026.4.02.5101', NULL, NULL, 'BNDES', NULL, 'BNDES', NULL, 'RJ', 'JFRJ', '30ª VF do Rio de Janeiro', 'TJRJ', NULL, NULL, NULL, NULL, 'Ações de Cobrança', _pasta_id, 'MLV', NULL, 'ativo', _criador),
    ('00026225120268250040202654000736', '82', NULL, 'ASTRO NAVEGAÇÃO LTDA', 'AMS GERADORES E SERVICOS LTDA', 'AMS GERADORES E SERVICOS LTDA', 'ASTRO NAVEGAÇÃO LTDA', 'SE', 'Lagarto', '1ª Vara Civel de Lagarto', 'TJSE', NULL, NULL, NULL, NULL, 'Ações de Cobrança', _pasta_id, 'MLV', NULL, 'ativo', _criador),
    ('0855140-07.2025.8.19.0001', '63', NULL, 'ASTRO NAVEGAÇÃO', 'Bradesco seguros', 'Bradesco seguros', 'ASTRO NAVEGAÇÃO', 'RJ', 'Capital', '47º Vara Cível da Capital', 'TJRJ', NULL, NULL, NULL, NULL, 'Ações de Cobrança', _pasta_id, 'MLV', NULL, 'ativo', _criador),
    ('0810307-84.2024.8.19.0211', '83', NULL, 'ASTROMARITIMA NAVEGACAO SA', 'ANTONIO DE AQUINO', 'ANTONIO DE AQUINO', 'ASTROMARITIMA NAVEGACAO SA', 'RJ', 'Capital', '2ª Vara Cível da Regional da Pavuna', 'TJRJ', NULL, NULL, NULL, NULL, 'Ações de Cobrança', _pasta_id, 'MLV', NULL, 'ativo', _criador),
    ('1026376-94.2023.8.26.0100', '84', NULL, 'ASTRO NAVEGAÇÃO LTDA', 'Bookeepers solutions consultoria LTDA', 'Bookeepers solutions consultoria LTDA', 'ASTRO NAVEGAÇÃO LTDA', 'SP', NULL, 'Vara Cível da Capital', 'TJSP', NULL, NULL, NULL, NULL, 'Ações de Cobrança', _pasta_id, 'MLV', NULL, 'ativo', _criador),
    ('3133260-12.2026.8.19.0001', '85', NULL, 'ASTRO NAVEGAÇÃO LTDA', 'BRASILDENTAL OPERADORA DE PLANOS ODONTOLOGICOS S', 'BRASILDENTAL OPERADORA DE PLANOS ODONTOLOGICOS S', 'ASTRO NAVEGAÇÃO LTDA', 'RJ', 'Capital', '23ª Vara Cível da Capital', 'TJRJ', NULL, NULL, NULL, NULL, 'Ações de Cobrança', _pasta_id, 'MLV', NULL, 'ativo', _criador),
    ('3134899-65.2026.8.19.0001', NULL, NULL, 'ASTROMARITIMA NAVEGACAO SA', 'PETROLEO BRASILEIRO S A PETROBRAS', 'PETROLEO BRASILEIRO S A PETROBRAS', 'ASTROMARITIMA NAVEGACAO SA', 'RJ', 'Campo Grande', '8ª Vara Cível da Regional de Campo Grande', 'TJRJ', NULL, NULL, NULL, NULL, 'Ações de Cobrança', _pasta_id, 'MLV', NULL, 'ativo', _criador),
    ('3141641-09.2026.8.19.0001', '86', NULL, 'ASTROMARITIMA NAVEGACAO SA', 'BLUE MARINE TELECOM S.A', 'BLUE MARINE TELECOM S.A', 'ASTROMARITIMA NAVEGACAO SA', 'RJ', 'Capital', NULL, 'TJRJ', NULL, 'Execução de Título Extrajudicial', NULL, NULL, 'Ações de Cobrança', _pasta_id, 'MLV', NULL, 'ativo', _criador),
    ('3125258-53.2026.8.19.0001', NULL, NULL, 'ASTROMARITIMA NAVEGACAO SA', 'ASGAARD BOURBON NAVEGACAO S.A', 'ASGAARD BOURBON NAVEGACAO S.A', 'ASTROMARITIMA NAVEGACAO SA', NULL, 'Leopoldina', NULL, NULL, NULL, NULL, NULL, NULL, 'Ações de Cobrança', _pasta_id, 'MLV', NULL, 'ativo', _criador)
  ON CONFLICT (numero_cnj) DO UPDATE SET
    numero_interno = COALESCE(EXCLUDED.numero_interno, public.processos.numero_interno),
    cliente = EXCLUDED.cliente,
    parte_contraria = EXCLUDED.parte_contraria,
    autor = EXCLUDED.autor,
    reu = EXCLUDED.reu,
    uf = COALESCE(EXCLUDED.uf, public.processos.uf),
    comarca = COALESCE(EXCLUDED.comarca, public.processos.comarca),
    vara = COALESCE(EXCLUDED.vara, public.processos.vara),
    tribunal = COALESCE(EXCLUDED.tribunal, public.processos.tribunal),
    classe = COALESCE(EXCLUDED.classe, public.processos.classe),
    fase = COALESCE(EXCLUDED.fase, public.processos.fase),
    observacoes = COALESCE(EXCLUDED.observacoes, public.processos.observacoes),
    carteira = EXCLUDED.carteira,
    pasta_id = EXCLUDED.pasta_id,
    responsavel = EXCLUDED.responsavel;

  INSERT INTO public.movimentacoes
    (processo_id, data_movimentacao, descricao, fonte, created_by)
  SELECT proc.id, v.data_movimentacao, v.descricao, 'planilha', _criador
  FROM (VALUES
    ('0244382-57.2021.8.19.0001', '2026-08-12'::date, '12/08 - Juntada de AR negativo 
21.07 - Reexpedida intimação postal para o executado
20.05 - Expedição de Mandado de intimação postal para fins diversos
07.05 - Ato "nformo que efetuei o andamento de juntada de carta
precatória uma vez que o processo consta no relatório
do Painel de Inspeção Simulada CNJ 2026. Vide
fls.379/396." e juntada - carta precatória
04.05 - Digitação do mandado de intimação
10.04 - Ato "As custas foram recolhidas corretamente, a digitação."
20.02 - Petição da Astro informando o recolhimento
05.02 - Enviado para a publicação
04.02 - Ato "A fim de dar cumprimento ao pedido de fls. 443, ao credor para recolher as custas para intimação via postal."
29.10 - Petição Astro
22.10 - Publicado AO
20.10 - Ato ordinatório - Ao credor sobre o AR''s de intimação negativa às fls. 437
01.10 - Juntada da AR'),
    ('3101758-55.2026.8.19.0001', '2026-06-08'::date, '08.06 - Certidão: central de autuação e Remetidos os Autos - CAPCENTAUT -> CAP30VCIV
03.06 - Distribuído por dependência'),
    ('0810654-68.2024.8.19.0001', '2026-05-04'::date, '04.05 - Certidão de TJ e arquivado definitivamente
14.04 - Publicado no DJEN
10.04 - Proferido despacho determinando o cumprimento do decidido pelo TJRJ, no prazo de 5 dias.
16.03 - Recebido os autos
30.11- Remessa ao TJRJ
22.10 - Contrarrazões do Autor
Publicado Intimação em 02/10/2025 sobre certidão: 1. Ao(s) Apelado(s) para contrarrazões. 
2. Apresentadas as contrarrazões, em caso de preliminares, intime-se o apelante para se manifestar, na forma do art. 1.009, §2º do NCPC. 
3. Certifique-se quanto à tempestividade e ao recolhimento das custas, conforme determinado no Ato Executivo Conjunto 05/2016. 
4. Após, subam ao Egrégio Tribunal de Justiça.'),
    ('0810654-68.2024.8.19.0001', '2026-03-16'::date, '16.03.2026 - Tânsito em julgado
19.02.2026 - Publicado acórdão que negou provimento ao recurso de apelação, majorando os honorários para 12% sobre o valor da condenação.
30.01.2026- Publicada pauta de julgamento virtual (09/02/2026 00:01)
18.12.2025- Petição nossa; Juntada de relatório com pedido de dia
09.12.2025- Disponibilizada intimação 
03.12.2025- Proferida dedicão indeferindo a gratuidade de justiça
03.12.2025- Conclusão ao relator'),
    ('0809611-96.2024.8.19.0001', '2026-05-28'::date, '28.05 - Certidão de tempestividade e remessa ao TJRJ
27.05 - Execução ou cumprimento de sentença Iniciada 
12.02 - Contrarrazões
23.01 - Publicada intimação para contrarrazões
19.01 - Certidão de tempestividade e expedição de intimação ao apelado
12.12- Apelação Astro
17.11- Decisão rejeitando EDs
14.08 - EDs da Astro'),
    ('0809611-96.2024.8.19.0001', '2026-08-06'::date, '06.08 - Certidão
31.07 - Relatório e despacho determinando inclusão na pauta de julgamento 
23/07 - Conclusão para o relator 
23.06: Certidão: certifico que foi comprovado o preparo recursal 
23.06: Petição Astro
16.06: Publicada a decisão
12.06 - Decisão: inderido o pedido de gratuidade de justiça. Prazo de 5 dias para recolhimento de custas
08.06 - Conclusos'),
    ('0810891-55.2023.8.19.0028', '2026-07-09'::date, '09.07 - Proferido despacho "1. Certifique quanto ao recolhimento das custas para a apresentação da impugnação.
2. Não tendo havido o recolhimento, intime-se o executado, independente de nova conclusão, para que promova o recolhimento no prazo de 5 (cinco) dias, sob pena do não conhecimento da impugnação. e expedida intimação
Intimem-se."
26.06 - Conclusos
19.05 - Petição Aproar
Publicado no DJEN - no dia 27/04/2026 - Refer. ao Evento: 91
22.04 - Disponibilizado no DJEN 
19.03 - Petição da Astro
03.03 - Migrado para eproc
30.01 - Publicada intimação para Astro
28.01 - Proferido despacho determinando intimação para pagamento do débito exequendo
27.01 - Petição cumprimento de sentença
19.12 - Publicado ato ordinatório
16.12 - Ato ordinatório "cumpra-se o acórdão"e expedição
29.05.2025 - Autos remetidos para 2 grau
12.05.2025 - Aproar apresentou contrarrazões ao recurso de apelação.'),
    ('0810891-55.2023.8.19.0028', '2025-12-12'::date, '12.12 - Trânsito em julgado e baixa definitiva
17.11 - Publicado no DJEN
13.11 - Proferido acórdão negando provimento ao recurso
30.10 - Publicação de pauta de julgamento
27.10 - Relatório 
28.08 - Conclusão relator
28.08 - Juntada da GRERJ
19.08 - Decisão de não concessão de justiça gratuita 
22.08 - certidão de disponibilização de publicação decisão'),
    ('0881112-47.2023.8.19.0001', '2026-04-29'::date, '29.04 - Juntada de peças digitalizadas
28.04 - Migrado para o eproc
25.03 - Petição do exequente
30.01 - Certidão do OJA "...deixei de proceder à penhora no rosto dos autos ordenada tendo em vista não haver até a presente data a ordem do r. Juízo da 3ª Vara Empresarial para a devida anotação. ... O mandado foi    juntado aos autos no dia 22/01/26 e enviado por fim à
conclusão em    28/01/26"
26.01 - Petição da autora apresentando nova planilha de debito
17.01 - Juntada de petição da Petrobras informando o cumprimento da ordem judicial, com o registro, em seu sistema financeiro interno, do bloqueio de créditos devidos à Astromarítima Navegação S.A., em recuperação judicial, a ser efetivado em pagamentos futuros até o limite do débito exequendo de R$ 581.386,63, conforme determinação do juízo.
15.01 - Certidão " Ao exequente para:
                      1) imprimir e encaminhar o Ofício de id.251126386
                      2) recolher as custas do requerimento de id 246323013, fl.04, item b , c"
15.12 - Expedido mandado de penhora 
26.11- Petição do credor apresentando planilha de débito atualizada no montante de R$ 581.386,63 e requerendo a realização de pesquisa de bens pelos sistemas SISBAJUD, RENAJUD,INFOJUD e SNIPER
13.10 - Publicada Intimação
09.10 - Intimação - Determinada penhora no rosto dos autos da recuperação judicial'),
    ('0872542-72.2023.8.19.0001', '2026-08-06'::date, '06/08 - Despacho:Ao impugnante para que proceda com recolhimento das custas, sob pena de não conhecimento da impugnação
06/08 - Conclusos 
04.05 - Petição do autor
29.04 - Petição Astro
01.04 - Publicado no DJEN (REQUERIDO - ASTRO NAVEGACAO LTDA - EM RECUPERACAO JUDICIAL)
Prazo: 15 dias Status:ABERTO
Data inicial da contagem do prazo: 06/04/2026 00:00:00
Data final: 28/04/2026 23:59:59
31.03 - Disponibilizado no DJEN
23.03 - Proferida decisão "1) DEFIRO o pedido para autorizar o prosseguimento do cumprimento de sentença, independentemente do recolhimento inicial da taxa judiciária, que deverá ser exigida ao final da demanda, na forma do art. 82, §3º, do CPC. Anote-se.  2) No mais cumpra-se despacho de evento 108."
20.03 - Migrado para o eproc
28.01 - Petição do exequento requerendo que seja deferido o recolhimento de custas ao final
26.01 - Expedição
23.01 - Proferido despacho determinando intimação da Astro para pagar o débito exequendo.
04.09 - Prazo decorrido no sistema para apelação
25.08 - Autor protocolizou cumprimento de sentença'),
    ('0890071-70.2024.8.19.0001', '2026-06-17'::date, '17.06 - Petição (não aparece petição no sistema)
15.06 - Publicado no DJEN
11.06 - Autos migrados para o sistema Eproc e despacho ao exequente
28.04 - Certidão negativa
08.04 - Petição Astro informando oposição dos embargos à execução
13.03 - Certidão "Id. 249690277. Certifico que o endereço foi anotado e as custas recolhidas para diligência por via postal."
08.12 - Petição do autor indicando novo endereço para citação por OJA (Rua da Assembleia, 85, Sala 702)
22.10 - Diligência - Certidão negativa - DEIXEI
DE CITAÇÃO ASTRO NAVEGAÇÃO LTDA'),
    ('0955453-73.2025.8.19.0001', '2026-06-25'::date, '25.06: Petição Astro
16.06: Juntada de certidão - suspensão de prazos 24/06/2026
02.06 - Publicado no DJEN
29.05 - Proferida decisão indeferindo pedido de JG da Astro e determinando o recolhimento de custas em 15 dias
22.04 - Migrado para eproc
02.02 - Petição nossa
26.01 - Publicado no DJEN
22.01 - Proferido despacho determinando a juntada de docs para comprovação de JG.
01.10 - EE da Astro'),
    ('0938028-04.2023.8.19.0001', '2026-07-21'::date, '21.07 - Pet Astro prosseguimento do feito
22.06: publicado a intimação 
25.03 - Certidão "1. Certifico o trânsito em julgado da r. Sentença.
2. Anotado o início da fase executiva. 
3.A sociedade de advogados representante da parte demandada requer o cumprimento definitivo de sentença; e para tanto, s.m.j., não há custas/taxa judiciária a recolher."
14.10 - CS da Astro - honorários
11.09 - PUBLICADA INTIMAÇÃO
08.09 - SENTENÇA - JULGO EXTINTO O PROCESSO, SEM RESOLUÇÃO DO MÉRITO
21.08 - Conclusos ao juiz'),
    ('5015328-70.2024.4.02.5101', '2025-05-19'::date, '19/05/2025 - Juntada de Mandado Cumprido - Sirvo-me do presente para dar ciência ao Administrador Judicial da recuperação judicial n° 0425144-44.2016.8.19.0001 do teor da sentença proferida nos autos do processo nº 5015328-70.2024.4.02.5101/RJ em trâmite neste juízo e para reserva do valor exequendo, e dos ônus de sucumbência, no referido processo de recuperação judicial.

Segue em anexo cópia da sentença.

Aproveito o ensejo para manifestar protestos de consideração e apreço.     
05/04/2025 - Transitado em julgado'),
    ('0240056-46.2023.8.06.0001', '2026-06-22'::date, '22.06 - conclusos para despacho 
08.06 - - Juntada de não entregue - recusado (ecarta)
14.05 - Proferido despacho determinando intimação pessoal da autora e expedição de AR.
06.02 - Certidão "CERTIFICO, face às prerrogativas por lei conferidas, que decorreu o prazo da intimação referente ao documento de ID187830480 e nada foi apresentado ou requerido." e conclusão
19.12 - Proferido despacho determinando a manifestação do exequente sobre petição da Astro
16.09 - Conclusos para despacho
15.09 - Manifestação da Astro
Publicado Intimação em 08/09/2025.
04.09 - Certifico que esta secretaria procedeu com o envio da comunicação via Diário da Justiça Eletrônico.
01.09 - Renovo a determinação de ID. 149775291 e determino a intimação da empresa executada para, no prazo de 5 (cinco) dias, informar se houve aprovação do plano recuperacional e/ou convolação da recuperação judicial em falência'),
    ('0006909-13.2016.8.19.0028', '2026-07-01'::date, '01.07 - Proferida decisão "... aguarde-se o julgamento do recurso"
30.06- Conclusos
27.05 - Certidão "Certifico que foi interposto agravo de instrumento id
1082. Manifestação em cumprimento de sentença id
1078"
09.06 - Petição Cumprimento de sentença Dell
11.05 - Enviado para publicação 
08.05 - Proferida decisão em que o juiz indeferiu o pedido da autora para alterar o termo inicial da correção monetária, por entender que a matéria está preclusa e coberta pela coisa julgada. Também rejeitou o pedido da ré e reconheceu como extraconcursais as custas, os honorários sucumbenciais e a multa processual. 
19.03 - Conclusos
27.01 - Petição da Astro
08.01 - Enviado para publicação
07.01 - Proferido despacho determinando intimação da Astro sobre petições da autora.
07.11 - Conclusão ao juiz
12.09 -Petição da autora Chamando o feito à ordem e outra petição requerendo prosseguimento da execução e intimação da Astro'),
    ('0871505-44.2022.8.19.0001', '2026-05-07'::date, '07.05 - Publicado no DJEN
05.05 - Expedida intimação
25.04 - Cetidão atestando a tempestividade e ato "MANIFESTE-SE O EMBARGADO , NA FORMA DO ART 1023, DO CPC."
30.01 - Eds da Astro
23.01 - Publicado no DJEN
21.01 - Expedição de intimação
19.01 - Proferida sentença julgando procedente o pedido autoral.
12.08 - Conclusos ao Juiz'),
    ('0871519-28.2022.8.19.0001', '2026-06-15'::date, '15.06: Migrado para o Sistema Eproc
14.04 - Manifestação do MP opinando pela suspensão do feito
24.10 - Manifestação Astro
15.10 - Ciência do MP
17.10 - Publicado Intimação 
15.10 - Despacho -   Diga a ré sobre manifestação da Curadoria de Massas e da autora. Após, voltem à Curadoria e conclusos.
17.09 - Conclusão
17.09 - Certifico que remeto os autos à Conclusão, tendo em vista as manifestações de ID 179589366 e 181425017.
27/03/2025 - Petição da FOCUS HEALTH SOLUTIONS SERVIÇOS DE SAÚDE LTDA'),
    ('0946416-90.2023.8.19.0001', '2026-05-21'::date, '21.05: Parecer MP
05.05 - Migrado ao eproc e Expedida/certificada a intimação eletrônica - Vista ao MP para Parecer
08.01 - Expedição de outros documentos
28.08 - Manifestação do MP o foi
nformando que foi erroneamente intimado para se manifestar, tendo em vista que a atribuição para oficiar nos autos é da 3ª Promotoria de Justiça de Massas Falidas e pedindo para intimar a ela.'),
    ('5119222-59.2023.8.13.0024', '2026-06-18'::date, '18.06: Disponibilizado no DJEN
17.06 - Migrado para o sistema Eproc 
23.03 - Petição da exequente requerendo expedição de mandado de pagamento
23.02 - Certidão "Certifico e dou fé que expedi a(s) Certidão(es) de Habilitação de Crédito, conforme requerido via sistema, podendo o pedido ter sido reiterado via balcão, e-mail e ou telefone."
23.01 - Juntada de custas para confecção de certidão de crédito
02.12- Juntada de solicitação de transferência e desbloqueio.
02.12- Proferida decisão de extinção do CS somente em relação ao crédito concursal devido pela Astro, determinando expedição de certidão de crédito em favor da exequente. Além disso, acolheu parcialmente a impugnação em razão do bloqueio em excesso, fixando o valor da execução em R$ 50.699,41 e arbitrando honorários em favor dos patronos da Astro em 10% sobre o excesso de R$ 20.677,18. Ao final, incumbiu a Astromarítima do dever de comunicar o juízo da RJ sobre a decisão.
05.10 - Conclusos para decisão
28.08 - Autora se manifesta para reforça a manifestação apresentada
08.07 - Petição da Astro juntando documentos para comprovar a Recuperação Judicial das empresas
30.06 - intime-se a parte executada, ASTROMARÍTIMA NAVEGAÇÃO S.A., para que, no prazo de 5 (cinco) dias, junte aos autos a documentação necessária à análise da matéria, sob pena de desconsideração da alegação.'),
    ('0938013-35.2023.8.19.0001', '2026-08-04'::date, '04/08 - Migrado para o sistema eproc 
28.04 - Publicado no DJEN
05.02 - Certidão informando que o ar não retornou e proferido despacho determinando a manifestação da autora
06.11 - Certidão - "Certifico que o mandado de citação do réu, até a presente data, não retornou à serventia. Assim sendo, o mandado será reexpedido."
05.11 - Expedição de AR para Astro e Certidão 
02.09 - Certifico que o mandado de citação ID 221565424 foi expedido, via postal. 
29.08 - Expedição de Aviso de recebimento (AR).
"Certifico que a parte ré não foi citada."'),
    ('0969984-38.2023.8.19.0001', '2026-08-03'::date, '03/08 - Migração para o sistema eproc 
10.07 - Certidão certificando a tempestividade dos eds
08.05 - Embargos de declaração Astro
03.05 - Publicado Intimação em 30/04/2026.
28.04 - Expedição de outros docs
05.02 - Proferida sentença julgando procedente o pedido 
18.12 - Conclusos
07.11 - Despacho - "Remetam-se ao Grupo de Sentença." ; e Remetidos os Autos (outros motivos) para Grupo de Sentença
06.11 - Conclusos
18.08 - Manifestação do MP
13.08 - Intimação sobre despacho - Tendo em vista a recuperação judicial da parte ré, remetam-se ao Ministério Público.'),
    ('0865865-89.2024.8.19.0001', '2026-06-26'::date, '26.06 - Petição cumprimento de sentença 
16.06 - Juntada de certidão (supensão de prazos no dia 24/06)
09.06 - Publicado no DJEN
26.06: petição - execução/cumprimento de sentença
03.06 - Proferida decisão rejeitando a exceção de pré- executividade e determinando o prosseguimento da execução
07.05 - Conclusos
06.05 - Certidão "Certifico que o excepto se manifestou tempestivamente."
13.02 - Manifestação do exequente
03.02 - Publicado no DJEN ((EXECUTADO - ASTRO NAVEGACAO LTDA - EM RECUPERACAO JUDICIAL)
Prazo: 15 dias Status:ABERTO
Data inicial da contagem do prazo: 04/02/2026 00:00:00
Data final: 24/02/2026 23:59:59
30.01 - Proferido despacho "Evento 56: Ao excepto."
19.01 - migrado pro sistema eproc
14.10 - Juntada de comprovante de taxa judiciária pela Astro
Publicado Intimação em 07/10/2025.
02.10 - Despacho - Tendo em vista a certidão de ID 230657282, intime-se o executado para recolhimento da taxa judiciária no prazo de 05 dias, sob pena de não recebimento. Decorrido o prazo, certifique-se e voltem conclusos.
05.08.2025 - Exceção de pré executividade da Astro'),
    ('0846952-90.2023.8.19.0002', '2026-08-10'::date, '10/08 - Juntada de Contrarrazões 
17.07 - Expedida intimação ao embargado
06.05 - Embargos de declaração Astro
28.04 - Publicação no DJEN
19.04 - Proferida sentença julgando procedente o pedido
20.02 - Certidão "Certifico a preclusão das vias impugnativas, bem como que as partes estão regularmente representadas." e conclusos.
Publicado Intimação em 17/10/2025.
14.10 - Decisão - rejeitada a preliminar de incompetência absoluta suscitada pela ré
15.07 - Petição Lognav falando sobre provas'),
    ('0907531-07.2023.8.19.0001', '2026-07-21'::date, '21.07 - Eds Astro
10.07 - Sentença procedente e expedição de intmação
06.07 - Certidão "Certifico que houve resposta aos Embargos Monitórios em id, 231110426." e conclusos
21.05 - Petição contrarrazões
18.05 - Publicado no DJEN
14.05 - Proferido despacho " Intime-se a parte autora para se manifestar acerca dos Embargos Monitórios em id, 231110426 , após retornem para Sentença."
10.05 - Certidão " Certifico que a ausência de manifestação das partes.
Faço os autos conclusos."
10.12 - Expedição de  outros documentos
02.10 - Embargos Monitórios da Astro'),
    ('0870978-58.2023.8.19.0001', '2026-06-12'::date, '12.06 - Migrado para o sistema Eproc 
21.05 - Publicada intimação
19.05 - Ato "Às partes sobre laudo pericial Id. 263498908." e expedição de intimação
17.02 - Petição do perito
03.12- Despacho determinando intimação do perito por e-mail e telefone para se manifestar no prazo de 30 dias.
19.11 - Certidão informando que não houve manifestação do perito 05.09 - Expedição de documentos - Ato ordinatório - Ao perito
02.09 - Juntada da guia correta dos honorarios periciais
28.08 -  Juntada de guia de recolhimento de custas
15.07 - Petição da Astro
11.06 - Astro - Juntada de 4 parcela do pagamento do perito'),
    ('0873988-47.2022.8.19.0001', '2026-08-05'::date, '05/08 - Sentença publicada no DJEN
30/07/2026 - Sentença improcedente 
31.05 - Conclusos para julgamento
29.05 - Alegações finais Astro e autor
08.05 - Publicado no DJEN (RÉU - ASTROMARITIMA NAVEGACAO SA - EM RECUPERACAO JUDICIAL)
Prazo: 15 dias Status:ABERTO
Data inicial da contagem do prazo: 11/05/2026 00:00:00
Data final: 29/05/2026 23:59:59
06.05 - Proferida decisão determinando a intimação das partes para apresentarem elegações finais no prazo de 15 dias
04.05 - Conclusos
23.04 - Migrado pro eproc
11.02 - Certidão "Certifico que tentei contato telefônico no nº  (021) 3492-6930 e está fora de área. Encaminhei e-mail pra "jorgerodrgues@jrcpericiais.com.br", solicitando resposta com urgência aos autos do processo."
02.10 - Expedição de Outros documentos.
19.09 - Publicada a intimação
17.09 - Renove-se a intimação do perito, através os meios de comunicação de conhecimento do cartório (Portal, e-mail, telefone) para cumprir o determinado em id. 178320931, no derradeiro prazo de 10 (dez) dias, já que tem o dever de esclarecer ponto sobre o qual exista divergência ou dúvida de qualquer das partes e divergente apresentado no parecer do assistente técnico da parte, sob pena de ser obrigado a restituir os valores recebidos pela parte do trabalho não realizado, conforme art. 468 do CPC.'),
    ('0074121-25.2022.8.19.0001', '2026-07-09'::date, '09.07 - Pagamento da 4ª parcela Astro
02.06 - Certidão "Fl. 514: Certifico que a ré se manifestou às fls. 517; 521 e 525."
24.04 - Petição Astro 
24.03 - Petição Astro 
03.03 - Enviado para a publicação
03.02 - Enviado para a publicação
02.02 - Proferida decisão deferindo o parcelamento dos honorários periciais em 10 vezes, devendo a 1ª parcela ser paga em até 15 dias após o recebimento da intimação, a 2ª em 30 dias e as demais no mesmo prazo sucessivamente. Após o pagamento da última parcela, determina a intimação do perito para apresentar o laudo em 90 dias.
04.11 - Pet. perito informando que teve ciência da intimação eletrônica
19.09 - : intime-se o perito para dizer se concorda com o parcelamento de seus honorários periciais na forma requerida pela ré
10.09 - Certidão de publicação
09.09 - intime-se o perito para dizer se concorda com o parcelamento de seus honorários periciais na forma requerida pela ré
17.06 - Manifestação Astromarítima'),
    ('0848534-94.2024.8.19.0001', '2026-03-31'::date, '31.03 - Migrado ao eproc
13.03 - Eds Astro
04.03 - Proferida sentença procedente e expedida intimação
05.01.26 - Certidão "  Certifico que as partes não se manifestaram acerca da r. decisão saneadora." e remessa à conclusão.
Publicado Intimação em 31/07/2025.
29.07 - INTIMAÇÃO - DECISÃO DE SANEAMENTO - Não há preliminares nem irregularidades a serem sanadas.
Deferiu a produção de prova documental suplementar, desde que superveniente, na forma do artigo 435 do CPC, com a sua juntada no prazo de 15 (quinze) dias, dando-se vista à parte adversa, na forma do artigo 437, §1° do CPC e indeferiu a produção de quaisquer outras provas'),
    ('0840696-37.2023.8.19.0001', '2026-08-10'::date, '10/08 - Conclusos 
30.07 - CR astro 
22.07 - Disponibilizada no DJEN intimação para contrarrazões Astro
21.07 - Eds exequente
16.07 - Publicado no DJEN
14.07 - Proferida decisão acolhendo parcialmente a impugnação
15.06 - Conclusos para decisão 
25.05 - Petição da Astro
24.04 -  Petiçao da Astro
31.03 - Petiçao da Astro
24.03 - Publicado no DJEN
20.03 - Proferido despacho "Esclareçam as impugnantes a data do pedido de recuperação judicial."
04.03 - Ato "Informo que a parte autora se manifestou tempestivamente no evento 129." e conclusos.
27.01 - Migrado pro eproc
15.12- Manifestação do impugnado
02.12- Despacho determinando intimação do impugnado e, na mesma data, expedição de intimação
17.11- Certidão informando o recolhimento das custas pela Astro. Na mesma data, os autos foram conclusos.
02.09 - Petição da Astro juntando GRERJ
Publicado Intimação em 29/08/2025.
Certifico que: 

1) Não consta no sistema PJe petições/ofícios/mandados a serem juntados, bem como GRERJ sem conferência.

2) Certifico ainda que a parte autora se manifestou pelo ID 197828156 e recolheu as custas corretamente, conforme extrato de ID 220970337.

Certifico mais que a parte ré apresentou impugnação tempestiva pelo ID 203609914.

3) Com relação às custas judiciais, a parte ré deverá recolher o valor R$ 388,11 na conta 1102-3 para impugnação.

4) Os patronos estão cadastrados corretamente no sistema PJe.

O referido é verdade e dou fé.'),
    ('0946064-35.2023.8.19.0001', '2026-08-04'::date, '04/08 - Autos remetidos ao 2 grau
20.07 - Migrado eproc
28.05 - Contrarrazões
06.05 - Certidão aos apelados e petição do MP reiterando manifestação
12.02 - Apelação Astro
22.01 - Publicado no DJEN
22.12- Proferida sentença não acolhendo os embargos de declaração e expedição 
14.10 - Conclusos
03.10 - Cerridão - Certiffico que: 1)  O  embargado  se   manifesta   tempestivamente  na  petição  index  227476525 2)   O  patrono  da  petição  index  22746525  se  encontra  cadastrado  no  processo.  
19.09 - Petição da autora solicitando exclsão e habilitação de adv.
01.09 - Contrarrazões
24.08 - Petição do MP reiterando manifetação
16.07 - Conclusos'),
    ('0030742-78.2016.8.08.0024', '2026-07-06'::date, '06.07 - Juntada de ofício
03.07 - Conclusos
18.06: petição
17.06: Publicado a decisão 
15.06 - Decisão: deferida a pesquisa no sistema Sisbajud, na modalidade de ordens de bloqueio (Teimosinha)
08.06 - Conclusos
20.05 - Publicada decisão
07.05 - Petição da Terra-mar requerendo o prosseguimento da execução com relação ao crédito sucumbencial
05.05 - Proferida decisão suspendendo o cumprimento de sentença
27.04 - Conclusos
17.04 - Petição da Astro informando interposição de AI
24.03 - Publicada decisão que não acolheu a impugnação reconhecendo a natureza extraconcursal 
03.03 - Conclusos
29.12 - Redistribuído por sorteio em razão de alteração de competência do órgão
27.11 - Redistribuído por sorteio em razão de alteração de competência do órgão
13.11- Manifestação da Terra-mar pugnando pela improcedência da impugnação.
07.11- Juntada de comprovante de alvaras expedidos ao perito
24.10 - certidão - expedição de alvaras para o perito 
22.10 - Manifestação autor - sobre honorários do perito, liberação desses valores e informando que vai apresentar respota à impugnação da astro
21.10 - Impugnação tempestiva - intimação autor
14.10 - DEFIRO a liberação dos valores já depositados a título de honorários
06.10 - Impugnação ao cumprimento de sentença
16.09 - Certidão - decurso de prazo - Certifico que, decorrido o prazo legal, até a presente data, não foi apresentada resposta para o(s) seguinte(s) expediente(s)...
21.08 - Conclusos para despacho
15.08 - perito manifestação - Aceita mais uma vez o parcelamento dos honorários
14.08 - Por conseguinte, INTIME-SE a parte executada/requerida, para que, no prazo de 15 (quinze) dias, efetue o pagamento do montante da execução, no valor de R$ 3.309.527,07 (três milhões, trezentos e nove mil, quinhentos e vinte e sete reais e sete centavos), em consonância com petição e demonstrativos de ID 75333357.
13.08 - Petição da Autora
13.08 - Conclusos para o Juiz'),
    ('0030742-78.2016.8.08.0024', '2025-01-19'::date, '19/01/25 - 2º Grau - Decisão
16.03.2025 - Decorrido o prazo
22.05.2025 - baixa definitiva'),
    ('5007321-94.2026.8.08.0000', '2026-05-22'::date, '22.05 - Proferido despacho determinando a regularização processual
20.05- Contrarrazões e petição nossa
19.05 - Conclusos 
06.05 - Eds da agravada
29.04 - Publicada intimação
24.04 - Decisão encaminhada ao juízo de origem
23.04 - Proferida decisão
17.04 - Petição Agravo de Instrumento'),
    ('0852264-50.2023.8.19.0001', '2026-06-15'::date, '15.06 - Migração par a o sistema Eproc
09/02 - Petição do exequente requerendo o prosseguimento da execução com a renovação do bloqueio especificamente em faze da astromarítima e pesquisa de bens através do RENAJUD com relação a Astro Navegação
05/02 - Proferido despacho determinando a remessa dos autos à Divisão de Cálculo de Custas Finais 
29.01 - Resultado de bloqueio negativo e proferido despacho determinando a intimação do credor para requerer o que for de direito
21.01 - conclusão
13.01 - Certidão atestando recolhimento das custas e conclusão
25.08 - Manifestação da autora comprovando o recolhimento da complementação de custas, reiterando a petição onde requereu o prosseguimento da execução, com a penhora online de valores existentes em contas bancárias das Executadas
Publicado Intimação em 22/08/2025.'),
    ('0818232-19.2023.8.19.0001', '2026-07-17'::date, '17/07 - Petição do exequente requerendo que o processo permaneça suspenso até o fim da RJ
08/07 - Proferido despacho "Intime-se pessoalmente o exequente para dar andamento ao feito, no prazo de 05 dias, sob pena de extinção."
01/07 - Pet Astro
24/06 - Publicado a intimação
24/06 -Certidão: Às partes para que informem acerca do deslinde do processo de recuperação judicial nº 0172177-59.2023.8.19.0001
24/06 - PROCESSO DESARQUIVADO
23.05.25 - ARQUIVADO 
14/02/2025 - Decorrido o prazo para manifestação
22/1/25 Processo supenso por 1 ano em razão da RJ. Arquivo provisório'),
    ('0813708-58.2024.8.19.0028', '2026-08-13'::date, '13/08 - Intimação sobre despacho publicada no DJEN
13/8 - Despacho - Para melhor análise do pedido de gratuidade de justiça da empresa ré, venha o balanço patrimonial de 2025, o balancete parcial de 2026 e o plano de recuperação judicial
]16.07 - Certidão " Certifico que as custas relativas à exceção de pré-executividade não foram recolhidas.
Tendo em vista a manifestação do executado de evento 65, PET1 acerca da determinação de evento 60, DESPADEC1, faço os autos conclusos." e conclusão
13.05 - Petição da Astro
06.05 - Publicado no DJEN
05.05 - Disponibilizado no DJEN
04.05 - Proferido despacho 1. Certifique o cartório acerca do recolhimento das custas para a apresentação da exceção de pré-executividade.
2. Não tendo sido recolhidas, determino o recolhimento no prazo de 5 (cinco) dias, sob pena do seu não recebimento.
Intimem-se. 
11.03 - Ato "Certifico que o excepto se manifestou tempestivamente." e conclusão.
23.01 - Migrado para o eproc
14.11 - Juntada da petição da Offshore pugnando peja rejeição da Exceção de Pré-Executividade
07.11 - Publicação de Intimação para a Astro referente ao Despacho
05.11 - Conclusos ; Despacho - "Ao excepto." 
29.10 - Aviso de recebimento de AR
15.10 - Juntada de AR
22.09 - Exceção de Pré-Executividade Astro
Publicado Intimação em 10/09/2025.
02.09 - Expedição de Aviso de recebimento (AR).
29.07 - Certifico também que as custas foram corretamente recolhidas. 
Publicado Intimação em 23/07/2025.
27.05.25 - Parte autora requerendo citação da Astro por DJE'),
    ('0276688-37.2024.8.06.0001', '2026-06-17'::date, '17.06 - Conclusos para julgamento
15.06 - Alegações finais SC
08.06 - Publicado no DJEN
03.06 - Proferida decisão determinando manifestação das partes para alegações finais no prazo de 5 dias
04.05 - Conclusos
22.04 - Petição Astro
14.04 - Publicação
10.04 - Certidão "Certifico que esta secretaria procedeu com o envio da comunicação via Diário da Justiça Eletrônico."
17.03 - Proferida decisão saneadora determinando a intimação das partes para se manifestarem/requererem provas no prazo de 5 dias.
08.08 - conclusos para despacho'),
    ('0287987-24.2019.8.19.0001', '2026-07-30'::date, '30/07 - Conclusos 
28/07 - Pet autor 
28/07 - Pet astro 
27/07 - Pet autor 
23/07 - Pet réu hornbeck
21.07 - Publicado no DJEN
15.07 - Proferida decisão em provas, no prazo de 5 dias
30.06 - Conclusos
13.05 - Petições Hornbeck e Astromarítima
05.05 - Enviado para publicação
04.05 - Ato "As partes fls. 705"
29.04 - Enviado para publicação
28.04 - Despacho 1) Digam as partes se ratificam os atos praticados. Prazo de 5 dias. 2) Decorridos, com ou sem manifestação, voltem para decisão.
14.04 - Conclusos
15.01 - Distribuído ao cartório da 1ª V Empresarial
24.10 - declinio de competência
01.10 - certidão de publicação
24.09 - Tendo em vista o desprovimento do agravo de instrumento, conforme id 623, cumpra-se a decisão de id 561 que declinou da competência em favor de uma das Varas Empresariais da Comarca da Capital
08.09 - Conclusos
30.06 - Juntada de Acórdão
Certidão de Publicação - 02.06.2025
28.05.25 - Certifico que o acórdão interposto foi desprovido.
Interposto embargos de declaração, estes foram
rejeitados, estando o feito aguardando a preclusão da
decisão que rejeitou os embargos.'),
    ('0100913-48.2024.8.19.0000', '2026-06-27'::date, '27.06 - Certidão de Transito
27.06 - Certificando que não houve interposição de recurso contra a
Decisão no Agravo de Instrumento
24.06 - Ofício - Pelo presente, comunico a Vossa Excelência que não houve interposição de recurso contra o(a) acórdão/decisão prolatado(a) no(a) AGRAVO DE INSTRUMENTO - CÍVEL nº 0100913-48.2024.8.19.0000 (ação originária nº 0287987- 24.2019.8.19.0001), em que são partes PETROLEO BRASILEIRO S.A. PETROBRAS e ASTROMARÍTIMA NAVEGAÇÃO S/A E OUTRO.
Desta forma, por se tratar de processo eletrônico, solicito a V. Exa. que determine a visualização e impressão das peças a que se refere o Inciso I do Artigo 1º, da Resolução nº 11/2008, do Órgão Especial do Tribunal de Justiça, por meio do caminho indicado abaixo(*), anexando-as aos autos físicos para prosseguimento'),
    ('0087228-68.2024.8.19.0001', '2026-06-19'::date, '19.06: conclusos
28.05 - Juntada de contestação Astro
27.05 - Proferido despacho "Fls. 241 - Anote-se
Em seguida, cumpra-se item 2 da decisão de fls. 239."
03.02 - Conclusos
02.02 - Petição MORAES & SAVAGET ADVOGADOS requerendo descadastramento dos patronos e conclusão
28.01 - Enviado para publicação
27.01 - Decisão não conhecendo EDs
04.11 - Ato Ordinatório - "Certifico que, em 25/09/2025, foi protocolada petição de Embargos de Declaração em face do despacho publicado em 17/09/2025." ; e Conclusos
25.09 - EDS do Moraes Savaget
17.09  - Certidão de Publicação
15.09 - Manifestação do autor juntando a procuração para comprovar a
regularidade de sua representação processual e requerendo prosseguimento do feito
18.08 - Decisão
23.07- Conclusos'),
    ('0938031-56.2023.8.19.0001', '2026-08-07'::date, '07/08 - Intimação sobre ato publicado no DJEN
07/08 - Ato ordinatório: Certifico que os embargos monitórios foram apresentados tempestivamente, entretanto não foi recolhida a taxa judiciária.
Ao embargante para recolher a taxa judiciária no valor dos embargos.
06/08 - Intimação sobre ato publicada no DJEN
05/08 - Ato ordinatório 
09.04 - Migrado para eproc
Publicado Intimação em 17/10/2025.
15.10 - certidão - ao autor
18.09 - Embargos Monitórios da Astro
03.09 - Expedição de Aviso de recebimento (AR).
09.06 - publicada intimação
05.06 - Intimação - Deixo de designar a audiência de conciliação na forma do artigo 334 do CPC, eis que a experiência tem demonstrada o insucesso da composição e ainda pelo fato da possibilidade de designação a qualquer momento de nova audiência, devendo o Juízo zelar pelo razoável duração do processo. Cite-se a ré  por meio eletrônico. Não havendo o cadastro no SISTCAPDPJ, cite-se por via postal com aviso de recebimento.'),
    ('0300880-47.2019.8.19.0001', '2026-06-15'::date, '15.06 - Petição Petróbas (recolhimento de custas)
27.05.2026 - Expedida intimação "C. V. ACÓRDÃO. DECORRIDO O PRAZO, AO ARQUIVO"
27.11 - Petição cumprimento de sentença
04.11 - Manifestação DP - "A DP vinculada ao Juízo não atua no feito."
21.10 - Certidão - Certifico que não houve interposição de recursos
contra acórdão/decisão retro
29.09 - Acórdão publicado no DJEN
25.09 - Acórdão Negando Provimento ao Recurso
16.09 - Certifico que os presentes autos foram incluídos na Pauta de
Julgamento do dia 25/09/2025 00:01, para serem julgados em
ambiente virtual, conforme publicação no DJEN – Diário de Justiça
Eletrônico do Nacional de 16/09/2025
11.09 - Relatório e despacho para dia de julgamento
28.08 - Contrarrazões - Petrobras
13.08 - Publicado ato ordinatório 
08.08 - Ato ordinatório - prazo para contrarrazões
20.06 - Apelação Astro
02.06.25 - Certidão de Publicação da Sentença - Julgado Procedente o Pedido'),
    ('0494824-53.2015.8.19.0001', '2026-08-12'::date, '12/08 - Pet MP
11/08 -Pet Wellington
08/08 - Pet jéssica 
08/08 - Pet PGE
07/08 - Pet Alan
0708 - Pet Guilherme 
07/08 - Pet K2
06/08 - Pet Alexandre Ornelas 
05/08 - Pet Luiz Claudio 
04/08 - Pet EISA
03/08 - Pet execução Luiz Claudio
03/08 - Pet Eisa 
28.07 - Pet autor 
22.07 - Publicado edital do leilão
08.07 - Pet leiloeiro
12.06 à 24.06 - Petições diversas 
08.06 - Publicado edital de leilão
27.05 - Relatório AJ mês de janeiro 2026
26.05 - Parecer do MP 
22.05 - Juntada assentada
30.04 - Proferida decisão redesignando audiência para o dia 20/05/2026, às 14:00
08.04 - Proferida decisão designando audiência de conciliação para 11/05/2026, às 15:00
07.04 - Conclusos
19.03 - Relatório mensal AJ dezembro de 2025
17.03 - Petição de prestação de contas de leilão negativo
11.03 - Parecer MP
09.03 - Expedida intimação
05.03 - Petição Douglas sobre parcelas em atraso
04.03 - Proferida decisão determinando a intimação da Recuperanda e do Administrador Judicial para manifestação acerca de alegações de inadimplemento de créditos trabalhistas; concedendo prazo adicional de 180 dias para conclusão das negociações fiscais; deferindo tutela de urgência para suspender execuções e atos constritivos em reclamações trabalhistas no âmbito de mediação incidental; e abrindo vista aos interessados, com ciência ao Ministério Público.
03.03 - Petição do autor requerendo que seja a recuperanda e o
administrador judicial intimados para que efetuem o pagamento do saldo remanescente,
23.02 - Manifestação das recuperandas
20.02- Expedição de ofícios
19.02 - Digitação de ofícios e envio de documento eletrônico
12.02 - Proferida decisão determinando a intimação da Recuperanda e AIJ para se manifestarem acerca dos  pedidos e alegações dos credores, bem como prestem esclarecimentos solicitados pelo MP. Defere a retirada das sucatas leiloadas mediante apresentação do auto de arrematação, determina a ciência dos credores sobre o pagamento de seus créditos e eventuais valores remanescentes, e determina a expedição de ofícios à 27ª e à 49ª Vara do Trabalho. Por fim, homologa as datas do leilão das sucatas, fixando início em 10/03/2026 e encerramento em 17/03/2026.
03.02 - Petição do Leioeiro de juntada do edital do leilão
21.01 - Petição do Luiz Carlos informando que houve pagamento parcial e requerendo que seja reconhecida existência de saldo remanescente
20.01 - Manifestação do mp
13.01.2026 - Petição do Tiago Souza da Silva requerendo a expedição de alvará no valor de  R$ 22.868,19
06.01.2026 - Petição do autor requerendo intimação da Astro para comprovar o pagamento.
22.12 - Petição do autor alegando que os cálculos apresentados pela parte ré não observam os exatos termos do acordo homologado; petição do Anderson requerendo que seja determinado o pagamento da 2ª parcela devida ao credor
16.12 - Juntada de petição das recuperandas
12.12 - Juntada de relatporio referente ao mês de setembro
08.12- Proferida decisão determinando intimação das partes sobre pedidos dos credores; homolando leilão das sucatas e autorizando o pagamento da parcela em atraso integral ou parcialmente mediante rateio.
03.12 - Pet do Leandro da Silva informando descumprimento do acordo requerendo execução das parcelas restantes. 
28.11 - Pet habilitação de credito ISAQUE OLIVEIRA SANTANA
27.11 - Petição do leiloeiro 
18.11 -Petição do Cicero Marinho requerendo a execução das 2 parcelas restantes em razão do atraso no pagamento.
17.11 - Manifestação da Eisa acerca da certidão
12.11 - Certidão negativa do OJA
31.10 - Parecer MP
09.10 - Petição AJ
06.10 - Decisão 
02.10 - Conclusos
30.09 - decisão
16.09 - RMA da Recuperanda
09.09 - exito no 1 leilão
12.08 - Manifestação Leiloeiro - Leilão publicado
12.08 - abertura de leilão
07.08 - Conclusos ao Juiz
17.07 - Eisa se manifestou requerendo autorização para continuidade da venda de sucatas de sua propriedade a fim de dar a efetiva continuidade na geração de caixa e provisionamentos para cumprimento do Plano de Recuperação Judicial das empresas
02.07 - habilitação da Astro
MP deu ciência sobre sentença de fls. 32631
Diante da concordância do Administrador Judicial às fls. 32542/32545 e do Ministério Público
às fls. 32605/32606, defiro a dilação do prazo pelo período de 180 dias para a comprovação
da regularidade fiscal, conforme requerido pela recuperanda às fls. 31141/31162.
No tocante ao pedido de autorização da retomada das vendas de sucatas estocadas nas
unidades operacionais das recuperandas, formulado às fls. 32614/32622, cumpre-me
esclarecer a existência de deicsão em 2ª instância indeferindo o pleito (Agravos de
Instrumento de números 0038663-76.2024.8.19.0000, 0066436-
33.2023.8.19.0000 e nº 0044471- 62.2024.8.19.0000).
Doravante, considerando a dilação de prazo ora deferida, oficie-se à Exma. Relatora, Des.
Denise Nicol, informando a aparente inexistência de óbice.
Intime-se a recuperanda acerca da manifestação do AJ às fls. 32626/32629, bem como acerca
dos pedidos de pagamento de credores formulados nos presentes autos.
Intimem-se as patronas subscritoras da petição às fls. 31061/31067 para que se manifestem
conforme requerido pelo AJ às fls. 32626/32629.
Dê-se vista ao Ministério Públic'),
    ('0835836-14.2024.8.19.0209', '2026-07-29'::date, '29.07 - ReceBido mandado para cumprimento pelo OJ
29.07 - Extrato GRERJ 
26.05 - Petição autor
21.05 - Publicado DJEN
19.05 - Juntada de certidão e expedida intimação pro autor
26.03 - Petição do autor
20.03 - Migrado para o eproc
16.03 - Juntada de certidão negativa "DEIXEI DE CITAR
ASTRO NAVEGAÇÃO LTDA , em razão de ser recebido pela Sra. Mariana Delmonte, que declarou que não funciona no  local a empresa Astro Navegação Ltda."
02.03 - Expedição de mandado de citação
15.01 - Digitação mandado de citação 
30.10 - autora informando que pagou as custas
06.09 - Decorrido prazo
29.08 - Publicado Intimação
28.08 - Autora pedindo citação por OJA'),
    ('0971644-33.2024.8.19.0001', '2026-07-21'::date, '21.07 - Petição do autor
07.07 - Publicado no DJEN
03.07 - Ato ao autor para recolher custas
24.06 - Migrado eproc
04.05 - Petição do autor reiterando o regular prosseguimento do feito
20.02 - Petição juntada de custas
10.02 - Proferido despacho "Ciente da Decisão superior de IE 262044707. Cumpra-se. Certifique-se quanto ao correto recolhimento da primeira parcela das custas/taxa judiciária iniciais. Após, voltem conclusos."
09/02 - Conclusos
08.01 - Petição do autor informando que foi dado provimento ao agravo para deferir o parcelamento das custas judiciais.
04.12 - Petição do autor informando que interpos agravo de instrumento contra decisõa que determina a complementação de custas (Protocolo No 2025.01145385)
19.11 - Proferido despacho mantendo a decisão anterior e determinando a complementação das custas. Na mesma data, foi expedida intimação
31.07 - Requerendo reconsideração da decisão
29.07 - Publicada  Intimação sobre decisão de tutela - INDEFIRO a tutela de urgência.'),
    ('0902410-61.2024.8.19.0001', '2026-07-09'::date, '09.07 - Manifestação do MP
03.07 - Proferido despacho"Ao Ministério Público"
05.06 - Petição da Astro
29.05 - Petição do autor
  15.05 - Publicado no DJEN (RÉU - ASTRO NAVEGACAO LTDA - EM RECUPERACAO JUDICIAL)
Prazo: 15 dias Status:ABERTO
Data inicial da contagem do prazo: 18/05/2026 00:00:00
Data final: 08/06/2026 23:59:59
14.05 - Petição MPF
03.05 - Proferido despacho determinando a intimação das partes para esclarecerem se os créditos listados no QGC correspondem às cobranças veiculadas, no prazo de dez dias
28.04 - Conclusos
21.02 - Migrado para eproc
29.01 - Petição da Astro
22.01 - Publicação no DJEN
15.01 - Pet da autora informando não ter mais provas a produzir
13.01 - Expedição de intimação para as partes esclarecerem se ainda possuem provas a produzir.
14.10 - Réplica
09.10 - Publicada intimação
07.10 - Intimação - Ao autor em réplica 
06.08 - Contestação da Astro'),
    ('0892972-74.2025.8.19.0001', '2026-07-08'::date, '08.07 - Proferido despacho "Ao Excipiente."
07.07 - Conclusos
14.04 - Emenda à inicial
10.03 - Migrado para o eproc
03.03 - Expedição de outros documentos
27.02 - Proferido despacho "  Ao excepto."
10.02 - Certidão certificando o recolhimento das custas e conclusos
16.10 - Petição com comprovante da taxa judiciária - Astro
10.10 - Publicada intimação - Ao réu  para recolher uma taxa judiciária mínima, referente à exceção de pré-executividade'),
    ('0955959-49.2025.8.19.0001', '2026-08-14'::date, '14/08 - Intimação publicada no DJEN
12/08 - Despacho
11.05 - Conclusos
19.03 - Petição de custas do autor
26.02 - Ato " Ao autor para dar cumprimento ao ato ordinatório de id. 228053959."
26.01 - Expedição de outros documentos
Publicado Intimação em 25/09/2025 sobre relatório de prevenção'),
    ('0001785-05.2004.8.20.0105', '2026-07-15'::date, '15.07 - Proferido despacho "Considerando o requerimento de extinção em razão da alegada satisfação da dívida ocorrida no presente feito (conforme consta no id 188447564), intime-se a exequente para, no prazo de 10 (dez) dias, apresentar manifestação.
Em seguida, retornem os autos conclusos para sentença de extinção.
Cumpra-se."
29.05 - Manifestação Astro
08.05 - Publicado no DJEN
29.04 - Proferido despacho "... Diante do exposto, considerando o art. 10 do CPC, intimem-se as partes para que, no prazo de 15 (quinze) dias, se manifestem acerca da ocorrência da prescrição intercorrente, arguindo, no caso da parte exequente, eventuais causas suspensivas ou interruptivas.
No referido prazo, as partes também deverão se manifestar sobre os documentos e petição apresentados no id 184830495 e seguintes, pelo BDNES. ..."
28.04 - Conclusos
27.04 - Petição do BNDES informando a não disponibilidade de recursos da Astro na conta vinculada
14.04 - Petição Astro
26.03 - Expedição de ofício
19.03 - Publicado Intimação (prazo 15 (quinze) dias)
17.03 - - Expedição de Outros documentos
09.03 - Proferida decisão
02.02 - Juntada de petição do Município
07.01 - Expedida intimação ao município
15.12 - Petição Astro'),
    ('00023197020258250008202590301334', '2026-07-21'::date, '21.07 - Intimação sobre decisão publicada no DJEN
17.07 - Proferida decisão deferindo a pesquisa de bens em nome da Astro através d sistema infojud
22.05 - Disponibilizado no DJEN
20.05 - Ato "Intime-se a parte autora, por seu(s)/sua(s) advogado(s)/advogada(s)/procurador(es) e via Diário da Justiça Eletrônico  DJE ou intimação eletrônica, para se manifestar, no prazo de 05 (cinco) dias, acerca do determinado no despacho"
02.04 - Foi disponibilizado no Diário de Justiça Eletrônico Nacional (DJEN), no dia 01/04/2026, o movimento registrado no dia 30/03/2026, às 10:06:32 : Despacho >> Mero Expediente
30.03 - Proferido despacho " Diante da resposta inefetiva à solicitação junto ao Sistema SISBAJUD, INTIME-SE o Exequente para, no prazo de 15 (quinze) dias, impulsionar a execução, requerendo o que entender de direito, sob pena de extinção nos moldes do Enunciado 75 do FONAJE, segundo o qual, se aplicam às Execuções de Título Judicial, as mesmas disposições do art. 53, § 4° da Lei 9099/95. Transcorrido o prazo, conclusos."
13.01 - Dispinibilização no DJEN
09.01 - Proferida decisão determinando o bloqueio da quantia de R$ 24.463,86 nas contas da Astro Navegação e a expedição de inteiro teor da decisão judicial para fins de protesto. 
01.12- Juntada de petição
12.11 - Despacho determinando a consulta de bens penhoráveis da ASTRO NAVEGAÇÃO LTDA através do RENAJUD.
07.11 - Conclusão
24.10 - Manifestação da Autora
16.10 - Publicado despacho
14.10 - Desapacho - DESPACHO 1. Procedo com Bloqueio via SisbaJud na conta da Executada ASTRO NAVEGAÇÃO LTDA
02.10 - Conclusão
02.10 - Transito em julgado da decisão
26.08 - Petição da Parte Autora
25.08 - Publicado
21.08 - Decisão - REJEITO A IMPUGNAÇÃO AO CUMPRIMENTO DE SENTENÇA apresentada por ASTRO NAVEGAÇÃO'),
    ('0200530-09.2024.8.06.0140', '2026-03-03'::date, '03.03 - Juntada de informações'),
    ('3023997-45.2026.8.19.0001', '2026-07-30'::date, '30.07 - Juntada de mandado negativo 
21.07 - Expedido mandado e recebido pelo OJA para cumprimento
28.05 - Proferido despacho "Cumpra-se.
Após, dê-se baixa e devolva-se com as nossas homenagens."
27.05 - Conclusos
23.05 - Petição
10.04 - Proferida decisão "Ao interessado para cumprir o disposto no artigo 260, inciso II do CPC, devendo trazer ao processo a cópia da petição inicial para instruir a deprecata."
26.02 - Remetidos os Autos - CAPCENTAUT -> CAP36VCIV'),
    ('0802520-68.2024.8.19.0028', '2026-06-11'::date, '11.06: Ato ordinatório e conclusos
05.03 - Migrado para eproc'),
    ('0901174-74.2024.8.19.0001', '2026-07-09'::date, '09.07 - Petição do autor
16.06 - Juntada de certidão: Suspensão de prazos no dia 24/06
15.06 - Publicado no DJEN 
08.06 - Proferido despacho "Intime-se a parte autora para que cumpra o despacho do evento 45, tendo em vista que o documento juntado no evento 53 consiste apenas em comprovante de situação cadastral, sem conter informações acerca do quadro societário da referida empresa.
Fixo o prazo de 15 dias. "
10.03 - Conclusos'),
    ('5008187-29.2026.4.02.5101', '2026-08-06'::date, '06/08 - Intimação sobre sentença disponibilizado no DJEN
05/08 - Sentença procedente no embargos a execução 
23.07 - Publicado no DJEN
22.07 - Disponibilizado no DJEN
15.07 - Proferida decisão deferindo o desbloqueio  o pedido formulado pelo executado para determinar o imediato desbloqueio e a liberação dos valores constritos em todas as contas do executado ARTHUR MAC LAREN 
25/06: juntada de certidão - supensão de prazos em 29/06/2026
09.06 - Expedida intimação
03.06 - Proferida decisão determinando o desboleio das contas da Astromarítima e a suspensão da execução por 180 dias com relação a astro
02.06 - Conclusos
16.06: Certidão: Certifico e dou fé que, nesta data, procedi ao cadastro da minuta no Sistema Sisbajud
29.05 - Juntada
28.05- Petição
27.05 - Proferida decisão e expedição de intimação pro BNDES
20.05 - Certidão
18.05 - Petição da Astro e proferida decisão "... a) determino o desbloqueio imediato dos valores constritos nas contas de ANA CRISTINA DE ANDRADE CABRAL ALVES ;
b) cumprida a ordem de desbloqueio, retifique-se a autuação para exclusão do nome de ANA CRISTINA DE ANDRADE CABRAL ALVES do polo passivo;
c) Tendo em vista o comparecimento dos executado  ASTROMARITIMA NAVEGACAO SA nos autos, dou--o por citado. Devolvo o prazo para pagamento e apresentação de defesa...."
11.05 - Certidão "Certifico e dou fé que, nesta data, procedi ao cadastro da minuta no Sistema Sisbajud, conforme determinado. Do que, para constar, lavro esta certidão."
06.04 - Juntada de mandado não cumprido
04.04 - Juntada de mandado não cumprido
23.03 - Embargos à execução'),
    ('00026225120268250040202654000736', '2026-06-15'::date, '15.06 - Disponibilizado no DJEN
11.06 - Proferido despacho "Cite-se a parte ré, por meio do Domicílio Judicial Eletrônico, para pagamento do débito informado na inicial, no prazo de 15 (quinze) dias..."
08.06 - Conclusão
05.06 - Petição
27.05 - Disponibilizado no DJEN
25.05 - Ato determinando manifestação do requerente
25.05 - Juntada de ar
29.04 - Mandado de citação Postado aos correios através da Lista de Postagem de número 194/2026'),
    ('0855140-07.2025.8.19.0001', '2026-06-01'::date, '01.06: Recebido o mandado de cumprimento pelo OJA'),
    ('0810307-84.2024.8.19.0211', '2026-05-02'::date, '02.05 - Migrado para eproc'),
    ('1026376-94.2023.8.26.0100', '2026-08-04'::date, '04/08 - Arquivado provisoriamente 
04.07 Confirmada a intimação eletrônica 
26.06 - Publicado no DJEN'),
    ('3133260-12.2026.8.19.0001', '2026-08-14'::date, '14/08 - Conclusos 
14/08 - Pet Brasildental
21.07 - Ato ordinatório - ntime-se o autor via DJEN e pessoalmente (pelo DJE se possível
) para, em complemento à última GRERJ, comprovar o recolhimento das custas / despesas processuais de ingresso com base no certificado no evento 5 , em 15 dias, sob pena de cancelamento da distribuição.'),
    ('3134899-65.2026.8.19.0001', '2026-08-14'::date, '14/08 - Certidão 
04/08 -Pet autor 
23.07 - Expedida certidão (Não gerou documento)'),
    ('3141641-09.2026.8.19.0001', '2026-08-14'::date, '14/08 - Pet autor 
05/08 - Declarado competente outro juízo para o Juízo da 3ª Vara
 Empresarial'),
    ('3125258-53.2026.8.19.0001', '2026-07-24'::date, '24/07 - Pet Astro 
09/07 - Despacho - Emenda à inicial')
  ) AS v(numero_cnj, data_movimentacao, descricao)
  JOIN public.processos proc ON proc.numero_cnj = v.numero_cnj
  ON CONFLICT (processo_id, data_movimentacao, md5(descricao)) DO NOTHING;

END $$;
