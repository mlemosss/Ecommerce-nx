export interface DiscountTier {
  /** Quantidade mínima de peças para valer esta faixa. */
  minItems: number;
  /** Percentual de desconto (10 = 10%). */
  percent: number;
}

/** Lê o JSON das Configurações sem estourar se vier torto. */
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

/**
 * Percentual que vale para a quantidade de peças no carrinho: a maior faixa
 * cujo mínimo foi atingido. Zero quando nenhuma faixa se aplica.
 */
export function discountPercentFor(totalItems: number, tiers: DiscountTier[]): number {
  let percent = 0;
  for (const tier of tiers) {
    if (totalItems >= tier.minItems) percent = tier.percent;
  }
  return percent;
}

/** Quanto falta, em peças, para a próxima faixa — para avisar no carrinho. */
export function nextTier(totalItems: number, tiers: DiscountTier[]): DiscountTier | null {
  return tiers.find((tier) => tier.minItems > totalItems) ?? null;
}
