'use client';

import { useEffect, useState } from 'react';
import { TopBar } from '../../components/top-bar';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/format';
import type { ProductReview } from '../../lib/types';

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<ProductReview[] | null>(null);

  function load() {
    api.get<ProductReview[]>('/reviews/all').then(setReviews);
  }

  useEffect(load, []);

  async function toggleApproved(review: ProductReview) {
    await api.patch(`/reviews/${review.id}/approve`, { approved: !review.approved });
    load();
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Excluir esta avaliação?')) return;
    await api.delete(`/reviews/${id}`);
    load();
  }

  const pendingCount = reviews?.filter((r) => !r.approved).length ?? 0;

  return (
    <div>
      <TopBar title="Avaliações" />

      <div className="px-4 pt-4">
        {pendingCount > 0 && (
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {pendingCount} avaliação(ões) aguardando aprovação.
          </p>
        )}

        <div className="mt-4 space-y-2">
          {reviews?.map((review) => (
            <div key={review.id} className="card !p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{review.product.name}</p>
                  <p className="text-xs text-amber-500">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</p>
                  <p className="mt-1 text-sm text-black/70">{review.comment}</p>
                  <p className="mt-1 text-xs text-black/40">
                    {review.customerName} · {formatDate(review.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <button
                    type="button"
                    onClick={() => toggleApproved(review)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      review.approved ? 'bg-green-100 text-green-700' : 'bg-black/10 text-black/50'
                    }`}
                  >
                    {review.approved ? 'Aprovada' : 'Pendente'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(review.id)}
                    className="text-black/30 hover:text-red-600"
                    aria-label="Excluir"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          ))}
          {reviews && reviews.length === 0 && (
            <p className="mt-8 text-center text-sm text-black/50">Nenhuma avaliação recebida ainda.</p>
          )}
        </div>
      </div>
    </div>
  );
}
