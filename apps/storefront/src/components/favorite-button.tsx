'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useCustomerAuth } from '../lib/customer-auth-context';

export function FavoriteButton({ productId }: { productId: string }) {
  const { customer, isLoaded, favoriteIds, toggleFavorite } = useCustomerAuth();
  const pathname = usePathname();
  const [pending, setPending] = useState(false);
  const isFavorited = favoriteIds.has(productId);

  if (isLoaded && !customer) {
    // O coração levava para o login e a peça se perdia: depois de entrar, a
    // cliente caía na conta, não de volta na peça que tinha acabado de
    // escolher. Some justamente quem demonstrou interesse.
    //
    // Só o caminho de volta, sem favoritar sozinho depois do login. A conta
    // recém-aberta já carregou a lista de favoritos, e marcar por fora dela
    // deixaria o coração vazio numa peça que está salva — errado de um jeito
    // pior do que pedir um clique a mais.
    return (
      <Link
        href={`/conta/entrar?voltar=${encodeURIComponent(pathname)}`}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/90 text-ink/70 shadow-sm backdrop-blur transition hover:bg-white hover:text-ink"
        aria-label="Entre para favoritar"
        title="Entre para favoritar"
      >
        <HeartIcon filled={false} />
      </Link>
    );
  }

  async function handleClick() {
    setPending(true);
    try {
      await toggleFavorite(productId);
    } catch {
      // silencioso: usuário pode tentar novamente
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending || !isLoaded}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full shadow-sm backdrop-blur transition disabled:opacity-60 ${
        isFavorited
          ? 'bg-ink text-white'
          : 'bg-white/90 text-ink/70 hover:bg-white hover:text-ink'
      }`}
      aria-label={isFavorited ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
      aria-pressed={isFavorited}
    >
      <HeartIcon filled={isFavorited} />
    </button>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} className="h-5 w-5">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 20.5s-7-4.35-9.5-8.7C.8 8.1 2.3 4.5 5.9 4.5c2 0 3.4 1 6.1 3.9 2.7-2.9 4.1-3.9 6.1-3.9 3.6 0 5.1 3.6 3.4 7.3-2.5 4.35-9.5 8.7-9.5 8.7Z"
      />
    </svg>
  );
}
