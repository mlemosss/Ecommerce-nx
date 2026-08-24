'use client';

import { useState } from 'react';
import { LightboxDeFotos, type FotoAmpliada } from './lightbox-fotos';

/**
 * Uma foto de avaliação que abre grande ao ser tocada.
 *
 * Existe para as listas onde a foto aparece sozinha, fora da grade do mural.
 * A miniatura ali tem oitenta pixels de largura: dá para saber que existe uma
 * foto, e para mais nada — e o motivo de ela existir é ser olhada de perto.
 */
export function FotoDaAvaliacao({ foto, className }: { foto: FotoAmpliada; className?: string }) {
  const [aberta, setAberta] = useState<number | null>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => setAberta(0)}
        aria-label={`Ampliar a foto de ${foto.autor}`}
        className={className}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={foto.url}
          alt={`${foto.autor} usando ${foto.productName ?? 'uma peça NO EXCUSE'}`}
          loading="lazy"
          className="h-full w-full object-cover transition hover:scale-105"
        />
      </button>

      <LightboxDeFotos
        fotos={[foto]}
        indice={aberta}
        aoFechar={() => setAberta(null)}
        aoTrocar={setAberta}
      />
    </>
  );
}
