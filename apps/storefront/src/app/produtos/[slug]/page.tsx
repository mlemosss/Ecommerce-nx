import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProductBySlug, getRelatedProducts } from '../../../lib/products';
import { formatInstallments, formatPrice } from '../../../lib/format';
import { ProductGallery } from '../../../components/product-gallery';
import { ProductCard } from '../../../components/product-card';
import { AddToCart } from '../../../components/add-to-cart';
import { TrackProductView } from '../../../components/track-product-view';
import { RecentlyViewed } from '../../../components/recently-viewed';
import { FavoriteButton } from '../../../components/favorite-button';
import { ProductReviews } from '../../../components/product-reviews';
import { getProductReviews } from '../../../lib/api';

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const product = await getProductBySlug(params.slug);
  return { title: product ? `${product.name} — NO EXCUSE` : 'Produto — NO EXCUSE' };
}

export default async function ProductDetailPage({ params }: { params: { slug: string } }) {
  const product = await getProductBySlug(params.slug);

  if (!product) {
    notFound();
  }

  const related = await getRelatedProducts(product);
  const reviewsResult = await getProductReviews(product.id);

  return (
    <div className="container-page py-10">
      <TrackProductView productId={product.id} />
      <nav className="mb-6 text-sm text-black/50">
        <Link href="/" className="hover:underline">
          Início
        </Link>{' '}
        /{' '}
        <Link href={`/produtos?categoria=${product.category}`} className="capitalize hover:underline">
          {product.category}
        </Link>{' '}
        / <span className="text-black">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <ProductGallery
          category={product.category}
          gradient={product.gradient}
          images={product.images}
          className="aspect-square w-full rounded-3xl"
          label={product.isBestSeller ? 'Mais vendido' : product.isNew ? 'Novidade' : undefined}
        />

        <div>
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm uppercase tracking-wide text-black/50">{product.category}</p>
            <FavoriteButton productId={product.id} />
          </div>
          <h1 className="mt-1 text-3xl font-black tracking-tight">{product.name}</h1>

          <div className="mt-5 flex items-baseline gap-3">
            <span className="text-3xl font-bold">{formatPrice(product.price)}</span>
            {product.compareAtPrice && (
              <span className="text-lg text-black/40 line-through">
                {formatPrice(product.compareAtPrice)}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-black/50">{formatInstallments(product.price)}</p>

          <p className="mt-6 text-black/70">{product.description}</p>

          <div className="mt-8">
            <AddToCart product={product} />
          </div>
        </div>
      </div>

      <ProductReviews
        productId={product.id}
        reviews={reviewsResult.reviews}
        average={reviewsResult.average}
        count={reviewsResult.count}
      />

      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="section-title">Você também pode gostar</h2>
          <div className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}

      <RecentlyViewed excludeId={product.id} />
    </div>
  );
}
