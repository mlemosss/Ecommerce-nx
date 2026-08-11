interface PricedProduct {
  price: number;
  compareAtPrice: number | null;
}

/**
 * Está em promoção quando existe um preço "de" maior que o preço atual. É o
 * mesmo critério que faz o selo de desconto aparecer na loja.
 */
export function isOnSale(product: PricedProduct): boolean {
  return product.compareAtPrice != null && product.compareAtPrice > product.price;
}

/**
 * Preço que vale para uma variação.
 *
 * Fora de promoção, a variação pode ter preço próprio (cor/tamanho mais caro).
 * Em promoção, o preço promocional do produto vale para todas as variações —
 * senão o cliente veria "-30%" e seria cobrado o preço da variação.
 *
 * Esta função é a única fonte da verdade: catálogo, carrinho e cobrança do
 * pedido passam por ela.
 */
export function effectivePrice(product: PricedProduct, variantPrice: number | null): number {
  if (isOnSale(product)) return product.price;
  return variantPrice ?? product.price;
}
