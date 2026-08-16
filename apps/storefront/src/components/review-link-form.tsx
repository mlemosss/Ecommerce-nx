'use client';

import Image from 'next/image';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { submitReviewLink, type ReviewLinkProduct } from '../lib/api';

/** Foto grande demais trava o envio; reduz antes de mandar. */
const MAX_LADO = 1400;
const QUALIDADE = 0.82;

async function comprimir(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  if (typeof document === 'undefined' || !file.type.startsWith('image/')) return dataUrl;

  try {
    const img = document.createElement('img');
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
      img.src = dataUrl;
    });

    const maior = Math.max(img.width, img.height);
    const escala = maior > MAX_LADO ? MAX_LADO / maior : 1;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.width * escala));
    canvas.height = Math.max(1, Math.round(img.height * escala));
    const ctx = canvas.getContext('2d');
    if (!ctx) return dataUrl;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const menor = canvas.toDataURL('image/jpeg', QUALIDADE);
    return menor.length < dataUrl.length ? menor : dataUrl;
  } catch {
    return dataUrl;
  }
}

/**
 * Um formulário por produto do pedido.
 *
 * Sem campo de nome: ele vem do pedido. Campo livre de nome em formulário
 * público vira qualquer coisa, e aqui a loja já sabe quem comprou.
 */
export function ReviewLinkForm({
  token,
  produto,
}: {
  token: string;
  produto: ReviewLinkProduct;
}) {
  const [rating, setRating] = useState(produto.avaliacao?.rating ?? 0);
  const [comment, setComment] = useState(produto.avaliacao?.comment ?? '');
  const [photoUrl, setPhotoUrl] = useState(produto.avaliacao?.photoUrl ?? '');
  const [estado, setEstado] = useState<'parado' | 'enviando' | 'pronto' | 'erro'>(
    produto.avaliacao ? 'pronto' : 'parado'
  );
  const [mensagem, setMensagem] = useState('');

  async function escolherFoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMensagem('');
    try {
      setPhotoUrl(await comprimir(file));
    } catch {
      setMensagem('Não consegui ler essa imagem. Tente outra.');
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (rating === 0) {
      setMensagem('Escolha de 1 a 5 estrelas.');
      return;
    }
    if (comment.trim().length < 3) {
      setMensagem('Escreva um comentário, mesmo que curto.');
      return;
    }

    setEstado('enviando');
    setMensagem('');
    const r = await submitReviewLink(token, {
      productId: produto.productId,
      rating,
      comment: comment.trim(),
      photoUrl: photoUrl || undefined,
    });

    if (r.ok) {
      setEstado('pronto');
    } else {
      setEstado('erro');
      setMensagem(r.message);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border border-line p-5 sm:p-6">
      <h2 className="text-sm font-bold uppercase tracking-[0.14em]">{produto.productName}</h2>

      <div className="mt-4">
        <p className="eyebrow mb-2 text-ink/50">Sua nota</p>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => {
                setRating(n);
                if (estado === 'pronto') setEstado('parado');
              }}
              aria-label={`${n} ${n === 1 ? 'estrela' : 'estrelas'}`}
              aria-pressed={rating === n}
              className={`text-3xl leading-none transition ${
                n <= rating ? 'text-ink' : 'text-ink/20 hover:text-ink/40'
              }`}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <label htmlFor={`c-${produto.productId}`} className="eyebrow mb-2 block text-ink/50">
          Seu comentário
        </label>
        <textarea
          id={`c-${produto.productId}`}
          value={comment}
          onChange={(e) => {
            setComment(e.target.value);
            if (estado === 'pronto') setEstado('parado');
          }}
          rows={4}
          placeholder="Serviu bem? Como é o caimento? O tecido agradou?"
          className="input-field w-full resize-y"
        />
      </div>

      <div className="mt-5">
        <p className="eyebrow mb-2 text-ink/50">Foto usando (opcional)</p>
        {photoUrl ? (
          <div className="flex items-start gap-3">
            <div className="relative h-28 w-24 shrink-0 overflow-hidden border border-line">
              <Image src={photoUrl} alt="Sua foto" fill className="object-cover" unoptimized />
            </div>
            <button
              type="button"
              onClick={() => {
                setPhotoUrl('');
                if (estado === 'pronto') setEstado('parado');
              }}
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
          A foto aparece junto da sua avaliação na página do produto. Mande só se quiser.
        </p>
      </div>

      {mensagem && (
        <p className="mt-4 text-sm text-ink/70" role="alert">
          {mensagem}
        </p>
      )}

      <div className="mt-6 flex items-center gap-4">
        <button
          type="submit"
          disabled={estado === 'enviando'}
          className="btn-primary disabled:opacity-60"
        >
          {estado === 'enviando' ? 'Enviando…' : estado === 'pronto' ? 'Salvar mudanças' : 'Enviar avaliação'}
        </button>
        {estado === 'pronto' && (
          <p className="text-sm text-ink/60" role="status">
            Avaliação recebida, obrigada!
          </p>
        )}
      </div>
    </form>
  );
}
