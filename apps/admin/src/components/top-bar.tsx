'use client';

import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

interface TopBarProps {
  title?: string;
  rightAction?: ReactNode;
  backHref?: string;
}

export function TopBar({ title, rightAction }: TopBarProps) {
  const router = useRouter();

  return (
    <div className="sticky top-0 z-30 flex items-center justify-between border-b border-black/5 bg-neutral-50/90 px-4 py-4 backdrop-blur">
      <button
        type="button"
        onClick={() => router.back()}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-black/5 text-ink"
        aria-label="Voltar"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 18 9 12l6-6" />
        </svg>
      </button>
      {title && <h1 className="text-base font-semibold">{title}</h1>}
      <div>{rightAction}</div>
    </div>
  );
}
