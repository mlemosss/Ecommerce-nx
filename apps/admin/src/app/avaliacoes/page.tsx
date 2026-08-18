'use client';

import { useEffect, useState } from 'react';
import { TopBar } from '../../components/top-bar';
import { PedirAvaliacao } from '../../components/pedir-avaliacao';
import { AvaliacoesDaLoja } from '../../components/avaliacoes-da-loja';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/format';
import type { ProductReview } from '../../lib/types';

const LOJA_URL = (
  process.env.NEXT_PUBLIC_STOREFRONT_URL ?? 'https://www.noexcusenx.com.br'
).replace(/\/$/, '');

const LINK_AVALIAR_LOJA = `${LOJA_URL}/avaliar-loja`;

const CONVITE =
  'Oi! Aqui é a NO EXCUSE 💪\n\n' +
  'Você já treinou com uma peça nossa — e a sua opinião ajuda muito quem ainda está em dúvida no tamanho ou no caimento.\n\n' +
  'Leva menos de um minuto, e você pode mandar uma foto usando, se quiser:\n' +
  LINK_AVALIAR_LOJA;

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
        {/* Pedir vem antes de aprovar, e não é ordem alfabética: a loja tem
            zero avaliações. Aprovar só importa quando existe o que aprovar. */}
        <h2 className="text-sm font-semibold uppercase tracking-wide text-black/50">
          Pedir avaliação
        </h2>
        <div className="mt-3">
          <PedirAvaliacao />
        </div>

        {/* Avaliação da loja é outra fila: vem do link público, de qualquer
            pessoa — inclusive de quem comprou antes de o site existir. Fica
            antes das de produto porque é a única que a lojista pode ir buscar
            hoje, mandando o link para as clientes antigas. */}
        <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-black/50">
          Avaliações da loja
        </h2>
        <div className="mt-3">
          <AvaliacoesDaLoja />
        </div>

        <div className="card mt-3">
          <p className="text-sm font-semibold">Link para pedir avaliação da loja</p>
          <p className="mt-1 break-all text-sm text-black/60">{LINK_AVALIAR_LOJA}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(CONVITE)}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white"
            >
              Enviar no WhatsApp
            </a>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(LINK_AVALIAR_LOJA)}
              className="rounded-lg bg-black/10 px-3 py-1.5 text-xs font-semibold text-black/60"
            >
              Copiar link
            </button>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-black/45">
            Serve para quem comprou antes do site. A cliente escolhe aparecer com o nome ou sem se
            identificar, e pode mandar foto usando a peça — que é o que mais ajuda quem está em
            dúvida no tamanho.
          </p>
        </div>

        <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-black/50">
          Avaliações de produto
        </h2>
        <div className="mt-3" />

        {pendingCount > 0 && (
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {pendingCount} avaliação(ões) aguardando aprovação.
          </p>
        )}

        <div className="mt-4 space-y-2">
          {reviews?.map((review) => (
            <div key={review.id} className="card !p-3">
              <div className="flex items-start justify-between gap-3">
                {review.photoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={review.photoUrl}
                    alt={`Foto enviada por ${review.customerName}`}
                    className="h-24 w-20 shrink-0 rounded-lg object-cover"
                  />
                )}
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
