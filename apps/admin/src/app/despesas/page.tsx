'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { TopBar } from '../../components/top-bar';
import { api } from '../../lib/api';
import { formatDate, formatPrice } from '../../lib/format';
import type { Expense } from '../../lib/types';

const CATEGORY_OPTIONS = ['Fixa', 'Estoque', 'Marketing', 'Operacional', 'Outra'];

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORY_OPTIONS[0]);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);

  function load() {
    api.get<Expense[]>('/expenses').then(setExpenses);
  }

  useEffect(load, []);

  const total = expenses?.reduce((sum, e) => sum + e.amount, 0) ?? 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/expenses', { description, category, amount: Number(amount), date });
      setDescription('');
      setAmount('');
      setShowForm(false);
      load();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Excluir esta despesa?')) return;
    await api.delete(`/expenses/${id}`);
    load();
  }

  return (
    <div>
      <TopBar
        title="Despesas"
        rightAction={
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="btn-primary !px-4 !py-2 text-xs"
          >
            {showForm ? 'Fechar' : '+ Nova'}
          </button>
        }
      />

      <div className="px-4 pt-4">
        <div className="card flex items-center justify-between">
          <span className="text-sm text-black/60">Total no período</span>
          <span className="text-lg font-bold text-red-600">{formatPrice(total)}</span>
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
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="input-field">
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
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
              {submitting ? 'Salvando...' : 'Salvar despesa'}
            </button>
          </form>
        )}

        <div className="mt-4 space-y-2">
          {expenses?.map((expense) => (
            <div key={expense.id} className="card flex items-center justify-between !p-3">
              <div>
                <p className="text-sm font-semibold">{expense.description}</p>
                <p className="text-xs text-black/50">
                  {expense.category} · {formatDate(expense.date)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-red-600">{formatPrice(expense.amount)}</span>
                <button
                  type="button"
                  onClick={() => handleDelete(expense.id)}
                  className="text-black/30 hover:text-red-600"
                  aria-label="Excluir"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
          {expenses && expenses.length === 0 && (
            <p className="mt-8 text-center text-sm text-black/50">Nenhuma despesa cadastrada.</p>
          )}
        </div>
      </div>
    </div>
  );
}
