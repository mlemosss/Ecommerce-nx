import Link from 'next/link';
import { getSettings } from '../../lib/api';
import { getProducts } from '../../lib/products';
import { ProductImage } from '../../components/product-image';

export const metadata = {
  alternates: { canonical: '/quem-somos' },
  title: 'Quem somos — NO EXCUSE',
  description: 'A história da NO EXCUSE, por Isabella e Layane.',
};

/** Texto de partida. O conteúdo real é editável em Configurações → Quem somos. */
const DEFAULT_HEADLINE = 'Somos a Isabella e a Layane.';
const DEFAULT_BODY = [
  'A NO EXCUSE é a nossa marca de roupa de treino. Escolhemos cada peça pensando em quem treina de verdade: caimento que não sobe, compressão que sustenta e tecido que aguenta a rotina.',
  'Somos nós duas em cada etapa — da escolha do tecido ao pedido que sai daqui embalado. Se precisar falar com a gente, é só chamar.',
].join('\n\n');

export default async function AboutPage() {
  const settings = await getSettings();
  const products = await getProducts();

  const headline = settings.aboutHeadline?.trim() || DEFAULT_HEADLINE;
  const body = settings.aboutBody?.trim() || DEFAULT_BODY;
  const paragraphs = body.split(/\n{2,}/).filter(Boolean);
  const showcase = products.filter((p) => p.images?.[0]).slice(0, 3);

  return (
    <div>
      <section className="bg-ink text-white">
        <div className="container-page grid items-center gap-14 py-20 sm:py-24 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          <div>
            <p className="eyebrow flex items-center gap-4 text-white/60">
              <span aria-hidden className="h-px w-10 bg-white/30" />
              Quem somos
            </p>
            <h1 className="display-sm mt-8">{headline}</h1>
            <div className="mt-8 max-w-md space-y-4">
              {paragraphs.map((paragraph, index) => (
                <p key={index} className="leading-relaxed text-white/70">
                  {paragraph}
                </p>
              ))}
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
              <Link href="/produtos" className="btn-invert">
                Ver a loja
              </Link>
              {settings.instagramUrl && (
                <a
                  href={settings.instagramUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="link-ghost text-white"
                >
                  Instagram
                  <span aria-hidden>→</span>
                </a>
              )}
            </div>
          </div>

          {showcase.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="col-span-2 overflow-hidden">
                <ProductImage
                  category={showcase[0].category}
                  gradient={showcase[0].gradient}
                  photo={showcase[0].images?.[0]}
                  className="aspect-[16/10] w-full"
                />
              </div>
              {showcase.slice(1, 3).map((product) => (
                <div key={product.id} className="overflow-hidden">
                  <ProductImage
                    category={product.category}
                    gradient={product.gradient}
                    photo={product.images?.[0]}
                    className="aspect-square w-full"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="border-b border-line bg-paper">
        <div className="container-page grid grid-cols-1 gap-px py-0 sm:grid-cols-3">
          {[
            ['Feito por quem treina', 'Cada modelo é provado antes de entrar na loja.'],
            ['Troca sem burocracia', 'Não serviu? A gente resolve.'],
            ['Envio para todo o Brasil', 'Rastreado, com prazo calculado no seu CEP.'],
          ].map(([title, description]) => (
            <div key={title} className="bg-paper py-8 sm:px-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em]">{title}</p>
              <p className="mt-2 text-sm leading-relaxed text-ink/60">{description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
