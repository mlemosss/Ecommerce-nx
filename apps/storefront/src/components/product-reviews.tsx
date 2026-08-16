'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { useCustomerAuth } from '../lib/customer-auth-context';
import type { ProductReview } from '../lib/api';

function Stars({ rating }: { rating: number }) {
  return (
    <span aria-hidden className="tracking-[0.15em] text-ink">
      {'★'.repeat(rating)}
      <span className="text-ink/25">{'★'.repeat(5 - rating)}</span>
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
    <section className="mt-16 border-t border-line pt-12">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="eyebrow text-ink/50">Opiniões</p>
          <h2 className="section-title mt-3">Avaliações</h2>
          {count > 0 ? (
            <p className="mt-2 text-sm text-ink/70">
              <Stars rating={Math.round(average)} /> {average.toFixed(1)} de 5 ({count}{' '}
              {count === 1 ? 'avaliação' : 'avaliações'})
            </p>
          ) : (
            <p className="mt-2 text-sm text-ink/60">Ainda sem avaliações.</p>
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
        <p className="mt-4 bg-paper px-4 py-3 text-sm text-ink/75" role="status">
          Obrigado! Sua avaliação foi enviada e será exibida após aprovação.
        </p>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-6 max-w-md space-y-3 border border-line p-5">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div>
            <label className="mb-1 block text-sm font-semibold">Nota</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  className={`text-2xl transition ${n <= rating ? 'text-ink' : 'text-ink/20'}`}
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
          <div key={review.id} className="flex gap-4 border-b border-line pb-4">
            {/* Foto da cliente usando a peça. É a prova social que mais decide
                compra em moda — a pessoa quer ver a roupa num corpo parecido
                com o dela, não em foto de estúdio. `unoptimized` porque vem
                como dataURL do banco, não de uma URL que o Next possa otimizar. */}
            {review.photoUrl && (
              <div className="relative h-24 w-20 shrink-0 overflow-hidden border border-line">
                <Image
                  src={review.photoUrl}
                  alt={`Foto enviada por ${review.customerName}`}
                  fill
                  sizes="80px"
                  unoptimized
                  className="object-cover"
                />
              </div>
            )}
            <div className="min-w-0">
              <Stars rating={review.rating} />
              <p className="mt-2 text-sm leading-relaxed text-ink/75">{review.comment}</p>
              <p className="mt-2 text-[11px] uppercase tracking-[0.12em] text-ink/60">
                {review.customerName}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
