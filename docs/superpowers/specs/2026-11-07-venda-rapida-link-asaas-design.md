# Venda rápida: nome da cliente, link de cartão e aparição em /admin/pedidos

**Data:** 07/11/2026
**Estado:** spec aprovada no desenho, aguardando plano de implementação

## O problema

A venda rápida (`/admin/vendas`) atende o balcão, mas hoje:

1. **Não aparece em `/admin/pedidos`.** Ela grava em `Sale`, e a tela de pedidos lê `Order`. A lojista
   tem que olhar dois lugares para saber o que vendeu no dia.
2. **Não dá para cobrar depois.** Ou a cliente paga na hora, ou vira fiado (`conta_aberta`). Não existe
   o caso do meio — "pago no cartão, pelo link, hoje à noite".
3. **Exige cadastro de cliente para registrar um nome.** O único jeito de a venda ter nome é criar um
   `Customer` (`sales-page-client.tsx:105-108`). Para venda de balcão isso é burocracia.
4. **É irreversível, e o estoque vaza.** Não existe status `cancelada`, não existe `DELETE /sales/:id`,
   e `updateStatus` não toca em estoque (`sales.service.ts:81-91`). Venda registrada errada só se
   conserta por ajuste manual em `/estoque`, sem rastro de que foi correção.

## O que foi decidido

- Quem vende é só a lojista. **Não há conceito de vendedor** — o que se quer distinguir é *origem*
  (balcão vs. site), não pessoa.
- Em `/admin/pedidos` a venda rápida é **só leitura**. Não se cancela, não se marca enviado, não se
  estorna de lá. É painel de conferência.
- O estoque da venda com link pendente **só sai quando o pagamento cair**. Fiado é exceção explícita
  (ver "Estoque").
- CPF é **obrigatório apenas no caminho do link**.

## A restrição que define o desenho

**Não dá para gerar cobrança no Asaas sabendo só o nome.**

- `AsaasCustomerPayload.cpfCnpj` é obrigatório no tipo (`asaas/asaas.service.ts:15-20`); `createCustomer({ name })`
  não compila, e a API do Asaas também recusa.
- `createPayment` exige um `customer` id (`asaas.service.ts:44-58`), e o único jeito de obtê-lo é
  `createCustomer`.
- **Não existe** `POST /paymentLinks` no código (grep por `paymentLink`: zero resultados). O "link" que
  a loja usa é sempre o `invoiceUrl` da cobrança.

O que **não** é necessário: dados do cartão. Criar a cobrança sem `creditCard`/`creditCardHolderInfo`
devolve a fatura hospedada, onde a cliente digita o cartão sozinha. É o que a segunda via já faz com
cinco campos (`orders.service.ts:1129-1136`).

## Por que a venda rápida NÃO vira um `Order`

Registrada aqui porque é a primeira ideia que vem à cabeça e ela está errada.

| Obstáculo | Evidência |
|---|---|
| `Order` tem 14 colunas NOT NULL sem default, entre elas e-mail, telefone, CPF, CEP, cidade, rua e número | `prisma/schema.prisma:246-287` |
| `customerEmail` passa por `@IsEmail` — string vazia é recusada | `orders/dto/order.dto.ts:89-90` |
| `paymentMethod` aceita só `pix\|cartao\|boleto` — **não existe `dinheiro`** | `order.dto.ts:211-212` |
| Preço é recalculado do catálogo; `unitPrice`/`total` do corpo são ignorados → **preço negociado de balcão não é representável** | `orders.service.ts:355`, `:570-578` |
| Criar pedido dispara e-mail à cliente **com BCC para a lojista** | `orders.service.ts:632,777,784`; `email.service.ts:70-73` |
| Marcar pago/enviado dispara mais e-mail | `orders.service.ts:980-992` |
| Cron varre todo pedido `enviado` há 3 dias e manda pedido de avaliação, sem checar `pickup` nem validade do e-mail | `email/email-scheduler.service.ts:37-52` |
| Criar pedido faz upsert de `Customer` por e-mail, e `Customer.email` é `@unique` → um e-mail placeholder colaria todas as vendas de balcão no mesmo cliente | `orders.service.ts:508-563`; `schema.prisma:154` |
| `/dashboard/summary` soma `Sale.total + CustomPayment.amount + Order.total` em quatro lugares → pedido-espelho conta o faturamento **e o custo** em dobro | `dashboard/dashboard.service.ts:95-98`, `:102-105`, `:108-111`, `:114-131` |

A venda rápida continua sendo **só `Sale`**. Não há pedido-espelho. Por isso nada no dashboard precisa
mudar de fonte — só de filtro.

## Desenho

### 1. Modelo

`Sale` (`prisma/schema.prisma:179-191`) ganha cinco colunas, **todas nullable** — migration puramente
aditiva, sem backfill:

| Coluna | Para quê |
|---|---|
| `customerName String?` | nome digitado livre, **sem** criar `Customer` |
| `customerDocument String?` | CPF, só preenchido no caminho do link |
| `asaasCustomerId String?` | espelha `Order` (`schema.prisma:330`) |
| `asaasPaymentId String?` | idem; é por aqui que o webhook acha a venda |
| `asaasInvoiceUrl String?` | o link que a cliente abre |

`Sale.status` é `String` livre no schema (`:184`), então ampliar o conjunto não exige migration de enum.
Conjunto novo: `concluida | conta_aberta | aguardando_pagamento | cancelada`.

Índice em `asaasPaymentId` para a busca do webhook.

### 2. Os dois desfechos da venda

**`POST /sales` ganha `paymentLink?: boolean`.**

| Caminho | Exige | Status inicial | Estoque |
|---|---|---|---|
| **OK — pago** (`paymentLink` ausente/false) | nada além dos itens; `customerName` opcional | `concluida` (ou `conta_aberta`) | baixa na hora |
| **Gerar link** (`paymentLink: true`) | `customerName` **e** `customerDocument` | `aguardando_pagamento` | **não baixa** |

Validação do CPF é no serviço, não no DTO: é condicional a `paymentLink`, e `class-validator` fica
ilegível para isso. Mensagem de erro tem que dizer *por que* — "o Asaas não cria cobrança sem CPF" —
e não um "campo obrigatório" seco.

`conta_aberta` segue exigindo cliente vinculado. Hoje essa regra só existe no front
(`sales-page-client.tsx:123-126`) e o backend aceita conta aberta órfã via API; **mover a regra para o
serviço** junto desta mudança.

### 3. Ordem das operações no caminho do link

Espelha o checkout, mas é mais simples porque **nenhum estoque se move antes da confirmação** — não há
o que desfazer.

1. Criar `Sale` em `aguardando_pagamento`, com itens e total calculados no servidor. Preço continua
   vindo do catálogo (`sales.service.ts:55`).
2. `asaas.createCustomer({ name: customerName, cpfCnpj: onlyDigits(customerDocument) })`. E-mail e
   telefone são opcionais no Asaas e ficam de fora — a venda de balcão não os tem.
3. `asaas.createPayment({ customer, billingType: 'CREDIT_CARD', value: sale.total, dueDate: hoje + 3,
   description: 'Venda balcão', externalReference: 'sale:' + sale.id })`, mais `installmentCount` +
   `totalValue` quando `installments > 1` (parcelamento só existe em cartão — `asaas.service.ts:51-52`).
4. Gravar `asaasCustomerId`/`asaasPaymentId`/`asaasInvoiceUrl` com `updateMany` condicional, como em
   `orders.service.ts:700-708`.
5. Se o passo 2 ou 3 falhar: marcar a venda `cancelada` e devolver erro. Nada a reverter — o estoque
   não se moveu. **Não** reaproveitar o `cobrancaCriada` do checkout (`orders.service.ts:823-835`), que
   existe para o caso de cartão transparente, ausente aqui.

`PAYMENT_DUE_DAYS = 3` já existe (`orders.service.ts:28`); reusar o mesmo prazo.

### 4. Estoque

Espelha a disciplina dos pedidos, incluindo a parte que não é óbvia.

```
SALE_DEBITED_STATUSES = { 'concluida', 'conta_aberta' }
```

**`conta_aberta` debita mesmo sem pagamento.** É a exceção à regra "estoque sai no pagamento": no fiado
a peça saiu da loja. Não debitar faria a vitrine anunciar uma peça que não existe mais.

> **Revisado no plano de implementação (07/11/2026): esta janela foi descartada.** Os pedidos precisaram dela porque pedidos antigos podiam estar em `aguardando_pagamento` *já debitados*. Venda rápida nunca teve esse estado: toda venda antiga é `concluida` ou `conta_aberta`, e as duas já debitaram na criação. Com a regra nova, cancelar uma venda antiga devolve peça que de fato saiu. Para não abrir buraco, `PATCH /sales/:id/status` **não aceita** `aguardando_pagamento` (só o sistema cria esse status). O texto abaixo fica como registro do raciocínio original.

**Janela de retroatividade — obrigatória.** Toda venda rápida existente hoje debitou na criação. Se
`holdsStock` passar a valer para elas, cancelar uma venda antiga **credita estoque que nunca saiu**.
O lado dos pedidos já viveu isso e resolveu com uma constante de data
(`DEBIT_ON_PAYMENT_SINCE`, `orders.service.ts:49`, e `holdsStock` em `:238-245`). Replicar:

A constante recebe o instante do deploy desta mudança, fixado no código como data literal — mesma
convenção de `STOCK_TRACKED_SINCE` (`orders.service.ts:35`) e `DEBIT_ON_PAYMENT_SINCE` (`:49`).
Na prática: escrever a data aproximada ao implementar e acertá-la no commit que vai para produção.

```
SALE_DEBIT_ON_PAYMENT_SINCE = new Date('<data do deploy>')

holdsStock(sale, status):
  if sale.createdAt < SALE_DEBIT_ON_PAYMENT_SINCE:
    return status !== 'cancelada'     // nasceu debitando na criação
  return SALE_DEBITED_STATUSES.has(status)
```

Transição de status move estoque só quando o lado muda:

| antes | depois | ação |
|---|---|---|
| não segura | segura | debitar |
| segura | não segura | devolver |
| igual | igual | nada |

**Venda acima do estoque na confirmação.** Consequência direta de "estoque só quando pagar": entre
gerar o link e o pagamento cair, a peça pode ter sido vendida no site. O pagamento é real e não se
recusa. A regra já está decidida e documentada do lado dos pedidos (`orders.service.ts:210-227`):
debita a quantidade **inteira**, deixa o saldo negativo e grita no log. Zerar seria errado porque a
devolução credita `quantity` cheio e a loja passaria a anunciar peças inexistentes. **Reusar
`syncStock` com `quandoFalta: 'negativar'`** em vez de escrever lógica nova.

`SaleItem` aponta direto para `productVariantId` (`schema.prisma:197`), e o `syncStock` dos pedidos
resolve a variação por `productId+color+size` (`orders.service.ts:182-185`). São assinaturas diferentes:
extrair a movimentação para um helper compartilhado que receba `{ variantId, quantity, label }`, ou
duplicar o laço nas vendas. **Decidir no plano, depois de ler as duas versões** — não adivinhar aqui.

### 5. Cancelar venda rápida (Bug 1)

`UpdateSaleStatusDto` (`sales/dto/sale.dto.ts:47-50`) passa a aceitar `cancelada`. `updateStatus` passa
a mover estoque pela tabela de transição acima, dentro de `$transaction`.

Vem quase de graça: o status `cancelada` é exigido pelo fluxo do link de qualquer forma.

### 6. Webhook

Hoje só sabe achar `Order` — `WebhooksModule` injeta apenas `OrdersService`
(`webhooks/webhooks.controller.ts:29`).

- `WebhooksModule` passa a importar `SalesModule`; o controller injeta `SalesService`.
- **Despacho por prefixo do `externalReference`.** `'sale:' + id` para vendas; pedidos continuam
  mandando o `order.id` cru. Prefixo em vez de "tenta pedido, senão tenta venda" porque não se deve
  depender de cuid de `Order` e de `Sale` nunca colidirem.
- **Fallback por `asaasPaymentId`**, para eventos cujo `externalReference` não volte: procura pedido;
  não achando, procura venda.
- `PAYMENT_CONFIRMED` / `PAYMENT_RECEIVED` → `SalesService.markPaidByAsaasPaymentId`.
- `PAYMENT_OVERDUE` / `PAYMENT_REFUNDED` / `PAYMENT_DELETED` / `PAYMENT_CHARGEBACK_REQUESTED` →
  `SalesService.markCancelledByAsaasPaymentId`.

**A trava de idempotência é a parte crítica.** `updateMany` condicional, transicionando **só** a partir
de `aguardando_pagamento`:

```
updateMany({ where: { id, status: 'aguardando_pagamento' }, data: { status: 'concluida' } })
count === 0  →  outro evento ganhou a corrida, ou a venda foi cancelada. Desistir sem efeito.
count === 1  →  debitar estoque na mesma transação.
```

Sem isso, o `PAYMENT_RECEIVED` do cartão — que marca a **liquidação** do dinheiro e chega ~30 dias
depois, uma vez por parcela no parcelado — ressuscita uma venda já cancelada e debita estoque de novo.
É exatamente o bug que a correção pendente em `orders.service.ts:1241-1246` conserta do lado dos
pedidos. **Essa correção precisa ser commitada antes** (ver "Trabalho adjacente").

No cancelamento, guarda espelhada de `orders.service.ts:1309-1315`: venda já `concluida` não é
cancelada por evento de vencimento. Desfazer venda paga é decisão de gente, não de webhook.

### 7. `GET /sales` ganha filtros

Para a aba e a busca de `/admin/pedidos` funcionarem igual nas duas fontes, `GET /sales` passa a
aceitar `status`, `q` (busca em `customerName`) e `limit`, espelhando `FindOrdersQueryDto`
(`orders/dto/order.dto.ts:241-255`). Hoje `findAll` devolve **tudo**, com itens e produtos aninhados
(`sales.service.ts:9-17`).

### 8. Tela `/admin/vendas`

- **Campo "Nome da cliente"**: texto livre que grava `customerName`, sem criar `Customer`. É o
  "simplificar" pedido. O seletor de cliente existente **continua**, porque `conta_aberta` precisa dele.
- **Dois botões de fechamento** no lugar do único atual: `✅ OK — pago` e `🔗 Gerar link de cartão`.
- **Campo CPF revelado só ao escolher "Gerar link"**, com validação de dígitos e a mensagem explicando
  a exigência do Asaas.
- **Painel de recibo** (já existe, `sales-page-client.tsx:46`) passa a mostrar o `asaasInvoiceUrl` com
  botão de copiar e de mandar no WhatsApp. O helper de WhatsApp dos pedidos
  (`orders-page-client.tsx:91-101`) exige telefone; aqui o telefone pode não existir — **o botão de
  WhatsApp só aparece quando há telefone**, e o de copiar sempre.

### 9. Tela `/admin/pedidos`

- Segundo fetch em `/sales`, intercalado com `/orders` por `createdAt desc`. A lista hoje não tem
  paginação nem agrupamento (`orders.service.ts:161`); a intercalação é no cliente.
- **Selo `VENDA RÁPIDA`** na linha colapsada. Hoje nenhum campo de origem é renderizado
  (`orders-page-client.tsx:551-565`), então sem o selo as duas ficariam indistinguíveis.
- **Detalhe enxuto**: nome, forma de pagamento, itens, total e o link do Asaas se houver.
  Suprimidos: contato, avaliação, entrega, cupom, rastreio, e todas as ações. Não é zelo estético — os
  helpers produzem `CPF: undefined` (`:197-205`, `:362-368`) e `wa.me/?text=` inválido (`:99`, `:127`)
  quando os campos faltam, e o botão de estornar sempre falha com
  `BadRequestException` (`orders.service.ts:880-884`).
- **Mapa de status para as abas existentes** (`:29-35`): `aguardando_pagamento`→Aguardando,
  `concluida`→Pagos, `cancelada`→Cancelados, e **`conta_aberta`→Aguardando**. Fiado não é venda paga:
  o dinheiro não entrou. É o mesmo agrupamento que o dashboard já faz, juntando `conta_aberta` com
  pedido `aguardando_pagamento` em "contas abertas" (`dashboard.service.ts:140-146`).
- `PAYMENT_LABEL` (`:23-27`) cobre só pix/cartao/boleto; **acrescentar `dinheiro`**, que existe em
  vendas (`sale.dto.ts:28`) e não em pedidos.

### 10. Quatro filtros que passam a faltar

Não é opcional: os status novos vazam para telas que hoje não filtram status nenhum.

| Onde | O que acontece sem o filtro | Linha |
|---|---|---|
| `/fiscal` | emite "NFC-e simulada" para toda venda, inclusive não paga e cancelada | `admin/src/app/fiscal/page.tsx:21`, `:56` |
| `/contas`, aba Parceladas | filtra só `installments > 1`; venda cancelada aparece como conta aberta | `accounts-page-client.tsx:30` |
| Dashboard, card Parceladas | mesmo filtro sem status | `dashboard.service.ts:53` |
| Dashboard, Contas abertas | venda com link pendente **deveria** entrar — é "dinheiro prometido que ainda não entrou", como diz o comentário em `:140-142` — e hoje não entraria | `dashboard.service.ts:140-146` |

**Faturamento e caixa estão a salvo sem mudança**: `allSales` e `monthSales` já filtram
`status: 'concluida'` (`dashboard.service.ts:45`, `:47-50`), então os status novos ficam fora do dinheiro
automaticamente.

## Trabalho adjacente aprovado

### Commitar a correção pendente do Asaas

A árvore tem `apps/api/src/orders/orders.service.ts` modificado (a trava por `DEBITED_STATUSES` em vez
de `status === 'pago'`) e `apps/api/src/orders/asaas-pagamento-idempotencia.spec.ts` não versionado.
**Commitar antes de começar** — o fluxo novo depende da mesma trava, e deixá-la fora do git arrisca
perdê-la.

### Bug 2 — reimportar catálogo apaga todo o histórico de vendas

`products/products.service.ts:376` roda `tx.sale.deleteMany({})` dentro de `replaceCatalog`: apaga
**todas** as vendas, não só as dos produtos substituídos, e sem devolver estoque.

É independente desta feature. O conserto não é só remover a linha — `SaleItem` tem FK para
`ProductVariant` (`schema.prisma:198-199`), e apagar variações com venda referenciada viola a
constraint. O próprio serviço já recusa apagar variação (`:188-197`) e produto (`:238-244`) com venda,
o que indica que `replaceCatalog` é a exceção incoerente.

**Direção**: `replaceCatalog` para de apagar vendas e passa a recusar, nomeando o que trava, quando a
substituição removeria variação com venda registrada. **Ler `replaceCatalog` inteiro antes de fechar o
conserto** — a interação com estoque e com o fluxo de importação não foi investigada nesta spec.

## Testes

Seguindo o padrão de `apps/api/src/orders/asaas-pagamento-idempotencia.spec.ts`.

**Estoque e status**
- venda `concluida` debita na criação (não regredir o comportamento atual)
- venda com `paymentLink` **não** debita na criação
- confirmação do webhook debita uma vez
- dois eventos do mesmo pagamento debitam **uma** vez
- `PAYMENT_RECEIVED` atrasado em venda `cancelada` não ressuscita nem debita
- cancelar venda `concluida` devolve estoque
- cancelar venda `aguardando_pagamento` não devolve nada
- venda criada **antes** de `SALE_DEBIT_ON_PAYMENT_SINCE`, ao ser cancelada, devolve estoque uma vez —
  e não duas
- confirmação com estoque insuficiente deixa saldo negativo e loga, sem recusar o pagamento

**Validação**
- `paymentLink: true` sem `customerDocument` → erro citando a exigência do Asaas
- `paymentLink: true` sem `customerName` → erro
- `conta_aberta` sem `customerId` → erro (regra movida do front)
- `OK — pago` sem nome nenhum → sucesso

**Asaas**
- falha no `createCustomer` deixa a venda `cancelada` e não move estoque
- `installments > 1` manda `installmentCount` + `totalValue`
- `externalReference` sai como `sale:<id>`

**Webhook**
- `externalReference` com prefixo `sale:` cai no `SalesService`, sem prefixo cai no `OrdersService`
- evento sem `externalReference` acha a venda por `asaasPaymentId`
- evento de pagamento inexistente loga e não derruba a requisição

## Fora de escopo

- Vendedor/comissão — não há conceito de vendedor neste negócio.
- Editar itens ou valores de venda já registrada.
- Marcar venda de balcão como enviada/entregue, etiqueta, rastreio.
- Regerar ou reenviar link expirado (equivalente a `ensureOpenPayment`). `asaasInvoiceUrl` fica gravado
  e a tela mostra de novo; isso basta até provar que não.
- Model de parcela, vencimento, pagamento parcial ou saldo devedor por cliente. Hoje "conta aberta" é
  só `Sale.status`, e quitar não registra data nem valor (`accounts-page-client.tsx:38`).
- Renderizar `customer.sales` em `/clientes/[id]`, que a API já devolve e a tela descarta
  (`customers.service.ts:28`; `app/clientes/[id]/page.tsx:41-56`).
