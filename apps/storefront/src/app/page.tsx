import Link from 'next/link';
import { categories, getFeaturedProducts } from '../lib/products';
import { ProductCard } from '../components/product-card';
import { ProductImage } from '../components/product-image';
import { NewsletterForm } from '../components/newsletter-form';

const valueProps = [
  {
    title: 'Troca grátis em 30 dias',
    description: 'Não serviu ou não gostou? Trocamos sem burocracia.',
  },
  {
    title: 'Entrega para todo o Brasil',
    description: 'Envio rastreado com prazos exibidos no checkout.',
  },
  {
    title: 'Tecido testado em treino real',
    description: 'Compressão, respirabilidade e durabilidade validadas por atletas.',
  },
  {
    title: 'Pagamento seguro',
    description: 'Pix, cartão em até 3x sem juros ou boleto.',
  },
];

export default function HomePage() {
  const featured = getFeaturedProducts(8);

  return (
    <div>
      <section className="relative overflow-hidden bg-ink text-white">
        <div className="container-page grid gap-10 py-16 sm:py-24 lg:grid-cols-2 lg:items-center">
          <div>
            <span className="inline-block rounded-full bg-volt2 px-4 py-1 text-xs font-bold uppercase tracking-wider text-ink">
              Nova coleção
            </span>
            <h1 className="mt-6 text-4xl font-black uppercase leading-[1.05] tracking-tight sm:text-6xl">
              Treine sem
              <br />
              <span className="text-volt2">limites.</span>
            </h1>
            <p className="mt-6 max-w-md text-white/70">
              Roupas de academia pensadas para quem treina de verdade: compressão certa,
              respirabilidade e caimento que acompanham cada repetição.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/produtos" className="btn-primary bg-volt2 text-ink hover:bg-white">
                Ver produtos
              </Link>
              <Link
                href="/produtos?categoria=leggings"
                className="btn-secondary border-white/30 text-white hover:bg-white hover:text-ink"
              >
                Explorar leggings
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <ProductImage
              category="leggings"
              gradient={['#1f1f24', '#3a3a42']}
              className="col-span-2 aspect-[16/9] rounded-3xl"
            />
            <ProductImage category="tops" gradient={['#1a1a1a', '#c6ff3d']} className="aspect-square rounded-3xl" />
            <ProductImage category="jaquetas" gradient={['#101a12', '#294d33']} className="aspect-square rounded-3xl" />
          </div>
        </div>
      </section>

      <section className="container-page py-16">
        <h2 className="section-title">Compre por categoria</h2>
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {categories.map((category) => (
            <Link
              key={category.value}
              href={`/produtos?categoria=${category.value}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-black/5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <ProductImage
                category={category.value}
                gradient={['#18181b', '#3a3a42']}
                className="aspect-square w-full"
              />
              <span className="bg-white p-3 text-center text-sm font-semibold">
                {category.label}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="container-page py-16">
        <div className="flex items-end justify-between gap-4">
          <h2 className="section-title">Mais vendidos &amp; novidades</h2>
          <Link href="/produtos" className="text-sm font-semibold underline underline-offset-4">
            Ver tudo
          </Link>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {featured.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      <section className="border-y border-black/5 bg-black/[0.02] py-16">
        <div className="container-page grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {valueProps.map((item) => (
            <div key={item.title}>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ink text-volt2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="mt-4 font-bold">{item.title}</h3>
              <p className="mt-1 text-sm text-black/60">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-ink py-16 text-white">
        <div className="container-page flex flex-col items-center gap-6 text-center">
          <h2 className="section-title">Ganhe 10% na primeira compra</h2>
          <p className="max-w-md text-white/60">
            Cadastre seu e-mail e receba um cupom exclusivo, além de novidades de lançamentos.
          </p>
          <NewsletterForm />
        </div>
      </section>
    </div>
  );
}
