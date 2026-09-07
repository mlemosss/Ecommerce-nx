import type { MetadataRoute } from 'next';
import { categories, getProducts } from '../lib/products';

const STOREFRONT_URL = (
  process.env.NEXT_PUBLIC_STOREFRONT_URL || 'https://www.noexcusenx.com.br'
).replace(/\/$/, '');

/** Páginas fixas mais uma entrada por produto e por categoria com peça. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getProducts();
  const now = new Date();

  /**
   * As paginas fixas, com peso proprio.
   *
   * `/em-breve` ficou de fora de propósito. Hoje ela anuncia uma categoria
   * só — acessórios — e mais nada: um card num site inteiro. Página rasa no
   * sitemap não é neutra: ela disputa rastreamento com as que vendem e
   * sinaliza ao Google que o site tem enchimento. A página continua no ar e
   * linkada; o que sai é o convite explícito para indexar.
   *
   * A prioridade deixou de ser 0,7 para tudo. Ela não muda ranqueamento, mas
   * diz ao rastreador onde voltar primeiro — e a política de privacidade não
   * merece a mesma visita que a vitrine.
   */
  const fixed = [
    { path: '', priority: 1 },
    { path: '/produtos', priority: 0.9 },
    { path: '/roupa-fitness-sao-paulo', priority: 0.8 },
    { path: '/avaliacoes', priority: 0.7 },
    { path: '/tabela-de-medidas', priority: 0.7 },
    { path: '/sale', priority: 0.7 },
    { path: '/quem-somos', priority: 0.5 },
    { path: '/perguntas-frequentes', priority: 0.5 },
    { path: '/trocas-e-devolucoes', priority: 0.3 },
    { path: '/privacidade', priority: 0.3 },
  ].map(({ path, priority }) => ({
    url: `${STOREFRONT_URL}${path}`,
    lastModified: now,
    priority,
  }));

  const withProducts = new Set(products.map((p) => p.category));
  // O endereço limpo é o canônico; a versão com query redireciona para ele, e
  // sitemap com URL que redireciona é erro no Search Console.
  const categoryPages = categories
    .filter((c) => withProducts.has(c.value))
    .map((c) => ({
      url: `${STOREFRONT_URL}/${c.value}`,
      lastModified: now,
      // Mesmo peso da página de produto: é por "legging fitness feminina"
      // que a busca chega, e a categoria é quem responde a essa procura.
      priority: 0.8,
    }));

  const productPages = products.map((product) => ({
    url: `${STOREFRONT_URL}/produtos/${product.slug}`,
    lastModified: now,
    priority: 0.8,
  }));

  return [...fixed, ...categoryPages, ...productPages];
}
