import { parseImages, toPublicImageUrls } from '../products/product-images';
import { effectivePrice, isOnSale } from '../products/pricing';

/**
 * Monta o item do catálogo do Meta a partir de uma variação.
 *
 * Existe separado do serviço porque duas saídas usam exatamente os mesmos
 * campos: o envio por Graph API (items_batch, exige token) e o feed CSV que o
 * Meta busca sozinho (não exige token nenhum). Se os dois montassem o item por
 * conta própria, um deles ficaria para trás na primeira mudança.
 */

export interface CatalogSource {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  images: string;
  variants: { id: string; color: string; size: string; stock: number; price: number | null }[];
}

/** Ordem das colunas do CSV. É também a ordem dos campos enviados na Graph API. */
export const CATALOG_COLUMNS = [
  'id',
  'item_group_id',
  'title',
  'description',
  'availability',
  'condition',
  'price',
  'sale_price',
  'link',
  'image_link',
  'additional_image_link',
  'brand',
  'color',
  'size',
  'gender',
  'age_group',
  'google_product_category',
  'quantity_to_sell_on_facebook',
] as const;

export type CatalogItem = Record<(typeof CATALOG_COLUMNS)[number], string>;

/**
 * Categoria do Google exigida para vestuário. Sem ela o item entra no catálogo
 * mas fica de fora do Instagram/Facebook Shop. O Meta aceita tanto o ID quanto
 * o caminho por extenso; o caminho é usado aqui porque erra menos.
 */
const GOOGLE_CATEGORY: Record<string, string> = {
  leggings: 'Apparel & Accessories > Clothing > Activewear',
  shorts: 'Apparel & Accessories > Clothing > Activewear',
  tops: 'Apparel & Accessories > Clothing > Activewear',
  camisetas: 'Apparel & Accessories > Clothing > Shirts & Tops',
  jaquetas: 'Apparel & Accessories > Clothing > Outerwear > Coats & Jackets',
  acessorios: 'Apparel & Accessories',
};
const DEFAULT_GOOGLE_CATEGORY = 'Apparel & Accessories > Clothing';

const BRAND = 'NO EXCUSE';
/** Linha feminina. Se entrar peça masculina ou unissex, isto vira campo do produto. */
const GENDER = 'female';
const AGE_GROUP = 'adult';

/** Até 20 fotos extras, separadas por vírgula — é o formato que o Meta espera. */
const MAX_ADDITIONAL_IMAGES = 20;

function money(value: number): string {
  return `${value.toFixed(2)} BRL`;
}

/**
 * O Meta corta a descrição em 9.999 caracteres e não aceita quebra de linha
 * crua no CSV. Os marcadores da ficha técnica viram " · " para o texto seguir
 * legível numa linha só.
 */
function flattenDescription(description: string, fallback: string): string {
  const flat = description
    .replace(/\r?\n\s*[-•*]\s+/g, ' · ')
    .replace(/\s*\r?\n\s*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return (flat || fallback).slice(0, 9999);
}

export function buildCatalogItems(
  product: CatalogSource,
  storefrontUrl: string,
  imageBaseUrl?: string
): CatalogItem[] {
  const images = toPublicImageUrls(product.id, parseImages(product.images), imageBaseUrl);
  if (images.length === 0) return [];

  const onSale = isOnSale(product);
  // Em promoção o Meta espera o preço cheio em `price` e o promocional em
  // `sale_price` — é assim que ele mostra o "de/por" no anúncio.
  const fullPrice = onSale ? (product.compareAtPrice as number) : null;
  const description = flattenDescription(product.description ?? '', product.name);
  const link = `${storefrontUrl}/produtos/${product.slug}`;
  const googleCategory =
    GOOGLE_CATEGORY[product.category?.toLowerCase()] ?? DEFAULT_GOOGLE_CATEGORY;

  return product.variants.map((variant) => {
    const unitPrice = effectivePrice(product, variant.price);
    return {
      id: variant.id,
      item_group_id: product.id,
      title: `${product.name} — ${variant.color} ${variant.size}`.trim(),
      description,
      availability: variant.stock > 0 ? 'in stock' : 'out of stock',
      condition: 'new',
      price: money(fullPrice ?? unitPrice),
      sale_price: onSale ? money(unitPrice) : '',
      link,
      image_link: images[0],
      additional_image_link: images.slice(1, MAX_ADDITIONAL_IMAGES + 1).join(','),
      brand: BRAND,
      color: variant.color,
      size: variant.size,
      gender: GENDER,
      age_group: AGE_GROUP,
      google_product_category: googleCategory,
      quantity_to_sell_on_facebook: String(Math.max(0, variant.stock)),
    };
  });
}

/** Escapa um valor para CSV (RFC 4180): aspas dobradas, campo entre aspas. */
function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export function toCsv(items: CatalogItem[]): string {
  const header = CATALOG_COLUMNS.join(',');
  const rows = items.map((item) => CATALOG_COLUMNS.map((c) => csvCell(item[c] ?? '')).join(','));
  // O Meta lê o arquivo como UTF-8; \r\n é o fim de linha do RFC 4180.
  return [header, ...rows].join('\r\n');
}
