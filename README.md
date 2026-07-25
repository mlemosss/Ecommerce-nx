# GRITWEAR — Loja de Roupas de Academia

Monorepo [Nx](https://nx.dev) com uma loja virtual (storefront) de roupas e acessórios para academia, construída em Next.js (App Router) + Tailwind CSS.

## O que tem na loja

- **Home** com hero, categorias em destaque, produtos mais vendidos/novidades e newsletter.
- **Catálogo** (`/produtos`) com filtro por categoria e ordenação por preço.
- **Página de produto** (`/produtos/[slug]`) com seleção de tamanho/cor, quantidade e produtos relacionados.
- **Carrinho** (`/carrinho`) persistido em `localStorage`.
- **Checkout simulado** (`/checkout`) com formulário de entrega/pagamento (Pix, cartão, boleto) e página de confirmação de pedido.

Todos os dados de produto são mockados em `apps/storefront/src/lib/products.ts` — não há backend nem processamento de pagamento real.

## Rodando o projeto

```sh
npm install
npx nx dev storefront      # ambiente de desenvolvimento
npx nx build storefront    # build de produção
npx nx lint storefront     # lint
```

Para ver todos os targets disponíveis: `npx nx show project storefront`.
