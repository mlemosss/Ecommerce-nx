'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { TopBar } from '../../components/top-bar';
import { api, ApiError } from '../../lib/api';
import { formatDate, formatPrice } from '../../lib/format';
import type { Coupon, CouponDiscountType } from '../../lib/types';

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<CouponDiscountType>('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [minOrderValue, setMinOrderValue] = useState('');
  const [usageLimit, setUsageLimit] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function load() {
    api.get<Coupon[]>('/coupons').then(setCoupons);
  }

  useEffect(load, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.post('/coupons', {
        code,
        discountType,
        discountValue: Number(discountValue),
        minOrderValue: minOrderValue ? Number(minOrderValue) : undefined,
        usageLimit: usageLimit ? Number(usageLimit) : undefined,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      });
      setCode('');
      setDiscountValue('');
      setMinOrderValue('');
      setUsageLimit('');
      setExpiresAt('');
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao criar cupom');
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(coupon: Coupon) {
    await api.patch(`/coupons/${coupon.id}`, { active: !coupon.active });
    load();
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Excluir este cupom?')) return;
    await api.delete(`/coupons/${id}`);
    load();
  }

  return (
    <div>
      <TopBar
        title="Cupons"
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
        {showForm && (
          <form onSubmit={handleSubmit} className="card mt-0 space-y-3">
            {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}
            <input
              required
              placeholder="Código (ex: TREINO10)"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="input-field uppercase"
            />
            <div className="flex gap-2">
              {(
                [
                  { value: 'percentage', label: 'Percentual' },
                  { value: 'fixed', label: 'Valor fixo' },
                ] as const
              ).map((option) => (
                <button
                  type="button"
                  key={option.value}
                  onClick={() => setDiscountType(option.value)}
                  className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium ${
                    discountType === option.value ? 'border-ink bg-ink text-white' : 'border-black/15'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                required
                type="number"
                step="0.01"
                min="0"
                placeholder={discountType === 'percentage' ? 'Desconto (%)' : 'Desconto (R$)'}
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                className="input-field"
              />
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Pedido mínimo (opcional)"
                value={minOrderValue}
                onChange={(e) => setMinOrderValue(e.target.value)}
                className="input-field"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                min="1"
                placeholder="Limite de usos (opcional)"
                value={usageLimit}
                onChange={(e) => setUsageLimit(e.target.value)}
                className="input-field"
              />
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="input-field"
              />
            </div>
            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting ? 'Salvando...' : 'Salvar cupom'}
            </button>
          </form>
        )}

        <div className="mt-4 space-y-2">
          {coupons?.map((coupon) => (
            <div key={coupon.id} className="card !p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-sm font-bold">{coupon.code}</p>
                  <p className="text-xs text-black/50">
                    {coupon.discountType === 'percentage'
                      ? `${coupon.discountValue}% de desconto`
                      : `${formatPrice(coupon.discountValue)} de desconto`}
                    {coupon.minOrderValue ? ` · mínimo ${formatPrice(coupon.minOrderValue)}` : ''}
                  </p>
                  <p className="text-xs text-black/40">
                    Usado {coupon.usageCount}
                    {coupon.usageLimit ? `/${coupon.usageLimit}` : ''} vez(es)
                    {coupon.expiresAt ? ` · expira em ${formatDate(coupon.expiresAt)}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => toggleActive(coupon)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      coupon.active ? 'bg-green-100 text-green-700' : 'bg-black/10 text-black/50'
                    }`}
                  >
                    {coupon.active ? 'Ativo' : 'Inativo'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(coupon.id)}
                    className="text-black/30 hover:text-red-600"
                    aria-label="Excluir"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          ))}
          {coupons && coupons.length === 0 && (
            <p className="mt-8 text-center text-sm text-black/50">Nenhum cupom cadastrado.</p>
          )}
        </div>
      </div>
    </div>
  );
}
