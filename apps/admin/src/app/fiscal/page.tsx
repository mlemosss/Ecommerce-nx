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
        {/* Dizer "módulo simulado" e parar ali deixava a lojista sem saber o
            que fazer com a obrigação de verdade. O CNPJ dela é ME, e ME emite
            NF-e — então o texto tem que apontar para onde se emite. */}
        <div className="card border border-purple-200 bg-purple-50 text-sm text-purple-900">
          <p className="font-semibold">Aqui não sai nota fiscal de verdade</p>
          <p className="mt-1">
            Emitir NF-e exige certificado digital e-CNPJ e credenciamento na SEFAZ-SP. Estas abaixo
            são simulações, só para conferência.
          </p>
          <p className="mt-2">
            Para emitir de verdade, use o <strong>Emissor NF-e do SEBRAE</strong> — gratuito, feito
            com a SEFAZ-SP, e suficiente para o volume de hoje. Em cada pedido há o botão{' '}
            <strong>&ldquo;Copiar dados para a nota&rdquo;</strong>, que copia destinatário, itens e
            valores prontos para colar lá.
          </p>
          <p className="mt-2">
            Quando passar de umas 20 notas por mês, vale um emissor pago (Bling, Tiny, eNotas): eles
            têm API e a nota pode sair junto com a etiqueta, sem digitação.
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
