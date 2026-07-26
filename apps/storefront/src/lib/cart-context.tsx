'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { CartItem } from './types';
import { useProducts } from './products-context';

const STORAGE_KEY = 'no-excuse:cart';

interface CartContextValue {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: string, size: string, color: string) => void;
  updateQuantity: (
    productId: string,
    size: string,
    color: string,
    quantity: number
  ) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
  isLoaded: boolean;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

function sameLine(a: CartItem, b: Pick<CartItem, 'productId' | 'size' | 'color'>) {
  return a.productId === b.productId && a.size === b.size && a.color === b.color;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { products } = useProducts();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setItems(JSON.parse(raw));
      }
    } catch {
      // localStorage indisponível ou dado corrompido: segue com carrinho vazio
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, isLoaded]);

  const addItem = useCallback((item: CartItem) => {
    setItems((prev) => {
      const existing = prev.find((line) => sameLine(line, item));
      if (existing) {
        return prev.map((line) =>
          sameLine(line, item)
            ? { ...line, quantity: line.quantity + item.quantity }
            : line
        );
      }
      return [...prev, item];
    });
  }, []);

  const removeItem = useCallback(
    (productId: string, size: string, color: string) => {
      setItems((prev) => prev.filter((line) => !sameLine(line, { productId, size, color })));
    },
    []
  );

  const updateQuantity = useCallback(
    (productId: string, size: string, color: string, quantity: number) => {
      setItems((prev) =>
        quantity <= 0
          ? prev.filter((line) => !sameLine(line, { productId, size, color }))
          : prev.map((line) =>
              sameLine(line, { productId, size, color }) ? { ...line, quantity } : line
            )
      );
    },
    []
  );

  const clearCart = useCallback(() => setItems([]), []);

  const totalItems = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const subtotal = useMemo(
    () =>
      items.reduce((sum, item) => {
        const product = products.find((p) => p.id === item.productId);
        return sum + (product?.price ?? 0) * item.quantity;
      }, 0),
    [items, products]
  );

  const value = useMemo(
    () => ({
      items,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      totalItems,
      subtotal,
      isLoaded,
    }),
    [items, addItem, removeItem, updateQuantity, clearCart, totalItems, subtotal, isLoaded]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart deve ser usado dentro de um CartProvider');
  }
  return ctx;
}
