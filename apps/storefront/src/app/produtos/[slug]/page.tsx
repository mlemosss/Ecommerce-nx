import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProductBySlug, getRelatedProducts, products } from '../../../lib/products';
import { formatInstallments, formatPrice } from '../../../lib/format';
import { ProductGallery } from '../../../components/product-gallery';
import { ProductCard } from '../../../components/product-card';
import { AddToCart } from '../../../components/add-to-cart';
import { FeatureIcon } from '../../../components/feature-icon';

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const product = getProductBySlug(params.slug);
  return { title: product ? `${product.name} — NO EXCUSE` : 'Produto — NO EXCUSE' };
}

export default function ProductDetailPage({ params }: { params: { slug: string } }) {
  const product = getProductBySlug(params.slug);

  if (!product) {
    notFound();
  }

  const related = getRelatedProducts(product);

  return (
    <div className="container-page py-10">
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
          <p className="text-sm uppercase tracking-wide text-black/50">{product.category}</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight">{product.name}</h1>

          <div className="mt-3 flex items-center gap-2 text-sm">
            <span aria-hidden className="text-volt2/80">
              {'★'.repeat(Math.round(product.rating))}
              {'☆'.repeat(5 - Math.round(product.rating))}
            </span>
            <span className="text-black/50">
              {product.rating.toFixed(1)} ({product.reviewCount} avaliações)
            </span>
          </div>

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

          <div className="mt-10 border-t border-black/10 pt-6">
            <p className="text-sm font-bold uppercase tracking-wide">Detalhes do produto</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {product.details.map((detail) => (
                <div key={detail} className="flex items-start gap-3 rounded-2xl border border-black/10 p-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-white">
                    <FeatureIcon label={detail} />
                  </span>
                  <span className="pt-1 text-sm font-medium text-black/80">{detail}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

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
    </div>
  );
}
