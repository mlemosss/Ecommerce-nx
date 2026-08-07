import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProductBySlug, getRelatedProducts } from '../../../lib/products';
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
    <div className="container-page py-10 sm:py-14">
      <TrackProductView productId={product.id} />
      <nav className="mb-8 text-[11px] uppercase tracking-[0.14em] text-ink/60">
        <Link href="/" className="underline-offset-4 hover:underline">
          Início
        </Link>{' '}
        /{' '}
        <Link
          href={`/produtos?categoria=${product.category}`}
          className="underline-offset-4 hover:underline"
        >
          {product.category}
        </Link>{' '}
        / <span className="text-ink">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <ProductGallery
          category={product.category}
          gradient={product.gradient}
          images={product.images}
          className="aspect-square w-full"
          label={product.isBestSeller ? 'Mais vendido' : undefined}
        />

        <div>
          <div className="flex items-start justify-between gap-3">
            <p className="eyebrow text-ink/50">{product.category}</p>
            <FavoriteButton productId={product.id} />
          </div>
          <h1 className="mt-3 text-3xl font-black uppercase leading-[0.95] tracking-[-0.02em] sm:text-4xl">
            {product.name}
          </h1>

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
          <p className="eyebrow text-ink/50">Combina com</p>
          <h2 className="section-title mt-3">Você também pode gostar</h2>
          <div className="mt-10 grid grid-cols-2 gap-x-2 gap-y-8 sm:gap-x-3 md:grid-cols-3 lg:grid-cols-4">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} showBadge={false} />
            ))}
          </div>
        </section>
      )}

      <RecentlyViewed excludeId={product.id} />
    </div>
  );
}
