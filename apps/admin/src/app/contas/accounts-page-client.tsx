'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { TopBar } from '../../components/top-bar';
import { api } from '../../lib/api';
import { formatDate, formatPrice } from '../../lib/format';
import type { Sale } from '../../lib/types';

type Tab = 'abertas' | 'parceladas';

export function AccountsPageClient() {
  const searchParams = useSearchParams();
  const initialTab: Tab = searchParams.get('filtro') === 'parceladas' ? 'parceladas' : 'abertas';

  const [sales, setSales] = useState<Sale[] | null>(null);
  const [tab, setTab] = useState<Tab>(initialTab);
  const [closingId, setClosingId] = useState<string | null>(null);

  function load() {
    api.get<Sale[]>('/sales').then(setSales);
  }

  useEffect(load, []);

  const filtered = useMemo(() => {
    if (!sales) return [];
    return tab === 'abertas'
      ? sales.filter((s) => s.status === 'conta_aberta')
      : sales.filter((s) => s.installments > 1);
  }, [sales, tab]);

  const total = filtered.reduce((sum, s) => sum + s.total, 0);

  async function handleClose(saleId: string) {
    setClosingId(saleId);
    try {
      await api.patch(`/sales/${saleId}/status`, { status: 'concluida' });
      load();
    } finally {
      setClosingId(null);
    }
  }

  return (
    <div>
      <TopBar title="Contas de clientes" />
      <div className="px-4 pt-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTab('abertas')}
            className={`flex-1 rounded-full border px-4 py-2 text-sm font-medium ${
              tab === 'abertas' ? 'border-ink bg-ink text-white' : 'border-black/10'
            }`}
          >
            Abertas
          </button>
          <button
            type="button"
            onClick={() => setTab('parceladas')}
            className={`flex-1 rounded-full border px-4 py-2 text-sm font-medium ${
              tab === 'parceladas' ? 'border-ink bg-ink text-white' : 'border-black/10'
            }`}
          >
            Parceladas
          </button>
        </div>

        <div className="card mt-4 flex items-center justify-between">
          <span className="text-sm text-black/60">
            {filtered.length} {tab === 'abertas' ? 'conta(s) em aberto' : 'venda(s) parcelada(s)'}
          </span>
          <span className="text-lg font-bold">{formatPrice(total)}</span>
        </div>

        {sales === null && <p className="mt-8 text-center text-sm text-black/50">Carregando...</p>}

        <div className="mt-4 space-y-2">
          {filtered.map((sale) => (
            <div key={sale.id} className="card !p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">
                  {sale.customer?.name ?? 'Consumidor não identificado'}
                </p>
                <span className="font-semibold">{formatPrice(sale.total)}</span>
              </div>
              <p className="mt-1 text-xs text-black/50">
                {formatDate(sale.createdAt)} · {sale.paymentMethod}
                {sale.installments > 1 && ` · ${sale.installments}x de ${formatPrice(sale.total / sale.installments)}`}
              </p>
              {tab === 'abertas' && (
                <button
                  type="button"
                  onClick={() => handleClose(sale.id)}
                  disabled={closingId === sale.id}
                  className="btn-secondary mt-2 w-full !py-1.5 text-xs"
                >
                  {closingId === sale.id ? 'Quitando...' : 'Quitar conta'}
                </button>
              )}
            </div>
          ))}
          {sales && filtered.length === 0 && (
            <p className="mt-8 text-center text-sm text-black/50">Nada por aqui.</p>
          )}
        </div>
      </div>
    </div>
  );
}
