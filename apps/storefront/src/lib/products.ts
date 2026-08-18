import type { Category, Product } from './types';
import catalogoReserva from './catalogo-reserva.json';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api';

/**
 * Categorias que a loja mostra — no menu, na vitrine da home, no rodapé e nos
 * filtros de /produtos.
 *
 * Camisetas e jaquetas saíram: não existe peça cadastrada em nenhuma das duas, e
 * uma aba que leva a uma prateleira vazia gasta a atenção de quem chegou para
 * comprar. O tipo `Category` continua aceitando as duas, então um produto
 * cadastrado nelas não quebra nada — só não ganha lugar no menu até existir.
 */
export const categories: { value: Category; label: string; description: string }[] = [
  { value: 'leggings', label: 'Leggings', description: 'Compressão e liberdade de movimento' },
  { value: 'tops', label: 'Tops', description: 'Sustentação para qualquer treino' },
  { value: 'shorts', label: 'Shorts', description: 'Leveza para dias de alta intensidade' },
  { value: 'acessorios', label: 'Acessórios', description: 'Os detalhes que fazem diferença' },
];

// Fundo de quem ainda não tem foto. A paleta da loja é monocromática, então
// estes gradientes são só cinzas — o verde e o azul de antes destoavam do
// resto da vitrine e disputavam atenção com a foto do produto ao lado.
const CATEGORY_GRADIENT: Record<string, [string, string]> = {
  leggings: ['#1c1c1f', '#3a3a3f'],
  tops: ['#151517', '#45454b'],
  shorts: ['#1a1a1d', '#4b4b51'],
  camisetas: ['#18181b', '#3f3f46'],
  jaquetas: ['#131316', '#35353a'],
  acessorios: ['#101012', '#2f2f34'],
};

export interface CatalogProduct {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  images: string[];
  colors: string[];
  sizes: string[];
  /** `id` é o da variação — a chave que o catálogo do Meta usa nos eventos. */
  variants: { id: string; color: string; size: string; stock: number; price: number }[];
  priceRange: { min: number; max: number } | null;
  isNew: boolean;
}

export function toProduct(item: CatalogProduct): Product {
  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    category: item.category as Category,
    price: item.price,
    priceRange: item.priceRange,
    compareAtPrice: item.compareAtPrice ?? undefined,
    colors: item.colors,
    sizes: item.sizes,
    description: item.description,
    isNew: item.isNew,
    gradient: CATEGORY_GRADIENT[item.category] ?? ['#1a1a1a', '#3a3a42'],
    images: item.images,
    variants: item.variants,
  };
}

/**
 * Catalogo de reserva, gravado no bundle a cada build.
 *
 * Em 18/08/2026 o banco (Neon) ficou inalcancavel e a API respondeu 500 em
 * tudo por horas. A loja nao ficou lenta: ficou sem produto nenhum, com
 * "Essa pagina saiu de linha" no lugar de cada peca, porque o catch daqui
 * devolvia lista vazia e a pagina chamava notFound().
 *
 * Vitrine nao precisa de banco. Nome, preco, foto e descricao mudam uma vez
 * por semana - manter uma copia no bundle custa 20 KB e mantem a loja de pe
 * quando o banco cai. As fotos continuam aparecendo porque quem as serve e o
 * otimizador de imagem da Vercel, que guarda as versoes ja processadas.
 *
 * O que NAO da para servir da copia e estoque, cupom e pedido - por isso o
 * aviso no topo manda a pessoa para o WhatsApp em vez de fingir que a compra
 * vai completar.
 */
const RESERVA = catalogoReserva as CatalogProduct[];

export async function getProducts(category?: string): Promise<Product[]> {
  try {
    const qs = category ? `?category=${encodeURIComponent(category)}` : '';
    const res = await fetch(`${API_URL}/catalog/products${qs}`, { next: { revalidate: 60 } });
    if (!res.ok) throw new Error(`catalogo respondeu ${res.status}`);
    const data: CatalogProduct[] = await res.json();
    return data.map(toProduct);
  } catch {
    const lista = category ? RESERVA.filter((p) => p.category === category) : RESERVA;
    return lista.map(toProduct);
  }
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  try {
    const res = await fetch(`${API_URL}/catalog/products/${slug}`, { next: { revalidate: 60 } });
    // 404 e resposta legitima: a peca nao existe mesmo, e a copia nao deve
    // ressuscitar um endereco que saiu do catalogo de proposito. So erro de
    // servidor cai para a reserva.
    if (res.status === 404) return undefined;
    if (!res.ok) throw new Error(`catalogo respondeu ${res.status}`);
    const data: CatalogProduct = await res.json();
    return toProduct(data);
  } catch {
    const guardado = RESERVA.find((p) => p.slug === slug);
    return guardado ? toProduct(guardado) : undefined;
  }
}

/**
 * O banco esta de pe? E o que decide se o aviso de instabilidade aparece.
 *
 * `no-store` de proposito: uma resposta guardada diria que esta tudo bem
 * durante a queda, e diria que caiu depois que voltou — nos dois casos o aviso
 * mente. Custa pouco porque `/health` roda um `SELECT 1`, que nao le linha
 * nenhuma; perguntar isso ao catalogo seria repetir em escala menor o erro que
 * derrubou o banco.
 *
 * Erro de rede conta como fora do ar; erro ao interpretar a resposta, nao.
 */
export async function catalogoOnline(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/health`, { cache: 'no-store' });
    return res.ok;
  } catch {
    return false;
  }
}

export async function getRelatedProducts(product: Product, limit = 4): Promise<Product[]> {
  const list = await getProducts(product.category);
  return list.filter((p) => p.id !== product.id).slice(0, limit);
}

export async function getFeaturedProducts(limit = 8): Promise<Product[]> {
  const list = await getProducts();
  return list.slice(0, limit);
}

export function getVariantPrice(product: Product, color: string, size: string): number {
  const variant = product.variants?.find((v) => v.color === color && v.size === size);
  return variant?.price ?? product.price;
}
