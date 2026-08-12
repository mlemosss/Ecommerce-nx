export interface DiscountTier {
  minItems: number;
  percent: number;
}

/**
 * Espelha a regra do servidor (apps/api/src/products/progressive-discount.ts).
 * A conta que vale é sempre a de lá — esta existe só para a loja mostrar o
 * mesmo número antes de enviar o pedido.
 */
export function parseTiers(raw: string | null | undefined): DiscountTier[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (t): t is DiscountTier =>
          t &&
          typeof t.minItems === 'number' &&
          typeof t.percent === 'number' &&
          t.minItems > 0 &&
          t.percent > 0 &&
          t.percent < 100
      )
      .sort((a, b) => a.minItems - b.minItems);
  } catch {
    return [];
  }
}

export function discountPercentFor(totalItems: number, tiers: DiscountTier[]): number {
  let percent = 0;
  for (const tier of tiers) {
    if (totalItems >= tier.minItems) percent = tier.percent;
  }
  return percent;
}

export function nextTier(totalItems: number, tiers: DiscountTier[]): DiscountTier | null {
  return tiers.find((tier) => tier.minItems > totalItems) ?? null;
}
