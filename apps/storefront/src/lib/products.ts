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

// Fundo de quem ainda não tem foto. A paleta da loja é monocromática, então
// estes gradientes são só cinzas — o verde e o azul de antes destoavam do
// resto da vitrine e disputavam atenção com a foto do produto ao lado.
const CATEGORY_GRADIENT: Record<string, [string, string]> = {
  leggings: ['#1c1c1f', '#3a3a3f'],
  tops: ['#151517', '#45454b'],
  shorts: ['#1a1a1d', '#4b4b51'],
  camisetas: ['#18181b', '#3f3f46'],
  jaquetas: ['#131316', '#35353a'],
  acessorios: ['#101012', '#2f2f34'],
};

export interface CatalogProduct {
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
  variants: { color: string; size: string; stock: number; price: number }[];
  priceRange: { min: number; max: number } | null;
  isNew: boolean;
}

export function toProduct(item: CatalogProduct): Product {
  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    category: item.category as Category,
    price: item.price,
    priceRange: item.priceRange,
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

export function getVariantPrice(product: Product, color: string, size: string): number {
  const variant = product.variants?.find((v) => v.color === color && v.size === size);
  return variant?.price ?? product.price;
}
