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
    return <div className="container-page py-24 text-center text-black/50">Carregando...</div>;
  }

  return (
    <div className="container-page py-10">
      <div className="flex items-center justify-between">
        <h1 className="section-title">Minha conta</h1>
        <button
          type="button"
          onClick={() => {
            logout();
            router.push('/');
          }}
          className="text-sm font-semibold text-black/50 underline underline-offset-4 hover:text-black"
        >
          Sair
        </button>
      </div>

      <div className="mt-6 rounded-2xl border border-black/10 p-6">
        <p className="font-semibold">{customer.name}</p>
        <p className="text-sm text-black/60">{customer.email}</p>
        {customer.phone && <p className="text-sm text-black/60">{customer.phone}</p>}
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-bold">Meus pedidos</h2>
        {orders === null && <p className="mt-4 text-sm text-black/50">Carregando...</p>}
        {orders?.length === 0 && (
          <p className="mt-4 text-sm text-black/50">Você ainda não fez nenhum pedido.</p>
        )}
        {orders && orders.length > 0 && (
          <ul className="mt-4 space-y-2">
            {orders.map((order) => (
              <li
                key={order.id}
                className="flex items-center justify-between rounded-2xl border border-black/10 p-4 text-sm"
              >
                <div>
                  <p className="font-semibold">#{order.orderNumber}</p>
                  <p className="text-black/50">{STATUS_LABEL[order.status] ?? order.status}</p>
                </div>
                <span className="font-bold">{formatPrice(order.total)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-bold">Meus favoritos</h2>
        {favoriteProducts.length === 0 && (
          <p className="mt-4 text-sm text-black/50">
            Você ainda não favoritou nenhum produto.{' '}
            <Link href="/produtos" className="underline underline-offset-4">
              Ver produtos
            </Link>
          </p>
        )}
        {favoriteProducts.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {favoriteProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
