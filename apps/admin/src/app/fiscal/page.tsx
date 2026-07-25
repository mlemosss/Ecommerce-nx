'use client';

import { useEffect, useState } from 'react';
import { TopBar } from '../../components/top-bar';
import { api } from '../../lib/api';
import { formatDate, formatPrice } from '../../lib/format';
import type { Sale } from '../../lib/types';

function fakeAccessKey(saleId: string): string {
  const digits = saleId
    .split('')
    .map((c) => c.charCodeAt(0) % 10)
    .join('');
  return (digits + '0'.repeat(44)).slice(0, 44).replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

export default function FiscalPage() {
  const [sales, setSales] = useState<Sale[] | null>(null);

  useEffect(() => {
    api.get<Sale[]>('/sales').then(setSales);
  }, []);

  return (
    <div>
      <TopBar title="Área Fiscal" />
      <div className="px-4 pt-4">
        <div className="card border border-purple-200 bg-purple-50 text-sm text-purple-900">
          <p className="font-semibold">Módulo simulado</p>
          <p className="mt-1">
            Emissão fiscal real (NFC-e/NF-e) exige certificado digital e integração com a SEFAZ do seu
            estado — fora do escopo desta demonstração. Aqui cada venda concluída aparece como uma nota
            simulada, só para visualização.
          </p>
        </div>

        <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-black/50">
          Notas simuladas
        </h2>

        {sales === null && <p className="mt-4 text-center text-sm text-black/50">Carregando...</p>}

        <div className="mt-3 space-y-2">
          {sales?.map((sale, index) => (
            <div key={sale.id} className="card !p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">NFC-e simulada #{sales.length - index}</p>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                  Autorizada (simulado)
                </span>
              </div>
              <p className="mt-1 text-xs text-black/50">{formatDate(sale.createdAt)}</p>
              <p className="mt-2 break-all font-mono text-[10px] text-black/40">
                Chave: {fakeAccessKey(sale.id)}
              </p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-black/50">{sale.customer?.name ?? 'Consumidor não identificado'}</span>
                <span className="font-semibold">{formatPrice(sale.total)}</span>
              </div>
            </div>
          ))}
          {sales && sales.length === 0 && (
            <p className="mt-8 text-center text-sm text-black/50">Nenhuma venda registrada ainda.</p>
          )}
        </div>
      </div>
    </div>
  );
}
