import { notFound } from 'next/navigation';
import { categories, getProducts } from '../../lib/products';
import type { Category } from '../../lib/types';
import { ProductsPageClient } from '../produtos/products-page-client';
import { JsonLd } from '../../components/json-ld';
import { breadcrumbSchema } from '../../lib/structured-data';

const STOREFRONT_URL = (
  process.env.NEXT_PUBLIC_STOREFRONT_URL || 'https://www.noexcusenx.com.br'
).replace(/\/$/, '');

/**
 * Categoria com endereço próprio: /leggings, /tops, /shorts.
 *
 * Existiam só como filtro — `/produtos?categoria=leggings` —, e `/leggings`
 * dava 404. Isso custa de três formas: quem digita o endereço direto não
 * chega, o anúncio do Google Ads leva à vitrine inteira em vez da prateleira
 * certa (e Índice de Qualidade cai quando a página de destino não fala do que
 * o anúncio prometeu), e o link compartilhado no Instagram perde o assunto.
 *
 * `dynamicParams = false` com a lista fixa: só estas três existem, e qualquer
 * outro endereço continua sendo 404 de verdade, resolvido pelo roteador antes
 * de chegar aqui. Sem isso, esta rota viraria o coringa de tudo que não casa
 * com outra página.
 *
 * O conteúdo é o mesmo de `/produtos` filtrado, e `/produtos?categoria=x`
 * agora redireciona para cá: duas URLs com a mesma lista dividiriam o
 * ranqueamento entre si em vez de somar.
 */

const CATEGORIAS_COM_PAGINA = ['leggings', 'tops', 'shorts'] as const;

const TITULO: Record<string, string> = {
  leggings: 'Legging Fitness Feminina — Cós Alto e Compressão',
  tops: 'Top Fitness Feminino — Sustentação para Treino',
  shorts: 'Shorts Fitness Feminino — Cós Alto e Bolso',
};

const DESCRICAO: Record<string, string> = {
  leggings:
    'Leggings de academia com cós alto, compressão média e tecido opaco que não fica transparente no agachamento. Do PP ao G, com envio para todo o Brasil.',
  tops: 'Tops de academia com sustentação para treino, entrada para bojo e tecido respirável. Do P ao G, com envio para todo o Brasil.',
  shorts:
    'Shorts de academia com cós alto, bolso lateral e tecido que acompanha o movimento. Do PP ao G, com envio para todo o Brasil.',
};

/** Texto de abertura da prateleira: o que o anúncio prometeu, dito de novo. */
const CHAMADA: Record<string, string> = {
  leggings:
    'Cós alto que não desce no agachamento, compressão média e tecido opaco. Provamos cada modelo antes de colocar na loja.',
  tops: 'Sustentação de verdade para treino, com entrada para bojo e tecido que respira.',
  shorts: 'Cós alto, bolso para o celular e liberdade de movimento nos dias de alta intensidade.',
};

export const dynamicParams = false;

export function generateStaticParams() {
  return CATEGORIAS_COM_PAGINA.map((categoria) => ({ categoria }));
}

export function generateMetadata({ params }: { params: { categoria: string } }) {
  const { categoria } = params;
  const rotulo = categories.find((c) => c.value === categoria)?.label ?? categoria;
  const title = `${TITULO[categoria] ?? rotulo} — NO EXCUSE`;
  const description = DESCRICAO[categoria] ?? '';

  return {
    title,
    description,
    alternates: { canonical: `/${categoria}` },
    openGraph: { title, description, url: `/${categoria}`, type: 'website' },
  };
}

export default async function CategoriaPage({ params }: { params: { categoria: string } }) {
  const { categoria } = params;
  if (!CATEGORIAS_COM_PAGINA.includes(categoria as (typeof CATEGORIAS_COM_PAGINA)[number])) {
    notFound();
  }

  const rotulo = categories.find((c) => c.value === categoria)?.label ?? categoria;
  const todos = await getProducts();
  const produtos = todos.filter((p) => p.category === categoria);

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { nome: 'Início', url: STOREFRONT_URL },
          { nome: rotulo, url: `${STOREFRONT_URL}/${categoria}` },
        ])}
      />
      <ProductsPageClient
        products={produtos}
        categoria={categoria as Category}
        chamada={CHAMADA[categoria]}
      />
    </>
  );
}
