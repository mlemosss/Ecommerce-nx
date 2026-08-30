'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { Product } from './types';
import { type CatalogProduct, toProduct } from './products';
import catalogoReserva from './catalogo-reserva.json';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api';

interface ProductsContextValue {
  products: Product[];
  isLoaded: boolean;
}

const ProductsContext = createContext<ProductsContextValue | undefined>(undefined);

export function ProductsProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  /**
   * Falhar aqui mostrava R$ 0,00 no carrinho e no checkout.
   *
   * O subtotal sai do cruzamento entre o carrinho e este catálogo. Com a lista
   * vazia, cada linha do carrinho não achava o produto e sumia da tela: a
   * pessoa via o carrinho em branco e **Total R$ 0,00**, com o botão de
   * confirmar ainda ativo. O servidor reprecifica tudo e cobra o valor certo —
   * ou seja, ela pagaria um número que a tela nunca mostrou.
   *
   * O servidor já tinha a cópia do catálogo no bundle desde a queda do banco;
   * o navegador não usava. É a mesma cópia, e é melhor um preço de ontem do que
   * um preço zero.
   */
  useEffect(() => {
    fetch(`${API_URL}/catalog/products`)
      .then((res) => {
        if (!res.ok) throw new Error(`catálogo respondeu ${res.status}`);
        return res.json();
      })
      .then((data: CatalogProduct[]) => setProducts(data.map(toProduct)))
      .catch(() => setProducts((catalogoReserva as CatalogProduct[]).map(toProduct)))
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
