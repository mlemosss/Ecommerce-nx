'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { TopBar } from '../../../components/top-bar';
import { api } from '../../../lib/api';
import { formatDate, formatPrice } from '../../../lib/format';
import type { Sale } from '../../../lib/types';

const STATUS_LABEL: Record<Sale['status'], string> = {
  concluida: 'Concluída',
  conta_aberta: 'Em aberto',
};

export function SalesHistoryClient() {
  const searchParams = useSearchParams();
  const onlyThisMonth = searchParams.get('periodo') === 'mes';

  const [sales, setSales] = useState<Sale[] | null>(null);

  useEffect(() => {
    api.get<Sale[]>('/sales').then(setSales);
  }, []);

  const filtered = useMemo(() => {
    if (!sales) return [];
    if (!onlyThisMonth) return sales;
    const now = new Date();
    return sales.filter((s) => {
      const d = new Date(s.createdAt);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    });
  }, [sales, onlyThisMonth]);

  const total = filtered.reduce((sum, s) => sum + s.total, 0);

  return (
    <div>
      <TopBar title={onlyThisMonth ? 'Vendas do mês' : 'Histórico de vendas'} />
      <div className="px-4 pt-4">
        <div className="card flex items-center justify-between">
          <span className="text-sm text-black/60">Total no período</span>
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
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    sale.status === 'concluida'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {STATUS_LABEL[sale.status]}
                </span>
              </div>
              <p className="mt-1 text-xs text-black/50">
                {formatDate(sale.createdAt)} · {sale.paymentMethod}
                {sale.installments > 1 && ` · ${sale.installments}x`}
              </p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-black/50">
                  {sale.items.map((i) => i.productVariant.product.name).join(', ')}
                </span>
                <span className="font-semibold">{formatPrice(sale.total)}</span>
              </div>
            </div>
          ))}
          {sales && filtered.length === 0 && (
            <p className="mt-8 text-center text-sm text-black/50">Nenhuma venda no período.</p>
          )}
        </div>
      </div>
    </div>
  );
}
