'use client';

import Link from 'next/link';
import { useCallback, useEffect } from 'react';

export interface FotoAmpliada {
  url: string;
  autor: string;
  rating?: number;
  texto?: string;
  productName?: string | null;
  productSlug?: string | null;
}

/**
 * A foto da cliente em tamanho de ver.
 *
 * No mural cada foto cabe num quadrado de duzentos pixels, e é ali que a
 * pessoa decide o tamanho: se a legging marca, se o top sustenta, como cai num
 * corpo parecido com o dela. Nesse quadrado não dá para ver nada disso — a
 * foto que existe justamente para ser examinada era a única que não podia ser.
 *
 * Abre o quanto a tela permitir, com o texto da avaliação ao lado e o caminho
 * para a peça. Fecha no Esc, no fundo e no botão; as setas andam pelas outras
 * fotos sem precisar voltar para a grade.
 */
export function LightboxDeFotos({
  fotos,
  indice,
  aoFechar,
  aoTrocar,
}: {
  fotos: FotoAmpliada[];
  indice: number | null;
  aoFechar: () => void;
  aoTrocar: (novoIndice: number) => void;
}) {
  const aberta = indice !== null && indice >= 0 && indice < fotos.length;

  const anterior = useCallback(() => {
    if (indice === null) return;
    aoTrocar((indice - 1 + fotos.length) % fotos.length);
  }, [indice, fotos.length, aoTrocar]);

  const proxima = useCallback(() => {
    if (indice === null) return;
    aoTrocar((indice + 1) % fotos.length);
  }, [indice, fotos.length, aoTrocar]);

  /**
   * Teclado e rolagem enquanto está aberta.
   *
   * Trava a rolagem do fundo: sem isso, o dedo que tenta arrastar a foto no
   * celular rola a loja atrás dela, e ao fechar a pessoa está em outro lugar da
   * página, sem entender por quê.
   */
  useEffect(() => {
    if (!aberta) return;

    function aoTeclar(e: KeyboardEvent) {
      if (e.key === 'Escape') aoFechar();
      if (e.key === 'ArrowLeft') anterior();
      if (e.key === 'ArrowRight') proxima();
    }

    const rolagemOriginal = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', aoTeclar);

    return () => {
      document.body.style.overflow = rolagemOriginal;
      window.removeEventListener('keydown', aoTeclar);
    };
  }, [aberta, aoFechar, anterior, proxima]);

  if (!aberta || indice === null) return null;
  const foto = fotos[indice];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Foto enviada por ${foto.autor}`}
      onClick={aoFechar}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4 sm:p-8"
    >
      <button
        type="button"
        onClick={aoFechar}
        aria-label="Fechar"
        className="absolute right-4 top-4 z-10 text-3xl leading-none text-white/70 transition hover:text-white"
      >
        ×
      </button>

      {fotos.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Foto anterior"
            onClick={(e) => {
              e.stopPropagation();
              anterior();
            }}
            className="absolute left-2 z-10 px-3 py-6 text-3xl text-white/60 transition hover:text-white sm:left-6"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Próxima foto"
            onClick={(e) => {
              e.stopPropagation();
              proxima();
            }}
            className="absolute right-2 z-10 px-3 py-6 text-3xl text-white/60 transition hover:text-white sm:right-6"
          >
            ›
          </button>
        </>
      )}

      {/* O clique no conteúdo não fecha: só o fundo. Fechar ao tocar na própria
          foto seria perder a foto justamente ao tentar olhá-la de perto. */}
      <figure
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-full w-full max-w-4xl flex-col gap-4 overflow-y-auto sm:flex-row sm:items-center"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={foto.url}
          alt={`${foto.autor} usando ${foto.productName ?? 'uma peça NO EXCUSE'}`}
          className="mx-auto max-h-[70vh] w-auto max-w-full object-contain sm:max-h-[85vh]"
        />

        <figcaption className="shrink-0 text-white sm:w-64">
          {foto.rating != null && (
            <p aria-hidden className="text-sm tracking-[0.2em]">
              {'★'.repeat(foto.rating)}
              <span className="text-white/30">{'★'.repeat(5 - foto.rating)}</span>
            </p>
          )}
          {foto.texto && (
            <p className="mt-3 text-sm leading-relaxed text-white/85">&ldquo;{foto.texto}&rdquo;</p>
          )}
          <p className="mt-3 text-[11px] uppercase tracking-[0.14em] text-white/60">{foto.autor}</p>

          {foto.productSlug && (
            <Link
              href={`/produtos/${foto.productSlug}`}
              className="mt-4 inline-block bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-ink"
            >
              Ver {foto.productName ?? 'a peça'}
            </Link>
          )}
        </figcaption>
      </figure>
    </div>
  );
}
