import Link from 'next/link';
import { getProducts } from '../../lib/products';
import { ProductCard } from '../../components/product-card';

export const metadata = {
  alternates: { canonical: '/sale' },
  title: 'Sale — NO EXCUSE',
  description: 'Peças NO EXCUSE com desconto.',
};

export default async function SalePage() {
  const products = await getProducts();

  // "Está em promoção" = tem preço "de" maior que o preço atual. É o mesmo
  // critério que faz o selo de -X% aparecer no card, então vitrine e etiqueta
  // nunca discordam.
  const onSale = products.filter(
    (p) => !p.priceRange && p.compareAtPrice && p.compareAtPrice > p.price
  );

  const biggestDiscount = onSale.reduce((max, p) => {
    const off = Math.round((1 - p.price / (p.compareAtPrice as number)) * 100);
    return off > max ? off : max;
  }, 0);

  return (
    <div>
      <section className="bg-ink text-white">
        <div className="container-page py-16 sm:py-20">
          <p className="eyebrow flex items-center gap-4 text-white/60">
            <span aria-hidden className="h-px w-10 bg-white/30" />
            Sale
          </p>
          <h1 className="display mt-8">
            {onSale.length > 0 ? (
              <>
                <span className="block text-white/45">Até</span>
                <span className="block">{biggestDiscount}% off.</span>
              </>
            ) : (
              <>
                <span className="block text-white/45">Nenhuma peça</span>
                <span className="block">em promoção agora.</span>
              </>
            )}
          </h1>
          {onSale.length > 0 && (
            <p className="mt-8 max-w-md leading-relaxed text-white/70">
              Últimas peças, aproveite! Promoção enquanto durar o estoque.
            </p>
          )}
        </div>
      </section>

      <section className="container-page py-16 sm:py-20">
        {onSale.length === 0 ? (
          <div className="flex flex-col items-center gap-5 py-10 text-center">
            <p className="max-w-md text-sm leading-relaxed text-ink/60">
              Assim que uma peça entrar em promoção, ela aparece aqui automaticamente.
            </p>
            <Link href="/produtos" className="btn-primary">
              Ver todos os produtos
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-2 gap-y-8 sm:gap-x-3 md:grid-cols-3 lg:grid-cols-4">
            {onSale.map((product) => (
              <ProductCard key={product.id} product={product} showBadge={false} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
