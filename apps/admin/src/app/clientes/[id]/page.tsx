'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { TopBar } from '../../../components/top-bar';
import { CustomerForm } from '../../../components/customer-form';
import { api, resolveMediaUrl } from '../../../lib/api';
import { formatDate, formatPrice } from '../../../lib/format';
import type { Customer } from '../../../lib/types';

export default function EditCustomerPage() {
  const params = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get<Customer>(`/customers/${params.id}`)
      .then(setCustomer)
      .catch((err) => setError(err.message ?? 'Cliente não encontrado'));
  }, [params.id]);

  return (
    <div>
      <TopBar title="Editar cliente" />
      {error && <p className="px-4 pt-4 text-sm text-red-600">{error}</p>}
      {!customer && !error && <p className="px-4 pt-8 text-center text-sm text-black/50">Carregando...</p>}
      {customer && (
        <div className="space-y-4 px-4 pb-8">
          <div className="card flex items-center justify-between">
            <span className="text-sm font-medium">Conta na loja online</span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                customer.hasAccount ? 'bg-green-100 text-green-700' : 'bg-black/5 text-black/50'
              }`}
            >
              {customer.hasAccount ? 'Cadastrado' : 'Sem conta'}
            </span>
          </div>

          {customer.orders && customer.orders.length > 0 && (
            <section className="card space-y-2">
              <p className="text-sm font-semibold uppercase tracking-wide text-black/50">
                Pedidos online ({customer.orders.length})
              </p>
              {customer.orders.map((order) => (
                <div key={order.id} className="flex items-center justify-between border-t border-black/5 pt-2 first:border-0 first:pt-0">
                  <div>
                    <p className="text-sm font-semibold">#{order.orderNumber}</p>
                    <p className="text-xs text-black/50">{formatDate(order.createdAt)}</p>
                  </div>
                  <span className="text-sm font-semibold">{formatPrice(order.total)}</span>
                </div>
              ))}
            </section>
          )}

          {customer.favorites && customer.favorites.length > 0 && (
            <section className="card space-y-2">
              <p className="text-sm font-semibold uppercase tracking-wide text-black/50">
                Produtos favoritados ({customer.favorites.length})
              </p>
              {customer.favorites.map((fav) => (
                <div key={fav.id} className="flex items-center gap-3 border-t border-black/5 pt-2 first:border-0 first:pt-0">
                  {fav.product.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={resolveMediaUrl(fav.product.images[0])}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 shrink-0 rounded-lg bg-black/5" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{fav.product.name}</p>
                    <p className="text-xs text-black/50">{formatPrice(fav.product.price)}</p>
                  </div>
                </div>
              ))}
            </section>
          )}

          <CustomerForm customer={customer} />
        </div>
      )}
    </div>
  );
}
