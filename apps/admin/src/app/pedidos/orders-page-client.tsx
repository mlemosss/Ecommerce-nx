'use client';

import { useEffect, useState } from 'react';
import { TopBar } from '../../components/top-bar';
import { api } from '../../lib/api';
import { formatDate, formatPrice } from '../../lib/format';
import type { Order, OrderStatus } from '../../lib/types';

const STATUS_LABEL: Record<OrderStatus, string> = {
  aguardando_pagamento: 'Aguardando pagamento',
  pago: 'Pago',
  enviado: 'Enviado',
  cancelado: 'Cancelado',
};

const STATUS_STYLE: Record<OrderStatus, string> = {
  aguardando_pagamento: 'bg-amber-100 text-amber-700',
  pago: 'bg-green-100 text-green-700',
  enviado: 'bg-blue-100 text-blue-700',
  cancelado: 'bg-black/10 text-black/50',
};

const PAYMENT_LABEL: Record<Order['paymentMethod'], string> = {
  pix: 'Pix',
  cartao: 'Cartão',
  boleto: 'Boleto',
};

export function OrdersPageClient() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  function load() {
    api.get<Order[]>('/orders').then(setOrders);
  }

  useEffect(load, []);

  async function updateStatus(order: Order, status: OrderStatus, trackingCode?: string) {
    setUpdatingId(order.id);
    try {
      await api.patch(`/orders/${order.id}/status`, { status, trackingCode });
      load();
    } finally {
      setUpdatingId(null);
    }
  }

  function handleMarkShipped(order: Order) {
    const trackingCode = window.prompt('Código de rastreio (opcional):', order.trackingCode ?? '');
    if (trackingCode === null) return;
    updateStatus(order, 'enviado', trackingCode || undefined);
  }

  return (
    <div>
      <TopBar title="Pedidos" />
      <div className="px-4 pt-4">
        {orders === null && <p className="mt-8 text-center text-sm text-black/50">Carregando...</p>}
        {orders && orders.length === 0 && (
          <p className="mt-8 text-center text-sm text-black/50">Nenhum pedido ainda.</p>
        )}

        <div className="space-y-2">
          {orders?.map((order) => {
            const expanded = expandedId === order.id;
            return (
              <div key={order.id} className="card !p-3">
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : order.id)}
                  className="flex w-full items-center justify-between text-left"
                >
                  <div>
                    <p className="text-sm font-bold">#{order.orderNumber}</p>
                    <p className="text-xs text-black/50">
                      {order.customerName} · {formatDate(order.createdAt)} ·{' '}
                      {PAYMENT_LABEL[order.paymentMethod]}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{formatPrice(order.total)}</span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLE[order.status]}`}
                    >
                      {STATUS_LABEL[order.status]}
                    </span>
                  </div>
                </button>

                {expanded && (
                  <div className="mt-3 space-y-3 border-t border-black/10 pt-3 text-sm">
                    <div>
                      <p className="font-semibold">Contato</p>
                      <p className="text-black/60">{order.customerEmail}</p>
                      <p className="text-black/60">{order.customerPhone}</p>
                    </div>
                    <div>
                      <p className="font-semibold">Entrega</p>
                      <p className="text-black/60">
                        {order.street}, {order.number}
                        {order.complement ? ` - ${order.complement}` : ''} · {order.city} ·{' '}
                        {order.zipCode}
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold">Itens</p>
                      <ul className="mt-1 space-y-1 text-black/60">
                        {order.items.map((item) => (
                          <li key={item.id} className="flex justify-between">
                            <span>
                              {item.productName} ({item.color}/{item.size}) × {item.quantity}
                            </span>
                            <span>{formatPrice(item.unitPrice * item.quantity)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    {order.couponCode && (
                      <p className="text-black/60">
                        Cupom: <span className="font-semibold">{order.couponCode}</span> (-
                        {formatPrice(order.discount)})
                      </p>
                    )}
                    {order.trackingCode && (
                      <p className="text-black/60">
                        Rastreio: <span className="font-semibold">{order.trackingCode}</span>
                      </p>
                    )}
                    {order.asaasInvoiceUrl && (
                      <a
                        href={order.asaasInvoiceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="block text-accent underline"
                      >
                        Ver cobrança na Asaas
                      </a>
                    )}

                    <div className="flex flex-wrap gap-2 pt-1">
                      {order.status !== 'pago' && (
                        <button
                          type="button"
                          disabled={updatingId === order.id}
                          onClick={() => updateStatus(order, 'pago')}
                          className="rounded-full bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-700 disabled:opacity-50"
                        >
                          Marcar como pago
                        </button>
                      )}
                      {order.status !== 'enviado' && order.status !== 'cancelado' && (
                        <button
                          type="button"
                          disabled={updatingId === order.id}
                          onClick={() => handleMarkShipped(order)}
                          className="rounded-full bg-blue-100 px-3 py-1.5 text-xs font-semibold text-blue-700 disabled:opacity-50"
                        >
                          Marcar como enviado
                        </button>
                      )}
                      {order.status !== 'cancelado' && (
                        <button
                          type="button"
                          disabled={updatingId === order.id}
                          onClick={() => updateStatus(order, 'cancelado')}
                          className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 disabled:opacity-50"
                        >
                          Cancelar pedido
                        </button>
                      )}
                      {order.status !== 'aguardando_pagamento' && (
                        <button
                          type="button"
                          disabled={updatingId === order.id}
                          onClick={() => updateStatus(order, 'aguardando_pagamento')}
                          className="rounded-full bg-black/5 px-3 py-1.5 text-xs font-semibold text-black/60 disabled:opacity-50"
                        >
                          Voltar p/ aguardando
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
