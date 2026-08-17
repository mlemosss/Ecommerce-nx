/**
 * Eventos do Pixel da Meta.
 *
 * A loja disparava só `PageView`. Sem `ViewContent` e `AddToCart` o catálogo
 * fica com taxa de correspondência 0%: o Meta sabe que alguém viu uma página e
 * sabe que existe uma legging no catálogo, e não liga as duas. Anúncio
 * dinâmico e retargeting por produto não rodam nesse estado.
 *
 * A regra que faz tudo funcionar é uma só: `content_ids` tem que trazer o
 * **id da variação**, o mesmo valor da coluna `id` do feed — não o id do
 * produto pai, não o SKU, não o slug da URL. Por isso a API passou a expor
 * `variant.id`; aqui ele é só repassado, nunca recalculado.
 */

type Fbq = (
  comando: 'track' | 'trackCustom',
  evento: string,
  dados?: Record<string, unknown>,
  opcoes?: { eventID?: string }
) => void;

declare global {
  interface Window {
    fbq?: Fbq;
  }
}

/** Uma peça do carrinho, do jeito que o Meta espera. */
export interface PixelItem {
  variantId: string;
  quantity: number;
  unitPrice: number;
}

/**
 * Chave de deduplicação.
 *
 * Se houver API de Conversões ativa no servidor, o mesmo evento chega duas
 * vezes à Meta e uma compra vira duas — o custo por resultado da campanha fica
 * mentiroso. A Meta deduplica por `event_name` + `event_id`, numa janela de
 * 48h.
 *
 * A sintaxe engana: no navegador o campo é `eventID`, em camelCase, e vai como
 * QUARTO argumento do `fbq` — dentro do objeto de dados ele não deduplica
 * nada. Na CAPI o mesmo valor se chama `event_id`.
 */
function novoEventId(prefixo: string): string {
  const aleatorio =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefixo}_${aleatorio}`;
}

/**
 * Soma item a item. Nunca `ticket × quantidade`: o catálogo tem preços
 * diferentes e carrinho misto quebra esse atalho.
 */
function valorDe(items: PixelItem[]): number {
  return Math.round(items.reduce((s, i) => s + i.unitPrice * i.quantity, 0) * 100) / 100;
}

function contents(items: PixelItem[]) {
  return items.map((i) => ({ id: i.variantId, quantity: i.quantity, item_price: i.unitPrice }));
}

/**
 * Dispara, se o Pixel existir.
 *
 * `fbq` só é carregado depois do aceite de cookies, e o ID do Pixel vem de
 * Configurações — pode não haver nenhum. Sem esta guarda, cada evento viraria
 * um erro no console de quem recusou rastreamento.
 */
function track(evento: string, dados: Record<string, unknown>, eventId: string): void {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return;
  window.fbq('track', evento, { ...dados, currency: 'BRL' }, { eventID: eventId });
}

/** Página de produto aberta, ou variação trocada. */
export function trackViewContent(input: {
  variantId: string;
  name: string;
  category: string;
  price: number;
}): void {
  track(
    'ViewContent',
    {
      content_ids: [input.variantId],
      content_type: 'product',
      content_name: input.name,
      content_category: input.category,
      value: input.price,
    },
    novoEventId('vc')
  );
}

/** Depois de a peça entrar no carrinho — não no clique cru, que também erra. */
export function trackAddToCart(item: PixelItem, nome: string): void {
  track(
    'AddToCart',
    {
      content_ids: [item.variantId],
      content_type: 'product',
      content_name: nome,
      contents: contents([item]),
      value: valorDe([item]),
    },
    novoEventId('atc')
  );
}

/** Entrada no checkout. É o evento de otimização com volume suficiente. */
export function trackInitiateCheckout(items: PixelItem[]): void {
  if (items.length === 0) return;
  track(
    'InitiateCheckout',
    {
      content_ids: items.map((i) => i.variantId),
      content_type: 'product',
      contents: contents(items),
      num_items: items.reduce((s, i) => s + i.quantity, 0),
      value: valorDe(items),
    },
    novoEventId('ic')
  );
}

/**
 * Compra concluída.
 *
 * O `eventID` é o número do pedido, de propósito: é estável e único, então F5
 * na tela de obrigado não vira uma segunda venda para a Meta. O guarda no
 * `sessionStorage` evita até o disparo repetido.
 */
export function trackPurchase(input: { orderNumber: string; items: PixelItem[] }): void {
  if (input.items.length === 0) return;

  const chave = `no-excuse:purchase-enviado:${input.orderNumber}`;
  try {
    if (window.sessionStorage.getItem(chave)) return;
    window.sessionStorage.setItem(chave, '1');
  } catch {
    // Navegador sem sessionStorage (aba anônima travada, por exemplo): segue e
    // confia no eventID, que é o que a Meta de fato usa para deduplicar.
  }

  track(
    'Purchase',
    {
      content_ids: input.items.map((i) => i.variantId),
      content_type: 'product',
      contents: contents(input.items),
      num_items: input.items.reduce((s, i) => s + i.quantity, 0),
      value: valorDe(input.items),
    },
    input.orderNumber
  );
}
