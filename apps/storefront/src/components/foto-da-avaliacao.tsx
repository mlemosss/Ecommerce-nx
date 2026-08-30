'use client';

import Image from 'next/image';
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
        className={`relative ${className ?? ''}`}
      >
        <Image
          src={foto.url}
          alt={`${foto.autor} usando ${foto.productName ?? 'uma peça NO EXCUSE'}`}
          fill
          sizes="(max-width: 640px) 50vw, 320px"
          className="object-cover transition hover:scale-105"
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
