'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { TopBar } from '../../components/top-bar';
import { api } from '../../lib/api';
import { formatDate, formatPrice } from '../../lib/format';
import type { CustomPayment, PaymentMethod } from '../../lib/types';

const METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: 'pix', label: 'Pix' },
  { value: 'cartao', label: 'Cartão' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'dinheiro', label: 'Dinheiro' },
];

export default function CustomPaymentsPage() {
  const [payments, setPayments] = useState<CustomPayment[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [description, setDescription] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('pix');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);

  function load() {
    api.get<CustomPayment[]>('/custom-payments').then(setPayments);
  }

  useEffect(load, []);

  const total = payments?.reduce((sum, p) => sum + p.amount, 0) ?? 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/custom-payments', { description, method, amount: Number(amount), date });
      setDescription('');
      setAmount('');
      setShowForm(false);
      load();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Excluir este pagamento?')) return;
    await api.delete(`/custom-payments/${id}`);
    load();
  }

  return (
    <div>
      <TopBar
        title="Pagamentos personalizados"
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
            Registre aqui um pagamento recebido que não passou pela venda rápida nem pelo checkout da
            loja — um serviço extra, uma encomenda personalizada, um acerto avulso. Entra no seu fluxo de
            caixa normalmente.
          </p>
        </div>

        <div className="card mt-4 flex items-center justify-between">
          <span className="text-sm text-black/60">Total no período</span>
          <span className="text-lg font-bold text-emerald-700">{formatPrice(total)}</span>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="card mt-4 space-y-3">
            <input
              required
              placeholder="Descrição"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field"
            />
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as PaymentMethod)}
              className="input-field"
            >
              {METHOD_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <input
                required
                type="number"
                step="0.01"
                min="0"
                placeholder="Valor (R$)"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="input-field"
              />
              <input
                required
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input-field"
              />
            </div>
            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting ? 'Salvando...' : 'Salvar pagamento'}
            </button>
          </form>
        )}

        <div className="mt-4 space-y-2">
          {payments?.map((payment) => (
            <div key={payment.id} className="card flex items-center justify-between !p-3">
              <div>
                <p className="text-sm font-semibold">{payment.description}</p>
                <p className="text-xs text-black/50">
                  {METHOD_OPTIONS.find((m) => m.value === payment.method)?.label ?? payment.method} ·{' '}
                  {formatDate(payment.date)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-emerald-700">{formatPrice(payment.amount)}</span>
                <button
                  type="button"
                  onClick={() => handleDelete(payment.id)}
                  className="text-black/30 hover:text-red-600"
                  aria-label="Excluir"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
          {payments && payments.length === 0 && (
            <p className="mt-8 text-center text-sm text-black/50">Nenhum pagamento cadastrado.</p>
          )}
        </div>
      </div>
    </div>
  );
}
