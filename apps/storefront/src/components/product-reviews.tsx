'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useCustomerAuth } from '../lib/customer-auth-context';
import type { ProductReview } from '../lib/api';

function Stars({ rating }: { rating: number }) {
  return (
    <span aria-hidden className="text-amber-400">
      {'★'.repeat(rating)}
      {'☆'.repeat(5 - rating)}
    </span>
  );
}

export function ProductReviews({
  productId,
  reviews,
  average,
  count,
}: {
  productId: string;
  reviews: ProductReview[];
  average: number;
  count: number;
}) {
  const { customer, isLoaded, submitReview } = useCustomerAuth();
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await submitReview(productId, rating, comment);
      setSent(true);
      setShowForm(false);
      setComment('');
      setRating(5);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar sua avaliação.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mt-16 border-t border-black/5 pt-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="section-title">Avaliações</h2>
          {count > 0 ? (
            <p className="mt-1 text-sm text-black/60">
              <Stars rating={Math.round(average)} /> {average.toFixed(1)} de 5 ({count}{' '}
              {count === 1 ? 'avaliação' : 'avaliações'})
            </p>
          ) : (
            <p className="mt-1 text-sm text-black/50">Ainda sem avaliações.</p>
          )}
        </div>

        {isLoaded && customer && !showForm && !sent && (
          <button type="button" onClick={() => setShowForm(true)} className="btn-secondary !px-4 !py-2 text-xs">
            Avaliar produto
          </button>
        )}
        {isLoaded && !customer && (
          <Link href="/conta/entrar" className="text-sm font-semibold underline underline-offset-4">
            Entre para avaliar
          </Link>
        )}
      </div>

      {sent && (
        <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Obrigado! Sua avaliação foi enviada e será exibida após aprovação.
        </p>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-4 max-w-md space-y-3 rounded-2xl border border-black/10 p-4">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div>
            <label className="mb-1 block text-sm font-semibold">Nota</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  className={`text-2xl ${n <= rating ? 'text-amber-400' : 'text-black/15'}`}
                  aria-label={`${n} estrela(s)`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
          <textarea
            required
            minLength={3}
            placeholder="Conte como foi sua experiência com o produto"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            className="input-field"
          />
          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? 'Enviando...' : 'Enviar avaliação'}
          </button>
        </form>
      )}

      <div className="mt-6 space-y-4">
        {reviews.map((review) => (
          <div key={review.id} className="border-b border-black/5 pb-4">
            <Stars rating={review.rating} />
            <p className="mt-1 text-sm text-black/70">{review.comment}</p>
            <p className="mt-1 text-xs text-black/40">{review.customerName}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
