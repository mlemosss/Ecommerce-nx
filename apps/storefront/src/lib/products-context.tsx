'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { Product } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api';

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
    category: item.category as Product['category'],
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

interface ProductsContextValue {
  products: Product[];
  isLoaded: boolean;
}

const ProductsContext = createContext<ProductsContextValue | undefined>(undefined);

export function ProductsProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/catalog/products`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: CatalogProduct[]) => setProducts(data.map(toProduct)))
      .catch(() => setProducts([]))
      .finally(() => setIsLoaded(true));
  }, []);

  return <ProductsContext.Provider value={{ products, isLoaded }}>{children}</ProductsContext.Provider>;
}

export function useProducts(): ProductsContextValue {
  const ctx = useContext(ProductsContext);
  if (!ctx) {
    throw new Error('useProducts deve ser usado dentro de um ProductsProvider');
  }
  return ctx;
}
