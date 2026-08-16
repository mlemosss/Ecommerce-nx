import Link from 'next/link';
import type { Product } from '../lib/types';
import { formatPrice } from '../lib/format';
import { ProductImage } from './product-image';
import { FavoriteButton } from './favorite-button';

export function ProductCard({
  product,
  showBadge = true,
}: {
  product: Product;
  /** Quando a vitrine inteira é "novidade", o selo em todo card não informa nada. */
  showBadge?: boolean;
}) {
  const badge = product.isBestSeller
    ? 'Mais vendido'
    : showBadge && product.isNew
    ? 'Novidade'
    : undefined;

  // Só mostra desconto quando ele é real: preço "de" acima do preço atual.
  const discount =
    !product.priceRange && product.compareAtPrice && product.compareAtPrice > product.price
      ? Math.round((1 - product.price / product.compareAtPrice) * 100)
      : null;

  return (
    <div className="group relative flex flex-col">
      <div className="relative overflow-hidden bg-paper">
        <div className="absolute right-2 top-2 z-20">
          <FavoriteButton productId={product.id} />
        </div>

        {discount !== null && (
          <span className="absolute left-0 top-3 z-10 bg-ink px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
            -{discount}%
          </span>
        )}

        <Link href={`/produtos/${product.slug}`} tabIndex={-1} aria-hidden className="block">
          <ProductImage
            category={product.category}
            gradient={product.gradient}
            photo={product.images?.[0]}
            alt={`${product.name} — NO EXCUSE`}
            className="aspect-[4/5] w-full transition duration-700 group-hover:scale-[1.04]"
            label={discount === null ? badge : undefined}
          />
          {/* Chamada que aparece sobre a foto no hover, no desktop. */}
          <span className="pointer-events-none absolute inset-x-0 bottom-0 hidden translate-y-full bg-ink/90 py-3 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-white transition duration-300 group-hover:translate-y-0 lg:block">
            Ver produto
          </span>
        </Link>
      </div>

      <Link href={`/produtos/${product.slug}`} className="mt-3 flex flex-1 flex-col">
        <h3 className="text-[11px] font-semibold uppercase leading-relaxed tracking-[0.12em] underline-offset-4 group-hover:underline">
          {product.name}
        </h3>
        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
          {discount !== null && product.compareAtPrice && (
            <span className="text-xs text-ink/60 line-through">
              {formatPrice(product.compareAtPrice)}
            </span>
          )}
          <span className="text-sm font-bold">
            {product.priceRange
              ? `A partir de ${formatPrice(product.price)}`
              : formatPrice(product.price)}
          </span>
        </div>
      </Link>
    </div>
  );
}
