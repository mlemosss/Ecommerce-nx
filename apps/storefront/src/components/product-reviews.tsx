'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { useCustomerAuth } from '../lib/customer-auth-context';
import { comprimirImagem } from '../lib/comprimir-imagem';
import { LightboxDeFotos } from './lightbox-fotos';
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
  const [photoUrl, setPhotoUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [ampliada, setAmpliada] = useState<number | null>(null);

  // Só as que têm foto entram na navegação por setas: pular para uma avaliação
  // sem imagem abriria uma tela preta vazia.
  const comFoto = reviews.filter((r) => r.photoUrl);

  async function escolherFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    try {
      setPhotoUrl(await comprimirImagem(file));
    } catch {
      setError('Não consegui ler essa imagem. Tente outra.');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await submitReview(productId, rating, comment, photoUrl || undefined);
      setSent(true);
      setShowForm(false);
      setComment('');
      setPhotoUrl('');
      setRating(5);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar sua avaliação.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section id="avaliacoes" className="mt-16 scroll-mt-24 border-t border-line pt-12">
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
            <p className="mt-2 text-sm text-ink/60">
              Ainda sem avaliações desta peça — a sua pode ser a primeira.
            </p>
          )}
        </div>

        {isLoaded && customer && !showForm && !sent && (
          <button type="button" onClick={() => setShowForm(true)} className="btn-secondary !px-4 !py-2 text-xs">
            Avaliar produto
          </button>
        )}
        {/* Quem comprou antes do site não tem conta, e "entre para avaliar"
            fecha a porta justamente para quem mais tem o que dizer. O segundo
            link resolve isso sem confundir: um avalia a peça, o outro a loja. */}
        {isLoaded && !customer && (
          <div className="text-right text-sm">
            <Link href="/conta/entrar" className="font-semibold underline underline-offset-4">
              Entre para avaliar
            </Link>
            <Link
              href="/avaliar-loja"
              className="mt-1 block text-ink/60 underline-offset-4 hover:underline"
            >
              Comprou com a gente antes do site? Avalie por aqui
            </Link>
          </div>
        )}
      </div>

      {/* Dizer que foi salva não basta: a avaliação não aparece na hora, e a
          pessoa que atualiza a página e não vê nada conclui que não gravou.
          Aqui a mensagem diz onde ela está — recebida, esperando a leitura da
          loja — em vez de deixar o silêncio explicar. */}
      {sent && (
        <p className="mt-4 bg-paper px-4 py-3 text-sm text-ink/75" role="status">
          Recebemos, obrigada! Ela está guardada e entra nesta página assim que a gente ler — em
          geral no mesmo dia.
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

          {/* Foto usando a peça. É o que mais decide compra em moda: quem está
              em dúvida no tamanho quer ver a roupa num corpo parecido com o
              dela, não em foto de estúdio. A imagem é reduzida no navegador —
              foto de celular sai com 4 a 8 MB e travaria o envio. */}
          <div>
            <label className="mb-1 block text-sm font-semibold">Foto usando (opcional)</label>
            {photoUrl ? (
              <div className="flex items-start gap-3">
                <div className="relative h-24 w-20 shrink-0 overflow-hidden border border-line">
                  <Image src={photoUrl} alt="Sua foto" fill className="object-cover" unoptimized />
                </div>
                <button
                  type="button"
                  onClick={() => setPhotoUrl('')}
                  className="text-sm underline underline-offset-4 hover:no-underline"
                >
                  Trocar foto
                </button>
              </div>
            ) : (
              <label className="inline-flex cursor-pointer items-center gap-2 border border-ink/20 px-4 py-3 text-sm transition hover:border-ink">
                <input type="file" accept="image/*" onChange={escolherFoto} className="sr-only" />
                Escolher foto
              </label>
            )}
            <p className="mt-2 text-xs text-ink/45">
              A foto aparece junto da sua avaliação nesta página. Mande só se quiser.
            </p>
          </div>

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
              <button
                type="button"
                onClick={() => setAmpliada(comFoto.findIndex((r) => r.id === review.id))}
                aria-label={`Ampliar a foto de ${review.customerName}`}
                className="relative h-24 w-20 shrink-0 overflow-hidden border border-line"
              >
                <Image
                  src={review.photoUrl}
                  alt={`Foto enviada por ${review.customerName}`}
                  fill
                  sizes="80px"
                  className="object-cover transition hover:scale-105"
                />
              </button>
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

      <LightboxDeFotos
        fotos={comFoto.map((r) => ({
          url: r.photoUrl as string,
          autor: r.customerName,
          rating: r.rating,
          texto: r.comment,
        }))}
        indice={ampliada}
        aoFechar={() => setAmpliada(null)}
        aoTrocar={setAmpliada}
      />
    </section>
  );
}
