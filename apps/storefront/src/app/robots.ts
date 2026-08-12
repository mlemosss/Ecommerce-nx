import type { MetadataRoute } from 'next';

const STOREFRONT_URL = (
  process.env.NEXT_PUBLIC_STOREFRONT_URL || 'https://www.noexcusenx.com.br'
).replace(/\/$/, '');

/**
 * Antes não existia robots.txt (o endereço respondia 404) e carrinho, checkout
 * e área do cliente eram indexáveis. Página de carrinho no Google não traz
 * visita útil e ainda expõe telas que só fazem sentido com sessão.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/carrinho', '/checkout', '/conta', '/pedido-confirmado'],
    },
    sitemap: `${STOREFRONT_URL}/sitemap.xml`,
  };
}
