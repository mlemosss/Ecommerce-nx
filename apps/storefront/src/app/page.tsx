import Link from 'next/link';
import { categories, getProducts } from '../lib/products';
import { ProductCard } from '../components/product-card';
import { ProductImage } from '../components/product-image';
import { NewsletterForm } from '../components/newsletter-form';
import { SeaBackdrop } from '../components/sea-backdrop';
import { SaleIntro } from '../components/sale-intro';
import { TestimonialsSection } from '../components/testimonials-section';
import { getSettings, getTestimonials } from '../lib/api';
import { formatPrice } from '../lib/format';
import type { Category, Product } from '../lib/types';

const TRUST = [
  {
    title: 'Frete grátis',
    icon: 'M3 3h2l.4 2M7 13h10l3-8H5.4M6 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm11 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z',
  },
  // Etiqueta de cupom. O código vai no lugar do subtítulo, logo abaixo.
  {
    title: 'Cupom de 10%',
    icon: 'M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0l-7.2-7.2a2 2 0 0 1-.6-1.4V4.5A1.5 1.5 0 0 1 4.3 3h7.5a2 2 0 0 1 1.4.6l7.4 7.4a2 2 0 0 1 0 2.4ZM7.3 7.3h.01',
  },
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

  // Mesmo critério do selo de -X% no card e da página /sale: sem isso a
  // abertura poderia anunciar um desconto que a vitrine não mostra.
  const onSale = products.filter(
    (p) => !p.priceRange && p.compareAtPrice && p.compareAtPrice > p.price
  );
  const biggestDiscount = onSale.reduce((max, p) => {
    const off = Math.round((1 - p.price / (p.compareAtPrice as number)) * 100);
    return off > max ? off : max;
  }, 0);

  // Catálogo recém-carregado deixa todo produto "novo": aí o selo vira ruído.
  const everythingIsNew = featured.length > 0 && featured.every((p) => p.isNew);

  const trust = [
    `acima de ${formatPrice(settings.freeShippingThreshold)}`,
    'PRIMEIRACOMPRA10 na sua estreia',
    `Pix, cartão ${settings.maxInstallments}x e boleto`,
    'prazo calculado no seu CEP',
  ];

  return (
    <div>
      {/* Sem peça em promoção a abertura nem é montada: anunciar oferta que não
          existe queima a credibilidade da próxima. */}
      {biggestDiscount > 0 && (
        <SaleIntro discount={biggestDiscount} />
      )}

      {/* ---------------- HERO ---------------- */}
      {/* Capa enxuta: a chamada e dois caminhos, sobre o mar. Tentei a foto da
          pista aqui — como fundo inteiro o texto ficava ilegível, e em meia
          tela ela brigava com a vitrine logo abaixo. Uma dobra com uma frase e
          duas saídas decide mais rápido do que uma cheia de blocos. */}
      <section className="relative isolate flex min-h-[30rem] items-center text-ink lg:min-h-[34rem]">
        <SeaBackdrop />
        <div className="container-page relative py-20 text-center sm:py-24">
          <h1 className="display mx-auto max-w-4xl">
            <span className="block text-ink/40">{settings.heroTitleLine1}</span>
            <span className="block">{settings.heroTitleHighlight}</span>
          </h1>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
            <Link href="/produtos" className="btn-primary">
              {settings.heroPrimaryButtonLabel}
            </Link>
            <Link href="/sale" className="btn-secondary">
              Sale
            </Link>
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
      {/* Era o segundo bloco preto da página. Em maré clara ele continua
          separando a vitrine do resto, sem devolver o peso à rolagem. */}
      <section className="border-y border-line bg-foam py-20 sm:py-24">
        <div className="container-page grid gap-14 lg:grid-cols-[1fr_1.15fr] lg:gap-20">
          <div>
            <p className="eyebrow text-ink/50">Por que No Excuse</p>
            <h2 className="display-sm mt-6">
              Feito para o treino
              <br />
              <span className="text-ink/40">que você faz de verdade.</span>
            </h2>
          </div>

          <ol className="border-t border-ink/10">
            {settings.valueProps.map((item, index) => (
              <li key={item.title} className="flex gap-6 border-b border-ink/10 py-6">
                <span className="eyebrow shrink-0 pt-1 text-ink/35">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wide">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink/60">{item.description}</p>
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
