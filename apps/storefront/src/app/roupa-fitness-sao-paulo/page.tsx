import type { Metadata } from 'next';
import Link from 'next/link';
import { getProducts } from '../../lib/products';
import { getSettings } from '../../lib/api';
import { ProductCard } from '../../components/product-card';
import { JsonLd } from '../../components/json-ld';
import { breadcrumbSchema, faqSchema } from '../../lib/structured-data';

const STOREFRONT_URL = (
  process.env.NEXT_PUBLIC_STOREFRONT_URL || 'https://www.noexcusenx.com.br'
).replace(/\/$/, '');

export const metadata: Metadata = {
  title: 'Roupa Fitness Feminina em São Paulo — Retirada em Higienópolis',
  description:
    'Leggings, tops e shorts de academia com retirada em mãos em Higienópolis, São Paulo, sem frete. Entrega em toda a capital em até 2 dias úteis.',
  alternates: { canonical: '/roupa-fitness-sao-paulo' },
};

/**
 * Uma página geográfica, e uma só.
 *
 * A loja tem uma oferta que a página nacional não tem: retirar em mãos em
 * Higienópolis, sem pagar frete. Isso justifica uma página própria — quem
 * busca "roupa fitness em São Paulo" está procurando exatamente isso, e o
 * conteúdo aqui é diferente de verdade, não a home com o nome da cidade
 * trocado.
 *
 * **Não fazer a mesma para outras cidades.** Sem retirada lá, seria a mesma
 * página com outro nome — o Google chama isso de página de entrada e trata
 * como manipulação. Uma página honesta ranqueia; dez cópias derrubam o site.
 */

const PERGUNTAS = [
  {
    pergunta: 'Dá para retirar em mãos em São Paulo?',
    resposta:
      'Dá. Escolha "Retirar em Higienópolis" na finalização da compra e o frete fica zerado. A gente combina dia e horário pelo WhatsApp assim que o pagamento cai. O estoque fica em Higienópolis, na região da Rua Tupi, perto de Santa Cecília.',
  },
  {
    pergunta: 'Vocês têm loja física para provar as peças?',
    resposta:
      'Não temos loja aberta ao público — o endereço é o do estoque, e a retirada é combinada. Para acertar o tamanho sem provar, use a tabela de medidas e, na dúvida, mande suas medidas no WhatsApp: a gente responde com o tamanho.',
  },
  {
    pergunta: 'Quanto tempo leva a entrega em São Paulo capital?',
    resposta:
      'Pelas transportadoras, normalmente 2 dias úteis para a capital, com rastreio. Na retirada em Higienópolis, é no mesmo dia ou no dia seguinte, conforme o horário que combinarmos.',
  },
  {
    pergunta: 'Quanto custa o frete dentro de São Paulo?',
    resposta:
      'A partir de cerca de R$ 12, calculado pelo seu CEP na finalização — e grátis na retirada em Higienópolis.',
  },
];

export default async function RoupaFitnessSaoPauloPage() {
  const [produtos, settings] = await Promise.all([getProducts(), getSettings()]);
  const destaques = produtos.slice(0, 4);
  const zap = settings.contactWhatsapp?.replace(/\D/g, '');

  return (
    <div className="container-page py-10 sm:py-14">
      <JsonLd
        data={breadcrumbSchema([
          { nome: 'Início', url: STOREFRONT_URL },
          { nome: 'São Paulo', url: `${STOREFRONT_URL}/roupa-fitness-sao-paulo` },
        ])}
      />
      <JsonLd data={faqSchema(PERGUNTAS)} />

      <nav className="mb-8 text-[11px] uppercase tracking-[0.14em] text-ink/60">
        <Link href="/" className="underline-offset-4 hover:underline">
          Início
        </Link>{' '}
        / <span className="text-ink">São Paulo</span>
      </nav>

      <p className="eyebrow text-ink/50">São Paulo · Higienópolis</p>
      <h1 className="section-title mt-3">Roupa fitness feminina em São Paulo</h1>

      <div className="mt-6 max-w-2xl space-y-4 text-sm leading-relaxed text-ink/75">
        <p>
          A NO EXCUSE é de São Paulo. O estoque fica em <strong>Higienópolis</strong>, e quem está na
          cidade pode <strong>retirar em mãos sem pagar frete</strong> — é só escolher a opção de
          retirada na finalização da compra, que combinamos dia e horário pelo WhatsApp.
        </p>
        <p>
          Não somos uma loja aberta ao público: o endereço é do estoque e a retirada é agendada. Em
          troca, a peça sai no mesmo dia ou no dia seguinte, sem esperar transportadora.
        </p>
        <p>
          Para o resto da capital e do país, enviamos por Correios, Jadlog, Loggi e outras
          transportadoras, com rastreio. Para São Paulo capital o prazo costuma ser de{' '}
          <strong>2 dias úteis</strong>, e o valor sai a partir de cerca de R$ 12, calculado pelo seu
          CEP.
        </p>
      </div>

      {destaques.length > 0 && (
        <section className="mt-14">
          <h2 className="text-sm font-bold uppercase tracking-[0.14em]">Peças disponíveis agora</h2>
          <div className="mt-6 grid grid-cols-2 gap-x-2 gap-y-8 sm:gap-x-3 md:grid-cols-4">
            {destaques.map((p) => (
              <ProductCard key={p.id} product={p} showBadge={false} />
            ))}
          </div>
          <Link href="/produtos" className="btn-secondary mt-8 inline-flex">
            Ver todas as peças
          </Link>
        </section>
      )}

      <section className="mt-16 border-t border-line pt-12">
        <h2 className="section-title">Perguntas de quem é daqui</h2>
        <div className="mt-8 max-w-2xl divide-y divide-line border-y border-line">
          {PERGUNTAS.map((p) => (
            <details key={p.pergunta} className="group py-5">
              <summary className="cursor-pointer list-none text-sm font-semibold">
                {p.pergunta}
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-ink/70">{p.resposta}</p>
            </details>
          ))}
        </div>
      </section>

      {zap && (
        <section className="mt-14 bg-paper px-6 py-10 text-center">
          <h2 className="section-title">Quer combinar a retirada?</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink/70">
            Chame a gente no WhatsApp. Respondemos com o horário e o ponto exato em Higienópolis.
          </p>
          <a
            href={`https://wa.me/${zap}?text=${encodeURIComponent(
              'Oi! Sou de São Paulo e queria saber sobre a retirada em Higienópolis.'
            )}`}
            target="_blank"
            rel="noreferrer"
            className="btn-primary mt-6 inline-flex"
          >
            Falar no WhatsApp
          </a>
        </section>
      )}
    </div>
  );
}
