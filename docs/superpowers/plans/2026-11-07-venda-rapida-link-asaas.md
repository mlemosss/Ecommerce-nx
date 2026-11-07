# Venda rápida: nome da cliente, link de cartão e aparição em Pedidos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A venda rápida (balcão) aceita o nome da cliente sem cadastro, fecha de dois jeitos ("OK — pago" ou link de cartão do Asaas), aparece em `/admin/pedidos` com selo e pode ser cancelada devolvendo o estoque.

**Architecture:** A venda continua sendo só `Sale` (nada de `Order` espelho: duplicaria faturamento no dashboard e dispararia e-mails). `Sale` ganha 5 colunas nulas e dois status novos; as regras de status/estoque vivem em arquivos puros testáveis (`sale-rules.ts`, `sale-stock.ts`); o webhook do Asaas passa a despachar por `externalReference` (`sale:<id>`) para o `SalesService`; `/admin/pedidos` faz um segundo fetch em `/sales` e intercala, em modo só leitura.

**Tech Stack:** NestJS 10 + Prisma 5 (Postgres/Neon) + Jest (`npx nx test api`), Next.js 15 + Tailwind (admin, sem Jest — validado por `npx nx build admin`), Asaas v3.

**Spec:** `docs/superpowers/specs/2026-11-07-venda-rapida-link-asaas-design.md`

## Desvio deliberado da spec

A spec (§4) pedia uma constante de data (`SALE_DEBIT_ON_PAYMENT_SINCE`) para proteger vendas antigas na devolução de estoque. **Este plano a descarta**, e o motivo está verificado no código: os pedidos precisaram da janela porque pedidos antigos podiam estar em `aguardando_pagamento` *já debitados*. Venda rápida nunca teve esse estado: toda venda antiga é `concluida` ou `conta_aberta`, e as duas já debitaram na criação (`sales.service.ts:50-53`). Com a regra nova (`concluida` e `conta_aberta` seguram estoque), cancelar uma venda antiga devolve peça que de fato saiu. Sem janela, sem constante para acertar no deploy. Para o desvio não virar buraco, `UpdateSaleStatusDto` **não aceita** `aguardando_pagamento` (só o sistema cria esse status).

## Global Constraints

Valores copiados da spec; toda tarefa os herda.

- A venda rápida continua sendo **só `Sale`**. Não criar `Order` nem pedido-espelho.
- Status de venda: exatamente `concluida | conta_aberta | aguardando_pagamento | cancelada`.
- `customerName` é texto livre e **não cria `Customer`**.
- CPF (`customerDocument`) é obrigatório **somente** com `paymentLink: true`. A mensagem tem que dizer o porquê: o Asaas não cria cobrança sem CPF.
- `paymentLink: true` exige `paymentMethod === 'cartao'`, `customerName` e CPF de 11 (ou 14) dígitos. Não combina com `conta_aberta`.
- Cobrança Asaas: `billingType: 'CREDIT_CARD'`, **sem** dados de cartão (a cliente digita na fatura hospedada), `externalReference: 'sale:<id>'`, vencimento hoje + `PAYMENT_DUE_DAYS = 3`, `installmentCount` + `totalValue` quando `installments > 1`.
- Estoque: `concluida` e `conta_aberta` **seguram** estoque (fiado é exceção: a peça saiu). `aguardando_pagamento` e `cancelada` não seguram. Link não debita até o pagamento cair.
- Confirmação por webhook com estoque insuficiente: debita a quantidade **inteira**, deixa o saldo **negativo** e grita no log (nunca recusa pagamento real). Criação e edição manual **recusam** estoque insuficiente.
- Trava do webhook: promover **só** a partir de `aguardando_pagamento` (`updateMany` condicional). Pagamento que chega em venda `cancelada` não ressuscita nada e vai para o log como erro (dinheiro recebido precisa de gente olhando).
- Evento de cancelamento do Asaas nunca cancela venda `concluida` (desfazer venda paga é decisão de gente).
- Webhook despacha por prefixo `sale:` no `externalReference`; sem prefixo, procura venda por `asaasPaymentId` e, não achando, segue para pedidos (comportamento atual).
- Nenhum e-mail, nenhum Purchase da Meta para venda de balcão.
- `/admin/pedidos`: venda rápida é **só leitura**, com selo `VENDA RÁPIDA`; sem endereço, etiqueta, rastreio, estorno ou folha de separação. Mapa de abas: `aguardando_pagamento` e `conta_aberta` → Aguardando; `concluida` → Pagos; `cancelada` → Cancelados; a aba Enviados não busca vendas.
- Faturamento/caixa do dashboard já filtram `status: 'concluida'` e não mudam.
- Texto de interface em pt-BR, sem emoji.

## Convenções do repositório (leia antes de editar)

- Testes da API: `npx nx test api --testPathPattern=<trecho> --skip-nx-cache`. **Não** use `npx jest` direto (quebra no tsconfig). Suíte inteira: `npx nx test api --skip-nx-cache`.
- Build: `npx nx build api` e `npx nx build admin`.
- Vários fontes são **CRLF** (`schema.prisma`, `orders.service.ts`, `coupons.service.ts`, scripts de e-mail) e outros LF. Uma troca de string de várias linhas falha se o terminador não bater. Use o helper abaixo (guarde numa pasta temporária, **não** commite):

```js
// sub.mjs — uso: node sub.mjs <arquivo> <pares.json>; pares = [{"de": "...", "para": "..."}]
// Cada "de" tem que aparecer EXATAMENTE uma vez. Preserva CRLF/LF do arquivo.
import fs from 'node:fs';
const [arquivo, pares] = process.argv.slice(2);
const bruto = fs.readFileSync(arquivo, 'utf8');
const crlf = bruto.includes('\r\n');
let s = bruto.replace(/\r\n/g, '\n');
for (const [i, { de, para }] of JSON.parse(fs.readFileSync(pares, 'utf8')).entries()) {
  const n = s.split(de).length - 1;
  if (n !== 1) { console.error(`FALHOU par ${i}: ${n} ocorrencias de:\n${de}`); process.exit(1); }
  s = s.replace(de, () => para);
}
fs.writeFileSync(arquivo, crlf ? s.replace(/\n/g, '\r\n') : s);
```

- `grep -r` na raiz trava (cache do Nx): use `git grep`.
- Mensagens de commit em português, no estilo do histórico (explicam o porquê), com o trailer `Co-Authored-By`.
- **Não faça `git push` neste plano.** O push na branch `claude/loja-roupas-academia-cpyyty` dispara deploy de produção dos três projetos; a decisão é da dona da loja (ver "Entrega" no fim).

## Estrutura de arquivos

| Arquivo | Responsabilidade | Ação |
|---|---|---|
| `apps/api/prisma/schema.prisma` | 5 colunas + índice em `Sale` | modificar |
| `apps/api/prisma/migrations/20261108120000_add_sale_quick_link_fields/migration.sql` | migration aditiva | criar |
| `apps/api/src/sales/sale-rules.ts` | status, quem segura estoque, referência `sale:<id>`, validação do pedido de venda | criar |
| `apps/api/src/sales/sale-stock.ts` | debitar/devolver estoque atomicamente | criar |
| `apps/api/src/sales/dto/sale.dto.ts` | DTOs novos | modificar |
| `apps/api/src/sales/sales.service.ts` | criar (pago/link), cancelar, webhook, listar | modificar |
| `apps/api/src/sales/sales.controller.ts` | `GET /sales` com filtros | modificar |
| `apps/api/src/sales/sales.module.ts` | provê `AsaasService` | modificar |
| `apps/api/src/webhooks/webhooks.controller.ts` + `.module.ts` | despacho para vendas | modificar |
| `apps/api/src/dashboard/dashboard.service.ts` | contas abertas e parceladas | modificar |
| `apps/api/src/products/products.service.ts` | `replaceCatalog` deixa de apagar vendas | modificar |
| `apps/api/src/sales/sale-rules.spec.ts`, `sale-stock.spec.ts`, `sales.service.spec.ts` | testes | criar |
| `apps/api/src/webhooks/webhooks.controller.spec.ts`, `dashboard/dashboard.service.spec.ts`, `products/replace-catalog.spec.ts` | testes | criar |
| `apps/admin/src/lib/types.ts` | tipos de venda | modificar |
| `apps/admin/src/lib/vendas-rapidas.ts` | rótulos, mapa de status, intercalação | criar |
| `apps/admin/src/components/venda-rapida-card.tsx` | linha de venda rápida em Pedidos | criar |
| `apps/admin/src/app/vendas/sales-page-client.tsx` | formulário (nome, CPF, dois botões, recibo com link) | modificar |
| `apps/admin/src/app/pedidos/orders-page-client.tsx` | intercala vendas | modificar |
| `apps/admin/src/app/{fiscal/page.tsx,contas/accounts-page-client.tsx,vendas/historico/sales-history-client.tsx}` | filtros de status e botão cancelar | modificar |

---

### Task 1: Schema e migration

**Files:**
- Modify: `apps/api/prisma/schema.prisma` (model `Sale`, ~linha 179)
- Create: `apps/api/prisma/migrations/20261108120000_add_sale_quick_link_fields/migration.sql`

**Interfaces:**
- Produces: colunas `Sale.customerName`, `Sale.customerDocument`, `Sale.asaasCustomerId`, `Sale.asaasPaymentId`, `Sale.asaasInvoiceUrl` (todas `String?`) e índice em `asaasPaymentId`. As tarefas seguintes as usam via Prisma Client.

- [ ] **Step 1: Editar o model `Sale`**

Crie `pares.json` e rode `node sub.mjs apps/api/prisma/schema.prisma pares.json`:

```json
[
  {
    "de": "model Sale {\n  id            String     @id @default(cuid())\n  customerId    String?\n  customer      Customer?  @relation(fields: [customerId], references: [id])\n  paymentMethod String\n  status        String     @default(\"concluida\")\n  installments  Int        @default(1)\n  total         Float\n  createdAt     DateTime   @default(now())\n  items         SaleItem[]\n\n  @@map(\"sales\")\n}",
    "para": "model Sale {\n  id            String     @id @default(cuid())\n  customerId    String?\n  customer      Customer?  @relation(fields: [customerId], references: [id])\n  // Nome digitado na hora, sem criar cadastro: a venda de balcao nao precisa de\n  // `Customer`, so de saber para quem foi.\n  customerName     String?\n  // CPF, so preenchido quando a venda gera link de cartao: o Asaas nao cria\n  // cobranca sem ele.\n  customerDocument String?\n  paymentMethod String\n  // concluida | conta_aberta | aguardando_pagamento | cancelada\n  status        String     @default(\"concluida\")\n  installments  Int        @default(1)\n  total         Float\n  asaasCustomerId String?\n  // E por aqui que o webhook acha a venda.\n  asaasPaymentId  String?\n  asaasInvoiceUrl String?\n  createdAt     DateTime   @default(now())\n  items         SaleItem[]\n\n  @@index([asaasPaymentId])\n  @@map(\"sales\")\n}"
  }
]
```

- [ ] **Step 2: Criar a migration**

`apps/api/prisma/migrations/20261108120000_add_sale_quick_link_fields/migration.sql`:

```sql
-- Venda rapida com nome livre e link de cartao do Asaas. Todas as colunas sao
-- nulas: migration puramente aditiva, sem preenchimento retroativo.
ALTER TABLE "sales" ADD COLUMN     "customerName" TEXT,
ADD COLUMN     "customerDocument" TEXT,
ADD COLUMN     "asaasCustomerId" TEXT,
ADD COLUMN     "asaasPaymentId" TEXT,
ADD COLUMN     "asaasInvoiceUrl" TEXT;

CREATE INDEX "sales_asaasPaymentId_idx" ON "sales"("asaasPaymentId");
```

- [ ] **Step 3: Conferir que a migration é exatamente o que o Prisma geraria**

```bash
git show HEAD:apps/api/prisma/schema.prisma > /tmp/schema-antigo.prisma
DATABASE_URL="postgresql://x:x@localhost:5432/x" DIRECT_URL="postgresql://x:x@localhost:5432/x" \
  npx prisma migrate diff --from-schema-datamodel /tmp/schema-antigo.prisma \
  --to-schema-datamodel apps/api/prisma/schema.prisma --script
```
Expected: o SQL impresso tem os mesmos 5 `ADD COLUMN` e o `CREATE INDEX "sales_asaasPaymentId_idx"` da migration. Se divergir, ajuste a migration, não o schema.

- [ ] **Step 4: Validar e gerar o client**

```bash
DATABASE_URL="postgresql://x:x@localhost:5432/x" DIRECT_URL="postgresql://x:x@localhost:5432/x" npx prisma validate --schema apps/api/prisma/schema.prisma
npx prisma generate --schema apps/api/prisma/schema.prisma
```
Expected: `The schema ... is valid` e `Generated Prisma Client`.

- [ ] **Step 5: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations/20261108120000_add_sale_quick_link_fields
git commit -m "Venda rapida ganha nome livre e campos do link de cartao do Asaas" \
  -m "Colunas nulas e indice em asaasPaymentId (o webhook acha a venda por ele). Migration aditiva, sem preenchimento retroativo." \
  -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: Regras puras de status, estoque e validação

**Files:**
- Create: `apps/api/src/sales/sale-rules.ts`
- Create: `apps/api/src/sales/sale-stock.ts`
- Test: `apps/api/src/sales/sale-rules.spec.ts`, `apps/api/src/sales/sale-stock.spec.ts`

**Interfaces:**
- Produces (`sale-rules.ts`):
  - `SALE_STATUSES: readonly ['concluida','conta_aberta','aguardando_pagamento','cancelada']`, `type SaleStatus`
  - `saleHoldsStock(status: string): boolean`
  - `stockMoveFor(from: string, to: string): 'debitar' | 'devolver' | null`
  - `SALE_REFERENCE_PREFIX = 'sale:'`, `saleReference(id: string): string`, `saleIdFromReference(ref?: string | null): string | null`
  - `parseSaleStatuses(raw?: string): SaleStatus[]`
  - `validateSaleRequest(dto): { link: boolean; customerName: string | null; documentDigits: string | null; status: SaleStatus }` (lança `BadRequestException`)
- Produces (`sale-stock.ts`):
  - `debitStock(tx: Prisma.TransactionClient, items: {productVariantId: string; quantity: number}[], onShortage: 'recusar' | 'negativar'): Promise<void>`
  - `returnStock(tx: Prisma.TransactionClient, items: {productVariantId: string; quantity: number}[]): Promise<void>`

- [ ] **Step 1: Escrever o teste das regras**

`apps/api/src/sales/sale-rules.spec.ts`:

```ts
import { BadRequestException } from '@nestjs/common';
import {
  parseSaleStatuses,
  saleHoldsStock,
  saleIdFromReference,
  saleReference,
  stockMoveFor,
  validateSaleRequest,
} from './sale-rules';

describe('saleHoldsStock', () => {
  it('concluida e conta_aberta seguram estoque (no fiado a peca ja saiu)', () => {
    expect(saleHoldsStock('concluida')).toBe(true);
    expect(saleHoldsStock('conta_aberta')).toBe(true);
  });

  it('aguardando_pagamento e cancelada nao seguram', () => {
    expect(saleHoldsStock('aguardando_pagamento')).toBe(false);
    expect(saleHoldsStock('cancelada')).toBe(false);
  });
});

describe('stockMoveFor', () => {
  it.each([
    ['aguardando_pagamento', 'concluida', 'debitar'],
    ['cancelada', 'concluida', 'debitar'],
    ['cancelada', 'conta_aberta', 'debitar'],
    ['concluida', 'cancelada', 'devolver'],
    ['conta_aberta', 'cancelada', 'devolver'],
    ['concluida', 'aguardando_pagamento', 'devolver'],
    ['conta_aberta', 'concluida', null],
    ['concluida', 'conta_aberta', null],
    ['aguardando_pagamento', 'cancelada', null],
    ['concluida', 'concluida', null],
  ])('%s -> %s = %s', (de, para, esperado) => {
    expect(stockMoveFor(de, para)).toBe(esperado);
  });
});

describe('referencia do Asaas', () => {
  it('prefixa o id da venda e le de volta', () => {
    expect(saleReference('abc123')).toBe('sale:abc123');
    expect(saleIdFromReference('sale:abc123')).toBe('abc123');
  });

  it('referencia de pedido (sem prefixo), vazia ou nula nao e de venda', () => {
    expect(saleIdFromReference('cmabc999')).toBeNull();
    expect(saleIdFromReference('')).toBeNull();
    expect(saleIdFromReference(null)).toBeNull();
    expect(saleIdFromReference(undefined)).toBeNull();
    expect(saleIdFromReference('sale:')).toBeNull();
  });
});

describe('parseSaleStatuses', () => {
  it('le lista separada por virgula e ignora o que nao e status', () => {
    expect(parseSaleStatuses('concluida, conta_aberta ,xpto')).toEqual(['concluida', 'conta_aberta']);
  });

  it('ausente ou so lixo vira lista vazia', () => {
    expect(parseSaleStatuses(undefined)).toEqual([]);
    expect(parseSaleStatuses('xpto')).toEqual([]);
  });
});

describe('validateSaleRequest', () => {
  const base = { paymentMethod: 'pix' };

  it('"OK - pago" so com itens: nome e cliente sao opcionais', () => {
    expect(validateSaleRequest(base)).toEqual({
      link: false,
      customerName: null,
      documentDigits: null,
      status: 'concluida',
    });
  });

  it('guarda o nome sem espacos nas pontas', () => {
    expect(validateSaleRequest({ ...base, customerName: '  Maria Souza ' }).customerName).toBe('Maria Souza');
  });

  it('conta em aberto exige cliente vinculado (regra que so existia no front)', () => {
    expect(() => validateSaleRequest({ ...base, status: 'conta_aberta' })).toThrow(
      /Selecione um cliente/
    );
    expect(validateSaleRequest({ ...base, status: 'conta_aberta', customerId: 'c1' }).status).toBe(
      'conta_aberta'
    );
  });

  describe('link de pagamento', () => {
    const link = { paymentMethod: 'cartao', paymentLink: true, customerName: 'Maria', customerDocument: '123.456.789-09' };

    it('valido: aguarda pagamento e guarda so os digitos do CPF', () => {
      expect(validateSaleRequest(link)).toEqual({
        link: true,
        customerName: 'Maria',
        documentDigits: '12345678909',
        status: 'aguardando_pagamento',
      });
    });

    it('sem CPF, a mensagem explica que o Asaas exige', () => {
      const erro = () => validateSaleRequest({ ...link, customerDocument: undefined });
      expect(erro).toThrow(BadRequestException);
      expect(erro).toThrow(/CPF/);
      expect(erro).toThrow(/Asaas/);
    });

    it('CPF curto demais e recusado', () => {
      expect(() => validateSaleRequest({ ...link, customerDocument: '123' })).toThrow(/CPF/);
    });

    it('aceita CNPJ (14 digitos)', () => {
      expect(validateSaleRequest({ ...link, customerDocument: '12.345.678/0001-95' }).documentDigits).toBe(
        '12345678000195'
      );
    });

    it('sem nome e recusado', () => {
      expect(() => validateSaleRequest({ ...link, customerName: '   ' })).toThrow(/nome da cliente/);
    });

    it('so para cartao', () => {
      expect(() => validateSaleRequest({ ...link, paymentMethod: 'pix' })).toThrow(/cartão/);
    });

    it('nao combina com conta em aberto', () => {
      expect(() => validateSaleRequest({ ...link, status: 'conta_aberta', customerId: 'c1' })).toThrow(
        /conta em aberto/
      );
    });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx nx test api --testPathPattern=sale-rules --skip-nx-cache`
Expected: FAIL (`Cannot find module './sale-rules'`).

- [ ] **Step 3: Implementar `sale-rules.ts`**

```ts
import { BadRequestException } from '@nestjs/common';

export const SALE_STATUSES = [
  'concluida',
  'conta_aberta',
  'aguardando_pagamento',
  'cancelada',
] as const;
export type SaleStatus = (typeof SALE_STATUSES)[number];

/**
 * A peca ja saiu da loja: o estoque esta debitado.
 *
 * `conta_aberta` entra de proposito. No fiado a cliente levou a peca sem pagar;
 * nao debitar faria a vitrine anunciar o que nao existe mais. Ja a venda com
 * link (`aguardando_pagamento`) nao segura nada: enquanto o pagamento nao cai,
 * a peca continua disponivel para outra pessoa.
 */
const HOLDS_STOCK = new Set<string>(['concluida', 'conta_aberta']);

export function saleHoldsStock(status: string): boolean {
  return HOLDS_STOCK.has(status);
}

export type StockMove = 'debitar' | 'devolver' | null;

/** Movimenta estoque so quando a venda passa de um lado para o outro. */
export function stockMoveFor(from: string, to: string): StockMove {
  const before = saleHoldsStock(from);
  const after = saleHoldsStock(to);
  if (!before && after) return 'debitar';
  if (before && !after) return 'devolver';
  return null;
}

/**
 * `externalReference` das cobrancas de venda. Pedidos mandam o id cru; o
 * prefixo evita depender de um cuid de Order e um de Sale nunca colidirem.
 */
export const SALE_REFERENCE_PREFIX = 'sale:';

export function saleReference(id: string): string {
  return `${SALE_REFERENCE_PREFIX}${id}`;
}

export function saleIdFromReference(reference?: string | null): string | null {
  if (!reference?.startsWith(SALE_REFERENCE_PREFIX)) return null;
  return reference.slice(SALE_REFERENCE_PREFIX.length) || null;
}

/** `?status=a,b` da listagem: ignora o que nao for status de venda. */
export function parseSaleStatuses(raw?: string): SaleStatus[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s): s is SaleStatus => (SALE_STATUSES as readonly string[]).includes(s));
}

export interface SaleRequestFields {
  customerId?: string;
  customerName?: string;
  customerDocument?: string;
  paymentMethod: string;
  status?: string;
  paymentLink?: boolean;
}

export interface ValidatedSaleRequest {
  link: boolean;
  customerName: string | null;
  documentDigits: string | null;
  status: SaleStatus;
}

/**
 * Regras do pedido de venda que dependem de mais de um campo.
 *
 * Ficam aqui e nao no DTO porque sao condicionais a `paymentLink`, e
 * class-validator fica ilegivel para isso. Cada mensagem diz o que a lojista
 * precisa fazer, nao so o que esta errado.
 */
export function validateSaleRequest(dto: SaleRequestFields): ValidatedSaleRequest {
  const customerName = dto.customerName?.trim() || null;

  if (dto.paymentLink === true) {
    if (dto.paymentMethod !== 'cartao') {
      throw new BadRequestException(
        'O link de pagamento é só para cartão. Escolha "Cartão" como forma de pagamento.'
      );
    }
    if (dto.status === 'conta_aberta') {
      throw new BadRequestException(
        'Link de pagamento e conta em aberto não combinam: escolha um dos dois.'
      );
    }
    if (!customerName) {
      throw new BadRequestException('Informe o nome da cliente para gerar o link de pagamento.');
    }
    const digits = (dto.customerDocument ?? '').replace(/\D/g, '');
    if (digits.length !== 11 && digits.length !== 14) {
      throw new BadRequestException(
        'Informe o CPF da cliente (11 números). O Asaas não cria cobrança sem CPF.'
      );
    }
    return { link: true, customerName, documentDigits: digits, status: 'aguardando_pagamento' };
  }

  const status = (dto.status ?? 'concluida') as SaleStatus;
  if (status === 'conta_aberta' && !dto.customerId) {
    throw new BadRequestException('Selecione um cliente para deixar a conta em aberto.');
  }
  return { link: false, customerName, documentDigits: null, status };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx nx test api --testPathPattern=sale-rules --skip-nx-cache`
Expected: PASS, todos os casos.

- [ ] **Step 5: Escrever o teste do estoque**

`apps/api/src/sales/sale-stock.spec.ts`:

```ts
import { BadRequestException } from '@nestjs/common';
import { debitStock, returnStock } from './sale-stock';

function montar(opcoes: { count?: number; variante?: object | null } = {}) {
  const updateMany = jest.fn(async () => ({ count: opcoes.count ?? 1 }));
  const update = jest.fn(async () => ({}));
  const findUnique = jest.fn(async () =>
    opcoes.variante === undefined
      ? { id: 'v1', stock: 1, color: 'Preto', size: 'M', product: { name: 'Top Alpha' } }
      : opcoes.variante
  );
  return { tx: { productVariant: { updateMany, update, findUnique } } as never, updateMany, update, findUnique };
}

const ITENS = [{ productVariantId: 'v1', quantity: 2 }];

describe('debitStock', () => {
  it('debita de forma atomica e condicional (nao le para depois gravar)', async () => {
    const t = montar();

    await debitStock(t.tx, ITENS, 'recusar');

    expect(t.updateMany).toHaveBeenCalledWith({
      where: { id: 'v1', stock: { gte: 2 } },
      data: { stock: { decrement: 2 } },
    });
    expect(t.update).not.toHaveBeenCalled();
  });

  it('recusar: estoque insuficiente interrompe e diz qual peca', async () => {
    const t = montar({ count: 0 });

    const erro = debitStock(t.tx, ITENS, 'recusar');

    await expect(erro).rejects.toThrow(BadRequestException);
    await expect(erro).rejects.toThrow(/Estoque insuficiente para Top Alpha \(Preto\/M\)/);
    expect(t.update).not.toHaveBeenCalled();
  });

  it('negativar: pagamento real nao se recusa, debita tudo e deixa o saldo negativo', async () => {
    const t = montar({ count: 0 });

    await debitStock(t.tx, ITENS, 'negativar');

    expect(t.update).toHaveBeenCalledWith({
      where: { id: 'v1' },
      data: { stock: { decrement: 2 } },
    });
  });

  it('negativar numa variacao que nao existe mais nao derruba nada', async () => {
    const t = montar({ count: 0, variante: null });

    await expect(debitStock(t.tx, ITENS, 'negativar')).resolves.toBeUndefined();
    expect(t.update).not.toHaveBeenCalled();
  });
});

describe('returnStock', () => {
  it('devolve somando a quantidade inteira', async () => {
    const t = montar();

    await returnStock(t.tx, ITENS);

    expect(t.update).toHaveBeenCalledWith({
      where: { id: 'v1' },
      data: { stock: { increment: 2 } },
    });
  });
});
```

- [ ] **Step 6: Rodar e ver falhar**

Run: `npx nx test api --testPathPattern=sale-stock --skip-nx-cache`
Expected: FAIL (`Cannot find module './sale-stock'`).

- [ ] **Step 7: Implementar `sale-stock.ts`**

```ts
import { BadRequestException, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

type Tx = Prisma.TransactionClient;

export interface StockItem {
  productVariantId: string;
  quantity: number;
}

const logger = new Logger('SaleStock');

/**
 * Tira do estoque, de forma atomica.
 *
 * O `updateMany` condicional faz a checagem e a gravacao na mesma operacao: a
 * versao antiga lia o saldo em JavaScript e gravava `saldo - quantidade`, e
 * duas vendas da ultima peca (balcao e webhook, por exemplo) liam 1 e gravavam
 * 0 — duas pecas vendidas, saldo zero, e o negativo que denunciaria o erro
 * nunca aparecia.
 *
 * - `recusar` (venda no balcao, edicao manual): falta de estoque interrompe.
 * - `negativar` (confirmacao de pagamento do Asaas): o dinheiro ja entrou e nao
 *   se recusa. Debita a quantidade INTEIRA, deixa o saldo negativo e grita no
 *   log. Zerar em vez de negativar parecia mais limpo e nao era: a devolucao
 *   credita a quantidade cheia, e a loja passaria a anunciar pecas que nao
 *   existem. O negativo e o aviso mais honesto: "-2" quer dizer duas pecas
 *   devendo.
 */
export async function debitStock(
  tx: Tx,
  items: StockItem[],
  onShortage: 'recusar' | 'negativar'
): Promise<void> {
  for (const item of items) {
    const { count } = await tx.productVariant.updateMany({
      where: { id: item.productVariantId, stock: { gte: item.quantity } },
      data: { stock: { decrement: item.quantity } },
    });
    if (count > 0) continue;

    const variant = await tx.productVariant.findUnique({
      where: { id: item.productVariantId },
      include: { product: { select: { name: true } } },
    });
    const label = variant
      ? `${variant.product.name} (${variant.color}/${variant.size})`
      : item.productVariantId;

    if (onShortage === 'recusar') {
      throw new BadRequestException(`Estoque insuficiente para ${label}`);
    }
    if (!variant) continue;

    await tx.productVariant.update({
      where: { id: item.productVariantId },
      data: { stock: { decrement: item.quantity } },
    });
    logger.error(
      `VENDA ACIMA DO ESTOQUE: ${label} — vendidas ${item.quantity}, havia ${variant.stock}. ` +
        `Faltam ${item.quantity - variant.stock} peças para entregar esta venda.`
    );
  }
}

export async function returnStock(tx: Tx, items: StockItem[]): Promise<void> {
  for (const item of items) {
    await tx.productVariant.update({
      where: { id: item.productVariantId },
      data: { stock: { increment: item.quantity } },
    });
  }
}
```

- [ ] **Step 8: Rodar e ver passar**

Run: `npx nx test api --testPathPattern="sale-(rules|stock)" --skip-nx-cache`
Expected: PASS (2 suítes).

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/sales/sale-rules.ts apps/api/src/sales/sale-stock.ts apps/api/src/sales/sale-rules.spec.ts apps/api/src/sales/sale-stock.spec.ts
git commit -m "Regras puras da venda rapida: status, estoque atomico e validacao" \
  -m "Debito condicional (updateMany) no lugar de ler o saldo e gravar saldo menos quantidade: duas vendas da ultima peca liam 1 e gravavam 0. Confirmacao de pagamento negativa o saldo em vez de recusar dinheiro que ja entrou." \
  -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: DTOs e criação "OK — pago"

**Files:**
- Modify: `apps/api/src/sales/dto/sale.dto.ts`
- Modify: `apps/api/src/sales/sales.service.ts` (reescrita do arquivo; `findAll`/`updateStatus` continuam funcionando até as Tasks 5 e 7)
- Modify: `apps/api/src/sales/sales.module.ts`
- Test: `apps/api/src/sales/sales.service.spec.ts`

**Interfaces:**
- Consumes: `validateSaleRequest`, `debitStock` (Task 2).
- Produces:
  - `CreateSaleDto` com `customerName?`, `customerDocument?`, `paymentLink?`.
  - `UpdateSaleStatusDto.status: 'concluida' | 'conta_aberta' | 'cancelada'`.
  - `FindSalesQueryDto { status?: string; q?: string; limit?: number }`.
  - `SalesService` com construtor `(prisma: PrismaService, asaas: AsaasService)`.
  - `sales.service.spec.ts` define a função `montar()` (mocks de `prisma`, `tx`, `asaas`) que as Tasks 4–6 **reaproveitam no mesmo arquivo**.

- [ ] **Step 1: Substituir o DTO**

Reescreva `apps/api/src/sales/dto/sale.dto.ts` inteiro:

```ts
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class SaleItemDto {
  @IsString()
  productVariantId!: string;

  @IsNumber()
  @Min(1)
  quantity!: number;
}

export class CreateSaleDto {
  @IsOptional()
  @IsString()
  customerId?: string;

  /** Nome livre: nao cria cadastro de cliente. */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  customerName?: string;

  /** So com `paymentLink`: o Asaas exige CPF para criar a cobranca. */
  @IsOptional()
  @IsString()
  @MaxLength(20)
  customerDocument?: string;

  @IsIn(['pix', 'cartao', 'boleto', 'dinheiro'])
  paymentMethod!: 'pix' | 'cartao' | 'boleto' | 'dinheiro';

  @IsOptional()
  @IsIn(['concluida', 'conta_aberta'])
  status?: 'concluida' | 'conta_aberta';

  /** Gera link de cartao do Asaas em vez de fechar a venda como paga. */
  @IsOptional()
  @IsBoolean()
  paymentLink?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  installments?: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  items!: SaleItemDto[];
}

/**
 * `aguardando_pagamento` fica de fora de proposito: so o sistema cria esse
 * status (venda com link). Aceita-lo aqui deixaria uma venda ja debitada
 * "esperar pagamento" sem a peca voltar ao estoque.
 */
export class UpdateSaleStatusDto {
  @IsIn(['concluida', 'conta_aberta', 'cancelada'])
  status!: 'concluida' | 'conta_aberta' | 'cancelada';
}

export class FindSalesQueryDto {
  /** Lista separada por virgula: `concluida,conta_aberta`. */
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;
}
```

- [ ] **Step 2: Prover o `AsaasService` no módulo**

`apps/api/src/sales/sales.module.ts` (o `AsaasService` não tem dependências; `OrdersModule` e `CustomerAuthModule` já o provêm do mesmo jeito):

```ts
import { Module } from '@nestjs/common';
import { AsaasService } from '../asaas/asaas.service';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';

@Module({
  controllers: [SalesController],
  providers: [SalesService, AsaasService],
  exports: [SalesService],
})
export class SalesModule {}
```

- [ ] **Step 3: Escrever o teste da criação "OK — pago"**

Crie `apps/api/src/sales/sales.service.spec.ts`:

```ts
import { BadRequestException } from '@nestjs/common';
import { SalesService } from './sales.service';

const VARIANTE = {
  id: 'v1',
  stock: 5,
  price: null,
  color: 'Preto',
  size: 'M',
  product: { name: 'Top Alpha', price: 100 },
};

/** Mocks compartilhados por todos os describes deste arquivo. */
function montar(opcoes: { asaasConfigurado?: boolean } = {}) {
  const tx = {
    productVariant: {
      findUnique: jest.fn(async () => VARIANTE as unknown),
      updateMany: jest.fn(async () => ({ count: 1 })),
      update: jest.fn(async () => ({})),
    },
    sale: {
      create: jest.fn(async ({ data }: { data: Record<string, unknown> & { items: { create: unknown[] } } }) => ({
        id: 'sale-1',
        createdAt: new Date(),
        ...data,
        items: data.items.create,
      })),
      findUnique: jest.fn(async () => null as unknown),
      updateMany: jest.fn(async () => ({ count: 1 })),
    },
  };
  const prisma = {
    $transaction: jest.fn(async (fn: (t: unknown) => unknown) => fn(tx)),
    sale: {
      update: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'sale-1', ...data })),
      updateMany: jest.fn(async () => ({ count: 1 })),
      findFirst: jest.fn(async () => null as unknown),
      findUnique: jest.fn(async () => null as unknown),
      findMany: jest.fn(async () => [] as unknown[]),
      count: jest.fn(async () => 0),
    },
  };
  const asaas = {
    isConfigured: jest.fn(() => opcoes.asaasConfigurado ?? true),
    createCustomer: jest.fn(async () => ({ id: 'cus_1' })),
    createPayment: jest.fn(async () => ({
      id: 'pay_1',
      status: 'PENDING',
      invoiceUrl: 'https://asaas.test/i/pay_1',
    })),
  };
  const service = new SalesService(prisma as never, asaas as never);
  return { service, prisma, tx, asaas };
}

const ITEM = { productVariantId: 'v1', quantity: 2 };

describe('SalesService.create — "OK, pago"', () => {
  it('fecha como concluida e debita o estoque de forma atomica', async () => {
    const t = montar();

    const venda = await t.service.create({ paymentMethod: 'pix', items: [ITEM] });

    expect(venda).toMatchObject({ status: 'concluida', total: 200 });
    expect(t.tx.productVariant.updateMany).toHaveBeenCalledWith({
      where: { id: 'v1', stock: { gte: 2 } },
      data: { stock: { decrement: 2 } },
    });
  });

  it('o preco vem do servidor: variacao com preco proprio vale mais que o do produto', async () => {
    const t = montar();
    t.tx.productVariant.findUnique.mockResolvedValue({ ...VARIANTE, price: 159.9 });

    const venda = await t.service.create({
      paymentMethod: 'pix',
      items: [{ productVariantId: 'v1', quantity: 3 }],
    });

    expect(venda.total).toBe(479.7);
  });

  it('guarda o nome digitado sem exigir cadastro de cliente', async () => {
    const t = montar();

    await t.service.create({ paymentMethod: 'dinheiro', customerName: '  Maria Souza ', items: [ITEM] });

    const dados = t.tx.sale.create.mock.calls[0][0].data;
    expect(dados.customerName).toBe('Maria Souza');
    expect(dados.customerId).toBeUndefined();
    expect(dados.customerDocument).toBeNull();
  });

  it('sem nome nenhum tambem fecha (consumidor nao identificado)', async () => {
    const t = montar();

    await expect(t.service.create({ paymentMethod: 'pix', items: [ITEM] })).resolves.toMatchObject({
      status: 'concluida',
    });
  });

  it('conta em aberto sem cliente e recusada antes de tocar no banco', async () => {
    const t = montar();

    await expect(
      t.service.create({ paymentMethod: 'pix', status: 'conta_aberta', items: [ITEM] })
    ).rejects.toThrow(/Selecione um cliente/);
    expect(t.prisma.$transaction).not.toHaveBeenCalled();
  });

  it('fiado tambem debita (a peca ja saiu)', async () => {
    const t = montar();

    await t.service.create({ paymentMethod: 'pix', status: 'conta_aberta', customerId: 'c1', items: [ITEM] });

    expect(t.tx.productVariant.updateMany).toHaveBeenCalledTimes(1);
  });

  it('estoque insuficiente recusa e nao grava a venda', async () => {
    const t = montar();
    t.tx.productVariant.updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(t.service.create({ paymentMethod: 'pix', items: [ITEM] })).rejects.toThrow(
      /Estoque insuficiente para Top Alpha/
    );
    expect(t.tx.sale.create).not.toHaveBeenCalled();
  });

  it('variacao inexistente e recusada', async () => {
    const t = montar();
    t.tx.productVariant.findUnique.mockResolvedValueOnce(null);

    await expect(t.service.create({ paymentMethod: 'pix', items: [ITEM] })).rejects.toThrow(
      BadRequestException
    );
  });
});
```

(O projeto compila com `noUnusedLocals`: por isso este arquivo importa só `BadRequestException` agora. As Tasks 5 e 6 acrescentam os outros imports no momento em que passam a usá-los.)

- [ ] **Step 4: Rodar e ver falhar**

Run: `npx nx test api --testPathPattern=sales.service --skip-nx-cache`
Expected: FAIL (o construtor atual de `SalesService` só aceita `prisma`, e `create` não conhece nome nem `validateSaleRequest`).

- [ ] **Step 5: Reescrever `sales.service.ts` (cabeçalho + `create` pago)**

Substitua o arquivo inteiro:

```ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AsaasService } from '../asaas/asaas.service';
import { CreateSaleDto, UpdateSaleStatusDto } from './dto/sale.dto';
import { validateSaleRequest } from './sale-rules';
import { debitStock } from './sale-stock';

const SALE_INCLUDE: Prisma.SaleInclude = {
  customer: true,
  items: { include: { productVariant: { include: { product: true } } } },
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly asaas: AsaasService
  ) {}

  findAll() {
    return this.prisma.sale.findMany({ include: SALE_INCLUDE, orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string) {
    const sale = await this.prisma.sale.findUnique({ where: { id }, include: SALE_INCLUDE });
    if (!sale) throw new NotFoundException('Venda não encontrada');
    return sale;
  }

  /**
   * Le as variacoes e calcula o total NO SERVIDOR: o formulario nao envia preco.
   * `checkStock` so confere o saldo (venda com link: nada e debitado ainda).
   */
  private async priceItems(
    tx: Prisma.TransactionClient,
    items: CreateSaleDto['items'],
    checkStock: boolean
  ) {
    let total = 0;
    const itemsData: { productVariantId: string; quantity: number; unitPrice: number }[] = [];

    for (const item of items) {
      const variant = await tx.productVariant.findUnique({
        where: { id: item.productVariantId },
        include: { product: true },
      });
      if (!variant) {
        throw new BadRequestException(`Variação ${item.productVariantId} não encontrada`);
      }
      if (checkStock && variant.stock < item.quantity) {
        throw new BadRequestException(
          `Estoque insuficiente para ${variant.product.name} (${variant.color}/${variant.size})`
        );
      }
      const unitPrice = variant.price ?? variant.product.price;
      total += unitPrice * item.quantity;
      itemsData.push({ productVariantId: variant.id, quantity: item.quantity, unitPrice });
    }

    return { itemsData, total: round2(total) };
  }

  async create(dto: CreateSaleDto) {
    const request = validateSaleRequest(dto);

    return this.prisma.$transaction(async (tx) => {
      const { itemsData, total } = await this.priceItems(tx, dto.items, false);
      // Debita ANTES de gravar a venda: se faltar peca, nada fica pela metade.
      await debitStock(tx, itemsData, 'recusar');

      return tx.sale.create({
        data: {
          customerId: dto.customerId,
          customerName: request.customerName,
          customerDocument: null,
          paymentMethod: dto.paymentMethod,
          status: request.status,
          installments: dto.installments ?? 1,
          total,
          items: { create: itemsData },
        },
        include: SALE_INCLUDE,
      });
    });
  }

  async updateStatus(id: string, dto: UpdateSaleStatusDto) {
    await this.findOne(id);
    return this.prisma.sale.update({
      where: { id },
      data: { status: dto.status },
      include: SALE_INCLUDE,
    });
  }
}
```

O ramo `request.link` ainda é ignorado aqui de propósito; a Task 4 o preenche antes de qualquer deploy.

- [ ] **Step 6: Rodar e ver passar**

Run: `npx nx test api --testPathPattern=sales.service --skip-nx-cache`
Expected: PASS (8 testes).

- [ ] **Step 7: Compilar**

Run: `npx nx build api`
Expected: `webpack compiled successfully`.

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/sales/dto/sale.dto.ts apps/api/src/sales/sales.module.ts apps/api/src/sales/sales.service.ts apps/api/src/sales/sales.service.spec.ts
git commit -m "Venda rapida aceita nome livre e debita estoque de forma atomica" \
  -m "O nome nao cria Customer. A regra 'conta aberta exige cliente' passa do formulario para o servico (via API dava para abrir conta orfa). O debito deixa de ser ler-saldo-e-gravar, que perdia uma venda quando balcao e webhook liam o mesmo saldo." \
  -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: Link de cartão do Asaas

**Files:**
- Modify: `apps/api/src/sales/sales.service.ts`
- Test: `apps/api/src/sales/sales.service.spec.ts` (acrescentar um `describe`)

**Interfaces:**
- Consumes: `AsaasService.isConfigured()`, `createCustomer({ name, cpfCnpj })`, `createPayment({ customer, billingType, value, dueDate, description, externalReference, installmentCount?, totalValue? })` (`asaas.service.ts:133,140`); `saleReference` (Task 2).
- Produces: `create()` com `paymentLink: true` devolve a venda com `asaasInvoiceUrl` e `asaasPaymentId` preenchidos; a linha gravada nasce `aguardando_pagamento`.

- [ ] **Step 1: Acrescentar os testes do link**

Ao final de `sales.service.spec.ts`:

```ts
describe('SalesService.create — link de cartao', () => {
  const LINK = {
    paymentMethod: 'cartao' as const,
    paymentLink: true,
    customerName: 'Maria Souza',
    customerDocument: '123.456.789-09',
    items: [ITEM],
  };

  it('grava a venda aguardando pagamento, devolve o link e NAO debita estoque', async () => {
    const t = montar();

    const venda = await t.service.create(LINK);

    expect(t.tx.sale.create.mock.calls[0][0].data).toMatchObject({
      status: 'aguardando_pagamento',
      customerName: 'Maria Souza',
    });
    expect(venda).toMatchObject({
      asaasInvoiceUrl: 'https://asaas.test/i/pay_1',
      asaasPaymentId: 'pay_1',
    });
    expect(t.tx.productVariant.updateMany).not.toHaveBeenCalled();
    expect(t.tx.productVariant.update).not.toHaveBeenCalled();
  });

  it('guarda so os digitos do CPF na venda', async () => {
    const t = montar();

    await t.service.create(LINK);

    expect(t.tx.sale.create.mock.calls[0][0].data.customerDocument).toBe('12345678909');
  });

  it('o cliente do Asaas leva so nome e CPF (a venda de balcao nao tem e-mail nem telefone)', async () => {
    const t = montar();

    await t.service.create(LINK);

    expect(t.asaas.createCustomer).toHaveBeenCalledWith({ name: 'Maria Souza', cpfCnpj: '12345678909' });
  });

  it('a cobranca e de cartao SEM dados de cartao, com a referencia da venda e valor do servidor', async () => {
    const t = montar();

    await t.service.create(LINK);

    const payload = (t.asaas.createPayment.mock.calls[0] as unknown[])[0] as Record<string, unknown>;
    expect(payload).toMatchObject({
      customer: 'cus_1',
      billingType: 'CREDIT_CARD',
      value: 200,
      externalReference: 'sale:sale-1',
    });
    expect(payload).not.toHaveProperty('creditCard');
    expect(payload).not.toHaveProperty('installmentCount');
    expect(payload.dueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('parcelado manda installmentCount e totalValue', async () => {
    const t = montar();

    await t.service.create({ ...LINK, installments: 3 });

    expect((t.asaas.createPayment.mock.calls[0] as unknown[])[0]).toMatchObject({
      installmentCount: 3,
      totalValue: 200,
    });
  });

  it('sem CPF recusa antes de tocar no banco ou no Asaas', async () => {
    const t = montar();

    await expect(t.service.create({ ...LINK, customerDocument: undefined })).rejects.toThrow(/CPF/);
    expect(t.prisma.$transaction).not.toHaveBeenCalled();
    expect(t.asaas.createCustomer).not.toHaveBeenCalled();
  });

  it('Asaas nao configurado recusa antes de criar a venda', async () => {
    const t = montar({ asaasConfigurado: false });

    await expect(t.service.create(LINK)).rejects.toThrow(/Asaas/);
    expect(t.prisma.$transaction).not.toHaveBeenCalled();
  });

  it('estoque insuficiente na hora de gerar o link recusa (sem reservar)', async () => {
    const t = montar();
    t.tx.productVariant.findUnique.mockResolvedValueOnce({ ...VARIANTE, stock: 1 });

    await expect(t.service.create(LINK)).rejects.toThrow(/Estoque insuficiente para Top Alpha/);
    expect(t.asaas.createCustomer).not.toHaveBeenCalled();
  });

  it('falha no Asaas cancela a venda e nao mexe no estoque', async () => {
    const t = montar();
    t.asaas.createCustomer.mockRejectedValueOnce(new Error('CPF inválido'));

    await expect(t.service.create(LINK)).rejects.toThrow(/Não foi possível gerar o link.*CPF inválido/);

    expect(t.prisma.sale.updateMany).toHaveBeenCalledWith({
      where: { id: 'sale-1', status: 'aguardando_pagamento' },
      data: { status: 'cancelada' },
    });
    expect(t.tx.productVariant.updateMany).not.toHaveBeenCalled();
  });

  it('Asaas que responde sem link tambem cancela', async () => {
    const t = montar();
    t.asaas.createPayment.mockResolvedValueOnce({
      id: 'pay_1',
      status: 'PENDING',
      invoiceUrl: undefined,
    } as never);

    await expect(t.service.create(LINK)).rejects.toThrow(/não devolveu o link/);
    expect(t.prisma.sale.updateMany).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx nx test api --testPathPattern=sales.service --skip-nx-cache`
Expected: FAIL nos casos do link (o `create` ainda não tem o ramo).

- [ ] **Step 3: Implementar o ramo do link**

Rode o helper em `apps/api/src/sales/sales.service.ts` com este `pares.json`:

```json
[
  {
    "de": "import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';",
    "para": "import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';"
  },
  {
    "de": "import { validateSaleRequest } from './sale-rules';",
    "para": "import { saleReference, validateSaleRequest } from './sale-rules';"
  },
  {
    "de": "function round2(value: number): number {\n  return Math.round(value * 100) / 100;\n}\n",
    "para": "function round2(value: number): number {\n  return Math.round(value * 100) / 100;\n}\n\n/** Mesmo prazo das cobrancas de pedido do site. */\nconst PAYMENT_DUE_DAYS = 3;\n\nfunction dueDate(from = new Date()): string {\n  return new Date(from.getTime() + PAYMENT_DUE_DAYS * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);\n}\n"
  },
  {
    "de": "export class SalesService {\n  constructor(",
    "para": "export class SalesService {\n  private readonly logger = new Logger(SalesService.name);\n\n  constructor("
  },
  {
    "de": "  async create(dto: CreateSaleDto) {\n    const request = validateSaleRequest(dto);\n\n    return this.prisma.$transaction(async (tx) => {\n      const { itemsData, total } = await this.priceItems(tx, dto.items, false);\n      // Debita ANTES de gravar a venda: se faltar peca, nada fica pela metade.\n      await debitStock(tx, itemsData, 'recusar');\n\n      return tx.sale.create({\n        data: {\n          customerId: dto.customerId,\n          customerName: request.customerName,\n          customerDocument: null,\n          paymentMethod: dto.paymentMethod,\n          status: request.status,\n          installments: dto.installments ?? 1,\n          total,\n          items: { create: itemsData },\n        },\n        include: SALE_INCLUDE,\n      });\n    });\n  }",
    "para": "  async create(dto: CreateSaleDto) {\n    const request = validateSaleRequest(dto);\n\n    // Sem Asaas nao ha o que gerar: recusa antes de gravar qualquer coisa.\n    if (request.link && !this.asaas.isConfigured()) {\n      throw new BadRequestException(\n        'O Asaas não está configurado na loja, então não dá para gerar o link. Feche a venda como paga ou configure o Asaas.'\n      );\n    }\n\n    const sale = await this.prisma.$transaction(async (tx) => {\n      const { itemsData, total } = await this.priceItems(tx, dto.items, request.link);\n      // Com link NADA e debitado: a peca continua disponivel ate o pagamento cair.\n      // Sem link, debita ANTES de gravar a venda: se faltar peca, nada fica pela metade.\n      if (!request.link) await debitStock(tx, itemsData, 'recusar');\n\n      return tx.sale.create({\n        data: {\n          customerId: dto.customerId,\n          customerName: request.customerName,\n          customerDocument: request.documentDigits,\n          paymentMethod: dto.paymentMethod,\n          status: request.status,\n          installments: dto.installments ?? 1,\n          total,\n          items: { create: itemsData },\n        },\n        include: SALE_INCLUDE,\n      });\n    });\n\n    return request.link ? this.attachCharge(sale) : sale;\n  }\n\n  /**\n   * Cria a cobranca no Asaas e guarda o link na venda.\n   *\n   * Cobranca de cartao SEM `creditCard`: o Asaas devolve a fatura hospedada, onde\n   * a cliente digita o cartao sozinha. Nenhum estoque se moveu ate aqui, entao\n   * falhar e simples: cancela a venda e nao ha o que desfazer.\n   */\n  private async attachCharge(sale: {\n    id: string;\n    total: number;\n    installments: number;\n    customerName: string | null;\n    customerDocument: string | null;\n  }) {\n    let paymentId: string | undefined;\n    try {\n      const customer = await this.asaas.createCustomer({\n        name: sale.customerName as string,\n        cpfCnpj: sale.customerDocument as string,\n      });\n      const payment = await this.asaas.createPayment({\n        customer: customer.id,\n        billingType: 'CREDIT_CARD',\n        value: sale.total,\n        dueDate: dueDate(),\n        description: 'Venda balcão',\n        externalReference: saleReference(sale.id),\n        ...(sale.installments > 1\n          ? { installmentCount: sale.installments, totalValue: sale.total }\n          : {}),\n      });\n      paymentId = payment?.id;\n      if (!payment?.id || !payment.invoiceUrl) {\n        throw new Error('O Asaas não devolveu o link da cobrança.');\n      }\n\n      return await this.prisma.sale.update({\n        where: { id: sale.id },\n        data: {\n          asaasCustomerId: customer.id,\n          asaasPaymentId: payment.id,\n          asaasInvoiceUrl: payment.invoiceUrl,\n        },\n        include: SALE_INCLUDE,\n      });\n    } catch (err) {\n      const motivo = err instanceof Error ? err.message : String(err);\n      await this.prisma.sale.updateMany({\n        where: { id: sale.id, status: 'aguardando_pagamento' },\n        data: { status: 'cancelada' },\n      });\n      this.logger.error(\n        `Venda ${sale.id}: falha ao gerar o link de pagamento${paymentId ? ` (cobrança ${paymentId} já existe no Asaas, conferir)` : ''}. Erro: ${motivo}`\n      );\n      throw new BadRequestException(`Não foi possível gerar o link de pagamento: ${motivo}`);\n    }\n  }"
  }
]
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx nx test api --testPathPattern=sales.service --skip-nx-cache`
Expected: PASS (18 testes: 8 da Task 3 + 10 novos).

- [ ] **Step 5: Provar que o teste pega o defeito**

Neste projeto, teste que nunca falhou não vale. Troque temporariamente `this.priceItems(tx, dto.items, request.link)` por `this.priceItems(tx, dto.items, false)`, rode o teste e confirme que `estoque insuficiente na hora de gerar o link recusa (sem reservar)` **falha**. Restaure a linha e rode de novo até passar.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/sales/sales.service.ts apps/api/src/sales/sales.service.spec.ts
git commit -m "Venda rapida gera link de cartao do Asaas, sem debitar estoque ate pagar" \
  -m "Cobranca CREDIT_CARD sem dados de cartao (a cliente digita na fatura hospedada), externalReference sale:<id>. Falha no Asaas cancela a venda; como nenhum estoque se moveu, nao ha o que desfazer." \
  -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: Cancelar venda rápida devolvendo o estoque

**Files:**
- Modify: `apps/api/src/sales/sales.service.ts` (`updateStatus`)
- Test: `apps/api/src/sales/sales.service.spec.ts`

**Interfaces:**
- Consumes: `stockMoveFor` (Task 2), `debitStock`/`returnStock` (Task 2), `UpdateSaleStatusDto` (Task 3).
- Produces: `PATCH /sales/:id/status` aceita `cancelada` e move o estoque pela tabela de transição, dentro de uma transação, com guarda de corrida.

- [ ] **Step 1: Acrescentar os testes**

No topo de `sales.service.spec.ts`, troque o import por `import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';`. Depois, ao final do arquivo:

```ts
describe('SalesService.updateStatus', () => {
  const ITENS = [{ productVariantId: 'v1', quantity: 2 }];

  /** Venda no status `atual`; a segunda leitura (resposta final) devolve qualquer coisa. */
  function com(atual: string) {
    const t = montar();
    t.tx.sale.findUnique.mockResolvedValueOnce({ id: 'sale-1', status: atual, items: ITENS });
    t.tx.sale.findUnique.mockResolvedValueOnce({ id: 'sale-1', status: 'depois' });
    return t;
  }

  it('cancelar venda concluida devolve as pecas ao estoque', async () => {
    const t = com('concluida');

    await t.service.updateStatus('sale-1', { status: 'cancelada' });

    expect(t.tx.productVariant.update).toHaveBeenCalledWith({
      where: { id: 'v1' },
      data: { stock: { increment: 2 } },
    });
  });

  it('cancelar fiado tambem devolve (a peca tinha saido)', async () => {
    const t = com('conta_aberta');

    await t.service.updateStatus('sale-1', { status: 'cancelada' });

    expect(t.tx.productVariant.update).toHaveBeenCalledTimes(1);
  });

  it('cancelar venda que aguarda o link NAO mexe no estoque (nunca saiu)', async () => {
    const t = com('aguardando_pagamento');

    await t.service.updateStatus('sale-1', { status: 'cancelada' });

    expect(t.tx.productVariant.update).not.toHaveBeenCalled();
    expect(t.tx.productVariant.updateMany).not.toHaveBeenCalled();
  });

  it('quitar o fiado nao mexe no estoque', async () => {
    const t = com('conta_aberta');

    await t.service.updateStatus('sale-1', { status: 'concluida' });

    expect(t.tx.productVariant.update).not.toHaveBeenCalled();
    expect(t.tx.productVariant.updateMany).not.toHaveBeenCalled();
  });

  it('reabrir venda cancelada debita de novo, recusando se faltar', async () => {
    const t = com('cancelada');

    await t.service.updateStatus('sale-1', { status: 'concluida' });

    expect(t.tx.productVariant.updateMany).toHaveBeenCalledWith({
      where: { id: 'v1', stock: { gte: 2 } },
      data: { stock: { decrement: 2 } },
    });
  });

  it('a troca de status so vale se a venda ainda estiver no status que lemos', async () => {
    const t = com('concluida');

    await t.service.updateStatus('sale-1', { status: 'cancelada' });

    expect(t.tx.sale.updateMany).toHaveBeenCalledWith({
      where: { id: 'sale-1', status: 'concluida' },
      data: { status: 'cancelada' },
    });
  });

  it('venda que mudou no meio do caminho nao devolve estoque duas vezes', async () => {
    const t = com('concluida');
    t.tx.sale.updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(t.service.updateStatus('sale-1', { status: 'cancelada' })).rejects.toThrow(
      ConflictException
    );
    expect(t.tx.productVariant.update).not.toHaveBeenCalled();
  });

  it('mesmo status e um no-op: nenhuma escrita', async () => {
    const t = com('cancelada');

    await t.service.updateStatus('sale-1', { status: 'cancelada' });

    expect(t.tx.sale.updateMany).not.toHaveBeenCalled();
    expect(t.tx.productVariant.update).not.toHaveBeenCalled();
  });

  it('venda inexistente', async () => {
    const t = montar();

    await expect(t.service.updateStatus('nada', { status: 'cancelada' })).rejects.toThrow(
      NotFoundException
    );
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx nx test api --testPathPattern=sales.service --skip-nx-cache`
Expected: FAIL nos casos novos (o `updateStatus` atual só troca o status).

- [ ] **Step 3: Implementar**

`pares.json` para `sales.service.ts`:

```json
[
  {
    "de": "import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';",
    "para": "import {\n  BadRequestException,\n  ConflictException,\n  Injectable,\n  Logger,\n  NotFoundException,\n} from '@nestjs/common';"
  },
  {
    "de": "import { saleReference, validateSaleRequest } from './sale-rules';\nimport { debitStock } from './sale-stock';",
    "para": "import { saleReference, stockMoveFor, validateSaleRequest } from './sale-rules';\nimport { debitStock, returnStock } from './sale-stock';"
  },
  {
    "de": "  async updateStatus(id: string, dto: UpdateSaleStatusDto) {\n    await this.findOne(id);\n    return this.prisma.sale.update({\n      where: { id },\n      data: { status: dto.status },\n      include: SALE_INCLUDE,\n    });\n  }",
    "para": "  /**\n   * Muda o status e move o estoque pela tabela de transicao (`stockMoveFor`).\n   *\n   * Antes so o texto do status mudava: nao existia `cancelada`, e a venda\n   * registrada errada so se desfazia ajustando o estoque na mao, sem rastro.\n   * O `updateMany` condicional impede o credito em dobro quando duas telas\n   * cancelam a mesma venda ao mesmo tempo. Edicao manual RECUSA estoque\n   * insuficiente ao reabrir; so o pagamento confirmado pelo Asaas negativa.\n   */\n  async updateStatus(id: string, dto: UpdateSaleStatusDto) {\n    return this.prisma.$transaction(async (tx) => {\n      const sale = await tx.sale.findUnique({ where: { id }, include: { items: true } });\n      if (!sale) throw new NotFoundException('Venda não encontrada');\n\n      if (sale.status !== dto.status) {\n        const { count } = await tx.sale.updateMany({\n          where: { id, status: sale.status },\n          data: { status: dto.status },\n        });\n        if (count === 0) {\n          throw new ConflictException(\n            'Esta venda mudou enquanto você a editava. Atualize a tela e tente de novo.'\n          );\n        }\n\n        const move = stockMoveFor(sale.status, dto.status);\n        if (move === 'debitar') await debitStock(tx, sale.items, 'recusar');\n        if (move === 'devolver') await returnStock(tx, sale.items);\n      }\n\n      return tx.sale.findUnique({ where: { id }, include: SALE_INCLUDE });\n    });\n  }"
  }
]
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx nx test api --testPathPattern=sales.service --skip-nx-cache`
Expected: PASS (27 testes).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/sales/sales.service.ts apps/api/src/sales/sales.service.spec.ts
git commit -m "Venda rapida pode ser cancelada e a peca volta ao estoque" \
  -m "Nao existia status cancelada nem DELETE: venda registrada errada so se desfazia ajustando estoque na mao, sem rastro. A troca de status agora move estoque pela tabela de transicao, em transacao, com guarda condicional contra credito em dobro." \
  -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 6: Webhook do Asaas despacha para vendas

**Files:**
- Modify: `apps/api/src/sales/sales.service.ts` (3 métodos novos)
- Modify: `apps/api/src/webhooks/webhooks.controller.ts`, `apps/api/src/webhooks/webhooks.module.ts`
- Test: `apps/api/src/sales/sales.service.spec.ts` (acrescentar), `apps/api/src/webhooks/webhooks.controller.spec.ts` (criar)

**Interfaces:**
- Consumes: `saleIdFromReference` (Task 2), `debitStock` (Task 2).
- Produces:
  - `SalesService.existsByAsaasPaymentId(paymentId: string): Promise<boolean>`
  - `SalesService.markPaidByAsaasPaymentId(paymentId: string, externalReference?: string)`: promove só de `aguardando_pagamento` para `concluida` e debita (negativando); devolve a venda ou `null`.
  - `SalesService.markCancelledByAsaasPaymentId(paymentId: string, externalReference?: string)`: só cancela quem ainda `aguardando_pagamento`; devolve `boolean`.
  - `WebhooksController` com construtor `(ordersService: OrdersService, salesService: SalesService)`.

- [ ] **Step 1: Testes do serviço**

No topo de `sales.service.spec.ts`, acrescente `Logger` ao import: `import { BadRequestException, ConflictException, Logger, NotFoundException } from '@nestjs/common';`. Depois, ao final do arquivo:

```ts
describe('SalesService — webhook do Asaas', () => {
  const venda = (status: string, extra: Record<string, unknown> = {}) => ({
    id: 'sale-1',
    status,
    asaasPaymentId: 'pay_1',
    items: [{ productVariantId: 'v1', quantity: 2 }],
    ...extra,
  });

  describe('markPaidByAsaasPaymentId', () => {
    it('confirma a venda que aguardava e debita as pecas uma vez', async () => {
      const t = montar();
      t.prisma.sale.findFirst.mockResolvedValueOnce(venda('aguardando_pagamento'));

      await t.service.markPaidByAsaasPaymentId('pay_1');

      expect(t.tx.productVariant.updateMany).toHaveBeenCalledTimes(1);
      expect(t.tx.productVariant.updateMany).toHaveBeenCalledWith({
        where: { id: 'v1', stock: { gte: 2 } },
        data: { stock: { decrement: 2 } },
      });
    });

    it('so promove a partir de aguardando_pagamento (a trava)', async () => {
      const t = montar();
      t.prisma.sale.findFirst.mockResolvedValueOnce(venda('aguardando_pagamento'));

      await t.service.markPaidByAsaasPaymentId('pay_1');

      expect(t.tx.sale.updateMany).toHaveBeenCalledWith({
        where: { id: 'sale-1', status: 'aguardando_pagamento' },
        data: { status: 'concluida' },
      });
    });

    it('com estoque insuficiente nao recusa o pagamento: debita tudo e deixa o saldo negativo', async () => {
      const t = montar();
      t.prisma.sale.findFirst.mockResolvedValueOnce(venda('aguardando_pagamento'));
      t.tx.productVariant.updateMany.mockResolvedValueOnce({ count: 0 });
      t.tx.productVariant.findUnique.mockResolvedValueOnce({ ...VARIANTE, stock: 1 });
      const log = jest.spyOn(Logger.prototype, 'error').mockImplementation();

      await expect(t.service.markPaidByAsaasPaymentId('pay_1')).resolves.not.toBeUndefined();

      expect(t.tx.productVariant.update).toHaveBeenCalledWith({
        where: { id: 'v1' },
        data: { stock: { decrement: 2 } },
      });
      expect(log).toHaveBeenCalledWith(expect.stringContaining('VENDA ACIMA DO ESTOQUE'));
      log.mockRestore();
    });

    it('evento repetido (outro evento ja promoveu) nao debita de novo', async () => {
      const t = montar();
      t.prisma.sale.findFirst.mockResolvedValueOnce(venda('aguardando_pagamento'));
      t.tx.sale.updateMany.mockResolvedValueOnce({ count: 0 });

      await expect(t.service.markPaidByAsaasPaymentId('pay_1')).resolves.toBeNull();

      expect(t.tx.productVariant.updateMany).not.toHaveBeenCalled();
    });

    it('liquidacao tardia de venda ja concluida e ignorada em silencio', async () => {
      const t = montar();
      t.prisma.sale.findFirst.mockResolvedValueOnce(venda('concluida'));
      t.tx.sale.updateMany.mockResolvedValueOnce({ count: 0 });
      const log = jest.spyOn(Logger.prototype, 'error').mockImplementation();

      await expect(t.service.markPaidByAsaasPaymentId('pay_1')).resolves.toBeNull();

      expect(t.tx.productVariant.updateMany).not.toHaveBeenCalled();
      expect(log).not.toHaveBeenCalled();
      log.mockRestore();
    });

    it('pagamento em venda CANCELADA nao ressuscita nem debita, e vai para o log como erro', async () => {
      const t = montar();
      t.prisma.sale.findFirst.mockResolvedValueOnce(venda('cancelada'));
      t.tx.sale.updateMany.mockResolvedValueOnce({ count: 0 });
      const log = jest.spyOn(Logger.prototype, 'error').mockImplementation();

      await expect(t.service.markPaidByAsaasPaymentId('pay_1')).resolves.toBeNull();

      expect(t.tx.productVariant.updateMany).not.toHaveBeenCalled();
      expect(log).toHaveBeenCalledWith(expect.stringContaining('DINHEIRO EM VENDA CANCELADA'));
      log.mockRestore();
    });

    it('acha a venda pelo externalReference quando o vinculo nao foi gravado', async () => {
      const t = montar();
      t.prisma.sale.findFirst.mockResolvedValueOnce(null);
      t.prisma.sale.findUnique.mockResolvedValueOnce(venda('aguardando_pagamento', { asaasPaymentId: null }));

      await t.service.markPaidByAsaasPaymentId('pay_9', 'sale:sale-1');

      expect(t.prisma.sale.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'sale-1' } })
      );
      // Grava o vinculo que faltava.
      expect(t.tx.sale.updateMany).toHaveBeenCalledWith({
        where: { id: 'sale-1', status: 'aguardando_pagamento' },
        data: { status: 'concluida', asaasPaymentId: 'pay_9' },
      });
    });

    it('referencia de pedido (sem prefixo) nao e procurada como venda', async () => {
      const t = montar();

      await expect(t.service.markPaidByAsaasPaymentId('pay_9', 'cmpedido1')).resolves.toBeNull();

      expect(t.prisma.sale.findUnique).not.toHaveBeenCalled();
    });

    it('pagamento sem venda correspondente grita no log e devolve null', async () => {
      const t = montar();
      const log = jest.spyOn(Logger.prototype, 'error').mockImplementation();

      await expect(t.service.markPaidByAsaasPaymentId('pay_x')).resolves.toBeNull();

      expect(log).toHaveBeenCalledWith(expect.stringContaining('nenhuma venda'));
      log.mockRestore();
    });
  });

  describe('markCancelledByAsaasPaymentId', () => {
    it('cancela quem ainda aguardava e nao mexe no estoque (nunca saiu)', async () => {
      const t = montar();
      t.prisma.sale.findFirst.mockResolvedValueOnce(venda('aguardando_pagamento'));

      await expect(t.service.markCancelledByAsaasPaymentId('pay_1')).resolves.toBe(true);

      expect(t.prisma.sale.updateMany).toHaveBeenCalledWith({
        where: { id: 'sale-1', status: 'aguardando_pagamento' },
        data: { status: 'cancelada' },
      });
      expect(t.tx.productVariant.update).not.toHaveBeenCalled();
    });

    it('nunca cancela venda ja concluida: desfazer venda paga e decisao de gente', async () => {
      const t = montar();
      t.prisma.sale.findFirst.mockResolvedValueOnce(venda('concluida'));
      const aviso = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

      await expect(t.service.markCancelledByAsaasPaymentId('pay_1')).resolves.toBe(false);

      expect(t.prisma.sale.updateMany).not.toHaveBeenCalled();
      aviso.mockRestore();
    });
  });

  describe('existsByAsaasPaymentId', () => {
    it('diz se ha venda com esta cobranca', async () => {
      const t = montar();
      t.prisma.sale.count.mockResolvedValueOnce(1);

      await expect(t.service.existsByAsaasPaymentId('pay_1')).resolves.toBe(true);
      expect(t.prisma.sale.count).toHaveBeenCalledWith({ where: { asaasPaymentId: 'pay_1' } });
      await expect(t.service.existsByAsaasPaymentId('pay_2')).resolves.toBe(false);
    });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx nx test api --testPathPattern=sales.service --skip-nx-cache`
Expected: FAIL (os métodos não existem).

- [ ] **Step 3: Implementar os métodos no serviço**

`pares.json` para `sales.service.ts`:

```json
[
  {
    "de": "import { saleReference, stockMoveFor, validateSaleRequest } from './sale-rules';",
    "para": "import {\n  saleIdFromReference,\n  saleReference,\n  stockMoveFor,\n  validateSaleRequest,\n} from './sale-rules';"
  },
  {
    "de": "      return tx.sale.findUnique({ where: { id }, include: SALE_INCLUDE });\n    });\n  }\n}",
    "para": "      return tx.sale.findUnique({ where: { id }, include: SALE_INCLUDE });\n    });\n  }\n\n  /** Ha venda com esta cobranca? Decide para onde o webhook do Asaas despacha. */\n  async existsByAsaasPaymentId(paymentId: string): Promise<boolean> {\n    return (await this.prisma.sale.count({ where: { asaasPaymentId: paymentId } })) > 0;\n  }\n\n  /**\n   * Pelo id da cobranca; se o vinculo nao foi gravado (a gravacao pos-cobranca\n   * falhou), pelo `externalReference` com prefixo `sale:`. Referencia de pedido\n   * nao e procurada aqui.\n   */\n  private async findByPayment(paymentId: string, externalReference?: string) {\n    const bound = await this.prisma.sale.findFirst({\n      where: { asaasPaymentId: paymentId },\n      include: { items: true },\n    });\n    if (bound) return bound;\n\n    const id = saleIdFromReference(externalReference);\n    if (!id) return null;\n    return this.prisma.sale.findUnique({ where: { id }, include: { items: true } });\n  }\n\n  /**\n   * Pagamento confirmado: a venda sai de `aguardando_pagamento` e a peca sai do\n   * estoque.\n   *\n   * A trava e o `updateMany` condicional, que so promove a partir de\n   * `aguardando_pagamento`. Sem ela, o PAYMENT_RECEIVED da liquidacao do cartao\n   * (~30 dias depois, uma vez por parcela) ressuscitaria uma venda cancelada nesse\n   * meio tempo e debitaria o estoque de novo.\n   *\n   * Estoque insuficiente NAO recusa: o dinheiro ja entrou. Debita tudo, negativa\n   * o saldo e grita no log (`debitStock` com 'negativar').\n   */\n  async markPaidByAsaasPaymentId(paymentId: string, externalReference?: string) {\n    const sale = await this.findByPayment(paymentId, externalReference);\n    if (!sale) {\n      this.logger.error(\n        `Pagamento ${paymentId} confirmado no Asaas, mas nenhuma venda foi encontrada ` +\n          `(referência: ${externalReference ?? 'nenhuma'}). Conferir no painel do Asaas.`\n      );\n      return null;\n    }\n\n    return this.prisma.$transaction(async (tx) => {\n      const { count } = await tx.sale.updateMany({\n        where: { id: sale.id, status: 'aguardando_pagamento' },\n        data: {\n          status: 'concluida',\n          // Grava o vinculo que faltava, se a venda foi achada pela referencia.\n          ...(sale.asaasPaymentId ? {} : { asaasPaymentId: paymentId }),\n        },\n      });\n\n      if (count === 0) {\n        // Dinheiro recebido numa venda que ja estava cancelada: nao ressuscita e\n        // nao debita, mas precisa de gente olhando (devolver ou refazer a venda).\n        if (sale.status === 'cancelada') {\n          this.logger.error(\n            `DINHEIRO EM VENDA CANCELADA: o Asaas confirmou o pagamento ${paymentId}, ` +\n              `mas a venda ${sale.id} está cancelada. Conferir se a cliente deve ser reembolsada.`\n          );\n        }\n        return null;\n      }\n\n      await debitStock(tx, sale.items, 'negativar');\n      return tx.sale.findUnique({ where: { id: sale.id }, include: SALE_INCLUDE });\n    });\n  }\n\n  /**\n   * Cobranca vencida, estornada ou excluida. Cancela so quem ainda aguardava: nao\n   * ha estoque a devolver (nunca saiu). Venda ja concluida nao e desfeita por\n   * evento do Asaas, e isso fica no log.\n   */\n  async markCancelledByAsaasPaymentId(paymentId: string, externalReference?: string): Promise<boolean> {\n    const sale = await this.findByPayment(paymentId, externalReference);\n    if (!sale) {\n      this.logger.warn(`Cobrança ${paymentId} cancelada no Asaas, mas nenhuma venda foi encontrada.`);\n      return false;\n    }\n    if (sale.status !== 'aguardando_pagamento') {\n      this.logger.warn(\n        `Evento de cancelamento do Asaas ignorado: a venda ${sale.id} está ${sale.status}. ` +\n          'Desfazer uma venda já fechada é decisão sua; conferir no Asaas.'\n      );\n      return false;\n    }\n\n    const { count } = await this.prisma.sale.updateMany({\n      where: { id: sale.id, status: 'aguardando_pagamento' },\n      data: { status: 'cancelada' },\n    });\n    return count > 0;\n  }\n}"
  }
]
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx nx test api --testPathPattern=sales.service --skip-nx-cache`
Expected: PASS (38 testes).

- [ ] **Step 5: Teste do controller**

Crie `apps/api/src/webhooks/webhooks.controller.spec.ts`:

```ts
import { WebhooksController } from './webhooks.controller';

/**
 * O webhook so sabia achar `Order`. Cobranca de venda rapida leva
 * `externalReference: "sale:<id>"` e precisa ir para o SalesService; pedido
 * continua exatamente como era.
 */
function montar(opcoes: { vendaPorPagamento?: boolean } = {}) {
  const orders = {
    markPaidByAsaasPaymentId: jest.fn(async () => null),
    markCancelledByAsaasPaymentId: jest.fn(async () => null),
  };
  const sales = {
    existsByAsaasPaymentId: jest.fn(async () => opcoes.vendaPorPagamento ?? false),
    markPaidByAsaasPaymentId: jest.fn(async () => null),
    markCancelledByAsaasPaymentId: jest.fn(async () => true),
  };
  const controller = new WebhooksController(orders as never, sales as never);
  const receber = (event: string, referencia?: string | null) =>
    controller.handleAsaas('token-teste', { event, payment: { id: 'pay_1', externalReference: referencia } });
  return { orders, sales, receber };
}

describe('WebhooksController — despacho', () => {
  const tokenOriginal = process.env.ASAAS_WEBHOOK_TOKEN;
  beforeEach(() => {
    process.env.ASAAS_WEBHOOK_TOKEN = 'token-teste';
  });
  afterAll(() => {
    if (tokenOriginal === undefined) delete process.env.ASAAS_WEBHOOK_TOKEN;
    else process.env.ASAAS_WEBHOOK_TOKEN = tokenOriginal;
  });

  it('referencia sale:<id> vai para vendas e nao toca em pedidos', async () => {
    const t = montar();

    await t.receber('PAYMENT_CONFIRMED', 'sale:abc');

    expect(t.sales.markPaidByAsaasPaymentId).toHaveBeenCalledWith('pay_1', 'sale:abc');
    expect(t.orders.markPaidByAsaasPaymentId).not.toHaveBeenCalled();
  });

  it('PAYMENT_RECEIVED (liquidacao) de venda tambem vai para vendas', async () => {
    const t = montar();

    await t.receber('PAYMENT_RECEIVED', 'sale:abc');

    expect(t.sales.markPaidByAsaasPaymentId).toHaveBeenCalled();
  });

  it('sem prefixo mas com cobranca conhecida de venda: vai para vendas', async () => {
    const t = montar({ vendaPorPagamento: true });

    await t.receber('PAYMENT_CONFIRMED', undefined);

    expect(t.sales.markPaidByAsaasPaymentId).toHaveBeenCalledWith('pay_1', undefined);
    expect(t.orders.markPaidByAsaasPaymentId).not.toHaveBeenCalled();
  });

  it('pedido segue como sempre (id cru no externalReference)', async () => {
    const t = montar();

    await t.receber('PAYMENT_CONFIRMED', 'cmpedido1');

    expect(t.orders.markPaidByAsaasPaymentId).toHaveBeenCalledWith('pay_1', 'cmpedido1');
    expect(t.sales.markPaidByAsaasPaymentId).not.toHaveBeenCalled();
  });

  it('vencimento de venda cancela pela via de vendas', async () => {
    const t = montar();

    await t.receber('PAYMENT_OVERDUE', 'sale:abc');

    expect(t.sales.markCancelledByAsaasPaymentId).toHaveBeenCalledWith('pay_1', 'sale:abc');
    expect(t.orders.markCancelledByAsaasPaymentId).not.toHaveBeenCalled();
  });

  it('estorno de pedido continua indo para pedidos', async () => {
    const t = montar();

    await t.receber('PAYMENT_REFUNDED', 'cmpedido1');

    expect(t.orders.markCancelledByAsaasPaymentId).toHaveBeenCalledWith('pay_1');
    expect(t.sales.markCancelledByAsaasPaymentId).not.toHaveBeenCalled();
  });

  it('evento que a loja nao trata nem consulta o banco de vendas', async () => {
    const t = montar();

    await expect(t.receber('PAYMENT_CREATED', 'sale:abc')).resolves.toEqual({ received: true });

    expect(t.sales.existsByAsaasPaymentId).not.toHaveBeenCalled();
    expect(t.sales.markPaidByAsaasPaymentId).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 6: Rodar e ver falhar**

Run: `npx nx test api --testPathPattern=webhooks.controller --skip-nx-cache`
Expected: FAIL (o construtor só aceita `OrdersService`).

- [ ] **Step 7: Implementar o despacho**

`pares.json` para `apps/api/src/webhooks/webhooks.controller.ts`:

```json
[
  {
    "de": "import { OrdersService } from '../orders/orders.service';",
    "para": "import { OrdersService } from '../orders/orders.service';\nimport { SalesService } from '../sales/sales.service';\nimport { saleIdFromReference } from '../sales/sale-rules';"
  },
  {
    "de": "  constructor(private readonly ordersService: OrdersService) {}",
    "para": "  constructor(\n    private readonly ordersService: OrdersService,\n    private readonly salesService: SalesService\n  ) {}"
  },
  {
    "de": "    const paymentId = body.payment?.id;\n    if (paymentId) {\n      if (PAID_EVENTS.has(body.event)) {\n        // O externalReference (id do pedido) vai junto: é a rede para o caso de o\n        // vínculo não ter sido gravado no checkout.\n        await this.ordersService.markPaidByAsaasPaymentId(\n          paymentId,\n          body.payment?.externalReference ?? undefined\n        );\n      } else if (body.event === EXPIRED_EVENT) {\n        await this.ordersService.markCancelledByAsaasPaymentId(paymentId, { expired: true });\n      } else if (CANCELLED_EVENTS.has(body.event)) {\n        await this.ordersService.markCancelledByAsaasPaymentId(paymentId);\n      }\n    }",
    "para": "    const paymentId = body.payment?.id;\n    const handled =\n      PAID_EVENTS.has(body.event) || body.event === EXPIRED_EVENT || CANCELLED_EVENTS.has(body.event);\n\n    if (paymentId && handled) {\n      const reference = body.payment?.externalReference ?? undefined;\n\n      // Venda rapida (balcao) ou pedido do site? O prefixo `sale:` diz; sem ele,\n      // a cobranca ainda pode ser de uma venda cujo vinculo ja foi gravado.\n      const isSale =\n        saleIdFromReference(reference) !== null ||\n        (await this.salesService.existsByAsaasPaymentId(paymentId));\n\n      if (isSale) {\n        if (PAID_EVENTS.has(body.event)) {\n          await this.salesService.markPaidByAsaasPaymentId(paymentId, reference);\n        } else {\n          await this.salesService.markCancelledByAsaasPaymentId(paymentId, reference);\n        }\n      } else if (PAID_EVENTS.has(body.event)) {\n        // O externalReference (id do pedido) vai junto: é a rede para o caso de o\n        // vínculo não ter sido gravado no checkout.\n        await this.ordersService.markPaidByAsaasPaymentId(paymentId, reference);\n      } else if (body.event === EXPIRED_EVENT) {\n        await this.ordersService.markCancelledByAsaasPaymentId(paymentId, { expired: true });\n      } else {\n        await this.ordersService.markCancelledByAsaasPaymentId(paymentId);\n      }\n    }"
  }
]
```

`pares.json` para `apps/api/src/webhooks/webhooks.module.ts`:

```json
[
  {
    "de": "import { OrdersModule } from '../orders/orders.module';",
    "para": "import { OrdersModule } from '../orders/orders.module';\nimport { SalesModule } from '../sales/sales.module';"
  },
  {
    "de": "  imports: [OrdersModule],",
    "para": "  imports: [OrdersModule, SalesModule],"
  }
]
```

- [ ] **Step 8: Rodar e ver passar (suíte inteira inclui o teste de fumaça que monta o módulo da aplicação)**

Run: `npx nx test api --skip-nx-cache`
Expected: todas as suítes passam, inclusive `__smoke__/app-module.spec.ts` (prova que a injeção de `SalesService` no controller resolve).

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/sales/sales.service.ts apps/api/src/sales/sales.service.spec.ts apps/api/src/webhooks
git commit -m "Webhook do Asaas despacha cobranca de venda rapida para o SalesService" \
  -m "O webhook so sabia achar Order. Cobranca de venda leva externalReference sale:<id>; sem prefixo, procura venda por asaasPaymentId antes de seguir para pedidos (comportamento atual preservado). Promove so a partir de aguardando_pagamento: a liquidacao tardia do cartao nao ressuscita venda cancelada. Dinheiro recebido em venda cancelada vai para o log como erro." \
  -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 7: Listagem de vendas com filtros

**Files:**
- Modify: `apps/api/src/sales/sales.service.ts` (`findAll`)
- Modify: `apps/api/src/sales/sales.controller.ts`
- Test: `apps/api/src/sales/sales.service.spec.ts`

**Interfaces:**
- Consumes: `FindSalesQueryDto` (Task 3), `parseSaleStatuses` (Task 2).
- Produces: `GET /sales?status=a,b&q=texto&limit=N`. Sem parâmetros, devolve tudo (as telas Contas, Fiscal e Histórico continuam funcionando).

- [ ] **Step 1: Testes**

Ao final de `sales.service.spec.ts`:

```ts
describe('SalesService.findAll', () => {
  function chamada(t: ReturnType<typeof montar>) {
    return t.prisma.sale.findMany.mock.calls[0][0] as unknown as Record<string, unknown>;
  }

  it('sem filtros devolve tudo, mais recentes primeiro', async () => {
    const t = montar();

    await t.service.findAll();

    expect(chamada(t)).toMatchObject({ where: {}, orderBy: { createdAt: 'desc' } });
    expect(chamada(t)).not.toHaveProperty('take');
  });

  it('filtra por uma lista de status', async () => {
    const t = montar();

    await t.service.findAll({ status: 'aguardando_pagamento,conta_aberta' });

    expect(chamada(t).where).toEqual({ status: { in: ['aguardando_pagamento', 'conta_aberta'] } });
  });

  it('status so com lixo nao vira "sem filtro": devolve nada', async () => {
    const t = montar();

    await t.service.findAll({ status: 'xpto' });

    expect(chamada(t).where).toEqual({ status: { in: [] } });
  });

  it('busca pelo nome digitado ou pelo nome do cliente cadastrado, sem diferenciar maiuscula', async () => {
    const t = montar();

    await t.service.findAll({ q: ' maria ' });

    expect(chamada(t).where).toEqual({
      OR: [
        { customerName: { contains: 'maria', mode: 'insensitive' } },
        { customer: { name: { contains: 'maria', mode: 'insensitive' } } },
      ],
    });
  });

  it('respeita o limite', async () => {
    const t = montar();

    await t.service.findAll({ limit: 50 });

    expect(chamada(t)).toMatchObject({ take: 50 });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx nx test api --testPathPattern=sales.service --skip-nx-cache`
Expected: FAIL (`findAll` não aceita argumentos).

- [ ] **Step 3: Implementar**

`pares.json` para `sales.service.ts`:

```json
[
  {
    "de": "import { CreateSaleDto, UpdateSaleStatusDto } from './dto/sale.dto';",
    "para": "import { CreateSaleDto, FindSalesQueryDto, UpdateSaleStatusDto } from './dto/sale.dto';"
  },
  {
    "de": "import {\n  saleIdFromReference,\n  saleReference,\n  stockMoveFor,\n  validateSaleRequest,\n} from './sale-rules';",
    "para": "import {\n  parseSaleStatuses,\n  saleIdFromReference,\n  saleReference,\n  stockMoveFor,\n  validateSaleRequest,\n} from './sale-rules';"
  },
  {
    "de": "  findAll() {\n    return this.prisma.sale.findMany({ include: SALE_INCLUDE, orderBy: { createdAt: 'desc' } });\n  }",
    "para": "  /**\n   * Os mesmos filtros de `GET /orders` (status, busca, limite), para a tela de\n   * Pedidos intercalar as duas listas. Sem parametros, devolve tudo.\n   *\n   * `status` presente mas sem nenhum valor valido filtra para NADA: tratar como\n   * \"sem filtro\" devolveria todas as vendas a quem pediu um status que nao existe.\n   */\n  findAll(query: FindSalesQueryDto = {}) {\n    const where: Prisma.SaleWhereInput = {};\n    if (query.status !== undefined) where.status = { in: parseSaleStatuses(query.status) };\n\n    const q = query.q?.trim();\n    if (q) {\n      where.OR = [\n        { customerName: { contains: q, mode: 'insensitive' } },\n        { customer: { name: { contains: q, mode: 'insensitive' } } },\n      ];\n    }\n\n    return this.prisma.sale.findMany({\n      where,\n      include: SALE_INCLUDE,\n      orderBy: { createdAt: 'desc' },\n      ...(query.limit ? { take: query.limit } : {}),\n    });\n  }"
  }
]
```

`pares.json` para `apps/api/src/sales/sales.controller.ts`:

```json
[
  {
    "de": "import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';",
    "para": "import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';"
  },
  {
    "de": "import { CreateSaleDto, UpdateSaleStatusDto } from './dto/sale.dto';",
    "para": "import { CreateSaleDto, FindSalesQueryDto, UpdateSaleStatusDto } from './dto/sale.dto';"
  },
  {
    "de": "  @Get()\n  findAll() {\n    return this.salesService.findAll();\n  }",
    "para": "  @Get()\n  findAll(@Query() query: FindSalesQueryDto) {\n    return this.salesService.findAll(query);\n  }"
  }
]
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx nx test api --testPathPattern=sales.service --skip-nx-cache`
Expected: PASS (43 testes).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/sales/sales.service.ts apps/api/src/sales/sales.controller.ts apps/api/src/sales/sales.service.spec.ts
git commit -m "GET /sales aceita status, busca e limite" \
  -m "Mesmos filtros de GET /orders, para a tela de Pedidos intercalar as duas listas. Sem parametros devolve tudo, entao Contas, Fiscal e Historico seguem funcionando." \
  -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 8: Dashboard — contas abertas e parceladas com os status novos

**Files:**
- Modify: `apps/api/src/dashboard/dashboard.service.ts`
- Test: `apps/api/src/dashboard/dashboard.service.spec.ts` (criar)

**Interfaces:**
- Produces: `summary().openAccounts` passa a contar venda `conta_aberta` **e** `aguardando_pagamento`; `summary().installmentSales` ignora `cancelada`. Faturamento e caixa **não mudam** (já filtram `status: 'concluida'`).

- [ ] **Step 1: Teste**

`apps/api/src/dashboard/dashboard.service.spec.ts`:

```ts
import { DashboardService } from './dashboard.service';

/**
 * Venda com link pendente e "dinheiro prometido que ainda nao entrou", como o
 * fiado: tem que aparecer em contas abertas. Venda cancelada nao e parcela a
 * receber. Faturamento e caixa ja filtram `concluida` e nao podem mudar.
 */
function montar() {
  const vazio = jest.fn(async () => [] as unknown[]);
  const prisma = {
    sale: { findMany: vazio },
    expense: { findMany: jest.fn(async () => []) },
    customPayment: { findMany: jest.fn(async () => []) },
    order: { findMany: jest.fn(async () => []) },
    productVariant: { findMany: jest.fn(async () => []) },
  };
  return { service: new DashboardService(prisma as never), prisma };
}

function wheres(prisma: ReturnType<typeof montar>['prisma']) {
  return prisma.sale.findMany.mock.calls.map((c) => (c as unknown[])[0] as { where: unknown }).map((a) => a.where);
}

describe('DashboardService.summary — status novos de venda', () => {
  it('contas abertas incluem venda aguardando o link de pagamento', async () => {
    const t = montar();

    await t.service.summary();

    expect(wheres(t.prisma)).toContainEqual({ status: { in: ['conta_aberta', 'aguardando_pagamento'] } });
  });

  it('parceladas ignoram venda cancelada', async () => {
    const t = montar();

    await t.service.summary();

    expect(wheres(t.prisma)).toContainEqual({ installments: { gt: 1 }, status: { notIn: ['cancelada'] } });
  });

  it('faturamento e caixa continuam so com venda concluida', async () => {
    const t = montar();

    await t.service.summary();

    expect(wheres(t.prisma)).toContainEqual({ status: 'concluida' });
    expect(wheres(t.prisma)).toContainEqual({ status: 'concluida', createdAt: { gte: expect.any(Date) } });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx nx test api --testPathPattern=dashboard.service --skip-nx-cache`
Expected: FAIL nos dois primeiros casos (o terceiro já passa e protege o que não pode mudar).

- [ ] **Step 3: Implementar**

`pares.json` para `apps/api/src/dashboard/dashboard.service.ts`:

```json
[
  {
    "de": "      this.prisma.sale.findMany({ where: { status: 'conta_aberta' } }),\n      this.prisma.sale.findMany({ where: { installments: { gt: 1 } } }),",
    "para": "      // Fiado e venda com link de cartao pendente sao o mesmo dinheiro prometido\n      // que ainda nao entrou.\n      this.prisma.sale.findMany({\n        where: { status: { in: ['conta_aberta', 'aguardando_pagamento'] } },\n      }),\n      // Venda cancelada nao e parcela a receber.\n      this.prisma.sale.findMany({\n        where: { installments: { gt: 1 }, status: { notIn: ['cancelada'] } },\n      }),"
  }
]
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx nx test api --testPathPattern=dashboard.service --skip-nx-cache`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/dashboard/dashboard.service.ts apps/api/src/dashboard/dashboard.service.spec.ts
git commit -m "Dashboard: link de cartao pendente conta como conta aberta; cancelada nao e parcela" \
  -m "Faturamento e caixa ja filtravam concluida e ficam intactos (o teste os protege)." \
  -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 9: Reimportar o catálogo deixa de apagar o histórico de vendas

**Files:**
- Modify: `apps/api/src/products/products.service.ts` (`replaceCatalog`, ~linha 361)
- Test: `apps/api/src/products/replace-catalog.spec.ts` (criar)

**Interfaces:**
- Produces: `replaceCatalog` recusa, com mensagem que diz o porquê e o que fazer, quando existe qualquer item de venda registrado; nunca mais chama `sale.deleteMany`.

Contexto: hoje `replaceCatalog` roda `tx.sale.deleteMany({})` — apaga **todas** as vendas, sem devolver estoque, porque `SaleItem` tem FK para `ProductVariant` e a exclusão dos produtos falharia sem isso. O próprio serviço já recusa apagar variação (`:188-197`) e produto (`:238-244`) que tenham venda; `replaceCatalog` era a exceção incoerente. A restrição nova tem um custo declarado: **enquanto existir venda rápida registrada (mesmo cancelada), o reset total do catálogo fica indisponível**. Ajustar produtos pelo cadastro e `POST /imports/products` (que faz upsert) continuam funcionando.

- [ ] **Step 1: Teste**

`apps/api/src/products/replace-catalog.spec.ts`:

```ts
import { BadRequestException } from '@nestjs/common';
import { ProductsService } from './products.service';

/**
 * `replaceCatalog` apagava TODAS as vendas (`sale.deleteMany`) para poder
 * apagar os produtos, e sem devolver estoque. Historico de venda nao e dado
 * descartavel: agora a operacao recusa em vez de destruir.
 */
function montar(itensDeVenda: number) {
  const tx = {
    sale: { deleteMany: jest.fn(async () => ({})) },
    product: {
      deleteMany: jest.fn(async () => ({})),
      create: jest.fn(async () => ({ id: 'p1', variants: [] })),
    },
  };
  const prisma = {
    saleItem: { count: jest.fn(async () => itensDeVenda) },
    $transaction: jest.fn(async (fn: (t: unknown) => unknown) => fn(tx)),
  };
  return { service: new ProductsService(prisma as never), tx, prisma };
}

const DTO = { confirmDeleteAll: true, products: [] } as never;

describe('ProductsService.replaceCatalog', () => {
  it('recusa quando ha venda registrada, explica por que e nao apaga nada', async () => {
    const t = montar(3);

    const erro = t.service.replaceCatalog(DTO);

    await expect(erro).rejects.toThrow(BadRequestException);
    await expect(erro).rejects.toThrow(/3 item\(ns\) de venda/);
    await expect(erro).rejects.toThrow(/histórico/);
    expect(t.prisma.$transaction).not.toHaveBeenCalled();
    expect(t.tx.product.deleteMany).not.toHaveBeenCalled();
  });

  it('sem vendas, substitui o catalogo e NUNCA apaga venda', async () => {
    const t = montar(0);

    await t.service.replaceCatalog(DTO);

    expect(t.tx.product.deleteMany).toHaveBeenCalledTimes(1);
    expect(t.tx.sale.deleteMany).not.toHaveBeenCalled();
  });

  it('continua exigindo a confirmacao explicita', async () => {
    const t = montar(0);

    await expect(
      t.service.replaceCatalog({ confirmDeleteAll: false, products: [] } as never)
    ).rejects.toThrow(/confirmDeleteAll/);
    expect(t.prisma.saleItem.count).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx nx test api --testPathPattern=replace-catalog --skip-nx-cache`
Expected: FAIL (`saleItem.count` nunca é chamado e `sale.deleteMany` ainda roda).

- [ ] **Step 3: Implementar**

`pares.json` para `apps/api/src/products/products.service.ts`:

```json
[
  {
    "de": "  /**\n   * Apaga todo o catálogo atual (produtos, variações e vendas ligadas a eles)\n   * e insere os produtos informados no lugar. Operação destrutiva e irreversível,\n   * pensada para reset completo do catálogo a partir de um inventário real.\n   */\n  async replaceCatalog(dto: ReplaceCatalogDto) {\n    if (!dto.confirmDeleteAll) {\n      throw new BadRequestException(\n        'Envie confirmDeleteAll=true para confirmar a substituição total do catálogo (apaga produtos, variações e vendas ligadas a eles).'\n      );\n    }\n\n    return this.prisma.$transaction(\n      async (tx) => {\n        await tx.sale.deleteMany({});\n        await tx.product.deleteMany({});",
    "para": "  /**\n   * Apaga todo o catálogo atual (produtos e variações) e insere os produtos\n   * informados no lugar. Operação destrutiva e irreversível, pensada para reset\n   * completo do catálogo a partir de um inventário real.\n   *\n   * Recusa quando existe venda rápida registrada. A versão anterior apagava TODAS\n   * as vendas (`sale.deleteMany`) para conseguir apagar os produtos — `SaleItem`\n   * tem FK para `ProductVariant` —, e sem devolver estoque nem deixar rastro. O\n   * serviço já recusa apagar variação e produto com venda; esta era a exceção.\n   */\n  async replaceCatalog(dto: ReplaceCatalogDto) {\n    if (!dto.confirmDeleteAll) {\n      throw new BadRequestException(\n        'Envie confirmDeleteAll=true para confirmar a substituição total do catálogo (apaga produtos e variações).'\n      );\n    }\n\n    const itensDeVenda = await this.prisma.saleItem.count();\n    if (itensDeVenda > 0) {\n      throw new BadRequestException(\n        `Não dá para substituir o catálogo inteiro: há ${itensDeVenda} item(ns) de venda rápida ligados aos produtos atuais, ` +\n          'e apagar o catálogo apagaria esse histórico de vendas. Ajuste os produtos pelo cadastro ' +\n          'ou use a importação por planilha, que atualiza o que já existe sem apagar nada.'\n      );\n    }\n\n    return this.prisma.$transaction(\n      async (tx) => {\n        await tx.product.deleteMany({});"
  }
]
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx nx test api --testPathPattern=replace-catalog --skip-nx-cache`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/products/products.service.ts apps/api/src/products/replace-catalog.spec.ts
git commit -m "Substituir o catalogo para de apagar todo o historico de vendas" \
  -m "replaceCatalog rodava sale.deleteMany para poder apagar os produtos: sumia toda venda, sem devolver estoque. Agora recusa se houver venda registrada, dizendo o porque e a saida (cadastro ou importacao por planilha). Custo declarado: com venda registrada, o reset total fica indisponivel." \
  -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 10: Admin — tipos, utilitários e a linha de venda rápida

O admin **não tem Jest**. A lógica pura vai para `lib/vendas-rapidas.ts` (sem React) e a verificação desta tarefa é o `build` (type-check do Next).

**Files:**
- Modify: `apps/admin/src/lib/types.ts`
- Create: `apps/admin/src/lib/vendas-rapidas.ts`
- Create: `apps/admin/src/components/venda-rapida-card.tsx`

**Interfaces:**
- Produces:
  - `SaleStatus = 'concluida' | 'conta_aberta' | 'aguardando_pagamento' | 'cancelada'`; `Sale.customerName: string | null`, `Sale.customerDocument: string | null`, `Sale.asaasInvoiceUrl: string | null`.
  - `ROTULO_DA_VENDA: Record<SaleStatus, { label: string; style: string }>`, `PAGAMENTO_DA_VENDA: Record<PaymentMethod, string>`
  - `nomeDaVenda(sale): string`, `statusDeVenda(filtro: OrderStatus | 'todos'): { buscar: boolean; status?: string }`, `mesclar(orders: Order[], sales: Sale[]): LinhaDePedidos[]`, `linkWhatsApp(telefone, nome, url): string | null`, `type LinhaDePedidos`
  - `<VendaRapidaCard sale expanded onToggle />`

- [ ] **Step 1: Tipos**

`pares.json` para `apps/admin/src/lib/types.ts`:

```json
[
  {
    "de": "export type SaleStatus = 'concluida' | 'conta_aberta';",
    "para": "export type SaleStatus = 'concluida' | 'conta_aberta' | 'aguardando_pagamento' | 'cancelada';"
  },
  {
    "de": "  customer: Customer | null;\n  paymentMethod: PaymentMethod;\n  status: SaleStatus;",
    "para": "  customer: Customer | null;\n  /** Nome digitado na venda rápida, sem cadastro de cliente. */\n  customerName: string | null;\n  customerDocument: string | null;\n  /** Link de cartão do Asaas, quando a venda foi gerada com link. */\n  asaasInvoiceUrl: string | null;\n  paymentMethod: PaymentMethod;\n  status: SaleStatus;"
  }
]
```

- [ ] **Step 2: Utilitários**

`apps/admin/src/lib/vendas-rapidas.ts`:

```ts
import type { Order, OrderStatus, PaymentMethod, Sale, SaleStatus } from './types';

/**
 * Como cada status de venda rapida aparece em /admin/pedidos. Fiado conta como
 * "aguardando": o dinheiro prometido ainda nao entrou, o mesmo agrupamento que o
 * dashboard usa para "contas abertas".
 */
export const ROTULO_DA_VENDA: Record<SaleStatus, { label: string; style: string }> = {
  concluida: { label: 'Pago', style: 'bg-green-100 text-green-700' },
  conta_aberta: { label: 'Em aberto (fiado)', style: 'bg-amber-100 text-amber-700' },
  aguardando_pagamento: { label: 'Aguardando pagamento', style: 'bg-amber-100 text-amber-700' },
  cancelada: { label: 'Cancelado', style: 'bg-black/10 text-black/50' },
};

/** Inclui dinheiro, que existe em venda de balcao e nao em pedido do site. */
export const PAGAMENTO_DA_VENDA: Record<PaymentMethod, string> = {
  pix: 'Pix',
  cartao: 'Cartão',
  boleto: 'Boleto',
  dinheiro: 'Dinheiro',
};

export function nomeDaVenda(sale: Pick<Sale, 'customerName' | 'customer'>): string {
  return sale.customerName?.trim() || sale.customer?.name || 'Cliente não informada';
}

export type LinhaDePedidos = { tipo: 'pedido'; order: Order } | { tipo: 'venda'; sale: Sale };

/**
 * O filtro de status de Pedidos traduzido para a busca de vendas. "Enviados"
 * nao busca venda: balcao nao tem envio.
 */
export function statusDeVenda(filtro: OrderStatus | 'todos'): { buscar: boolean; status?: string } {
  switch (filtro) {
    case 'aguardando_pagamento':
      return { buscar: true, status: 'aguardando_pagamento,conta_aberta' };
    case 'pago':
      return { buscar: true, status: 'concluida' };
    case 'cancelado':
      return { buscar: true, status: 'cancelada' };
    case 'enviado':
      return { buscar: false };
    default:
      return { buscar: true };
  }
}

/** Pedidos e vendas rapidas numa lista so, mais recentes primeiro. */
export function mesclar(orders: Order[], sales: Sale[]): LinhaDePedidos[] {
  const linhas: LinhaDePedidos[] = [
    ...orders.map((order) => ({ tipo: 'pedido' as const, order })),
    ...sales.map((sale) => ({ tipo: 'venda' as const, sale })),
  ];
  const quando = (l: LinhaDePedidos) =>
    new Date(l.tipo === 'pedido' ? l.order.createdAt : l.sale.createdAt).getTime();
  return linhas.sort((a, b) => quando(b) - quando(a));
}

/**
 * Mensagem pronta com o link de pagamento. `null` quando nao ha telefone: a
 * venda de balcao muitas vezes so tem o nome, e `wa.me/?text=` sem numero e um
 * link quebrado.
 */
export function linkWhatsApp(
  telefone: string | null | undefined,
  nome: string,
  url: string
): string | null {
  const digitos = (telefone ?? '').replace(/\D/g, '');
  if (digitos.length < 10) return null;
  const numero = digitos.startsWith('55') ? digitos : `55${digitos}`;
  const primeiro = nome.trim().split(/\s+/)[0];
  const saudacao = primeiro ? `Oi, ${primeiro}!` : 'Oi!';
  const texto = `${saudacao} Segue o link para pagar sua compra no cartão: ${url}`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}
```

- [ ] **Step 3: Componente**

`apps/admin/src/components/venda-rapida-card.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { formatDate, formatPrice } from '../lib/format';
import { nomeDaVenda, PAGAMENTO_DA_VENDA, ROTULO_DA_VENDA } from '../lib/vendas-rapidas';
import type { Sale } from '../lib/types';

/**
 * Venda rapida na lista de Pedidos: SO LEITURA, de proposito.
 *
 * Nao tem endereco, etiqueta, rastreio, estorno nem folha de separacao: os
 * ajudantes da tela de pedidos produzem "CPF: undefined" e links de WhatsApp
 * sem numero quando faltam esses campos, e o botao de estornar sempre falha
 * (nao ha cobranca online). Cancelar ou quitar fica em Vendas > Historico e
 * Contas.
 */
export function VendaRapidaCard({
  sale,
  expanded,
  onToggle,
}: {
  sale: Sale;
  expanded: boolean;
  onToggle: () => void;
}) {
  const [copiado, setCopiado] = useState<boolean | null>(null);
  const rotulo = ROTULO_DA_VENDA[sale.status];

  async function copiar(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(null), 2500);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <div className="card !p-3">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between text-left"
      >
        <div>
          <p className="flex flex-wrap items-center gap-2 text-sm font-bold">
            {nomeDaVenda(sale)}
            <span className="rounded bg-ink px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
              Venda rápida
            </span>
          </p>
          <p className="text-xs text-black/50">
            {formatDate(sale.createdAt)} · {PAGAMENTO_DA_VENDA[sale.paymentMethod]}
            {sale.installments > 1 && ` · ${sale.installments}x`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{formatPrice(sale.total)}</span>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${rotulo.style}`}>
            {rotulo.label}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="mt-3 space-y-3 border-t border-black/10 pt-3 text-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-black/50">Itens</p>
            <ul className="mt-1 space-y-1">
              {sale.items.map((item) => (
                <li key={item.id} className="flex justify-between gap-2">
                  <span>
                    {item.quantity}x {item.productVariant.product.name} ({item.productVariant.color}/
                    {item.productVariant.size})
                  </span>
                  <span className="shrink-0 font-medium">
                    {formatPrice(item.unitPrice * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {sale.asaasInvoiceUrl && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-black/50">
                Link de pagamento (cartão)
              </p>
              <div className="mt-1 flex gap-2">
                <a
                  href={sale.asaasInvoiceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary !py-1.5 text-xs"
                >
                  Abrir link
                </a>
                <button
                  type="button"
                  onClick={() => copiar(sale.asaasInvoiceUrl as string)}
                  className="btn-secondary !py-1.5 text-xs"
                >
                  {copiado ? 'Copiado' : 'Copiar link'}
                </button>
              </div>
              {copiado === false && (
                <p className="mt-1 text-xs text-red-600">
                  Não consegui copiar sozinho. Use “Abrir link” e copie o endereço de lá.
                </p>
              )}
              {sale.status === 'aguardando_pagamento' && (
                <p className="mt-2 text-xs text-black/50">
                  A peça só sai do estoque quando o pagamento no cartão for aprovado.
                </p>
              )}
            </div>
          )}

          <p className="text-xs text-black/50">
            Venda feita pela venda rápida. Para cancelar, use Vendas &gt; Histórico; para quitar
            fiado, use Contas.
          </p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Type-check**

Run: `npx nx build admin`
Expected: **falha** em `sales-history-client.tsx` (`STATUS_LABEL: Record<Sale['status'], string>` agora exige as 4 chaves). Isso é esperado e é consertado na Task 12; qualquer **outro** erro é seu. Confirme que o erro listado é só esse.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/lib/types.ts apps/admin/src/lib/vendas-rapidas.ts apps/admin/src/components/venda-rapida-card.tsx
git commit -m "Admin: tipos, utilitarios e linha somente-leitura da venda rapida em Pedidos" \
  -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

(O commit sai com o build do admin quebrado só em `sales-history-client.tsx`; a Task 12 fecha isso. Não faça push entre as tarefas.)

---

### Task 11: Admin — formulário da venda rápida

**Files:**
- Modify: `apps/admin/src/app/vendas/sales-page-client.tsx`

**Interfaces:**
- Consumes: `linkWhatsApp` (Task 10), `POST /sales` com `customerName`, `customerDocument`, `paymentLink` (Tasks 3-4).
- Produces: dois botões de fechamento ("OK — pago" e "Gerar link de cartão"), campo "Nome da cliente", campo CPF só no caminho do link, recibo com o link (copiar e WhatsApp).

- [ ] **Step 1: Aplicar as edições**

`pares.json` para `apps/admin/src/app/vendas/sales-page-client.tsx`:

```json
[
  {
    "de": "import { formatPrice } from '../../lib/format';",
    "para": "import { formatPrice } from '../../lib/format';\nimport { linkWhatsApp } from '../../lib/vendas-rapidas';"
  },
  {
    "de": "  const [error, setError] = useState('');\n  const [receipt, setReceipt] = useState<{ id: string; total: number; status: string } | null>(\n    null\n  );",
    "para": "  const [error, setError] = useState('');\n  // Nome livre: nao cria cadastro de cliente.\n  const [customerName, setCustomerName] = useState('');\n  // CPF so existe no caminho do link: o Asaas nao cria cobranca sem ele.\n  const [customerDocument, setCustomerDocument] = useState('');\n  const [linkOpen, setLinkOpen] = useState(false);\n  const [copiado, setCopiado] = useState<boolean | null>(null);\n  const [receipt, setReceipt] = useState<{\n    id: string;\n    total: number;\n    status: string;\n    link: string | null;\n    nome: string;\n    telefone: string | null;\n  } | null>(null);"
  },
  {
    "de": "  async function handleConfirm() {\n    if (cart.length === 0) return;\n    if (openAccount && !customerId) {\n      setError('Selecione um cliente para deixar a conta em aberto.');\n      return;\n    }\n    setSubmitting(true);\n    setError('');\n    try {\n      const sale = await api.post<{ id: string; total: number; status: string }>('/sales', {\n        customerId: customerId || undefined,\n        paymentMethod: payment,\n        status: openAccount ? 'conta_aberta' : 'concluida',\n        installments: payment === 'cartao' ? installments : 1,\n        items: cart.map((l) => ({ productVariantId: l.variantId, quantity: l.quantity })),\n      });\n      setReceipt(sale);\n      setCart([]);\n    } catch (err) {\n      setError(err instanceof ApiError ? err.message : 'Erro ao registrar venda');\n    } finally {\n      setSubmitting(false);\n    }\n  }",
    "para": "  async function copiar(url: string) {\n    try {\n      await navigator.clipboard.writeText(url);\n      setCopiado(true);\n      setTimeout(() => setCopiado(null), 2500);\n    } catch {\n      setCopiado(false);\n    }\n  }\n\n  /** `link: false` = \"OK, pago\"; `link: true` = gera o link de cartao do Asaas. */\n  async function enviar(link: boolean) {\n    if (cart.length === 0) return;\n    if (!link && openAccount && !customerId) {\n      setError('Selecione um cliente para deixar a conta em aberto.');\n      return;\n    }\n    if (link && openAccount) {\n      setError('Link de pagamento e conta em aberto não combinam: desmarque \"Deixar conta em aberto\".');\n      return;\n    }\n    const selecionada = customers.find((c) => c.id === customerId);\n    const nome = customerName.trim() || selecionada?.name || '';\n    if (link && !nome) {\n      setError('Informe o nome da cliente para gerar o link.');\n      return;\n    }\n    if (link && customerDocument.replace(/\\D/g, '').length < 11) {\n      setError('Informe o CPF da cliente. O Asaas não cria cobrança sem CPF.');\n      return;\n    }\n\n    setSubmitting(true);\n    setError('');\n    try {\n      const sale = await api.post<{\n        id: string;\n        total: number;\n        status: string;\n        asaasInvoiceUrl?: string | null;\n      }>('/sales', {\n        customerId: customerId || undefined,\n        customerName: nome || undefined,\n        customerDocument: link ? customerDocument : undefined,\n        paymentLink: link || undefined,\n        paymentMethod: link ? 'cartao' : payment,\n        status: link ? undefined : openAccount ? 'conta_aberta' : 'concluida',\n        installments: link || payment === 'cartao' ? installments : 1,\n        items: cart.map((l) => ({ productVariantId: l.variantId, quantity: l.quantity })),\n      });\n      setReceipt({\n        id: sale.id,\n        total: sale.total,\n        status: sale.status,\n        link: sale.asaasInvoiceUrl ?? null,\n        nome,\n        telefone: selecionada?.phone ?? null,\n      });\n      setCart([]);\n      setCustomerName('');\n      setCustomerDocument('');\n      setLinkOpen(false);\n      setCopiado(null);\n    } catch (err) {\n      setError(err instanceof ApiError ? err.message : 'Erro ao registrar venda');\n    } finally {\n      setSubmitting(false);\n    }\n  }"
  },
  {
    "de": "          <p className=\"page-title\">\n            {receipt.status === 'conta_aberta' ? 'Conta aberta!' : 'Venda concluída!'}\n          </p>\n          <p className=\"text-black/60\">Total: {formatPrice(receipt.total)}</p>\n          <button type=\"button\" onClick={() => setReceipt(null)} className=\"btn-primary mt-4\">\n            Nova venda\n          </button>",
    "para": "          <p className=\"page-title\">\n            {receipt.link\n              ? 'Link gerado!'\n              : receipt.status === 'conta_aberta'\n                ? 'Conta aberta!'\n                : 'Venda concluída!'}\n          </p>\n          <p className=\"text-black/60\">Total: {formatPrice(receipt.total)}</p>\n\n          {receipt.link && (\n            <div className=\"mt-2 w-full max-w-sm space-y-2 text-left\">\n              <p className=\"text-xs text-black/60\">\n                A venda fica aguardando o pagamento. A peça só sai do estoque quando o cartão for\n                aprovado.\n              </p>\n              <input readOnly value={receipt.link} onFocus={(e) => e.currentTarget.select()} className=\"input-field\" />\n              <div className=\"flex gap-2\">\n                <button type=\"button\" onClick={() => copiar(receipt.link as string)} className=\"btn-secondary flex-1 !py-2 text-sm\">\n                  {copiado ? 'Copiado' : 'Copiar link'}\n                </button>\n                {linkWhatsApp(receipt.telefone, receipt.nome, receipt.link) && (\n                  <a\n                    href={linkWhatsApp(receipt.telefone, receipt.nome, receipt.link) as string}\n                    target=\"_blank\"\n                    rel=\"noreferrer\"\n                    className=\"btn-secondary flex-1 !py-2 text-center text-sm\"\n                  >\n                    Enviar no WhatsApp\n                  </a>\n                )}\n              </div>\n              {copiado === false && (\n                <p className=\"text-xs text-red-600\">\n                  Não consegui copiar sozinho: toque e segure no link acima para copiar.\n                </p>\n              )}\n            </div>\n          )}\n\n          <button type=\"button\" onClick={() => setReceipt(null)} className=\"btn-primary mt-4\">\n            Nova venda\n          </button>"
  },
  {
    "de": "        <div className=\"mt-4\">\n          <label className=\"mb-2 block text-sm font-semibold\">Forma de pagamento</label>",
    "para": "        {!customerId && (\n          <div className=\"mt-4\">\n            <label className=\"mb-1 block text-sm font-semibold\">Nome da cliente (opcional)</label>\n            <input\n              value={customerName}\n              onChange={(e) => setCustomerName(e.target.value)}\n              placeholder=\"Só para saber de quem foi a venda\"\n              className=\"input-field\"\n            />\n          </div>\n        )}\n\n        <div className=\"mt-4\">\n          <label className=\"mb-2 block text-sm font-semibold\">Forma de pagamento</label>"
  },
  {
    "de": "                onClick={() => setPayment(option.value)}",
    "para": "                onClick={() => {\n                  setPayment(option.value);\n                  // O link e so de cartao: trocar a forma de pagamento o desfaz.\n                  if (option.value !== 'cartao') setLinkOpen(false);\n                }}"
  },
  {
    "de": "        <button\n          type=\"button\"\n          disabled={cart.length === 0 || submitting}\n          onClick={handleConfirm}\n          className=\"btn-primary mt-4 w-full\"\n        >\n          {submitting ? 'Registrando...' : openAccount ? 'Abrir conta' : 'Confirmar venda'}\n        </button>",
    "para": "        {linkOpen && (\n          <div className=\"mt-4\">\n            <label className=\"mb-1 block text-sm font-semibold\">CPF da cliente</label>\n            <input\n              inputMode=\"numeric\"\n              value={customerDocument}\n              onChange={(e) => setCustomerDocument(e.target.value)}\n              placeholder=\"000.000.000-00\"\n              className=\"input-field\"\n            />\n            <p className=\"mt-1 text-xs text-black/50\">\n              O Asaas não cria a cobrança sem CPF. Escolha as parcelas acima antes de gerar o link.\n            </p>\n          </div>\n        )}\n\n        <button\n          type=\"button\"\n          disabled={cart.length === 0 || submitting}\n          onClick={() => enviar(false)}\n          className=\"btn-primary mt-4 w-full\"\n        >\n          {submitting && !linkOpen ? 'Registrando...' : openAccount ? 'Abrir conta' : 'OK — pago'}\n        </button>\n        <button\n          type=\"button\"\n          disabled={cart.length === 0 || submitting}\n          onClick={() => {\n            if (!linkOpen) {\n              setLinkOpen(true);\n              setPayment('cartao');\n              setError('');\n              return;\n            }\n            enviar(true);\n          }}\n          className=\"btn-secondary mt-2 w-full\"\n        >\n          {submitting && linkOpen ? 'Gerando link...' : linkOpen ? 'Gerar link agora' : 'Gerar link de cartão'}\n        </button>"
  }
]
```

- [ ] **Step 2: Type-check**

Run: `npx nx build admin`
Expected: o único erro restante é o de `sales-history-client.tsx` (Task 12). Nenhum erro em `sales-page-client.tsx`.

- [ ] **Step 3: Conferência visual do fluxo (sem backend)**

Se o ambiente permitir `npx nx dev admin` com API de desenvolvimento, confira em `/admin/vendas`: (a) o campo "Nome da cliente" some quando um cliente é escolhido; (b) "Gerar link de cartão" revela o CPF e força "Cartão"; (c) trocar para Pix esconde o CPF; (d) o recibo do link mostra o endereço, "Copiar link" e, **só com telefone**, "Enviar no WhatsApp". Se não for possível rodar, registre isso na entrega (item de verificação manual).

- [ ] **Step 4: Commit**

```bash
git add apps/admin/src/app/vendas/sales-page-client.tsx
git commit -m "Venda rapida: nome da cliente, 'OK - pago' ou link de cartao com CPF" \
  -m "O campo de nome nao cria cadastro. O CPF so aparece no caminho do link, com a explicacao de que o Asaas exige. O recibo do link tem copiar e WhatsApp (este so quando ha telefone: wa.me sem numero e link quebrado)." \
  -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 12: Admin — Pedidos intercala vendas; filtros das telas que leem `/sales`

**Files:**
- Modify: `apps/admin/src/app/pedidos/orders-page-client.tsx`
- Modify: `apps/admin/src/app/vendas/historico/sales-history-client.tsx`
- Modify: `apps/admin/src/app/contas/accounts-page-client.tsx`
- Modify: `apps/admin/src/app/fiscal/page.tsx`

**Interfaces:**
- Consumes: `mesclar`, `statusDeVenda`, `<VendaRapidaCard>` (Task 10); `GET /sales?status=&q=` (Task 7); `PATCH /sales/:id/status` com `cancelada` (Task 5).
- Produces: `/admin/pedidos` mostra vendas rápidas com selo; `/admin/vendas/historico` cancela venda e soma só o que é dinheiro; `/admin/contas` (aba Parceladas) e `/admin/fiscal` ignoram venda cancelada/pendente.

- [ ] **Step 1: Pedidos**

`pares.json` para `apps/admin/src/app/pedidos/orders-page-client.tsx`:

```json
[
  {
    "de": "import type { Order, OrderStatus } from '../../lib/types';",
    "para": "import { VendaRapidaCard } from '../../components/venda-rapida-card';\nimport { mesclar, statusDeVenda } from '../../lib/vendas-rapidas';\nimport type { Order, OrderStatus, Sale } from '../../lib/types';"
  },
  {
    "de": "  const [orders, setOrders] = useState<Order[] | null>(null);",
    "para": "  const [orders, setOrders] = useState<Order[] | null>(null);\n  // Vendas rapidas (balcao) intercaladas na lista: so leitura.\n  const [sales, setSales] = useState<Sale[] | null>(null);\n  const [erroVendas, setErroVendas] = useState('');"
  },
  {
    "de": "      api\n        .get<Order[]>(`/orders${query ? `?${query}` : ''}`)\n        .then((data) => {\n          setOrders(data);\n          setError('');\n        })\n        .catch((e) => setError(e?.message ?? 'Não foi possível carregar os pedidos.'));",
    "para": "      api\n        .get<Order[]>(`/orders${query ? `?${query}` : ''}`)\n        .then((data) => {\n          setOrders(data);\n          setError('');\n        })\n        .catch((e) => setError(e?.message ?? 'Não foi possível carregar os pedidos.'));\n\n      const vendas = statusDeVenda(statusFilter);\n      if (vendas.buscar) {\n        const vp = new URLSearchParams();\n        if (vendas.status) vp.set('status', vendas.status);\n        if (q) vp.set('q', q);\n        const vq = vp.toString();\n        api\n          .get<Sale[]>(`/sales${vq ? `?${vq}` : ''}`)\n          .then((data) => {\n            setSales(data);\n            setErroVendas('');\n          })\n          .catch(() => {\n            setSales([]);\n            setErroVendas('Não foi possível carregar as vendas rápidas. Os pedidos do site estão certos.');\n          });\n      } else {\n        setSales([]);\n        setErroVendas('');\n      }"
  },
  {
    "de": "  function reload() {\n    setReloadKey((key) => key + 1);\n  }",
    "para": "  function reload() {\n    setReloadKey((key) => key + 1);\n  }\n\n  // Enquanto as vendas nao chegam, a lista mostra so os pedidos.\n  const lista = orders === null ? null : mesclar(orders, sales ?? []);"
  },
  {
    "de": "        {error && (\n          <p className=\"mt-3 rounded-2xl bg-red-50 px-4 py-2 text-sm text-red-600\">{error}</p>\n        )}",
    "para": "        {error && (\n          <p className=\"mt-3 rounded-2xl bg-red-50 px-4 py-2 text-sm text-red-600\">{error}</p>\n        )}\n        {erroVendas && (\n          <p className=\"mt-3 rounded-2xl bg-red-50 px-4 py-2 text-sm text-red-600\">{erroVendas}</p>\n        )}"
  },
  {
    "de": "        {orders && orders.length === 0 && (",
    "para": "        {lista && lista.length === 0 && ("
  },
  {
    "de": "          {orders?.map((order) => {\n            const expanded = expandedId === order.id;",
    "para": "          {lista?.map((item) => {\n            if (item.tipo === 'venda') {\n              return (\n                <VendaRapidaCard\n                  key={`venda-${item.sale.id}`}\n                  sale={item.sale}\n                  expanded={expandedId === item.sale.id}\n                  onToggle={() => setExpandedId(expandedId === item.sale.id ? null : item.sale.id)}\n                />\n              );\n            }\n            const order = item.order;\n            const expanded = expandedId === order.id;"
  }
]
```

- [ ] **Step 2: Histórico (cancelar venda e total)**

`pares.json` para `apps/admin/src/app/vendas/historico/sales-history-client.tsx`:

```json
[
  {
    "de": "import { api } from '../../../lib/api';",
    "para": "import { api, ApiError } from '../../../lib/api';"
  },
  {
    "de": "const STATUS_LABEL: Record<Sale['status'], string> = {\n  concluida: 'Concluída',\n  conta_aberta: 'Em aberto',\n};",
    "para": "const STATUS_LABEL: Record<Sale['status'], string> = {\n  concluida: 'Concluída',\n  conta_aberta: 'Em aberto',\n  aguardando_pagamento: 'Aguardando pagamento',\n  cancelada: 'Cancelada',\n};"
  },
  {
    "de": "  const [sales, setSales] = useState<Sale[] | null>(null);\n\n  useEffect(() => {\n    api.get<Sale[]>('/sales').then(setSales);\n  }, []);",
    "para": "  const [sales, setSales] = useState<Sale[] | null>(null);\n  const [cancelando, setCancelando] = useState<string | null>(null);\n  const [erro, setErro] = useState('');\n\n  function carregar() {\n    api.get<Sale[]>('/sales').then(setSales);\n  }\n\n  useEffect(carregar, []);\n\n  async function cancelar(sale: Sale) {\n    // Cobranca do Asaas nao se desfaz daqui (nao ha DELETE no AsaasService): avisar\n    // o que a lojista precisa fazer se a cliente ainda pagar o link.\n    const aviso =\n      sale.status === 'aguardando_pagamento'\n        ? 'Cancelar esta venda? O link de pagamento continua existindo no Asaas: se a cliente pagar depois, o dinheiro entra sem venda e você precisa devolver pelo painel do Asaas.'\n        : 'Cancelar esta venda? As peças voltam para o estoque.';\n    if (!window.confirm(aviso)) return;\n\n    setCancelando(sale.id);\n    setErro('');\n    try {\n      await api.patch(`/sales/${sale.id}/status`, { status: 'cancelada' });\n      carregar();\n    } catch (e) {\n      setErro(e instanceof ApiError ? e.message : 'Não foi possível cancelar a venda.');\n    } finally {\n      setCancelando(null);\n    }\n  }"
  },
  {
    "de": "  const total = filtered.reduce((sum, s) => sum + s.total, 0);",
    "para": "  // So o que e dinheiro: venda cancelada ou ainda aguardando o link nao entra no total.\n  const total = filtered\n    .filter((s) => s.status === 'concluida' || s.status === 'conta_aberta')\n    .reduce((sum, s) => sum + s.total, 0);"
  },
  {
    "de": "        {sales === null && <p className=\"mt-8 text-center text-sm text-black/50\">Carregando...</p>}",
    "para": "        {erro && <p className=\"mt-3 rounded-2xl bg-red-50 px-4 py-2 text-sm text-red-600\">{erro}</p>}\n\n        {sales === null && <p className=\"mt-8 text-center text-sm text-black/50\">Carregando...</p>}"
  },
  {
    "de": "                    sale.status === 'concluida'\n                      ? 'bg-emerald-100 text-emerald-700'\n                      : 'bg-amber-100 text-amber-700'",
    "para": "                    sale.status === 'concluida'\n                      ? 'bg-emerald-100 text-emerald-700'\n                      : sale.status === 'cancelada'\n                        ? 'bg-black/10 text-black/50'\n                        : 'bg-amber-100 text-amber-700'"
  },
  {
    "de": "                <span className=\"font-semibold\">{formatPrice(sale.total)}</span>\n              </div>\n            </div>\n          ))}",
    "para": "                <span className=\"font-semibold\">{formatPrice(sale.total)}</span>\n              </div>\n              {sale.status !== 'cancelada' && (\n                <button\n                  type=\"button\"\n                  onClick={() => cancelar(sale)}\n                  disabled={cancelando === sale.id}\n                  className=\"btn-secondary mt-2 w-full !py-1.5 text-xs\"\n                >\n                  {cancelando === sale.id ? 'Cancelando...' : 'Cancelar venda'}\n                </button>\n              )}\n            </div>\n          ))}"
  }
]
```

- [ ] **Step 3: Contas e Fiscal**

`pares.json` para `apps/admin/src/app/contas/accounts-page-client.tsx`:

```json
[
  {
    "de": "      : sales.filter((s) => s.installments > 1);",
    "para": "      : sales.filter((s) => s.installments > 1 && s.status !== 'cancelada');"
  }
]
```

`pares.json` para `apps/admin/src/app/fiscal/page.tsx`:

```json
[
  {
    "de": "  }, []);\n\n  return (\n    <div>\n      <TopBar title=\"Área Fiscal\" />",
    "para": "  }, []);\n\n  // Nota simulada so para o que virou venda de fato: link ainda nao pago e venda\n  // cancelada nao geram nota.\n  const notas = sales?.filter((s) => s.status === 'concluida' || s.status === 'conta_aberta') ?? null;\n\n  return (\n    <div>\n      <TopBar title=\"Área Fiscal\" />"
  },
  {
    "de": "        {sales === null && <p className=\"mt-4 text-center text-sm text-black/50\">Carregando...</p>}",
    "para": "        {notas === null && <p className=\"mt-4 text-center text-sm text-black/50\">Carregando...</p>}"
  },
  {
    "de": "          {sales?.map((sale, index) => (",
    "para": "          {notas?.map((sale, index) => ("
  },
  {
    "de": "NFC-e simulada #{sales.length - index}",
    "para": "NFC-e simulada #{notas.length - index}"
  }
]
```

Depois confirme que não sobrou nenhum uso de `sales` onde devia ser `notas`: `git grep -n "sales" apps/admin/src/app/fiscal/page.tsx` — só podem restar `useState<Sale[]...>`, `setSales`, `api.get<Sale[]>('/sales')` e a definição de `notas`. Se houver outro uso (por exemplo um total), troque por `notas`.

- [ ] **Step 4: Type-check do admin inteiro**

Run: `npx nx build admin`
Expected: build conclui **sem erros** (o erro de `STATUS_LABEL` da Task 10 desapareceu).

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/app/pedidos/orders-page-client.tsx apps/admin/src/app/vendas/historico/sales-history-client.tsx apps/admin/src/app/contas/accounts-page-client.tsx apps/admin/src/app/fiscal/page.tsx
git commit -m "Pedidos mostra a venda rapida com selo; historico cancela venda; filtros de status" \
  -m "A lista de Pedidos intercala GET /sales em modo so leitura (sem etiqueta, rastreio ou estorno). Historico ganha 'Cancelar venda' e deixa de somar venda cancelada ou pendente. Fiscal e a aba Parceladas de Contas deixam de contar venda cancelada." \
  -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 13: Verificação final e entrega

**Files:** nenhum novo.

- [ ] **Step 1: Suíte e builds completos**

```bash
npx nx test api --skip-nx-cache
npx nx build api
npx nx build admin
```
Expected: todas as suítes passam (as 71 que já existiam **mais** as novas: `sale-rules`, `sale-stock`, `sales.service`, `webhooks.controller`, `dashboard.service`, `replace-catalog`); os dois builds concluem sem erro.

- [ ] **Step 2: Conferir que nada ficou de fora do commit**

```bash
git status --short
git log --oneline -14
```
Expected: árvore limpa; 12 commits novos (um por tarefa, na ordem).

- [ ] **Step 3: Verificação manual pós-deploy (roteiro para a dona da loja — não é automatizável)**

Registre no relatório final que **nada disto foi exercitado contra o Asaas real**; só os mocks. Roteiro, em ordem:

1. Venda "OK — pago" de 1 peça, com e sem nome: aparece em `/admin/pedidos` com selo "VENDA RÁPIDA", status "Pago", e o estoque da variação cai 1 em `/admin/estoque`.
2. Cancelar essa venda em `Vendas > Histórico > Cancelar venda`: o estoque volta e a linha em Pedidos vira "Cancelado".
3. Link de cartão com uma peça barata (Asaas **sandbox** se `ASAAS_ENV` não for `production`; senão uma cobrança real de baixo valor): o recibo mostra o link; em Pedidos a venda fica "Aguardando pagamento" e o **estoque não muda**.
4. Pagar o link: em alguns segundos a venda vira "Pago" **e só então** o estoque cai 1. Conferir nos logs da API (`noexcuse-api`, janela de 1h) que o webhook chegou e que não houve erro.
5. Cancelar uma venda aguardando link: o estoque **não** muda e o aviso sobre o link ainda aberto no Asaas aparece.

- [ ] **Step 4: Entrega (decisão da dona da loja, não do executor)**

Não faça `git push`. Relate: (a) a migration `20261108120000_add_sale_quick_link_fields` roda sozinha no build da API (`prisma migrate deploy`) e é aditiva; (b) o push em `claude/loja-roupas-academia-cpyyty` dispara deploy de produção dos três projetos; (c) o webhook do Asaas **já** aponta para `/api/webhooks/asaas` e `ASAAS_WEBHOOK_TOKEN` já existe, então nenhum ajuste de configuração é necessário para os eventos de venda chegarem; (d) o resíduo conhecido: cancelar uma venda com link pendente **não** cancela a cobrança no Asaas (o `AsaasService` não tem exclusão), por isso o aviso na tela.

---

## Cobertura da spec

| Spec | Onde |
|---|---|
| §1 Modelo (5 colunas, status, índice) | Task 1 |
| §2 Dois desfechos, validação, `conta_aberta` movida para o serviço | Tasks 2, 3 |
| §3 Ordem das operações do link | Task 4 |
| §4 Estoque (tabela de transição, negativar no webhook) | Tasks 2, 5, 6 — **sem a janela de data (ver "Desvio deliberado")** |
| §5 Cancelar venda (Bug 1) | Task 5 (API) e Task 12 (botão) |
| §6 Webhook (prefixo, fallback, trava, guarda de venda concluída) | Task 6 |
| §7 `GET /sales` com filtros | Task 7 |
| §8 Tela `/admin/vendas` | Task 11 |
| §9 Tela `/admin/pedidos` | Tasks 10, 12 |
| §10 Quatro filtros | Task 8 (dashboard ×2), Task 12 (Fiscal, Contas) |
| Trabalho adjacente: Bug 2 (`replaceCatalog`) | Task 9 |
| Trabalho adjacente: commitar a correção do Asaas | **já feito** (commit `d4ce0e1`, em produção) |
