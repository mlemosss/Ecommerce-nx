import type { MetadataRoute } from 'next';
import { categories, getProducts } from '../lib/products';

const STOREFRONT_URL = (
  process.env.NEXT_PUBLIC_STOREFRONT_URL || 'https://www.noexcusenx.com.br'
).replace(/\/$/, '');

/** Páginas fixas mais uma entrada por produto e por categoria com peça. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getProducts();
  const now = new Date();

  const fixed = ['', '/produtos', '/sale', '/quem-somos', '/em-breve', '/privacidade'].map(
    (path) => ({
      url: `${STOREFRONT_URL}${path}`,
      lastModified: now,
      priority: path === '' ? 1 : 0.7,
    })
  );

  const withProducts = new Set(products.map((p) => p.category));
  const categoryPages = categories
    .filter((c) => withProducts.has(c.value))
    .map((c) => ({
      url: `${STOREFRONT_URL}/produtos?categoria=${c.value}`,
      lastModified: now,
      priority: 0.6,
    }));

  const productPages = products.map((product) => ({
    url: `${STOREFRONT_URL}/produtos/${product.slug}`,
    lastModified: now,
    priority: 0.8,
  }));

  return [...fixed, ...categoryPages, ...productPages];
}
