'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { TopBar } from '../../components/top-bar';
import { api, ApiError, resolveMediaUrl, uploadTestimonialPhoto } from '../../lib/api';
import type { Testimonial } from '../../lib/types';

export default function TestimonialsPage() {
  const [testimonials, setTestimonials] = useState<Testimonial[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [quote, setQuote] = useState('');
  const [rating, setRating] = useState(5);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function load() {
    api.get<Testimonial[]>('/testimonials/all').then(setTestimonials);
  }

  useEffect(load, []);

  async function handlePhotoSelected(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const url = await uploadTestimonialPhoto(file);
      setPhotoUrl(url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao enviar foto');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.post('/testimonials', { customerName, quote, rating, photoUrl: photoUrl ?? undefined });
      setCustomerName('');
      setQuote('');
      setRating(5);
      setPhotoUrl(null);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao criar depoimento');
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(testimonial: Testimonial) {
    await api.patch(`/testimonials/${testimonial.id}`, { active: !testimonial.active });
    load();
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Excluir este depoimento?')) return;
    await api.delete(`/testimonials/${id}`);
    load();
  }

  return (
    <div>
      <TopBar
        title="Depoimentos"
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

            <div>
              <label className="mb-2 block text-sm font-semibold">Foto (opcional)</label>
              <div className="flex items-center gap-3">
                {photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={resolveMediaUrl(photoUrl)}
                    alt=""
                    className="h-16 w-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/5 text-2xl">
                    🙂
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="btn-secondary !px-4 !py-2 text-xs disabled:opacity-60"
                >
                  {uploading ? 'Enviando...' : photoUrl ? 'Trocar foto' : 'Enviar foto'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handlePhotoSelected(e.target.files)}
                  className="hidden"
                />
              </div>
            </div>

            <input
              required
              placeholder="Nome do cliente"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="input-field"
            />

            <textarea
              required
              placeholder="Depoimento"
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
              className="input-field"
              rows={3}
            />

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

            <button type="submit" disabled={submitting || uploading} className="btn-primary w-full">
              {submitting ? 'Salvando...' : 'Salvar depoimento'}
            </button>
          </form>
        )}

        <div className="mt-4 space-y-2">
          {testimonials?.map((testimonial) => (
            <div key={testimonial.id} className="card flex items-center gap-3 !p-3">
              {testimonial.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={resolveMediaUrl(testimonial.photoUrl)}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-black/5 text-xl">
                  🙂
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{testimonial.customerName}</p>
                <p className="truncate text-sm text-black/60">{testimonial.quote}</p>
                <p className="text-xs text-amber-500">{'★'.repeat(testimonial.rating)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => toggleActive(testimonial)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    testimonial.active ? 'bg-green-100 text-green-700' : 'bg-black/10 text-black/50'
                  }`}
                >
                  {testimonial.active ? 'Visível' : 'Oculto'}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(testimonial.id)}
                  className="text-black/30 hover:text-red-600"
                  aria-label="Excluir"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
          {testimonials && testimonials.length === 0 && (
            <p className="mt-8 text-center text-sm text-black/50">Nenhum depoimento cadastrado.</p>
          )}
        </div>
      </div>
    </div>
  );
}
