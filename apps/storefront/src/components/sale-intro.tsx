'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

const SEEN_KEY = 'no-excuse:sale-intro';

/**
 * Abertura da loja: leva quem chega direto para a promoção.
 *
 * Regras que evitam que isso vire o pop-up que todo mundo fecha sem ler:
 *
 * - **Uma vez por sessão.** Aparecer a cada página é o que faz a pessoa
 *   aprender a fechar sem olhar. Fechou, não volta até abrir o navegador de novo.
 * - **Só quando existe promoção de verdade.** A página decide se renderiza; sem
 *   peça com desconto, o componente nem é montado. Abertura anunciando oferta
 *   que não existe queima a próxima.
 * - **Só na home.** Quem entrou por um link de produto veio buscar aquilo.
 * - **Fácil de sair**: Esc, clique fora, botão de fechar e um "continuar
 *   navegando" do mesmo tamanho do botão de ir para a promoção. Saída escondida
 *   irrita e não converte.
 *
 * Renderiza no cliente de propósito: o HTML que o Google e o WhatsApp leem
 * continua sendo o da home, sem a camada por cima.
 */
export function SaleIntro({ discount }: { discount: number }) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(SEEN_KEY)) return;
    } catch {
      // Navegador com armazenamento bloqueado: mostra, e some ao trocar de página.
    }
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
    };
    document.addEventListener('keydown', onKey);

    // Trava a rolagem do fundo enquanto a camada está aberta.
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [open]);

  function dismiss() {
    setOpen(false);
    try {
      window.sessionStorage.setItem(SEEN_KEY, '1');
    } catch {
      /* sem armazenamento, reaparece na próxima página — aceitável */
    }
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sale-intro-title"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/70 p-4 backdrop-blur-sm motion-safe:animate-[fadeIn_240ms_ease-out]"
      onClick={dismiss}
    >
      <div
        className="relative w-full max-w-lg overflow-hidden bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          ref={closeRef}
          type="button"
          onClick={dismiss}
          aria-label="Fechar"
          className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center text-ink/60 transition hover:text-ink"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden className="h-5 w-5">
            <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        {/* Foto de entrada com o texto por cima. A areia clara e o céu deixam
            o texto preto legível sem precisar escurecer a imagem inteira — só
            um véu branco na metade de baixo, onde o número fica. */}
        <div className="relative isolate px-8 pb-10 pt-14 text-center">
          <Image
            src="/entrada-dunas.jpg"
            alt=""
            fill
            priority
            sizes="(max-width: 640px) 100vw, 32rem"
            className="-z-10 object-cover object-[60%_center]"
          />
          {/* Véu leve e só embaixo: forte o bastante para o texto miúdo
              descolar da areia, fraco o bastante para a foto continuar sendo
              a foto. A primeira versão levou 70% de branco no meio e apagou
              as dunas inteiras. */}
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-gradient-to-b from-white/10 via-white/35 to-white/80"
          />
          <p className="eyebrow text-ink/70">Promoção</p>
          <p id="sale-intro-title" className="display mt-4 drop-shadow-[0_1px_10px_rgba(255,255,255,0.85)]">
            <span className="block text-ink/60">Até</span>
            <span className="block">{discount}% off</span>
          </p>
          <p className="mx-auto mt-5 max-w-xs text-sm font-medium leading-relaxed text-ink/80">
            Últimas peças, aproveite! Promoção enquanto durar o estoque.
          </p>
        </div>

        <div className="flex flex-col gap-3 px-8 py-8">
          <Link href="/sale" onClick={dismiss} className="btn-primary w-full">
            Ver as peças
          </Link>
          <button
            type="button"
            onClick={dismiss}
            className="w-full py-3 text-xs font-bold uppercase tracking-[0.16em] text-ink/60 underline underline-offset-4 transition hover:text-ink"
          >
            Continuar navegando
          </button>
        </div>
      </div>
    </div>
  );
}
