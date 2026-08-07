'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCustomerAuth } from '../../lib/customer-auth-context';
import { useProducts } from '../../lib/products-context';
import { formatPrice } from '../../lib/format';
import { ProductCard } from '../../components/product-card';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api';
const TOKEN_KEY = 'no-excuse:customer-token';

interface OrderSummary {
  id: string;
  orderNumber: string;
  total: number;
  status: string;
  createdAt: string;
}

const STATUS_LABEL: Record<string, string> = {
  aguardando_pagamento: 'Aguardando pagamento',
  pago: 'Pago',
  enviado: 'Enviado',
  cancelado: 'Cancelado',
};

export default function AccountPage() {
  const { customer, isLoaded, favoriteIds, logout } = useCustomerAuth();
  const { products } = useProducts();
  const router = useRouter();
  const [orders, setOrders] = useState<OrderSummary[] | null>(null);

  useEffect(() => {
    if (isLoaded && !customer) {
      router.replace('/conta/entrar');
    }
  }, [isLoaded, customer, router]);

  useEffect(() => {
    if (!customer) return;
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) return;

    fetch(`${API_URL}/customer-auth/me/orders`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => (res.ok ? res.json() : []))
      .then(setOrders)
      .catch(() => setOrders([]));
  }, [customer]);

  const favoriteProducts = useMemo(
    () => products.filter((p) => favoriteIds.has(p.id)),
    [products, favoriteIds]
  );

  if (!customer) {
    return (
      <div className="container-page py-24 text-center text-sm text-ink/60" role="status">
        Carregando...
      </div>
    );
  }

  return (
    <div className="container-page py-14 sm:py-16">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-ink/50">Minha conta</p>
          <h1 className="section-title mt-3">Olá, {customer.name.split(' ')[0]}</h1>
        </div>
        <button
          type="button"
          onClick={() => {
            logout();
            router.push('/');
          }}
          className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/60 underline underline-offset-4 transition hover:text-ink"
        >
          Sair
        </button>
      </div>

      <div className="mt-8 bg-paper p-6">
        <p className="text-sm font-semibold">{customer.name}</p>
        <p className="mt-1 text-sm text-ink/70">{customer.email}</p>
        {customer.phone && <p className="text-sm text-ink/70">{customer.phone}</p>}
      </div>

      <section className="mt-12">
        <p className="eyebrow text-ink/50">Meus pedidos</p>
        {orders === null && (
          <p className="mt-4 text-sm text-ink/60" role="status">
            Carregando...
          </p>
        )}
        {orders?.length === 0 && (
          <p className="mt-4 text-sm text-ink/60">Você ainda não fez nenhum pedido.</p>
        )}
        {orders && orders.length > 0 && (
          <ul className="mt-4 border-t border-line">
            {orders.map((order) => (
              <li
                key={order.id}
                className="flex items-center justify-between border-b border-line py-4 text-sm"
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em]">
                    #{order.orderNumber}
                  </p>
                  <p className="mt-1 text-xs text-ink/60">
                    {STATUS_LABEL[order.status] ?? order.status}
                  </p>
                </div>
                <span className="font-bold">{formatPrice(order.total)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-12">
        <p className="eyebrow text-ink/50">Meus favoritos</p>
        {favoriteProducts.length === 0 && (
          <p className="mt-4 text-sm text-ink/60">
            Você ainda não favoritou nenhum produto.{' '}
            <Link href="/produtos" className="underline underline-offset-4">
              Ver produtos
            </Link>
          </p>
        )}
        {favoriteProducts.length > 0 && (
          <div className="mt-6 grid grid-cols-2 gap-x-2 gap-y-8 sm:gap-x-3 md:grid-cols-3 lg:grid-cols-4">
            {favoriteProducts.map((product) => (
              <ProductCard key={product.id} product={product} showBadge={false} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
