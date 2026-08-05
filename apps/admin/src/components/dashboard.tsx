'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '../lib/api';
import { formatPrice } from '../lib/format';
import type { Order, OrderStatus, Product, Customer } from '../lib/types';

const PERIODS = [
  { days: 7, label: '7 dias' },
  { days: 30, label: '30 dias' },
  { days: 90, label: '90 dias' },
];

// Faturamento considera pedidos pagos em diante (pago/enviado).
const REVENUE_STATUS = new Set<OrderStatus>(['pago', 'enviado']);

const STATUS_LABEL: Record<OrderStatus, string> = {
  aguardando_pagamento: 'Aguardando',
  pago: 'Pago',
  enviado: 'Enviado',
  cancelado: 'Cancelado',
};

const STATUS_STYLE: Record<OrderStatus, string> = {
  aguardando_pagamento: 'bg-amber-100 text-amber-700',
  pago: 'bg-emerald-100 text-emerald-700',
  enviado: 'bg-blue-100 text-blue-700',
  cancelado: 'bg-red-100 text-red-600',
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h`;
  const d = Math.floor(h / 24);
  return `${d} d`;
}

export function Dashboard() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [days, setDays] = useState(30);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get<Order[]>('/orders').catch(() => [] as Order[]),
      api.get<Product[]>('/products').catch(() => [] as Product[]),
      api.get<Customer[]>('/customers').catch(() => [] as Customer[]),
    ])
      .then(([o, p, c]) => {
        setOrders(o);
        setProducts(p);
        setCustomers(c);
      })
      .catch((e) => setError(e?.message ?? 'Não foi possível carregar os dados.'));
  }, []);

  const loading = orders === null || products === null || customers === null;

  const metrics = useMemo(() => {
    if (!orders || !products || !customers) return null;
    const since = Date.now() - days * 86_400_000;
    const inPeriod = (iso: string) => new Date(iso).getTime() >= since;

    const periodOrders = orders.filter((o) => inPeriod(o.createdAt));
    const paid = periodOrders.filter((o) => REVENUE_STATUS.has(o.status));
    const revenue = paid.reduce((s, o) => s + (o.total ?? 0), 0);
    const itemsSold = paid.reduce(
      (s, o) => s + (o.items ?? []).reduce((a, i) => a + i.quantity, 0),
      0
    );
    const newCustomers = customers.filter((c) => inPeriod(c.createdAt)).length;
    const pending = orders.filter((o) => o.status === 'aguardando_pagamento');
    const lowStock = products
      .filter((p) => p.active !== false)
      .flatMap((p) => p.variants.filter((v) => v.stock <= 2).map((v) => ({ product: p, variant: v })));
    const recent = [...periodOrders]
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      .slice(0, 6);

    return {
      revenue,
      orderCount: periodOrders.length,
      aov: paid.length ? revenue / paid.length : 0,
      itemsSold,
      newCustomers,
      pending,
      lowStock,
      recent,
    };
  }, [orders, products, customers, days]);

  return (
    <section className="mt-6">
      {/* Seletor de período */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-black/60">Visão geral</h2>
        <div className="flex rounded-full border border-black/10 p-0.5">
          {PERIODS.map((p) => (
            <button
              key={p.days}
              type="button"
              onClick={() => setDays(p.days)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                days === p.days ? 'bg-ink text-white' : 'text-black/60 hover:text-ink'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {loading && !error && (
        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-black/5" />
          ))}
        </div>
      )}

      {metrics && (
        <>
          {/* KPIs */}
          <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi label="Faturamento" value={formatPrice(metrics.revenue)} hint={`${metrics.itemsSold} itens vendidos`} highlight />
            <Kpi label="Pedidos" value={String(metrics.orderCount)} hint={`${metrics.pending.length} aguardando`} />
            <Kpi label="Ticket médio" value={formatPrice(metrics.aov)} />
            <Kpi label="Novos clientes" value={String(metrics.newCustomers)} hint="no período" />
          </div>

          {/* Aguardando pagamento */}
          {metrics.pending.length > 0 && (
            <Link
              href="/pedidos"
              className="mt-3 flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold text-amber-800">
                  {metrics.pending.length} pedido{metrics.pending.length > 1 ? 's' : ''} aguardando pagamento
                </p>
                <p className="text-xs text-amber-700">
                  {formatPrice(metrics.pending.reduce((s, o) => s + o.total, 0))} em aberto
                </p>
              </div>
              <span className="text-amber-700">→</span>
            </Link>
          )}

          {/* Últimos pedidos */}
          <div className="mt-6 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-black/60">Últimos pedidos</h3>
            <Link href="/pedidos" className="text-xs font-semibold text-accent underline underline-offset-2">
              Ver todos
            </Link>
          </div>
          <div className="mt-2 space-y-2">
            {metrics.recent.length === 0 && (
              <p className="rounded-2xl bg-neutral-100 px-4 py-6 text-center text-sm text-black/50">
                Nenhum pedido no período.
              </p>
            )}
            {metrics.recent.map((o) => (
              <div key={o.id} className="flex items-center justify-between rounded-2xl bg-neutral-100 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{o.customerName}</p>
                  <p className="text-xs text-black/50">
                    #{o.orderNumber} · {relativeTime(o.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-sm font-bold">{formatPrice(o.total)}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLE[o.status]}`}>
                    {STATUS_LABEL[o.status]}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Estoque baixo */}
          {metrics.lowStock.length > 0 && (
            <>
              <div className="mt-6 flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-black/60">Estoque baixo</h3>
                <Link href="/estoque" className="text-xs font-semibold text-accent underline underline-offset-2">
                  Ver estoque
                </Link>
              </div>
              <div className="mt-2 space-y-2">
                {metrics.lowStock.slice(0, 6).map(({ product, variant }) => (
                  <Link
                    key={variant.id}
                    href={`/produtos/${product.id}`}
                    className="flex items-center justify-between rounded-2xl bg-neutral-100 px-4 py-2.5"
                  >
                    <p className="min-w-0 truncate text-sm">
                      <span className="font-semibold">{product.name}</span>{' '}
                      <span className="text-black/50">
                        {variant.color} · {variant.size}
                      </span>
                    </p>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${
                        variant.stock === 0 ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {variant.stock} un
                    </span>
                  </Link>
                ))}
                {metrics.lowStock.length > 6 && (
                  <p className="text-center text-xs text-black/50">
                    e mais {metrics.lowStock.length - 6} variações
                  </p>
                )}
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}

function Kpi({
  label,
  value,
  hint,
  highlight,
}: {
  label: string;
  value: string;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-4 ${highlight ? 'border-transparent bg-ink text-white' : 'border-black/10 bg-white'}`}>
      <p className={`text-xs font-medium uppercase tracking-wide ${highlight ? 'text-white/70' : 'text-black/50'}`}>
        {label}
      </p>
      <p className="mt-1 text-xl font-black tracking-tight">{value}</p>
      {hint && <p className={`mt-0.5 text-xs ${highlight ? 'text-white/60' : 'text-black/50'}`}>{hint}</p>}
    </div>
  );
}
