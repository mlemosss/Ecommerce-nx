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
import { getProductReviews, getSettings } from '../../../lib/api';
import { formatPrice } from '../../../lib/format';
import { summarizeDescription } from '../../../lib/description';
import { JsonLd } from '../../../components/json-ld';
import { breadcrumbSchema, productSchema } from '../../../lib/structured-data';

const STOREFRONT_URL = (
  process.env.NEXT_PUBLIC_STOREFRONT_URL || 'https://www.noexcusenx.com.br'
).replace(/\/$/, '');

/**
 * Sem Open Graph, um link de produto colado no WhatsApp ou no Instagram chega
 * sem foto, sem nome e sem preço — e esses são os principais canais da loja.
 */
export async function generateMetadata({ params }: { params: { slug: string } }) {
  const product = await getProductBySlug(params.slug);
  if (!product) return { title: 'Produto — NO EXCUSE' };

  const title = `${product.name} — NO EXCUSE`;
  const description =
    (product.description?.trim() && summarizeDescription(product.description)) ||
    `${product.name} por ${formatPrice(product.price)}. ${product.colors.length > 1 ? `${product.colors.length} cores` : product.colors[0] ?? ''}${
      product.sizes.length ? ` · tamanhos ${product.sizes.join(', ')}` : ''
    }. Frete para todo o Brasil.`;
  const url = `${STOREFRONT_URL}/produtos/${product.slug}`;
  const image = product.images?.[0];

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: 'website',
      siteName: 'NO EXCUSE',
      locale: 'pt_BR',
      ...(image ? { images: [{ url: image, width: 1200, height: 1500, alt: product.name }] } : {}),
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function ProductDetailPage({ params }: { params: { slug: string } }) {
  const product = await getProductBySlug(params.slug);

  if (!product) {
    notFound();
  }

  const related = await getRelatedProducts(product);
  const reviewsResult = await getProductReviews(product.id);
  const settings = await getSettings();

  return (
    <div className="container-page py-10 sm:py-14">
      {/* Preço, estoque e estrelas no resultado do Google. Sem isto o link
          aparece só com título e um pedaço do texto. */}
      <JsonLd
        data={productSchema({
          product,
          url: `${STOREFRONT_URL}/produtos/${product.slug}`,
          reviews: { average: reviewsResult.average, count: reviewsResult.count },
          storeName: 'NO EXCUSE',
          storefrontUrl: STOREFRONT_URL,
          freeShippingThreshold: settings.freeShippingThreshold,
        })}
      />
      <JsonLd
        data={breadcrumbSchema([
          { nome: 'Início', url: STOREFRONT_URL },
          {
            nome: product.category,
            url: `${STOREFRONT_URL}/produtos?categoria=${product.category}`,
          },
          { nome: product.name, url: `${STOREFRONT_URL}/produtos/${product.slug}` },
        ])}
      />
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
          productName={product.name}
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

          {/* Nota logo abaixo do nome, antes do preço.
              As avaliações ficavam só no fim da página, depois da grade de
              tamanhos e do botão de comprar — quem decide pela opinião das
              outras decidia sem ver que existia opinião. Aqui a nota entra no
              mesmo golpe de vista do nome e do preço, e o link leva direto
              para os textos. Sem nenhuma avaliação, o espaço vira convite:
              quem já usou a peça é quem pode escrever a primeira. */}
          {reviewsResult.count > 0 ? (
            <a href="#avaliacoes" className="mt-3 inline-flex items-center gap-2 text-sm">
              <span aria-hidden className="tracking-[0.15em] text-ink">
                {'★'.repeat(Math.round(reviewsResult.average))}
                <span className="text-ink/25">
                  {'★'.repeat(5 - Math.round(reviewsResult.average))}
                </span>
              </span>
              <span className="text-ink/70 underline-offset-4 hover:underline">
                {reviewsResult.average.toFixed(1)} · {reviewsResult.count}{' '}
                {reviewsResult.count === 1 ? 'avaliação' : 'avaliações'}
              </span>
            </a>
          ) : (
            <Link
              href="/avaliar-loja"
              className="mt-3 inline-block text-sm text-ink/60 underline-offset-4 hover:underline"
            >
              Ainda sem avaliações — já usou? Conte para as próximas
            </Link>
          )}

          <div className="mt-8">
            <AddToCart product={product} sizeGuide={settings.sizeGuide} />
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
