const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api';

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
}

export const DEFAULT_SETTINGS: StoreSettings = {
  storeName: 'No Excuse',
  contactEmail: null,
  contactWhatsapp: null,
  shippingFee: 19.9,
  freeShippingThreshold: 199.9,
  pixEnabled: true,
  cardEnabled: true,
  boletoEnabled: true,
  maxInstallments: 3,
  instagramUrl: null,
  facebookUrl: null,
};

export async function getSettings(): Promise<StoreSettings> {
  try {
    const res = await fetch(`${API_URL}/settings`, { cache: 'no-store' });
    if (!res.ok) return DEFAULT_SETTINGS;
    return await res.json();
  } catch {
    return DEFAULT_SETTINGS;
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
