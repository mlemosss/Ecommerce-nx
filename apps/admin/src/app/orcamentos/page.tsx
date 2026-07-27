'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { TopBar } from '../../components/top-bar';
import { api } from '../../lib/api';
import { formatDate, formatPrice } from '../../lib/format';
import type { Quote, QuoteStatus } from '../../lib/types';

const STATUS_LABEL: Record<QuoteStatus, string> = {
  aberto: 'Em aberto',
  aceito: 'Aceito',
  recusado: 'Recusado',
};

const STATUS_STYLE: Record<QuoteStatus, string> = {
  aberto: 'bg-amber-100 text-amber-700',
  aceito: 'bg-green-100 text-green-700',
  recusado: 'bg-black/10 text-black/50',
};

interface DraftItem {
  description: string;
  quantity: string;
  unitPrice: string;
}

const EMPTY_ITEM: DraftItem = { description: '', quantity: '1', unitPrice: '' };

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<DraftItem[]>([{ ...EMPTY_ITEM }]);
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  function load() {
    api.get<Quote[]>('/quotes').then(setQuotes);
  }

  useEffect(load, []);

  function updateItem(index: number, field: keyof DraftItem, value: string) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  }

  function addItem() {
    setItems((prev) => [...prev, { ...EMPTY_ITEM }]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  const draftTotal = items.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
    0
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/quotes', {
        customerName: customerName || undefined,
        notes: notes || undefined,
        items: items
          .filter((item) => item.description.trim())
          .map((item) => ({
            description: item.description,
            quantity: Number(item.quantity) || 1,
            unitPrice: Number(item.unitPrice) || 0,
          })),
      });
      setCustomerName('');
      setNotes('');
      setItems([{ ...EMPTY_ITEM }]);
      setShowForm(false);
      load();
    } finally {
      setSubmitting(false);
    }
  }

  async function updateStatus(quote: Quote, status: QuoteStatus) {
    setUpdatingId(quote.id);
    try {
      await api.patch(`/quotes/${quote.id}/status`, { status });
      load();
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Excluir este orçamento?')) return;
    await api.delete(`/quotes/${id}`);
    load();
  }

  return (
    <div>
      <TopBar
        title="Orçamentos"
        rightAction={
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="btn-primary !px-4 !py-2 text-xs"
          >
            {showForm ? 'Fechar' : '+ Novo'}
          </button>
        }
      />

      <div className="px-4 pt-4">
        <div className="card border border-blue-200 bg-blue-50 text-sm text-blue-900">
          <p className="font-semibold">Pra que serve</p>
          <p className="mt-1">
            Monte uma proposta pra um pedido personalizado ou em quantidade antes de fechar a venda — ex:
            “10 camisetas com estampa do time, tamanho G”. Quando o cliente aceitar, registre a venda de
            verdade em Vendas rápidas.
          </p>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="card mt-4 space-y-3">
            <input
              placeholder="Nome do cliente (opcional)"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="input-field"
            />

            <div className="space-y-2">
              {items.map((item, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    placeholder="Item (ex: Camiseta personalizada G)"
                    value={item.description}
                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                    className="input-field flex-1"
                  />
                  <input
                    type="number"
                    min="1"
                    placeholder="Qtd"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                    className="input-field w-16"
                  />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="R$ un."
                    value={item.unitPrice}
                    onChange={(e) => updateItem(index, 'unitPrice', e.target.value)}
                    className="input-field w-24"
                  />
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="text-black/30 hover:text-red-600"
                      aria-label="Remover item"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={addItem} className="text-sm font-semibold text-accent">
                + Adicionar item
              </button>
            </div>

            <textarea
              placeholder="Observações (opcional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input-field"
              rows={2}
            />

            <div className="flex items-center justify-between border-t border-black/10 pt-3">
              <span className="text-sm text-black/60">Total estimado</span>
              <span className="text-lg font-bold">{formatPrice(draftTotal)}</span>
            </div>

            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting ? 'Salvando...' : 'Salvar orçamento'}
            </button>
          </form>
        )}

        <div className="mt-4 space-y-2">
          {quotes?.map((quote) => (
            <div key={quote.id} className="card !p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{quote.customerName ?? 'Sem cliente informado'}</p>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLE[quote.status]}`}>
                  {STATUS_LABEL[quote.status]}
                </span>
              </div>
              <p className="mt-1 text-xs text-black/50">{formatDate(quote.createdAt)}</p>
              <ul className="mt-2 space-y-1 text-sm text-black/70">
                {quote.items.map((item) => (
                  <li key={item.id} className="flex justify-between">
                    <span>
                      {item.description} × {item.quantity}
                    </span>
                    <span>{formatPrice(item.unitPrice * item.quantity)}</span>
                  </li>
                ))}
              </ul>
              {quote.notes && <p className="mt-2 text-xs text-black/50">{quote.notes}</p>}
              <div className="mt-2 flex items-center justify-between border-t border-black/10 pt-2">
                <span className="text-sm font-bold">{formatPrice(quote.total)}</span>
                <div className="flex gap-2">
                  {quote.status !== 'aceito' && (
                    <button
                      type="button"
                      disabled={updatingId === quote.id}
                      onClick={() => updateStatus(quote, 'aceito')}
                      className="rounded-full bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-700 disabled:opacity-50"
                    >
                      Aceito
                    </button>
                  )}
                  {quote.status !== 'recusado' && (
                    <button
                      type="button"
                      disabled={updatingId === quote.id}
                      onClick={() => updateStatus(quote, 'recusado')}
                      className="rounded-full bg-black/5 px-3 py-1.5 text-xs font-semibold text-black/60 disabled:opacity-50"
                    >
                      Recusado
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(quote.id)}
                    className="text-black/30 hover:text-red-600"
                    aria-label="Excluir"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          ))}
          {quotes && quotes.length === 0 && (
            <p className="mt-8 text-center text-sm text-black/50">Nenhum orçamento cadastrado.</p>
          )}
        </div>
      </div>
    </div>
  );
}
