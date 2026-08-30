import { permanentRedirect } from 'next/navigation';
import { categories, getProducts } from '../../lib/products';
import type { Category } from '../../lib/types';
import { ProductsPageClient } from './products-page-client';

/**
 * A vitrine é montada no servidor.
 *
 * Ela era um client component que buscava o catálogo num `useEffect`, e o
 * servidor entregava só "Carregando…": 22 KB de HTML, zero nome de produto,
 * zero link para página de produto. Isso é a página que deveria ranquear para
 * "legging de academia" e é o destino da campanha de Google Ads — anúncio
 * apontando para tela em branco encarece o clique além de não converter.
 *
 * Filtro e ordenação continuam no cliente; o que mudou é que a lista chega
 * pronta. Trocar de categoria navega de verdade, então cada categoria tem URL,
 * título e conteúdo próprios.
 */

const DESCRICAO: Record<string, string> = {
  leggings:
    'Leggings de academia com cós alto, compressão média e tecido opaco. Do PP ao G, com envio para todo o Brasil.',
  tops: 'Tops de academia com sustentação e entrada para bojo. Do P ao G, com envio para todo o Brasil.',
  shorts:
    'Shorts de academia com cós alto e bolso lateral. Do PP ao G, com envio para todo o Brasil.',
};

const TITULO: Record<string, string> = {
  leggings: 'Legging Fitness Feminina — Cós Alto e Compressão',
  tops: 'Top Fitness Feminino — Sustentação para Treino',
  shorts: 'Shorts Fitness Feminino — Cós Alto e Bolso',
};

function categoriaDe(searchParams: { categoria?: string }): Category | null {
  const valor = searchParams.categoria;
  return categories.some((c) => c.value === valor) ? (valor as Category) : null;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: { categoria?: string };
}) {
  const categoria = categoriaDe(searchParams);

  // O canonical inclui a categoria: as três URLs estão no sitemap, e apontar
  // todas para /produtos faria o sitemap pedir uma coisa e o canonical outra.
  // Categoria com pagina propria nem chega aqui: e redirecionada antes. O que
  // sobra e categoria sem pagina, e para ela o canonico continua sendo a query.
  const canonical = categoria ? `/produtos?categoria=${categoria}` : '/produtos';

  const title = categoria
    ? `${TITULO[categoria] ?? categories.find((c) => c.value === categoria)?.label} — NO EXCUSE`
    : 'Todos os produtos — NO EXCUSE';
  const description =
    (categoria && DESCRICAO[categoria]) ||
    'Leggings, tops e shorts de academia com compressão certa e caimento que aguenta o treino. Frete para todo o Brasil.';

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: 'website' },
  };
}

/** Categorias que ganharam endereço próprio. */
const COM_PAGINA_PROPRIA = new Set(['leggings', 'tops', 'shorts']);

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: { categoria?: string };
}) {
  const categoria = categoriaDe(searchParams);

  // Duas URLs com a mesma lista dividem o ranqueamento entre si em vez de
  // somar, e o link antigo continua circulando em anúncio e conversa de
  // WhatsApp. O redirecionamento junta as duas numa só sem quebrar nada.
  if (categoria && COM_PAGINA_PROPRIA.has(categoria)) {
    // Permanente, e nao temporario: o Google so transfere a forca de link de
    // um 308. Com 307 as duas URLs seguem competindo, que e o oposto do motivo
    // de existir o redirecionamento.
    permanentRedirect(`/${categoria}`);
  }
  const todos = await getProducts();
  const produtos = categoria ? todos.filter((p) => p.category === categoria) : todos;

  return <ProductsPageClient products={produtos} categoria={categoria} />;
}
