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
const DEFAULT_HEADLINE = 'Duas mulheres, duas histórias, um propósito.';
const DEFAULT_BODY = [
  'A NO EXCUSE nasceu da união de duas mulheres, duas histórias e um propósito em comum: criar uma marca fitness que acompanhe mulheres reais em movimento.',
  'De um lado, Isa — professora, empreendedora e apaixonada por criar, idealizar e transformar ideias em projetos. Seu olhar cuidadoso para os detalhes, para a estética e para aquilo que faz uma mulher se sentir bonita e confiante trouxe para a NO EXCUSE o desejo de criar peças que vão além da academia: peças que tenham estilo, personalidade e que façam a gente se sentir bem ao vestir.',
  'Do outro, Lay — personal trainer e professora de Educação Física, que vive o universo do treino todos os dias. Determinada, disciplinada e apaixonada pelo movimento, fez dele não apenas sua profissão, mas parte da sua vida. Sua experiência trouxe um olhar técnico e essencial: entender o corpo em movimento, o conforto, a sustentação, a compressão, a respirabilidade e o caimento que uma boa roupa fitness precisa ter.',
  'Foi dessa combinação que nasceu a NO EXCUSE. Uma marca pensada por mulheres e para mulheres que trabalham, treinam, cuidam de tantas coisas e, ainda assim, escolhem reservar um tempo para cuidar de si.',
  'Por isso, cada peça é escolhida pensando no equilíbrio entre performance, conforto, qualidade e estilo.',
].join('\n\n');

/**
 * Fecho da história, sempre em destaque próprio.
 *
 * Fica fora de `aboutBody` de propósito: é a assinatura da marca, e sai com
 * tratamento tipográfico diferente do corpo do texto. Se estivesse no corpo,
 * viraria mais um parágrafo entre outros.
 */
const CLOSING = {
  lead: 'Não queremos apenas vestir o seu treino.',
  body: 'Queremos fazer parte daquela escolha diária de se movimentar, se cuidar, se superar e continuar.',
};

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

      {/* Fecho da história. Tipografia de vitrine e nada em volta: é a frase
          que a marca quer que fique, e ela some se virar mais um parágrafo. */}
      <section className="container-page py-20 text-center sm:py-24">
        <p className="display-sm mx-auto max-w-3xl text-ink/40">{CLOSING.lead}</p>
        <p className="display-sm mx-auto mt-3 max-w-3xl">{CLOSING.body}</p>
        <p className="eyebrow mt-12 text-ink/50">No Excuse</p>
        <p className="mt-3 text-lg font-semibold tracking-tight">
          Vista sua força. Viva seu movimento.
        </p>
      </section>

      <section className="border-b border-t border-line bg-paper">
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
