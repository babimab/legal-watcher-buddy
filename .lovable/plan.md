# Nova API de processos cadastrados

## Implementação
- Criar `GET /api/public/integracao-processos` para listar processos pelo período de cadastro.
- Aceitar `data` ou o intervalo `desde`/`ate`, usando o dia atual quando nenhum filtro for informado.
- Proteger a consulta com a mesma chave enviada no cabeçalho `x-api-key` e validar formatos e intervalos antes da leitura.
- Retornar somente os campos enviados no arquivo, com respostas adequadas para chave inválida, parâmetros inválidos e falhas.

## Documentação
- Incluir a nova consulta na documentação da tela Integração, com parâmetros, campos de resposta e endereço publicado.

## Verificação
- Validar a compilação e testar respostas sem chave, com datas inválidas e com uma chave ativa.

## Detalhes técnicos
- A nova integração será um endpoint público do aplicativo, não uma nova função legada.
- A chave continuará armazenada apenas como hash; o valor recebido será comparado sem ser gravado.
