import Link from 'next/link';
import type { Product } from '../lib/types';
import { formatPrice } from '../lib/format';
import { ProductImage } from './product-image';
import { FavoriteButton } from './favorite-button';

export function ProductCard({ product }: { product: Product }) {
  const badge = product.isBestSeller ? 'Mais vendido' : product.isNew ? 'Novidade' : undefined;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div className="absolute right-2 top-2 z-10">
        <FavoriteButton productId={product.id} />
      </div>
      <Link href={`/produtos/${product.slug}`} className="flex flex-1 flex-col">
        <ProductImage
          category={product.category}
          gradient={product.gradient}
          photo={product.images?.[0]}
          className="aspect-[4/5] w-full"
          label={badge}
        />
        <div className="flex flex-1 flex-col gap-1 p-4">
          <p className="text-xs uppercase tracking-wide text-black/60">{product.category}</p>
          <h3 className="font-semibold leading-snug text-ink group-hover:underline">
            {product.name}
          </h3>
          <div className="mt-auto flex items-baseline gap-2 pt-2">
            <span className="text-lg font-bold text-ink">
              {product.priceRange ? `A partir de ${formatPrice(product.price)}` : formatPrice(product.price)}
            </span>
            {!product.priceRange && product.compareAtPrice && (
              <span className="text-sm text-black/60 line-through">
                {formatPrice(product.compareAtPrice)}
              </span>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}
