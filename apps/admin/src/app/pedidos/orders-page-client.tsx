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

const FILTERS: { value: OrderStatus | 'todos'; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'aguardando_pagamento', label: 'Aguardando' },
  { value: 'pago', label: 'Pagos' },
  { value: 'enviado', label: 'Enviados' },
  { value: 'cancelado', label: 'Cancelados' },
];

export function OrdersPageClient() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'todos'>('todos');
  const [search, setSearch] = useState('');
  const [copiado, setCopiado] = useState<string | null>(null);

  /**
   * O link tem que apontar para o domínio da loja, não para o do painel — os
   * dois vivem no mesmo endereço (`/admin`), então uma URL relativa levaria a
   * cliente para dentro do administrativo.
   */
  const lojaUrl = (
    process.env.NEXT_PUBLIC_STOREFRONT_URL ?? 'https://www.noexcusenx.com.br'
  ).replace(/\/$/, '');

  function linkAvaliacao(order: Order): string {
    return `${lojaUrl}/avaliar/${order.reviewToken}`;
  }

  function copiarLinkAvaliacao(order: Order) {
    navigator.clipboard
      .writeText(linkAvaliacao(order))
      .then(() => {
        setCopiado(order.id);
        setTimeout(() => setCopiado((atual) => (atual === order.id ? null : atual)), 2000);
      })
      .catch(() => undefined);
  }

  /** Abre o WhatsApp já com a mensagem escrita, para a lojista só apertar enviar. */
  function linkWhatsApp(order: Order): string {
    const telefone = (order.customerPhone ?? '').replace(/\D/g, '');
    const primeiroNome = order.customerName.trim().split(/\s+/)[0] ?? '';
    const texto =
      `Oi, ${primeiroNome}! Aqui é da NO EXCUSE. ` +
      `Você recebeu o pedido #${order.orderNumber}? Se puder contar o que achou, ajuda muito ` +
      `quem está em dúvida no tamanho: ${linkAvaliacao(order)}`;
    const numero = telefone.length >= 10 ? (telefone.startsWith('55') ? telefone : `55${telefone}`) : '';
    return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
  }
  const [reloadKey, setReloadKey] = useState(0);
  const [error, setError] = useState('');
  // Rastreio digitado por pedido, antes de salvar.
  const [tracking, setTracking] = useState<Record<string, string>>({});

  // A busca vai para a API com um respiro, para não disparar a cada tecla.
  useEffect(() => {
    const handle = setTimeout(() => {
      const params = new URLSearchParams();
      if (statusFilter !== 'todos') params.set('status', statusFilter);
      const q = search.trim();
      if (q) params.set('q', q);
      const query = params.toString();

      api
        .get<Order[]>(`/orders${query ? `?${query}` : ''}`)
        .then((data) => {
          setOrders(data);
          setError('');
        })
        .catch((e) => setError(e?.message ?? 'Não foi possível carregar os pedidos.'));
    }, 250);

    return () => clearTimeout(handle);
  }, [statusFilter, search, reloadKey]);

  function reload() {
    setReloadKey((key) => key + 1);
  }

  async function updateStatus(order: Order, status: OrderStatus, trackingCode?: string) {
    setUpdatingId(order.id);
    setError('');
    try {
      await api.patch(`/orders/${order.id}/status`, { status, trackingCode });
      reload();
    } catch (e) {
      // Ex.: reabrir um pedido cancelado sem estoque para repor a saída.
      setError((e as Error)?.message ?? 'Não foi possível mudar o status.');
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDelete(order: Order) {
    if (!window.confirm(`Apagar o pedido #${order.orderNumber}? Esta ação não pode ser desfeita.`)) return;
    setUpdatingId(order.id);
    setError('');
    try {
      await api.delete(`/orders/${order.id}`);
      reload();
    } catch (e) {
      setError((e as Error)?.message ?? 'Não foi possível apagar o pedido.');
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div>
      <TopBar title="Pedidos" />
      <div className="px-4 pt-4">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por número, nome ou e-mail"
          className="w-full rounded-full border border-black/10 px-4 py-2 text-sm outline-none focus:border-ink"
        />

        <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
          {FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setStatusFilter(filter.value)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                statusFilter === filter.value
                  ? 'bg-ink text-white'
                  : 'bg-black/5 text-black/60 hover:text-ink'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {error && (
          <p className="mt-3 rounded-2xl bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>
        )}

        {orders === null && <p className="mt-8 text-center text-sm text-black/50">Carregando...</p>}
        {orders && orders.length === 0 && (
          <p className="mt-8 text-center text-sm text-black/50">
            {search.trim() || statusFilter !== 'todos'
              ? 'Nenhum pedido encontrado com esse filtro.'
              : 'Nenhum pedido ainda.'}
          </p>
        )}

        <div className="mt-3 space-y-2">
          {orders?.map((order) => {
            const expanded = expandedId === order.id;
            const trackingValue = tracking[order.id] ?? order.trackingCode ?? '';
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

                    {/* Link de avaliação, para mandar no WhatsApp.
                        Abre sem senha — quem comprou como convidado não tem
                        conta, e era isso que travava a avaliação até agora. */}
                    {order.reviewToken && (
                      <div>
                        <p className="font-semibold">Avaliação</p>
                        <div className="mt-1 flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={() => copiarLinkAvaliacao(order)}
                            className="rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-white"
                          >
                            {copiado === order.id ? 'Link copiado!' : 'Copiar link de avaliação'}
                          </button>
                          <a
                            href={linkWhatsApp(order)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-semibold text-accent underline underline-offset-2"
                          >
                            Abrir no WhatsApp
                          </a>
                        </div>
                        <p className="mt-1 text-xs text-black/45">
                          Abre sem login. Vale só para este pedido e pode ser reenviado.
                        </p>
                      </div>
                    )}
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

                    <div>
                      <label
                        htmlFor={`rastreio-${order.id}`}
                        className="text-xs font-semibold text-black/60"
                      >
                        Código de rastreio
                      </label>
                      <input
                        id={`rastreio-${order.id}`}
                        value={trackingValue}
                        onChange={(e) =>
                          setTracking((current) => ({ ...current, [order.id]: e.target.value }))
                        }
                        placeholder="Opcional — vai no e-mail de envio"
                        className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm outline-none focus:border-ink"
                      />
                    </div>

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
                          onClick={() =>
                            updateStatus(order, 'enviado', trackingValue.trim() || undefined)
                          }
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
                      <button
                        type="button"
                        disabled={updatingId === order.id}
                        onClick={() => handleDelete(order)}
                        className="rounded-full bg-black/5 px-3 py-1.5 text-xs font-semibold text-black/60 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      >
                        Apagar
                      </button>
                    </div>

                    {order.status === 'cancelado' && (
                      <p className="text-xs text-black/50">
                        As peças deste pedido voltaram para o estoque.
                      </p>
                    )}
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
