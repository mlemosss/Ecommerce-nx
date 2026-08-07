'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { Category } from '../lib/types';
import { ProductImage } from './product-image';

interface ProductGalleryProps {
  category: Category;
  gradient: [string, string];
  images?: string[];
  label?: string;
  className?: string;
}

export function ProductGallery({ category, gradient, images, label, className = '' }: ProductGalleryProps) {
  const [active, setActive] = useState(0);

  if (!images || images.length === 0) {
    return <ProductImage category={category} gradient={gradient} label={label} className={className} />;
  }

  return (
    <div>
      <ProductImage
        category={category}
        gradient={gradient}
        photo={images[active]}
        label={label}
        className={className}
        fit="contain"
      />
      {images.length > 1 && (
        <div className="mt-3 flex gap-3">
          {images.map((src, index) => (
            <button
              key={src}
              type="button"
              onClick={() => setActive(index)}
              className={`relative h-16 w-16 shrink-0 overflow-hidden border-2 transition ${
                index === active ? 'border-ink' : 'border-transparent opacity-70 hover:opacity-100'
              }`}
              aria-label={`Ver foto ${index + 1}`}
            >
              <Image src={src} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
