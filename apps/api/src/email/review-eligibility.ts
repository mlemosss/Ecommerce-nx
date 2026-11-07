const DIA = 24 * 60 * 60 * 1000;

/** Depois da entrega confirmada: tempo de a cliente experimentar a peça. */
export const REVIEW_DELAY_AFTER_DELIVERY_MS = 2 * DIA;

/** Retirada em mãos: a peça saiu da loja na mão da cliente, não há trânsito. */
export const REVIEW_DELAY_PICKUP_MS = 3 * DIA;

/**
 * Postado sem rastreio automático (código digitado na mão, sem envio no Melhor
 * Envio). Não há como saber quando chegou; este prazo cobre o pior caso de PAC.
 */
export const REVIEW_DELAY_UNTRACKED_MS = 10 * DIA;

export interface ReviewEligibilityInput {
  pickup: boolean;
  shipmentId: string | null;
  shippedAt: Date | null;
  deliveredAt: Date | null;
}

/**
 * Quando o pedido de avaliação deste pedido pode sair; `null` se não deve sair.
 *
 * O prazo era 3 dias a partir da postagem para todo mundo. PAC para fora de SP
 * leva de 5 a 12 dias: a cliente era perguntada "o que achou da compra?" com a
 * peça ainda no caminhão.
 *
 * O caso que devolve `null` é de propósito: pacote rastreado cuja entrega a
 * transportadora nunca confirmou. Pode estar extraviado ou devolvido, e pedir
 * avaliação de uma peça que a cliente não recebeu é pior do que não pedir.
 */
export function reviewRequestDueAt(order: ReviewEligibilityInput): Date | null {
  if (order.deliveredAt) {
    return new Date(order.deliveredAt.getTime() + REVIEW_DELAY_AFTER_DELIVERY_MS);
  }
  if (!order.shippedAt) return null;
  if (order.pickup) return new Date(order.shippedAt.getTime() + REVIEW_DELAY_PICKUP_MS);
  if (!order.shipmentId) return new Date(order.shippedAt.getTime() + REVIEW_DELAY_UNTRACKED_MS);
  return null;
}

export function isReviewRequestDue(order: ReviewEligibilityInput, now: Date): boolean {
  const due = reviewRequestDueAt(order);
  return due !== null && due.getTime() <= now.getTime();
}
