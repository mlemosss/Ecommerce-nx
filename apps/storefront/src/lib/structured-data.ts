import { atributosDe } from './atributos';
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

/**
 * Prazo de arrependimento do Código de Defesa do Consumidor, art. 49.
 *
 * Sete dias corridos a contar do recebimento, para compra fora do
 * estabelecimento — o que inclui toda venda pela internet. Quem devolve nesse
 * prazo recebe tudo de volta, e o frete da devolução é por conta da loja: a lei
 * fala em valores "monetariamente atualizados", e a jurisprudência entende que
 * cobrar o retorno esvaziaria o direito.
 *
 * É o piso legal, não uma política que a loja escolheu. Qualquer prazo maior é
 * decisão da lojista e vai em Configurações; menor não existe.
 */
export const DIAS_DE_ARREPENDIMENTO = 7;

/**
 * Política de devolução, do jeito que o Google entende.
 *
 * Sem este bloco a peça aparece na busca com aviso de dado faltando, e nas
 * listagens gratuitas do Shopping o Google passa a exigir — anúncio sem
 * política declarada é reprovado.
 */
function politicaDeDevolucao(): Record<string, unknown> {
  return {
    '@type': 'MerchantReturnPolicy',
    applicableCountry: 'BR',
    returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
    merchantReturnDays: DIAS_DE_ARREPENDIMENTO,
    returnMethod: 'https://schema.org/ReturnByMail',
    returnFees: 'https://schema.org/FreeReturn',
  };
}

/**
 * Frete, só a parte que é verdade sempre.
 *
 * Abaixo do mínimo o valor sai da cotação por CEP e muda de cliente para
 * cliente — declarar um número fixo ali seria anunciar um frete que a loja não
 * pratica, e é isso que derruba a página do resultado enriquecido. Então
 * declara-se apenas a faixa em que a resposta é certa: acima do mínimo, zero.
 */
function freteGratisAcimaDe(minimo: number): Record<string, unknown> {
  return {
    '@type': 'OfferShippingDetails',
    shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'BR' },
    shippingRate: {
      '@type': 'MonetaryAmount',
      value: 0,
      currency: MOEDA,
    },
    // A condição que torna a taxa zero honesta.
    eligibleTransactionVolume: {
      '@type': 'PriceSpecification',
      priceCurrency: MOEDA,
      minPrice: minimo,
    },
  };
}

export interface ProductSchemaInput {
  product: Product;
  url: string;
  /** Avaliações aprovadas. Sem nenhuma, o bloco de estrelas não é declarado. */
  reviews: { average: number; count: number };
  storeName: string;
  storefrontUrl: string;
  /** A partir de quanto o frete é grátis. Vem de Configurações. */
  freeShippingThreshold: number;
}

/**
 * A lista de pecas de uma prateleira, para o buscador.
 *
 * So url e nome por item. A forma completa, com Product aninhado, obriga a
 * repetir preco e estoque em dois lugares - e e exatamente ali que a marcacao
 * passa a divergir da pagina, que e pior do que nao ter marcacao.
 */
export function itemListSchema(
  produtos: { slug: string; name: string }[],
  storefrontUrl: string
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    numberOfItems: produtos.length,
    itemListElement: produtos.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${storefrontUrl}/produtos/${p.slug}`,
      name: p.name,
    })),
  };
}

export function productSchema({
  product,
  url,
  reviews,
  storeName,
  storefrontUrl,
  freeShippingThreshold,
}: ProductSchemaInput): Record<string, unknown> {
  const precos = (product.variants ?? []).map((v) => v.price).filter((p) => p > 0);
  const menor = precos.length ? Math.min(...precos) : product.price;
  const maior = precos.length ? Math.max(...precos) : product.price;

  // Vão nas duas formas de oferta: o Google exige em ambas.
  const condicoes = {
    hasMerchantReturnPolicy: politicaDeDevolucao(),
    shippingDetails: freteGratisAcimaDe(freeShippingThreshold),

    /**
     * As duas formas de receber a peça, ditas em campo.
     *
     * A retirada em mãos em São Paulo existe desde sempre e só aparecia
     * como frase na finalização da compra e na página da cidade —
     * invisível para quem lê a marcação, que é o buscador e o assistente
     * de IA. Declarada aqui, "retirar hoje, sem frete" vira atributo da
     * oferta, e é exatamente esse o diferencial contra a loja que só posta.
     *
     * A retirada NÃO entra como frete grátis para o estado inteiro: seria
     * mentira, porque para o resto de São Paulo a loja cobra envio normal.
     * É um método de entrega disponível, e nada além disso.
     */
    availableDeliveryMethod: [
      'https://schema.org/ParcelService',
      'https://schema.org/OnSitePickup',
    ],
  };

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

    /**
     * A ficha técnica em campos, e não no meio do texto.
     *
     * Compressão, cós, FPS, bolso e opacidade decidem a compra de roupa
     * fitness — e estavam só como frase solta na descrição. Aqui viram dado
     * que o buscador lê e que um assistente consegue citar. A mesma tabela é
     * renderizada na página: dado estruturado que não aparece na tela é
     * motivo de penalização, não de ganho.
     */
    ...(atributosDe(product.slug).length
      ? {
          additionalProperty: atributosDe(product.slug).map((a) => ({
            '@type': 'PropertyValue',
            name: a.nome,
            value: a.valor,
          })),
        }
      : {}),
    audience: { '@type': 'PeopleAudience', suggestedGender: 'female' },

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
            ...condicoes,
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
            ...condicoes,
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

/**
 * Perguntas frequentes, do jeito que o Google entende.
 *
 * Quando ele aceita, a busca passa a mostrar as perguntas abertas embaixo do
 * link — a loja ocupa mais espaço no resultado e responde a dúvida antes do
 * clique. Quem chega já sabe do frete e da troca.
 *
 * A resposta declarada aqui precisa ser a MESMA que está visível na página.
 * Texto só no dado estruturado é considerado engano, e a punição é sumir do
 * resultado enriquecido sem aviso.
 */
export function faqSchema(
  perguntas: { pergunta: string; resposta: string }[]
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: perguntas.map((p) => ({
      '@type': 'Question',
      name: p.pergunta,
      acceptedAnswer: { '@type': 'Answer', text: p.resposta },
    })),
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

    /**
     * O endereço declarado, sem fingir loja aberta.
     *
     * `OnlineStore` com `address` diz "esta empresa fica aqui" — que é verdade,
     * e é o que sustenta a busca local junto com a página de São Paulo.
     *
     * O que **não** entra é `Store` com `openingHours`: seria declarar um
     * estabelecimento com atendimento presencial que não existe. Além de falso,
     * é motivo de suspensão no Perfil da Empresa. A retirada é combinada, e é
     * assim que ela aparece.
     */
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'R. Tupi, 103',
      addressLocality: 'São Paulo',
      addressRegion: 'SP',
      postalCode: '01233-001',
      addressCountry: 'BR',
    },
    areaServed: { '@type': 'Country', name: 'Brasil' },
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
