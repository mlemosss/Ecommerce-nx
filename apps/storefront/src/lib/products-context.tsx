'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { Product } from './types';
import { type CatalogProduct, toProduct } from './products';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api';

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
