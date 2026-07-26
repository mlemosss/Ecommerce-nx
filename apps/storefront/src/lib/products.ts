import type { Category, Product } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api';

export const categories: { value: Category; label: string; description: string }[] = [
  { value: 'leggings', label: 'Leggings', description: 'Compressão e liberdade de movimento' },
  { value: 'tops', label: 'Tops', description: 'Sustentação para qualquer treino' },
  { value: 'shorts', label: 'Shorts', description: 'Leveza para dias de alta intensidade' },
  { value: 'camisetas', label: 'Camisetas', description: 'Respirabilidade em cada repetição' },
  { value: 'jaquetas', label: 'Jaquetas', description: 'Do aquecimento ao pós-treino' },
  { value: 'acessorios', label: 'Acessórios', description: 'Os detalhes que fazem diferença' },
];

const CATEGORY_GRADIENT: Record<string, [string, string]> = {
  leggings: ['#1f1f24', '#3a3a42'],
  tops: ['#1a1a1a', '#a1a1aa'],
  shorts: ['#101418', '#334155'],
  camisetas: ['#18181b', '#3f3f46'],
  jaquetas: ['#101a12', '#294d33'],
  acessorios: ['#111827', '#374151'],
};

interface CatalogProduct {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  images: string[];
  colors: string[];
  sizes: string[];
  variants: { color: string; size: string; stock: number }[];
  isNew: boolean;
}

function toProduct(item: CatalogProduct): Product {
  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    category: item.category as Category,
    price: item.price,
    compareAtPrice: item.compareAtPrice ?? undefined,
    colors: item.colors,
    sizes: item.sizes,
    description: item.description,
    isNew: item.isNew,
    gradient: CATEGORY_GRADIENT[item.category] ?? ['#1a1a1a', '#3a3a42'],
    images: item.images,
    variants: item.variants,
  };
}

export async function getProducts(category?: string): Promise<Product[]> {
  try {
    const qs = category ? `?category=${encodeURIComponent(category)}` : '';
    const res = await fetch(`${API_URL}/catalog/products${qs}`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const data: CatalogProduct[] = await res.json();
    return data.map(toProduct);
  } catch {
    return [];
  }
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  try {
    const res = await fetch(`${API_URL}/catalog/products/${slug}`, { next: { revalidate: 60 } });
    if (!res.ok) return undefined;
    const data: CatalogProduct = await res.json();
    return toProduct(data);
  } catch {
    return undefined;
  }
}

export async function getRelatedProducts(product: Product, limit = 4): Promise<Product[]> {
  const list = await getProducts(product.category);
  return list.filter((p) => p.id !== product.id).slice(0, limit);
}

export async function getFeaturedProducts(limit = 8): Promise<Product[]> {
  const list = await getProducts();
  return list.slice(0, limit);
}
