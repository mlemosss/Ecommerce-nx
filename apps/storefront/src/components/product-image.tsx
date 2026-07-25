import type { ReactElement } from 'react';
import type { Category } from '../lib/types';

const categoryIcons: Record<Category, ReactElement> = {
  leggings: (
    <path d="M9 2h6l1 6-1 5 2 9h-4l-2-8-2 8H5l2-9-1-5 3-6Z" />
  ),
  tops: <path d="M7 4 3 7l2 3 2-1v11h10V9l2 1 2-3-4-3-2 2h-4L7 4Z" />,
  shorts: <path d="M4 3h16l1 6-2 1-1 11h-4l-1-9-1 9H8L7 10l-2-1 1-6Z" />,
  camisetas: <path d="M8 3 3 6l1 4 3-1v12h10V9l3 1 1-4-5-3-2 2h-4L8 3Z" />,
  jaquetas: (
    <path d="M8 3 3 6l1.5 5L6 10v11h12V10l1.5 1L21 6l-5-3-2 2h-4L8 3Zm4 3h0" />
  ),
  acessorios: <path d="M12 2a5 5 0 0 1 5 5v3h1a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1h1V7a5 5 0 0 1 5-5Zm0 2a3 3 0 0 0-3 3v3h6V7a3 3 0 0 0-3-3Z" />,
};

interface ProductImageProps {
  category: Category;
  gradient: [string, string];
  className?: string;
  label?: string;
}

export function ProductImage({ category, gradient, className = '', label }: ProductImageProps) {
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden ${className}`}
      style={{
        backgroundImage: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`,
      }}
    >
      <div className="absolute inset-0 opacity-10 mix-blend-overlay" aria-hidden>
        <svg width="100%" height="100%">
          <pattern id="grain" width="6" height="6" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="white" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#grain)" />
        </svg>
      </div>
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className="relative h-16 w-16 text-white/25 sm:h-24 sm:w-24"
        aria-hidden
      >
        {categoryIcons[category]}
      </svg>
      {label && (
        <span className="absolute left-3 top-3 rounded-full bg-black/40 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur">
          {label}
        </span>
      )}
    </div>
  );
}
