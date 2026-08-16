import type { Product, ProductVariant } from './types';

/**
 * Quais combinações de cor e tamanho realmente existem e têm estoque.
 *
 * A vitrine mostrava `colors` × `sizes` — o produto cartesiano — e o estoque
 * não era lido em lugar nenhum. Das 97 combinações clicáveis do catálogo, 50
 * eram compráveis: a cliente escolhia uma das outras 47, preenchia CPF,
 * endereço e cartão, e só descobria no fim (quando descobria — a variação
 * inexistente passava direto e virava pedido pago de peça que não existe).
 *
 * Tudo aqui parte de `variants`, que é a matriz esparsa de verdade. `colors` e
 * `sizes` continuam existindo no catálogo, mas não mandam mais em nada.
 */

export type Availability = 'disponivel' | 'esgotado' | 'inexistente';

/** Cor e tamanho identificam a variação; comparação sem depender de caixa. */
function chave(color: string, size: string): string {
  return `${color.trim().toLowerCase()}|${size.trim().toLowerCase()}`;
}

function mapaDeVariacoes(product: Product): Map<string, ProductVariant> {
  return new Map((product.variants ?? []).map((v) => [chave(v.color, v.size), v]));
}

export function findVariant(
  product: Product,
  color: string,
  size: string
): ProductVariant | undefined {
  return mapaDeVariacoes(product).get(chave(color, size));
}

export function availabilityOf(product: Product, color: string, size: string): Availability {
  const variant = findVariant(product, color, size);
  if (!variant) return 'inexistente';
  return variant.stock > 0 ? 'disponivel' : 'esgotado';
}

/** Estoque da combinação. Zero também para combinação que não existe. */
export function stockOf(product: Product, color: string, size: string): number {
  return Math.max(0, findVariant(product, color, size)?.stock ?? 0);
}

/**
 * Tamanhos oferecidos, na ordem em que o catálogo os declara.
 *
 * Um tamanho só aparece se existir em alguma variação — não adianta oferecer GG
 * porque outra cor tem GG. Quando uma cor está escolhida, a lista é filtrada
 * por ela, senão a cliente clica num tamanho que aquela cor não tem.
 */
export function sizesFor(product: Product, color?: string): string[] {
  const variants = product.variants ?? [];
  const doCor = color
    ? variants.filter((v) => v.color.trim().toLowerCase() === color.trim().toLowerCase())
    : variants;
  const existentes = new Set(doCor.map((v) => v.size));
  return product.sizes.filter((s) => existentes.has(s));
}

/** Mesma regra para cores. */
export function colorsFor(product: Product, size?: string): string[] {
  const variants = product.variants ?? [];
  const doTamanho = size
    ? variants.filter((v) => v.size.trim().toLowerCase() === size.trim().toLowerCase())
    : variants;
  const existentes = new Set(doTamanho.map((v) => v.color));
  return product.colors.filter((c) => existentes.has(c));
}

/**
 * Combinação que a página deve abrir selecionada.
 *
 * Antes era `colors[0]` + `sizes[0]`, e na Legging isso dava "Fúcsia / G" —
 * que existe com estoque zero. A vitrine abria esgotada sem avisar. A ordem de
 * preferência agora é: primeira combinação com estoque, na ordem do catálogo;
 * senão a primeira que ao menos exista; e só então o primeiro de cada lista,
 * para um produto sem variação nenhuma nunca quebrar a tela.
 */
export function defaultSelection(product: Product): { color: string; size: string } {
  const variants = product.variants ?? [];
  const ordem = (v: ProductVariant) =>
    product.colors.indexOf(v.color) * 1000 + product.sizes.indexOf(v.size);
  const porOrdem = [...variants].sort((a, b) => ordem(a) - ordem(b));

  const comEstoque = porOrdem.find((v) => v.stock > 0) ?? porOrdem[0];
  return {
    color: comEstoque?.color ?? product.colors[0] ?? '',
    size: comEstoque?.size ?? product.sizes[0] ?? '',
  };
}

/** Soma do estoque real. É o número que a home anuncia como "pronto p/ envio". */
export function inStockCount(product: Product): number {
  return (product.variants ?? []).filter((v) => v.stock > 0).length;
}

/** Nenhuma variação com estoque: a peça inteira está esgotada. */
export function isSoldOut(product: Product): boolean {
  return (product.variants ?? []).length > 0 && inStockCount(product) === 0;
}
