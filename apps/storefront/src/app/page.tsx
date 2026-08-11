import Link from 'next/link';
import { categories, getProducts } from '../lib/products';
import { ProductCard } from '../components/product-card';
import { ProductImage } from '../components/product-image';
import { NewsletterForm } from '../components/newsletter-form';
import { TestimonialsSection } from '../components/testimonials-section';
import { getSettings, getTestimonials } from '../lib/api';
import { formatPrice } from '../lib/format';
import type { Category, Product } from '../lib/types';

const TRUST = [
  {
    title: 'Frete grátis',
    icon: 'M3 3h2l.4 2M7 13h10l3-8H5.4M6 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm11 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z',
  },
  { title: 'Troca grátis', icon: 'M3 12a9 9 0 1 0 3-6.7L3 8m0-5v5h5' },
  { title: 'Compra 100% segura', icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z' },
  {
    title: 'Envio para todo o Brasil',
    icon: 'M3 9h13v7H3zM16 12h3l2 3v1h-5M6 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm12 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z',
  },
];

/** Primeira foto de um produto da categoria — a vitrine mostra peça real, não ícone. */
function photoOfCategory(products: Product[], category: Category): string | undefined {
  return products.find((p) => p.category === category && p.images?.[0])?.images?.[0];
}

export default async function HomePage() {
  const products = await getProducts();
  const settings = await getSettings();
  const testimonials = await getTestimonials();

  const featured = products.slice(0, 8);
  const showcase = products.filter((p) => p.images?.[0]);
  const [heroProduct, secondProduct] = showcase;
  const variantCount = products.reduce((sum, p) => sum + (p.variants?.length ?? 0), 0);
  // Catálogo recém-carregado deixa todo produto "novo": aí o selo vira ruído.
  const everythingIsNew = featured.length > 0 && featured.every((p) => p.isNew);

  const trust = [
    `acima de ${formatPrice(settings.freeShippingThreshold)}`,
    'em até 7 dias',
    `Pix, cartão ${settings.maxInstallments}x e boleto`,
    'prazo calculado no seu CEP',
  ];

  return (
    <div>
      {/* ---------------- HERO ---------------- */}
      <section className="bg-ink text-white">
        <div className="container-page grid items-center gap-14 py-20 sm:py-24 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:py-28">
          <div>
            <p className="eyebrow flex items-center gap-4 text-white/60">
              <span aria-hidden className="h-px w-10 bg-white/30" />
              {settings.heroTag}
            </p>

            <h1 className="display mt-8">
              <span className="block text-white/45">{settings.heroTitleLine1}</span>
              <span className="block">{settings.heroTitleHighlight}</span>
            </h1>

            <p className="mt-8 max-w-md leading-relaxed text-white/70">{settings.heroSubtitle}</p>

            <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
              <Link href="/produtos" className="btn-invert">
                {settings.heroPrimaryButtonLabel}
              </Link>
              <Link href="/produtos?categoria=leggings" className="link-ghost text-white">
                {settings.heroSecondaryButtonLabel}
                <span aria-hidden>→</span>
              </Link>
            </div>

            <p className="mt-10 border-t border-white/10 pt-6 text-xs uppercase tracking-[0.2em] text-white/50">
              Frete grátis acima de {formatPrice(settings.freeShippingThreshold)}
            </p>
          </div>

          {/* Composição da vitrine: peça grande + peça de apoio + contagem real do estoque. */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <Link
              href={heroProduct ? `/produtos/${heroProduct.slug}` : '/produtos'}
              className="group col-span-2 block"
            >
              <div className="overflow-hidden">
                <ProductImage
                  category={heroProduct?.category ?? 'leggings'}
                  gradient={heroProduct?.gradient ?? ['#1f1f24', '#3a3a42']}
                  photo={heroProduct?.images?.[0]}
                  priority
                  className="aspect-[4/5] w-full transition duration-700 group-hover:scale-[1.04]"
                />
              </div>
              {heroProduct && (
                <span className="mt-4 flex items-baseline justify-between gap-3 border-t border-white/15 pt-4">
                  <span className="truncate text-sm font-semibold group-hover:underline">
                    {heroProduct.name}
                  </span>
                  <span className="shrink-0 text-sm text-white/60">
                    {formatPrice(heroProduct.price)}
                  </span>
                </span>
              )}
            </Link>

            <div className="flex flex-col gap-3 sm:gap-4">
              <Link
                href={secondProduct ? `/produtos/${secondProduct.slug}` : '/produtos'}
                className="group block overflow-hidden"
              >
                <ProductImage
                  category={secondProduct?.category ?? 'tops'}
                  gradient={secondProduct?.gradient ?? ['#1a1a1a', '#3f3f46']}
                  photo={secondProduct?.images?.[0]}
                  className="aspect-square w-full transition duration-700 group-hover:scale-[1.06]"
                />
              </Link>

              <div className="flex flex-1 flex-col justify-end border border-white/15 p-4">
                <p className="text-3xl font-black leading-none tracking-tight">{variantCount}</p>
                <p className="eyebrow mt-2 text-white/50">
                  variações
                  <br />
                  prontas p/ envio
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- FAIXA DE CONFIANÇA ---------------- */}
      <section className="border-b border-line bg-line">
        <div className="container-page">
          <div className="grid grid-cols-2 gap-px md:grid-cols-4">
            {TRUST.map((item, index) => (
              <div key={item.title} className="flex items-start gap-3 bg-paper px-4 py-5">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.6}
                  aria-hidden
                  className="mt-0.5 h-5 w-5 shrink-0 text-ink/70"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wide">{item.title}</p>
                  <p className="mt-0.5 text-xs text-ink/60">{trust[index]}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- CATEGORIAS ---------------- */}
      <section className="container-page py-20 sm:py-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow text-ink/50">Vitrine</p>
            <h2 className="section-title mt-3">Compre por categoria</h2>
          </div>
          <Link href="/produtos" className="link-ghost">
            Ver tudo
            <span aria-hidden>→</span>
          </Link>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-6">
          {categories.map((category) => {
            // Categoria sem peça cadastrada não manda o cliente para uma vitrine
            // vazia: vai para a página "Em breve" e se anuncia como tal.
            const hasProducts = products.some((p) => p.category === category.value);
            return (
              <Link
                key={category.value}
                href={hasProducts ? `/produtos?categoria=${category.value}` : '/em-breve'}
                className="group relative overflow-hidden bg-ink"
              >
                <ProductImage
                  category={category.value}
                  gradient={['#18181b', '#3a3a42']}
                  photo={photoOfCategory(products, category.value)}
                  className="aspect-[3/4] w-full transition duration-700 group-hover:scale-105"
                />
                <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink via-ink/70 to-transparent px-3 pb-3 pt-10">
                  <span className="block text-xs font-bold uppercase tracking-[0.12em] text-white">
                    {category.label}
                  </span>
                  {!hasProducts && (
                    <span className="mt-0.5 block text-[10px] uppercase tracking-[0.12em] text-white/55">
                      Em breve
                    </span>
                  )}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ---------------- DESTAQUES ---------------- */}
      <section className="container-page pb-20 sm:pb-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow text-ink/50">Seleção</p>
            <h2 className="section-title mt-3">Mais vendidos &amp; novidades</h2>
          </div>
          <Link href="/produtos" className="link-ghost">
            Ver tudo
            <span aria-hidden>→</span>
          </Link>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-x-2 gap-y-8 sm:gap-x-3 md:grid-cols-3 lg:grid-cols-4">
          {featured.map((product) => (
            <ProductCard key={product.id} product={product} showBadge={!everythingIsNew} />
          ))}
        </div>
      </section>

      {/* ---------------- MANIFESTO + VANTAGENS ---------------- */}
      <section className="bg-ink py-20 text-white sm:py-24">
        <div className="container-page grid gap-14 lg:grid-cols-[1fr_1.15fr] lg:gap-20">
          <div>
            <p className="eyebrow text-white/50">Por que No Excuse</p>
            <h2 className="display-sm mt-6">
              Feito para o treino
              <br />
              <span className="text-white/45">que você faz de verdade.</span>
            </h2>
          </div>

          <ol className="border-t border-white/10">
            {settings.valueProps.map((item, index) => (
              <li key={item.title} className="flex gap-6 border-b border-white/10 py-6">
                <span className="eyebrow shrink-0 pt-1 text-white/40">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wide">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/60">{item.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <TestimonialsSection testimonials={testimonials} />

      {/* ---------------- NEWSLETTER ---------------- */}
      <section className="border-t border-line bg-paper py-20 sm:py-24">
        <div className="container-page grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="eyebrow text-ink/50">Newsletter</p>
            <h2 className="section-title mt-3">{settings.newsletterTitle}</h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-ink/60">
              {settings.newsletterSubtitle}
            </p>
          </div>
          <div className="lg:justify-self-end">
            <NewsletterForm />
          </div>
        </div>
      </section>
    </div>
  );
}
