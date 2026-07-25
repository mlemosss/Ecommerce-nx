# NO EXCUSE — Loja de Roupas de Academia

> Login do painel admin (seed): `admin@noexcuse.com.br` / `NoExcuse@2026`

Monorepo [Nx](https://nx.dev) com três aplicações:

| App | O que é | Stack |
|---|---|---|
| `apps/storefront` | Loja virtual (frontend do cliente) | Next.js + Tailwind CSS, dados mockados |
| `apps/admin` | Painel de gestão (produtos, estoque, clientes, vendas, despesas, fiscal) | Next.js + Tailwind CSS |
| `apps/api` | Backend REST usado pelo painel admin | NestJS + Prisma + PostgreSQL |

## apps/storefront — Loja virtual

- **Home** com hero, categorias em destaque, produtos mais vendidos/novidades e newsletter.
- **Catálogo** (`/produtos`) com filtro por categoria e ordenação por preço.
- **Página de produto** (`/produtos/[slug]`) com seleção de tamanho/cor, quantidade e produtos relacionados.
- **Carrinho** (`/carrinho`) persistido em `localStorage`.
- **Checkout simulado** (`/checkout`) com formulário de entrega/pagamento (Pix, cartão, boleto) e confirmação de pedido.

Os dados de produto são mockados em `apps/storefront/src/lib/products.ts` (não consome a API ainda — é uma evolução natural para uma próxima etapa).

## apps/admin — Painel de gestão

Painel mobile-first inspirado em apps de gestão de loja, com:

- **Produtos + Estoque**: cadastro com custo, preço, fotos (upload direto, guardadas no banco), variações de cor/tamanho e quantidade; tela de estoque com edição rápida e filtro de estoque baixo.
- **Clientes (CRM)**: lista com busca, cadastro completo (PF/PJ, CPF/CNPJ, endereço, tags), ações rápidas (venda, WhatsApp).
- **Vendas rápidas (PDV)**: seleciona produtos/variação, cliente opcional, forma de pagamento e parcelas (cartão); pode registrar como concluída ou deixar como **conta em aberto (fiado)**. Abate o estoque automaticamente.
- **Contas de clientes** (`/contas`): lista contas em aberto (com ação de quitar) e vendas parceladas.
- **Seu financeiro** (aba Gerencial): fluxo de caixa (entradas/saídas do dia, caixa atual), receitas/despesas do mês e lucro bruto — tudo calculado em tempo real a partir das vendas e despesas reais, não valores fixos.
- **Despesas**: lista e cadastro de despesas por categoria.
- **Área Fiscal**: **módulo simulado** — cada venda concluída aparece como uma "nota simulada". Emissão fiscal real (NFC-e/NF-e) exige certificado digital e integração com a SEFAZ, fora do escopo desta demonstração.
- **Integração Meta** (`/meta`): sincroniza os produtos ativos com um catálogo do Meta Commerce Manager via Graph API (`items_batch`), para uso em anúncios e Instagram/Facebook Shop.

**Autenticação**: login com e-mail/senha (JWT), protegendo tanto as páginas do admin quanto a API. Usuário seedado acima.

O catálogo de tops, leggings e shorts já reflete os valores reais informados (custo, preço e estoque); as demais categorias (camisetas, jaquetas, acessórios) seguem como estimativa até os dados reais serem enviados.

## apps/api — Backend

API REST em NestJS com Prisma (PostgreSQL):

- `GET/POST/PATCH/DELETE /api/products`, `PATCH /api/products/variants/:id/stock`, `GET /api/products/low-stock`
- `POST /api/uploads/products` — recebe uma foto em base64 (data URL), valida formato/tamanho (até 5MB, JPG/PNG/WEBP) e a devolve para ser salva no campo `images` do produto (a foto fica armazenada no próprio banco, sem storage externo)
- `GET/POST/PATCH/DELETE /api/customers`
- `GET/POST /api/sales` (abate estoque em transação; aceita `status: conta_aberta` e `installments`), `PATCH /api/sales/:id/status` (quitar conta)
- `GET/POST/PATCH/DELETE /api/expenses`
- `GET /api/dashboard/summary` (caixa atual, receitas/despesas do mês, lucro bruto, contas abertas, parceladas)
- `POST /api/auth/login`, `GET /api/auth/me` — todas as demais rotas exigem `Authorization: Bearer <token>`
- `GET /api/meta/status`, `POST /api/meta/sync`, `GET /api/meta/batch-status/:handle` — exige `META_ACCESS_TOKEN` e `META_CATALOG_ID` configurados

## Rodando o projeto

Requer um banco PostgreSQL rodando (local via Docker/instalação nativa, ou um banco gratuito na nuvem como Neon/Supabase/Vercel Postgres).

```sh
npm install

# 1. Banco de dados (uma vez, ou após mudar o schema)
cp apps/api/.env.example apps/api/.env
# edite apps/api/.env com a DATABASE_URL do seu Postgres
npx nx run api:prisma-migrate
npx nx run api:seed        # popula com produtos/clientes/despesas de exemplo

# 2. Subir tudo (em terminais separados)
npx nx serve api           # http://localhost:3333/api
npx nx dev admin           # http://localhost:4200
npx nx dev storefront      # http://localhost:3000
```

Outros comandos úteis: `npx nx build <app>`, `npx nx lint <app>`, `npx nx show project <app>`.

O admin lê a URL da API de `apps/admin/.env.local` (`NEXT_PUBLIC_API_URL`, padrão `http://localhost:3333/api`).

## Deploy

- **Loja (storefront)**: publicada na Vercel a partir da branch deste repositório.
- **Admin + API**: ainda não publicados. A API está pronta para rodar como Vercel Functions
  (`apps/api/api/index.js`, `apps/api/vercel.json`), faltando apenas: (1) criar um banco Postgres
  gerenciado e configurar `DATABASE_URL`/`JWT_SECRET` como variáveis de ambiente do projeto na Vercel,
  e (2) publicar `apps/admin` apontando `NEXT_PUBLIC_API_URL` para a URL da API publicada.
