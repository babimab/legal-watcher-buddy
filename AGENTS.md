<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

> [!IMPORTANT]
> ## Publicações e Diário de Justiça (DJEN)
> - A API do DJEN (`comunicaapi.pje.jus.br`) é bloqueada por país: CloudFront
>   devolve 403 para pedidos vindos de fora do Brasil, então qualquer busca
>   feita pelo servidor do app (edge function `buscar-djen`) falha nesse
>   passo. Antes de suspeitar do mapeamento de campos, confirme se a recusa é
>   geográfica.
> - O relatório diário (`relatorio-publicacoes-diario`) **não** consulta o
>   DJEN: ele resume as publicações já importadas no FaroLex
>   (`movimentacoes` com `fonte = 'publicacoes'`), com dedup por
>   `publicacoes_relatorio_enviadas` (`chave = 'mov:<id>'`). Não reintroduza
>   busca ao DJEN nessa função — ela não vai passar pela barreira de país.
> - O agendamento do relatório diário mora no `cron.job` do banco
>   (`relatorio-publicacoes-diario`, 14h UTC), com chave e segredo reais já
>   aplicados. O arquivo `supabase/migrations/20261013140007_relatorio_publicacoes_diario.sql`
>   mantém os marcadores `<ANON_KEY>` / `<MESMO_VALOR...>`: ao reaplicá-lo, o
>   job é recriado com marcadores e para de funcionar — reescreva o job com os
>   valores reais depois.
