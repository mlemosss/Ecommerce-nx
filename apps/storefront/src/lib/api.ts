const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api';

export interface ValueProp {
  title: string;
  description: string;
}

export interface StoreSettings {
  storeName: string;
  contactEmail: string | null;
  contactWhatsapp: string | null;
  shippingFee: number;
  freeShippingThreshold: number;
  pixEnabled: boolean;
  cardEnabled: boolean;
  boletoEnabled: boolean;
  maxInstallments: number;
  instagramUrl: string | null;
  facebookUrl: string | null;
  heroTag: string;
  heroTitleLine1: string;
  heroTitleHighlight: string;
  heroSubtitle: string;
  heroPrimaryButtonLabel: string;
  heroSecondaryButtonLabel: string;
  newsletterTitle: string;
  newsletterSubtitle: string;
  valueProps: ValueProp[];
  gtmId: string | null;
  metaPixelId: string | null;
  /** Página "Quem somos" — editável em Configurações. */
  aboutHeadline: string | null;
  aboutBody: string | null;
}

export const DEFAULT_SETTINGS: StoreSettings = {
  storeName: 'No Excuse',
  contactEmail: null,
  contactWhatsapp: null,
  shippingFee: 19.9,
  // Só vale se a API não responder; deve espelhar o que está em Configurações,
  // senão a loja promete um frete grátis diferente do que vai praticar.
  freeShippingThreshold: 499.9,
  pixEnabled: true,
  cardEnabled: true,
  boletoEnabled: true,
  maxInstallments: 3,
  instagramUrl: null,
  facebookUrl: null,
  heroTag: 'Nova coleção',
  heroTitleLine1: 'Treine sem',
  heroTitleHighlight: 'limites.',
  heroSubtitle:
    'Roupas de academia pensadas para quem treina de verdade: compressão certa, respirabilidade e caimento que acompanham cada repetição.',
  heroPrimaryButtonLabel: 'Ver produtos',
  heroSecondaryButtonLabel: 'Explorar leggings',
  newsletterTitle: 'Ganhe 10% na primeira compra',
  newsletterSubtitle: 'Cadastre seu e-mail e receba um cupom exclusivo, além de novidades de lançamentos.',
  valueProps: [
    { title: 'Troca grátis em 7 dias', description: 'Não serviu ou não gostou? Trocamos sem burocracia.' },
    { title: 'Entrega para todo o Brasil', description: 'Envio rastreado com prazos exibidos no checkout.' },
    {
      title: 'Tecido testado em treino real',
      description: 'Compressão, respirabilidade e durabilidade validadas por atletas.',
    },
    { title: 'Pagamento seguro', description: 'Pix, cartão em até 3x sem juros ou boleto.' },
  ],
  gtmId: null,
  metaPixelId: null,
  aboutHeadline: null,
  aboutBody: null,
};

export async function getSettings(): Promise<StoreSettings> {
  try {
    const res = await fetch(`${API_URL}/settings`, { next: { revalidate: 60 } });
    if (!res.ok) return DEFAULT_SETTINGS;
    return await res.json();
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export interface Testimonial {
  id: string;
  customerName: string;
  photoUrl: string | null;
  quote: string;
  rating: number;
}

export async function getTestimonials(): Promise<Testimonial[]> {
  try {
    const res = await fetch(`${API_URL}/testimonials`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export interface ProductReview {
  id: string;
  customerName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface ProductReviewsResult {
  reviews: ProductReview[];
  average: number;
  count: number;
}

export async function getProductReviews(productId: string): Promise<ProductReviewsResult> {
  try {
    const res = await fetch(`${API_URL}/reviews/product/${productId}`, { next: { revalidate: 60 } });
    if (!res.ok) return { reviews: [], average: 0, count: 0 };
    return await res.json();
  } catch {
    return { reviews: [], average: 0, count: 0 };
  }
}

export interface CouponValidationResult {
  valid: boolean;
  message?: string;
  code?: string;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  discountAmount?: number;
}

export async function validateCoupon(code: string, orderTotal: number): Promise<CouponValidationResult> {
  try {
    const res = await fetch(`${API_URL}/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, orderTotal }),
    });
    if (!res.ok) return { valid: false, message: 'Não foi possível validar o cupom agora.' };
    return await res.json();
  } catch {
    return { valid: false, message: 'Não foi possível validar o cupom agora.' };
  }
}

export interface CreateOrderItemInput {
  productId: string;
  productName: string;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number;
}

export interface CreateOrderInput {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerDocument: string;
  zipCode: string;
  city: string;
  street: string;
  number: string;
  complement?: string;
  items: CreateOrderItemInput[];
  subtotal: number;
  shipping: number;
  discount: number;
  couponCode?: string;
  total: number;
  paymentMethod: 'pix' | 'cartao' | 'boleto';
}

export interface CreateOrderResult {
  order: { id: string; orderNumber: string };
  paymentUrl: string | null;
  paymentWarning: string | null;
}

export class OrderError extends Error {}

export interface TrackAbandonedCartInput {
  email: string;
  name?: string;
  items: CreateOrderItemInput[];
  total: number;
}

export async function trackAbandonedCart(input: TrackAbandonedCartInput): Promise<void> {
  try {
    await fetch(`${API_URL}/abandoned-cart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  } catch {
    // melhor esforço: se falhar, não atrapalha o checkout do cliente
  }
}

export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const res = await fetch(`${API_URL}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = Array.isArray(body?.message) ? body.message.join(', ') : body?.message;
    throw new OrderError(message || 'Não foi possível registrar o pedido agora.');
  }
  return res.json();
}

export interface ShippingOption {
  id: string;
  name: string;
  company: string;
  price: number;
  deliveryTime: number | null;
}

export interface ShippingQuoteResult {
  configured: boolean;
  options: ShippingOption[];
  error?: string;
}

export interface ShippingQuoteInput {
  toZipCode: string;
  subtotal: number;
  items: { category?: string; quantity: number; unitPrice: number }[];
}

/** Cota o frete no Melhor Envio. Best-effort: se falhar, devolve lista vazia e o
 * checkout usa o frete fixo, sem travar. */
export async function quoteShipping(input: ShippingQuoteInput): Promise<ShippingQuoteResult> {
  try {
    const res = await fetch(`${API_URL}/shipping/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) return { configured: false, options: [] };
    return res.json();
  } catch {
    return { configured: false, options: [] };
  }
}
