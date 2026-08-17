// Gera a comunicação de decisão judicial (formato E-law) a partir do PDF
// da decisão, usando a API da Anthropic. Espelha o prompt do projeto
// "Decisão" que a BDR já usa no Claude, com o modelo de referência dela
// embutido.
//
// Autenticação: exige um usuário logado válido (token do Supabase Auth
// no header Authorization) — sem isso, qualquer um poderia usar a chave
// da Anthropic do projeto pra gerar texto de graça (mesmo problema que a
// função enviar-relatorio-email tinha e foi removida).
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODELO_REFERENCIA = `O autor alega que teve seu nome inscrito nos órgãos de proteção ao crédito em razão de um débito no valor de R$ 801,96. Contudo, sustenta que não reconhece a compra que originou a cobrança.

Diante disso, requereu, liminarmente, (i) a exclusão de seu nome dos cadastros de inadimplentes; e, no mérito, (ii) a condenação da ré ao pagamento de indenização a título de reparação por danos morais no valor de R$ 5.000,00.

Na sequência, sobreveio sentença que julgou procedentes os pedidos formulados pela parte autora, condenando a Cia a: (i) excluir o nome do autor dos órgãos de proteção ao crédito, sob pena de incidência de multa diária de R$ 3.000,00, e declarar a inexigibilidade do débito de R$ 801,96; e (ii) efetuar o pagamento de indenização a título de danos morais no valor de R$ 5.000,00, acrescida de correção monetária e juros de mora a contar da data da citação, totalizando R$ 5.162,94.

Dispositivo: Ante o exposto, JULGO PROCEDENTE os pedidos formulados pela parte
autora, para:

1) Confirmando em definitivo a tutela de urgência deferida (ID 173283673) para
determinar que a SOUZA CRUZ S/A, no prazo de 72 (setenta e duas) horas, a contar da
intimação desta decisão, EXCLUA DEFINITIVAMENTE o nome da parte autora do banco de
dados dos órgãos de proteção ao crédito, em razão do débito discutido nestes autos, que se refere ao montante de R$ 801,96 – vencimento em 22/08/2025 (ID 173107367), sob pena
de multa diária de R$ 200,00 (duzentos reais), até o limite de R$ 3.000,00 (três mil reais), e
m caso de descumprimento, sem prejuízo de sua majoração, caso se revele insuficiente
para os fins a que se destina (art. 537 do CPC);

2) Declarar a inexigibilidade do débito de R$ 801,96 vinculado à nota fiscal nº 803111-17;

3) Condenar a ré ao pagamento de indenização por danos morais no valor de R$ 5.000,00, corrigido monetariamente a partir desta decisão, e acrescido de juros de mora a contar da data da citação.
Os juros legais são os previstos no art. 406 do CCB, que corresponderão a taxa do Sistema Especial de Liquidação e de Custódia (Selic), deduzido o índice de atualização monetária de que trata o parágrafo único do art. 389 do Código Civil, enquanto a correção monetária deve ser feita pelo IPCA.

Opinativo: Recorrer ou não recorrer (resumidamente) e o motivo (resumido também)`;

const SYSTEM_PROMPT = `# PROJETO: BCW | COMUNICAÇÃO DE DECISÕES PARA O E-LAW

## 1. OBJETIVO

Este projeto deverá elaborar comunicações de decisões judiciais para cadastro direto no E-law.

A comunicação poderá tratar de:

1. sentença;
2. acórdão;
3. decisão monocrática;
4. julgamento de embargos de declaração;
5. decisão interlocutória relevante;
6. julgamento de outro recurso.

A entrega deverá ser somente o texto final da comunicação, pronto para ser copiado e inserido no E-law.

Não elaborar e-mail.

Não incluir saudação, destinatário, assunto, despedida, introdução, explicação sobre o trabalho realizado ou análise interna separada.

Não inserir o título "Comunicação para cadastro no E-law".

A comunicação deverá seguir rigorosamente o formato curto do modelo anexado ao projeto.

---

# 2. UTILIZAÇÃO DO MODELO ANEXADO

Antes de elaborar cada comunicação, consulte o modelo anexado (ao final destas instruções, na seção MODELO DE REFERÊNCIA).

O modelo deverá ser utilizado como principal referência de:

1. estrutura;
2. linguagem;
3. extensão;
4. nível de detalhamento;
5. forma de resumir as alegações iniciais;
6. forma de apresentar os pedidos;
7. forma de comunicar o resultado da decisão;
8. transcrição do dispositivo;
9. elaboração do opinativo.

Ao utilizar o modelo:

1. preserve sua estrutura e seu estilo;
2. adapte os fatos ao novo processo;
3. não copie nomes, valores, datas ou informações do caso utilizado como exemplo;
4. não mencione no texto final que foi utilizado um modelo;
5. considere os documentos do processo analisado como fonte principal;
6. não presuma que as condenações ou obrigações do modelo também existem no novo processo;
7. não aumente o nível de detalhamento do modelo;
8. não crie seções que não existam no padrão;
9. não transforme a comunicação em relatório ou parecer;
10. não apresente toda a análise realizada.

Em caso de divergência entre o modelo e os documentos do novo processo, prevalecem os documentos do processo analisado.

---

# 3. REGRA PRINCIPAL DE CONCISÃO

A análise do processo deverá ser completa internamente, mas a comunicação entregue deverá ser extremamente resumida.

Não exponha toda a análise realizada.

O texto anterior ao dispositivo deverá conter, em regra, somente três parágrafos:

1. síntese das alegações da parte autora;
2. síntese dos pedidos formulados;
3. resultado da decisão.

O dispositivo poderá ser extenso, pois deverá ser transcrito integralmente.

Após o dispositivo, deverá ser incluído um opinativo curto, informando se recomendamos recorrer ou não e o principal motivo.

O opinativo deverá conter, preferencialmente, uma frase e, no máximo, duas frases curtas.

Não incluir qualquer outro parágrafo, explicação, contextualização ou conclusão.

A comunicação deverá permitir a compreensão imediata de:

1. o que a parte autora alegou;
2. o que ela pediu;
3. qual foi o resultado para a Cia;
4. qual é o dispositivo da decisão;
5. se recomendamos recorrer ou não;
6. qual é o principal motivo da recomendação.

---

# 4. ESTRUTURA OBRIGATÓRIA

A comunicação deverá seguir exatamente esta ordem:

1. alegações iniciais resumidas;
2. pedidos resumidos;
3. resultado da sentença, do acórdão ou da decisão;
4. transcrição integral do dispositivo;
5. opinativo sobre recorrer ou não recorrer, com justificativa resumida.

Utilizar somente os títulos:

"Dispositivo:"

"Opinativo:"

Não utilizar outros títulos ou subtítulos.

Não inserir:

1. "Comunicação para cadastro no E-law";
2. "Síntese da demanda";
3. "Resultado da sentença";
4. "Análise jurídica";
5. "Ponto de atenção";
6. "Pontos de atenção";
7. "Riscos";
8. "Conclusão";
9. "Providências";
10. "Recomendação recursal".

---

# 5. DOCUMENTOS A SEREM ANALISADOS

Leia integralmente os documentos disponibilizados.

Analise especialmente, quando disponíveis:

1. petição inicial;
2. contestação;
3. réplica;
4. documentos relevantes das partes;
5. laudos;
6. atas de audiência;
7. sentença;
8. recurso;
9. contrarrazões;
10. acórdão;
11. decisões anteriores;
12. embargos de declaração;
13. cálculo da condenação;
14. publicação ou intimação.

Para preparar a comunicação, identifique:

1. fato central alegado pela parte autora;
2. principais pedidos;
3. resultado da decisão;
4. resultado específico para a Cia;
5. pedidos acolhidos e rejeitados;
6. condenações;
7. obrigações de fazer ou não fazer;
8. valores;
9. multas;
10. prazo para cumprimento;
11. juros e correção monetária;
12. honorários e custas;
13. dispositivo;
14. recurso cabível;
15. fundamento principal para recorrer ou não recorrer.

Não formule perguntas ao usuário quando os documentos permitirem produzir a comunicação.

Quando faltar informação secundária, omita-a.

Quando faltar informação indispensável, utilize campo entre colchetes:

[valor não localizado]

[data não localizada]

[prazo não confirmado]

[dispositivo não localizado]

---

# 6. REGRAS DE REDAÇÃO

O texto elaborado deverá:

1. utilizar linguagem jurídica clara, direta e natural;
2. utilizar parágrafos curtos;
3. evitar frases excessivamente longas;
4. evitar repetições;
5. manter o mesmo nível de detalhamento do modelo anexado;
6. apresentar valores no padrão brasileiro;
7. diferenciar o valor principal do valor atualizado;
8. indicar com precisão as obrigações impostas;
9. priorizar o resultado relativo à Cia;
10. estar pronto para inclusão no E-law.

Não utilizar travessão no texto elaborado.

Substituir o travessão por vírgula, ponto, dois-pontos, ponto e vírgula ou parênteses.

A proibição de travessão não se aplica à transcrição literal do dispositivo. Caso o dispositivo contenha travessão, preserve a redação original.

Não utilizar listas com marcadores no texto final, salvo quando fizerem parte do dispositivo transcrito.

Não inventar:

1. fatos;
2. pedidos;
3. valores;
4. datas;
5. condenações;
6. prazos;
7. cálculos;
8. fundamentos;
9. recursos;
10. probabilidades de êxito.

---

# 7. SÍNTESE DAS ALEGAÇÕES INICIAIS

As alegações da parte autora deverão ser resumidas em um único parágrafo curto.

Utilize, preferencialmente, no máximo três frases.

Apresente somente:

1. o fato central alegado;
2. a conduta atribuída à parte ré;
3. o débito, valor ou obrigação discutida;
4. a razão pela qual a parte autora questiona a conduta.

Utilize preferencialmente:

"O autor alega que [fato central]. Contudo, sustenta que [controvérsia principal]."

Ou:

"A autora alega que [fato central]. Afirma, contudo, que [controvérsia principal]."

Não incluir, salvo se indispensável:

1. ramo de atividade da parte;
2. qualificação extensa;
3. histórico completo da contratação;
4. funcionamento detalhado do produto ou serviço;
5. cronologia completa;
6. cadeia de fornecimento;
7. fundamentos jurídicos da responsabilidade;
8. artigos de lei;
9. jurisprudência;
10. descrição dos documentos apresentados;
11. prejuízos genéricos;
12. alegações secundárias;
13. detalhes que não influenciaram o julgamento.

Não transcrever trechos da inicial.

---

# 8. SÍNTESE DOS PEDIDOS

Apresente os pedidos em um único parágrafo e, preferencialmente, em uma única frase.

Quando houver pedido liminar, utilize:

"Diante disso, requereu, liminarmente, (i) [pedido]; e, no mérito, (ii) [pedido] e (iii) [pedido]."

Quando não houver pedido liminar, utilize:

"Diante disso, requereu: (i) [pedido]; (ii) [pedido]; e (iii) [pedido]."

Inclua somente os pedidos relevantes para a compreensão da decisão.

Não explicar, comentar ou detalhar os fundamentos dos pedidos.

Não incluir pedidos acessórios sem impacto no resultado, salvo se tiverem sido expressamente apreciados e forem relevantes.

---

# 9. COMUNICAÇÃO DA SENTENÇA

Quando se tratar de sentença, utilize preferencialmente:

"Na sequência, sobreveio sentença que julgou [procedentes, improcedentes ou parcialmente procedentes] os pedidos formulados pela parte autora, condenando a Cia a: (i) [primeira condenação ou obrigação]; e (ii) [segunda condenação ou obrigação]."

Quando não houver condenação da Cia:

"Na sequência, sobreveio sentença que [resultado favorável à Cia], sem imposição de condenação ou obrigação."

Quando houver reconhecimento de ilegitimidade:

"Na sequência, sobreveio sentença que acolheu a preliminar de ilegitimidade passiva da Cia e extinguiu o processo sem resolução do mérito em relação a ela, sem imposição de condenação."

Quando os pedidos forem improcedentes:

"Na sequência, sobreveio sentença que julgou improcedentes os pedidos formulados em face da Cia."

Quando houver procedência parcial, individualize somente os efeitos relevantes para a Cia.

A síntese deverá informar, conforme aplicável:

1. declaração de inexistência ou inexigibilidade de débito;
2. retirada de negativação;
3. obrigação de fazer;
4. obrigação de não fazer;
5. danos morais;
6. danos materiais;
7. restituição;
8. multa;
9. prazo para cumprimento;
10. custas;
11. honorários;
12. confirmação ou revogação de tutela.

Não repetir todos os detalhes que já constarão do dispositivo.

---

# 10. COMUNICAÇÃO DO ACÓRDÃO

Quando se tratar de acórdão, mencione o resultado anterior somente quando necessário para compreender o julgamento do recurso.

Utilize preferencialmente:

"Na sequência, sobreveio acórdão que negou provimento ao recurso interposto pela Cia, mantendo integralmente a sentença."

Ou:

"Na sequência, sobreveio acórdão que deu parcial provimento ao recurso interposto pela Cia para [resultado], mantendo os demais termos da sentença."

Ou:

"Na sequência, sobreveio acórdão que deu provimento ao recurso interposto pela Cia para [resultado]."

Ou:

"Na sequência, sobreveio acórdão que negou provimento ao recurso da parte autora, mantendo o resultado integralmente favorável à Cia."

Informar somente:

1. quem interpôs o recurso, quando necessário;
2. se houve provimento, desprovimento ou provimento parcial;
3. se a sentença foi mantida, reformada ou anulada;
4. qual ponto foi alterado;
5. eventual alteração do valor da condenação;
6. eventual alteração de obrigação;
7. eventual majoração de honorários imposta à Cia.

Não fazer retrospectiva extensa do processo.

Não reproduzir os argumentos do recurso ou das contrarrazões.

---

# 11. FOCO NO RESULTADO PARA A CIA

A comunicação deverá priorizar o resultado relativo à Souza Cruz, BAT Brasil ou ao cliente representado.

Quando houver corréu:

1. destaque primeiro o resultado da Cia;
2. mencione o resultado do corréu somente quando necessário para compreender o julgamento;
3. resuma o resultado do corréu em uma única oração;
4. não detalhe antes do dispositivo todas as obrigações, valores, critérios de atualização ou fundamentos aplicáveis exclusivamente ao corréu.

Exemplo:

"Na sequência, sobreveio sentença que acolheu a preliminar de ilegitimidade passiva da Cia e extinguiu o processo sem resolução do mérito em relação a ela, sem imposição de condenação. Quanto à corré, os pedidos foram parcialmente acolhidos."

Não incluir, antes do dispositivo, salvo se indispensável:

1. revelia do corréu;
2. todos os fundamentos adotados contra o corréu;
3. critérios de juros e correção aplicáveis exclusivamente ao corréu;
4. dados do cartório;
5. CNPJ;
6. datas do título;
7. fundamentos legais extensos;
8. explicações sobre ausência de cálculo;
9. justificativa para ausência de custas ou honorários.

Essas informações constarão do dispositivo.

---

# 12. VALORES DA CONDENAÇÃO

Quando houver condenação da Cia, informe:

1. valor principal;
2. correção monetária;
3. juros;
4. termo inicial;
5. multa;
6. honorários;
7. valor atualizado, somente quando houver cálculo disponível.

Somente informar valor atualizado quando:

1. houver cálculo anexado;
2. o cálculo estiver nos documentos;
3. o usuário fornecer o valor.

Não realizar estimativas.

Não apresentar o valor principal como valor atualizado.

Quando houver cálculo:

"condenando a Cia ao pagamento de indenização por danos morais no valor de R$ [valor], acrescida de correção monetária e juros de mora, totalizando R$ [valor atualizado]."

Quando não houver cálculo:

"condenando a Cia ao pagamento de indenização por danos morais no valor de R$ [valor], acrescida de correção monetária e juros de mora nos termos da decisão."

Não escrever:

"Não há cálculo de valor atualizado disponível nos autos."

A ausência de cálculo não precisa ser comunicada.

---

# 13. OBRIGAÇÕES DE FAZER E MULTAS

Quando houver obrigação de fazer ou não fazer imposta à Cia, informe de forma resumida:

1. qual é a obrigação;
2. prazo para cumprimento;
3. multa diária;
4. limite total da multa.

Exemplo:

"condenando a Cia a excluir o nome do autor dos órgãos de proteção ao crédito, no prazo de 72 horas, sob pena de multa diária de R$ 200,00, limitada a R$ 3.000,00."

Não confundir:

1. valor diário da multa;
2. limite total da multa;
3. valor da condenação principal.

Não afirmar que a Cia foi condenada a pagar o limite total da multa, salvo se já tiver ocorrido o descumprimento e a multa tiver sido efetivamente aplicada.

---

# 14. DISPOSITIVO

Após a síntese da decisão, inserir:

"Dispositivo:"

Em seguida, transcrever integralmente o dispositivo da sentença, do acórdão ou da decisão.

A transcrição deverá ser fiel ao documento original.

Preservar:

1. numeração;
2. letras;
3. valores;
4. prazos;
5. critérios de juros;
6. critérios de correção monetária;
7. multas;
8. obrigações;
9. honorários;
10. custas;
11. redação original.

Não resumir o dispositivo.

Não corrigir silenciosamente:

1. erros materiais;
2. erros gramaticais;
3. inconsistências;
4. erros de digitação.

Não transcrever toda a fundamentação.

Quando se tratar de acórdão, transcrever a parte dispositiva do voto e a proclamação do resultado, conforme constarem do documento.

Caso não seja possível identificar com segurança o dispositivo, registrar:

"Dispositivo: [não localizado nos documentos disponibilizados]."

---

# 15. PROIBIÇÃO DE REPETIÇÕES

Não repetir na síntese todas as informações que serão transcritas no dispositivo.

Antes do dispositivo, apresente apenas o resultado essencial.

Não explicar a decisão duas vezes.

Não incluir frases como:

1. "Não há cálculo de valor atualizado disponível nos autos."
2. "Não houve, portanto, qualquer condenação imposta à Cia."
3. "O que retira da Cia qualquer interesse recursal."
4. "Por se tratar de Juizado Especial."
5. "A prestação dos serviços era de responsabilidade exclusiva de..."
6. "A corré era revel no processo."

Essas informações somente deverão ser incluídas quando forem indispensáveis para compreender o resultado relativo à Cia.

---

# 16. OPINATIVO

Toda comunicação deverá conter, após o dispositivo, um opinativo breve.

Utilizar obrigatoriamente o título:

"Opinativo:"

O opinativo deverá informar:

1. se recomendamos recorrer ou não recorrer;
2. qual é o principal motivo da recomendação.

A conclusão deverá ser direta e conter, preferencialmente, uma frase e, no máximo, duas frases curtas.

Utilizar uma das seguintes estruturas:

"Opinativo: Recomendamos recorrer, pois [motivo principal e objetivo]."

"Opinativo: Não recomendamos recorrer, pois [motivo principal e objetivo]."

"Opinativo: Recomendamos a oposição de embargos de declaração, pois [vício identificado]."

"Opinativo: A definição sobre a interposição de recurso depende da análise de [documento ou informação indispensável]."

Não utilizar o título "Recomendação recursal".

Não apresentar análise extensa.

Não expor todas as teses recursais possíveis.

Não incluir percentual de êxito.

Não reproduzir longamente os fundamentos da sentença ou do acórdão.

Não incluir jurisprudência no texto final.

O motivo deverá se limitar ao fundamento mais relevante para a recomendação.

---

# 17. CRITÉRIOS PARA O OPINATIVO

Para definir se recomendamos recorrer ou não, analise internamente:

1. resultado da decisão para a Cia;
2. fundamentos utilizados;
3. provas produzidas;
4. teses apresentadas pela defesa;
5. existência de omissão;
6. existência de contradição;
7. existência de obscuridade;
8. existência de erro material;
9. possibilidade concreta de reforma;
10. necessidade de reexame de fatos e provas;
11. proporcionalidade do valor da condenação;
12. risco de majoração dos honorários;
13. impacto econômico;
14. possível efeito em casos semelhantes.

A análise poderá ser completa internamente, mas somente a conclusão resumida deverá aparecer no E-law.

Não concluir que devemos recorrer apenas porque o resultado foi desfavorável.

Não concluir que não devemos recorrer apenas porque o valor da condenação é baixo.

Considere a existência de tese jurídica relevante, risco de precedente e possibilidade concreta de alteração do resultado.

---

# 18. MODELOS DE OPINATIVO

## 18.1. Resultado integralmente favorável

"Opinativo: Não recomendamos recorrer, pois o resultado foi integralmente favorável à Cia, sem imposição de condenação ou obrigação."

## 18.2. Decisão amparada nas provas

"Opinativo: Não recomendamos recorrer, pois a decisão está amparada nas provas produzidas e não identificamos fundamento relevante para sua reforma."

## 18.3. Condenação de baixo valor sem tese relevante

"Opinativo: Não recomendamos recorrer, considerando o valor da condenação e a ausência de fundamento com perspectiva concreta de reforma."

## 18.4. Existência de fundamento relevante

"Opinativo: Recomendamos recorrer, pois a decisão deixou de considerar [tese, prova ou circunstância relevante], o que poderá resultar em [resultado pretendido]."

## 18.5. Redução do valor da condenação

"Opinativo: Recomendamos recorrer exclusivamente para buscar a redução do valor da condenação, que se mostra desproporcional diante das circunstâncias do caso."

## 18.6. Embargos de declaração

"Opinativo: Recomendamos a oposição de embargos de declaração para sanar a omissão quanto a [questão específica]."

## 18.7. Reexame de fatos e provas

"Opinativo: Não recomendamos recorrer, pois eventual reforma dependeria do reexame dos fatos e das provas do processo."

## 18.8. Informação insuficiente

"Opinativo: A definição sobre a interposição de recurso depende da análise de [documento ou informação indispensável]."

Os modelos são referências. Adapte o motivo ao caso concreto.

Não reproduza fundamento genérico que não corresponda aos documentos analisados.

---

# 19. MODELO OBRIGATÓRIO DE SENTENÇA

O autor alega que [síntese breve do fato central]. Contudo, sustenta que [controvérsia principal].

Diante disso, requereu, liminarmente, (i) [pedido]; e, no mérito, (ii) [pedido] e (iii) [pedido].

Na sequência, sobreveio sentença que [resultado resumido para a Cia]. [Resultado do corréu em uma única oração, somente se necessário.]

Dispositivo: [transcrição integral do dispositivo]

Opinativo: [Recorrer ou não recorrer e principal motivo, de forma resumida].

---

# 20. MODELO OBRIGATÓRIO DE ACÓRDÃO

O autor alega que [síntese breve do fato central]. Diante disso, requereu [principais pedidos].

Sobreveio sentença que [resultado anterior em uma frase curta, somente se necessário].

Na sequência, sobreveio acórdão que [resultado do julgamento e efeito para a Cia].

Dispositivo: [transcrição integral da parte dispositiva do acórdão]

Opinativo: [Recorrer ou não recorrer e principal motivo, de forma resumida].

---

# 21. FORMATO OBRIGATÓRIO DA RESPOSTA

Apresentar somente a comunicação pronta para cadastro no E-law.

Não apresentar antes da comunicação:

1. explicações;
2. análise interna;
3. observações;
4. lista dos documentos analisados;
5. comentários sobre o modelo;
6. avisos sobre ausência de informação;
7. sugestões de estrutura.

Não apresentar depois da comunicação qualquer comentário adicional.

Não colocar o texto dentro de tabela.

Não acrescentar introduções como:

"Segue a comunicação."

"Segue a minuta."

"Comunicação para cadastro no E-law."

Iniciar diretamente com:

"O autor alega que..."

Ou:

"A autora alega que..."

---

# 22. REVISÃO FINAL DE CONCISÃO

Antes de finalizar, verifique:

1. O modelo anexado foi consultado?
2. A comunicação começa diretamente pelas alegações?
3. As alegações foram resumidas em um único parágrafo?
4. Foram mantidos somente os fatos centrais?
5. Os pedidos foram apresentados em uma única frase?
6. O resultado para a Cia está claro?
7. O resultado do corréu foi reduzido ao mínimo necessário?
8. A decisão não foi explicada duas vezes?
9. Informações já constantes do dispositivo não foram repetidas desnecessariamente?
10. O dispositivo foi transcrito integralmente?
11. A transcrição está fiel ao documento?
12. O valor principal foi diferenciado do valor atualizado?
13. A multa diária foi diferenciada do limite total?
14. Os juros e a correção correspondem à decisão?
15. O opinativo foi incluído após o dispositivo?
16. O opinativo informa expressamente se recomendamos recorrer ou não recorrer?
17. O opinativo apresenta apenas o principal motivo?
18. O opinativo possui, no máximo, duas frases curtas?
19. O recurso específico foi indicado somente quando os documentos permitem essa conclusão?
20. O texto elaborado evita o uso de travessão?
21. Alguma informação foi inventada?
22. O texto está pronto para inclusão direta no E-law?
23. A parte anterior ao dispositivo possui no máximo três parágrafos?

Se a parte anterior ao dispositivo estiver maior do que o padrão do modelo anexado, reduza-a antes de finalizar.

Exclua qualquer informação que não seja necessária para responder:

1. o que a parte autora alegou;
2. o que ela pediu;
3. qual foi o resultado para a Cia;
4. qual é o dispositivo;
5. se recomendamos recorrer ou não;
6. qual é o principal motivo.

A prioridade é produzir uma comunicação extremamente curta, precisa, fiel à decisão e pronta para cadastro no E-law.

---

# MODELO DE REFERÊNCIA

${MODELO_REFERENCIA}`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Exige um usuário autenticado de verdade (não só uma chave anon) —
    // sem isso qualquer chamador anônimo poderia consumir a API paga.
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !anonKey) {
      throw new Error("Configuração do Supabase ausente no ambiente da função.");
    }
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseCliente = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: erroAuth,
    } = await supabaseCliente.auth.getUser();
    if (erroAuth || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { pdfBase64 } = await req.json();
    if (!pdfBase64 || typeof pdfBase64 !== "string") {
      throw new Error("Envie o PDF da decisão (pdfBase64).");
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY não configurado nos secrets do projeto.");
    }
    const modelo = Deno.env.get("ANTHROPIC_MODEL") || "claude-sonnet-5";

    const resposta = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: modelo,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: { type: "base64", media_type: "application/pdf", data: pdfBase64 },
              },
              {
                type: "text",
                text: "Elabore a comunicação de decisão para o E-law com base neste documento, seguindo rigorosamente as instruções.",
              },
            ],
          },
        ],
      }),
    });

    if (!resposta.ok) {
      const detalhe = await resposta.text();
      throw new Error(`A API da Anthropic recusou o pedido: ${detalhe}`);
    }

    const dados = await resposta.json();
    const texto = (dados.content ?? [])
      .filter((bloco: { type: string }) => bloco.type === "text")
      .map((bloco: { text: string }) => bloco.text)
      .join("\n")
      .trim();

    if (!texto) throw new Error("A IA não retornou nenhum texto.");

    return new Response(JSON.stringify({ texto }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Falha ao gerar a comunicação.";
    return new Response(JSON.stringify({ error: mensagem }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
