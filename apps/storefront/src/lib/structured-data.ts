import type { Product } from './types';

/**
 * Dados estruturados (JSON-LD) para o Google.
 *
 * Sem isto o resultado da busca traz só título e um pedaço do texto. Com isto o
 * Google mostra preço, se tem em estoque e as estrelas embaixo do link — o que
 * decide o clique antes mesmo de a pessoa entrar. É o único jeito de aparecer
 * no Google Shopping gratuito, que para loja nova é a visita que não se paga.
 *
 * Tudo aqui precisa bater com o que a página mostra. Anunciar preço ou estoque
 * diferente do real derruba a página do resultado enriquecido, e o Google não
 * avisa antes.
 */

const MOEDA = 'BRL';

/** Peça sem nenhuma variação com saldo está esgotada, e o Google precisa saber. */
function disponibilidade(product: Product): string {
  const temEstoque = (product.variants ?? []).some((v) => v.stock > 0);
  return temEstoque
    ? 'https://schema.org/InStock'
    : 'https://schema.org/OutOfStock';
}

export interface ProductSchemaInput {
  product: Product;
  url: string;
  /** Avaliações aprovadas. Sem nenhuma, o bloco de estrelas não é declarado. */
  reviews: { average: number; count: number };
  storeName: string;
  storefrontUrl: string;
}

export function productSchema({
  product,
  url,
  reviews,
  storeName,
  storefrontUrl,
}: ProductSchemaInput): Record<string, unknown> {
  const precos = (product.variants ?? []).map((v) => v.price).filter((p) => p > 0);
  const menor = precos.length ? Math.min(...precos) : product.price;
  const maior = precos.length ? Math.max(...precos) : product.price;

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || product.name,
    image: product.images ?? [],
    sku: product.id,
    brand: { '@type': 'Brand', name: storeName },
    ...(product.colors?.length ? { color: product.colors.join(', ') } : {}),
    ...(product.sizes?.length ? { size: product.sizes.join(', ') } : {}),

    // Uma faixa de preço quando as variações custam diferente, e um preço só
    // quando é tudo igual. `AggregateOffer` com menor === maior faz o Google
    // mostrar "a partir de" numa peça de preço único, o que soa a pegadinha.
    offers:
      menor === maior
        ? {
            '@type': 'Offer',
            url,
            priceCurrency: MOEDA,
            price: menor.toFixed(2),
            availability: disponibilidade(product),
            itemCondition: 'https://schema.org/NewCondition',
            seller: { '@type': 'Organization', name: storeName, url: storefrontUrl },
          }
        : {
            '@type': 'AggregateOffer',
            url,
            priceCurrency: MOEDA,
            lowPrice: menor.toFixed(2),
            highPrice: maior.toFixed(2),
            offerCount: precos.length,
            availability: disponibilidade(product),
            seller: { '@type': 'Organization', name: storeName, url: storefrontUrl },
          },

    // Estrelas só quando existem de verdade. Declarar nota sem avaliação é o
    // tipo de coisa que o Google trata como manipulação.
    ...(reviews.count > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: reviews.average.toFixed(1),
            reviewCount: reviews.count,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
  };
}

/** O caminho até a peça, igual ao que a página desenha em cima do título. */
export function breadcrumbSchema(
  trilha: { nome: string; url: string }[]
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trilha.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.nome,
      item: item.url,
    })),
  };
}

/**
 * Quem é a loja. Alimenta o painel lateral do Google e liga a marca às redes.
 *
 * O CNPJ entra como `taxID`: para uma loja que ninguém conhece, ser uma empresa
 * verificável é parte do que faz a busca confiar no site.
 */
export function organizationSchema(input: {
  storeName: string;
  storefrontUrl: string;
  logoUrl: string;
  legalName?: string | null;
  cnpj?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  redes: string[];
}): Record<string, unknown> {
  const digits = input.whatsapp?.replace(/\D/g, '');

  return {
    '@context': 'https://schema.org',
    '@type': 'OnlineStore',
    name: input.storeName,
    url: input.storefrontUrl,
    logo: input.logoUrl,
    ...(input.legalName ? { legalName: input.legalName } : {}),
    ...(input.cnpj ? { taxID: input.cnpj } : {}),
    ...(input.redes.length ? { sameAs: input.redes } : {}),
    ...(digits || input.email
      ? {
          contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'customer service',
            areaServed: 'BR',
            availableLanguage: 'Portuguese',
            ...(digits ? { telephone: `+${digits}` } : {}),
            ...(input.email ? { email: input.email } : {}),
          },
        }
      : {}),
  };
}
