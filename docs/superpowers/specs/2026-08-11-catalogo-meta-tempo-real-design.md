# Catálogo do Meta sincronizado com o estoque, em tempo real

Data: 11/08/2026 · Loja NO EXCUSE (`mlemosss/Ecommerce-nx`)

## Problema

O catálogo do Meta hoje só é atualizado quando alguém clica em **Sincronizar** na
tela `/admin/meta`. Entre um clique e outro, o anúncio continua oferecendo peça
que já acabou — o cliente clica, chega na loja e encontra "esgotado". Isso queima
verba de anúncio e frustra quem veio pelo anúncio.

O objetivo é que a disponibilidade no Meta acompanhe o estoque real em segundos.

## Escopo

**Dentro:** empurrar mudanças de estoque, preço, promoção e disponibilidade para
o Meta assim que acontecem; reconciliação periódica que corrige divergências;
visibilidade do estado da sincronização no painel.

**Fora:** aprovação de Loja no Instagram/Facebook (Commerce Manager), verificação
de domínio e checkout dentro do Instagram. Nada disso é necessário para alimentar
anúncio, que é o objetivo imediato.

## Abordagem escolhida

Push por evento **mais** reconciliação periódica.

Foram consideradas três opções:

1. **Só push por evento** — tempo real, mas uma falha pontual deixa o item
   desatualizado indefinidamente.
2. **Só feed puxado pelo Meta** — robusto e autocorretivo, mas a frequência
   mínima de leitura do Meta é horária: não atende "tempo real".
3. **Push + reconciliação** — escolhida. O push resolve o minuto a minuto; a
   reconciliação conserta o que falhou, sem ninguém perceber.

## Arquitetura

Um serviço novo, `MetaSyncService`, com uma responsabilidade única: traduzir
"estes produtos mudaram" numa chamada ao Meta.

- `productsChanged(productIds: string[])` — push pontual.
- `syncAll()` — reconciliação; é o `syncProducts` que já existe.

Os pontos do sistema que mudam estoque ou preço **não conhecem o Meta**. Eles
chamam o notificador e seguem. Isso mantém a integração fora do caminho crítico
da venda e concentra a lógica de catálogo num lugar só.

## Gatilhos

| Origem | Evento |
|---|---|
| `orders.service` → `syncStock` | pagamento confirmado, cancelamento, exclusão de pedido |
| `products.service` → `updateVariantStock` | edição de estoque no painel |
| `products.service` → `setSale` | entrada ou saída de promoção |
| `products.service` → `update` / `create` / `remove` | preço, foto, nome, ativo/inativo |

Cada operação agrupa os produtos afetados e dispara **uma** chamada. Um pedido
com três peças do mesmo produto gera um envio, não três.

## Conteúdo enviado

Mesmo formato do sync completo — `items_batch`, um item por variação:

- `id` = id da variação, `item_group_id` = id do produto
- `image_link` (obrigatório; produto sem foto é pulado e reportado)
- `price` cheio e `sale_price` quando em promoção
- `availability` e `inventory` por variação
- `link` para a página do produto

Produto inativo ou apagado é enviado com `method: DELETE`, para sair do anúncio.

O preço usa a mesma função `effectivePrice` que o catálogo da loja e a cobrança
do pedido — vitrine, anúncio e cobrança não podem divergir.

## Comportamento em falha

**O Meta nunca derruba uma venda.** O push é disparado e esquecido: erro vai para
o log e para ali, sem subir para o checkout nem para o painel. Sem repetição
imediata — insistir seguraria a requisição do cliente.

Sem `META_ACCESS_TOKEN` ou `META_CATALOG_ID` configurados, o notificador não faz
nada, em silêncio. O código pode subir antes de a configuração no Meta terminar.

Consequência aceita: uma falha pontual deixa **um item** desatualizado até a
próxima mudança dele. É esse buraco que a reconciliação fecha.

## Reconciliação

`syncAll()` reenvia o catálogo inteiro e corrige divergência acumulada.
Disponível no botão que já existe em `/admin/meta` desde o primeiro dia, e depois
num agendamento.

**Frequência:** o projeto está no plano **Pro** da Vercel, confirmado em
11/08/2026, então a reconciliação roda **de hora em hora** (`0 * * * *`). No
Hobby seria uma vez por dia — configurar acima do permitido faz o deploy falhar,
por isso o plano precisava ser confirmado antes.

## Visibilidade no painel

A tela `/admin/meta` passa a mostrar, além do total do catálogo:

- quando foi a última sincronização e se deu certo
- quantos itens ficaram de fora por falta de foto, com os nomes

Erro de token expirado aparece na tela em vez de morrer no log.

## Verificação

Não há suíte de testes neste repositório; a verificação é manual:

1. Mudar o estoque de uma variação no painel e confirmar, no Gerenciador de
   Comércio, que a disponibilidade daquele item muda em segundos.
2. Zerar o estoque de uma variação e confirmar que ela aparece como
   `out of stock`.
3. Colocar um produto em promoção e confirmar que o "de/por" aparece no item.
4. Desativar um produto e confirmar que ele sai do catálogo.
5. Derrubar o token de propósito e confirmar que a venda continua funcionando e
   que o erro aparece na tela de status.

## Riscos aceitos

- **Latência extra no pagamento** — mitigada pelo disparo assíncrono.
- **Limite de chamadas do Meta** — irrelevante no volume atual (10 produtos).
- **Token expirar sem aviso** — mitigado pela exibição do erro no painel.

## Pré-requisitos do lojista

- Catálogo criado no Gerenciador de Comércio, tipo e-commerce, com upload manual
- `META_ACCESS_TOKEN` de **usuário do sistema** com permissão `catalog_management`
  (token do Graph API Explorer expira e para a sincronização sem aviso)
- `META_CATALOG_ID`
- Ambos no projeto `noexcuse-api` da Vercel, com redeploy
- Fotos nas 3 peças sem imagem (Legging, Top Básico, Top Costas), senão elas não
  entram no catálogo

## Nota lateral

O plano Pro também destrava o cron de e-mails, que hoje roda uma vez por dia às
13h UTC. O lembrete de carrinho abandonado é disparado "2 horas depois", mas na
prática só sai na próxima execução diária — um carrinho abandonado às 11h recebe
o e-mail quase 24h depois, quando a pessoa já comprou em outro lugar. Passar
para `*/30 * * * *` faz o lembrete chegar na janela em que ele ainda converte.
Mudança de uma linha em `apps/api/vercel.json`, fora do escopo deste design mas
já acordada.
