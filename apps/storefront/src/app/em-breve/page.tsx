import Link from 'next/link';
import { categories, getProducts } from '../../lib/products';
import { ProductImage } from '../../components/product-image';
import type { Category } from '../../lib/types';

export const metadata = {
  title: 'Em breve — NO EXCUSE',
  description: 'Camisetas, jaquetas e acessórios NO EXCUSE chegando em breve.',
};

/** Categorias já previstas na loja que ainda não têm peça cadastrada. */
const COMING: { value: Category; label: string; description: string }[] = categories.filter((c) =>
  ['camisetas', 'jaquetas', 'acessorios'].includes(c.value)
);

export default async function ComingSoonPage() {
  const products = await getProducts();
  const available = new Set(products.map((p) => p.category));
  // Se uma dessas categorias ganhar produto, ela some daqui sozinha.
  const coming = COMING.filter((c) => !available.has(c.value));

  return (
    <div>
      <section className="bg-ink text-white">
        <div className="container-page py-20 sm:py-24">
          <p className="eyebrow flex items-center gap-4 text-white/60">
            <span aria-hidden className="h-px w-10 bg-white/30" />
            Em breve
          </p>
          <h1 className="display mt-8 max-w-3xl">
            <span className="block text-white/45">Tem coisa nova</span>
            <span className="block">a caminho.</span>
          </h1>
          <p className="mt-8 max-w-md leading-relaxed text-white/70">
            Estamos preparando as próximas linhas. Enquanto isso, leggings, tops e shorts já estão
            no ar — com as mesmas medidas e o mesmo tecido testado em treino.
          </p>
          <div className="mt-10">
            <Link href="/produtos" className="btn-invert">
              Ver o que já está à venda
            </Link>
          </div>
        </div>
      </section>

      {coming.length > 0 && (
        <section className="container-page py-20 sm:py-24">
          <p className="eyebrow text-ink/50">Próximas linhas</p>
          <h2 className="section-title mt-3">O que vem por aí</h2>

          <div className="mt-10 grid gap-3 sm:grid-cols-3 sm:gap-4">
            {coming.map((category) => (
              <div key={category.value} className="group relative overflow-hidden bg-ink">
                <ProductImage
                  category={category.value}
                  gradient={['#18181b', '#3a3a42']}
                  className="aspect-[3/4] w-full"
                />
                <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink via-ink/70 to-transparent px-4 pb-4 pt-12">
                  <span className="block text-xs font-bold uppercase tracking-[0.12em] text-white">
                    {category.label}
                  </span>
                  <span className="mt-1 block text-xs text-white/60">{category.description}</span>
                </span>
              </div>
            ))}
          </div>

          <p className="mt-10 max-w-md text-sm leading-relaxed text-ink/60">
            Ainda sem data. Quando entrarem, aparecem direto na vitrine — e esta página some.
          </p>
        </section>
      )}
    </div>
  );
}
