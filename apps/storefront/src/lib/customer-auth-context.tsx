'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

const TOKEN_KEY = 'no-excuse:customer-token';
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api';

export interface CustomerProfile {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

interface CustomerAuthContextValue {
  customer: CustomerProfile | null;
  isLoaded: boolean;
  favoriteIds: Set<string>;
  register: (input: { name: string; email: string; password: string; phone?: string }) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  toggleFavorite: (productId: string) => Promise<void>;
}

const CustomerAuthContext = createContext<CustomerAuthContextValue | undefined>(undefined);

async function request<T>(path: string, token: string | null, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = Array.isArray(body?.message) ? body.message.join(', ') : body?.message;
    throw new Error(message || 'Não foi possível completar a operação.');
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export function CustomerAuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [isLoaded, setIsLoaded] = useState(false);

  const loadFavorites = useCallback(async (activeToken: string) => {
    try {
      const favorites = await request<{ productId: string }[]>('/customer-auth/me/favorites', activeToken);
      setFavoriteIds(new Set(favorites.map((f) => f.productId)));
    } catch {
      setFavoriteIds(new Set());
    }
  }, []);

  useEffect(() => {
    const stored = window.localStorage.getItem(TOKEN_KEY);
    if (!stored) {
      setIsLoaded(true);
      return;
    }
    setTokenState(stored);
    request<CustomerProfile>('/customer-auth/me', stored)
      .then((profile) => {
        setCustomer(profile);
        return loadFavorites(stored);
      })
      .catch(() => {
        window.localStorage.removeItem(TOKEN_KEY);
        setTokenState(null);
      })
      .finally(() => setIsLoaded(true));
  }, [loadFavorites]);

  const applySession = useCallback(
    async (data: { token: string; customer: CustomerProfile }) => {
      window.localStorage.setItem(TOKEN_KEY, data.token);
      setTokenState(data.token);
      setCustomer(data.customer);
      await loadFavorites(data.token);
    },
    [loadFavorites]
  );

  const register = useCallback(
    async (input: { name: string; email: string; password: string; phone?: string }) => {
      const data = await request<{ token: string; customer: CustomerProfile }>('/customer-auth/register', null, {
        method: 'POST',
        body: JSON.stringify(input),
      });
      await applySession(data);
    },
    [applySession]
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await request<{ token: string; customer: CustomerProfile }>('/customer-auth/login', null, {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      await applySession(data);
    },
    [applySession]
  );

  const logout = useCallback(() => {
    window.localStorage.removeItem(TOKEN_KEY);
    setTokenState(null);
    setCustomer(null);
    setFavoriteIds(new Set());
  }, []);

  const toggleFavorite = useCallback(
    async (productId: string) => {
      if (!token) {
        throw new Error('Faça login para favoritar produtos.');
      }
      const isFavorited = favoriteIds.has(productId);
      if (isFavorited) {
        await request(`/customer-auth/me/favorites/${productId}`, token, { method: 'DELETE' });
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          next.delete(productId);
          return next;
        });
      } else {
        await request('/customer-auth/me/favorites', token, {
          method: 'POST',
          body: JSON.stringify({ productId }),
        });
        setFavoriteIds((prev) => new Set(prev).add(productId));
      }
    },
    [token, favoriteIds]
  );

  const value = useMemo(
    () => ({ customer, isLoaded, favoriteIds, register, login, logout, toggleFavorite }),
    [customer, isLoaded, favoriteIds, register, login, logout, toggleFavorite]
  );

  return <CustomerAuthContext.Provider value={value}>{children}</CustomerAuthContext.Provider>;
}

export function useCustomerAuth(): CustomerAuthContextValue {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) {
    throw new Error('useCustomerAuth deve ser usado dentro de um CustomerAuthProvider');
  }
  return ctx;
}
