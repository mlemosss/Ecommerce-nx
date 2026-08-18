export interface ProductVariant {
  id: string;
  productId: string;
  color: string;
  size: string;
  stock: number;
  price: number | null;
  costPrice: number | null;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  costPrice: number;
  price: number;
  compareAtPrice: number | null;
  images: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
  variants: ProductVariant[];
}

export type PersonType = 'PF' | 'PJ';

export interface Customer {
  id: string;
  name: string;
  personType: PersonType;
  documentNumber: string | null;
  birthDate: string | null;
  phone: string | null;
  email: string | null;
  description: string | null;
  tags: string;
  zipCode: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  createdAt: string;
  updatedAt: string;
  sales?: Sale[];
  orders?: Order[];
  favorites?: Favorite[];
  hasAccount?: boolean;
}

export interface Favorite {
  id: string;
  customerId: string;
  productId: string;
  createdAt: string;
  product: Product;
}

export type PaymentMethod = 'pix' | 'cartao' | 'boleto' | 'dinheiro';
export type SaleStatus = 'concluida' | 'conta_aberta';

export interface SaleItem {
  id: string;
  saleId: string;
  productVariantId: string;
  quantity: number;
  unitPrice: number;
  productVariant: ProductVariant & { product: Product };
}

export interface Sale {
  id: string;
  customerId: string | null;
  customer: Customer | null;
  paymentMethod: PaymentMethod;
  status: SaleStatus;
  installments: number;
  total: number;
  createdAt: string;
  items: SaleItem[];
}

export interface Expense {
  id: string;
  description: string;
  category: string;
  amount: number;
  date: string;
  createdAt: string;
}

export interface CustomPayment {
  id: string;
  description: string;
  method: PaymentMethod;
  amount: number;
  date: string;
  createdAt: string;
}

export interface DashboardSummary {
  cashBalance: number;
  todayIn: number;
  todayOut: number;
  monthRevenue: number;
  monthExpenses: number;
  grossProfit: number;
  openAccounts: { count: number; total: number };
  installmentSales: { count: number; total: number };
  /** Recorte só da loja online, para separar do balcão. */
  onlineStore: { monthCount: number; monthRevenue: number };
}

export type CouponDiscountType = 'percentage' | 'fixed';

export interface Coupon {
  id: string;
  code: string;
  discountType: CouponDiscountType;
  discountValue: number;
  minOrderValue: number | null;
  usageLimit: number | null;
  firstPurchaseOnly: boolean;
  usageCount: number;
  active: boolean;
  startsAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type OrderPaymentMethod = 'pix' | 'cartao' | 'boleto';
export type OrderStatus = 'aguardando_pagamento' | 'pago' | 'enviado' | 'cancelado';

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerDocument: string;
  zipCode: string;
  city: string;
  street: string;
  number: string;
  complement: string | null;
  subtotal: number;
  shipping: number;
  discount: number;
  couponCode: string | null;
  total: number;
  /** Retirada em maos, combinada por fora. Nao posta. */
  pickup: boolean;
  paymentMethod: OrderPaymentMethod;
  status: OrderStatus;
  asaasInvoiceUrl: string | null;
  shippedAt: string | null;
  trackingCode: string | null;
  /** Token do link de avaliação: /avaliar/&lt;token&gt;. Sem senha, por pedido. */
  reviewToken: string | null;
  reviewRequestSentAt: string | null;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ValueProp {
  title: string;
  description: string;
}

export interface StoreSettings {
  id: string;
  storeName: string;
  contactEmail: string | null;
  contactWhatsapp: string | null;
  legalName: string | null;
  cnpj: string | null;
  shippingFee: number;
  freeShippingThreshold: number;
  /** Página "Quem somos" da loja. */
  aboutHeadline: string | null;
  aboutBody: string | null;
  /** JSON: [{ minItems, percent }] do desconto progressivo. */
  progressiveDiscount: string;
  promoBannerText: string | null;
  promoBannerEndsAt: string | null;
  sizeGuide: string;
  googleAdsId: string | null;
  googleAdsConversionLabel: string | null;
  /** CEP de onde a loja despacha; base da cotação do Melhor Envio. */
  shippingOriginZip: string | null;
  packageHeightCm: number;
  packageWidthCm: number;
  packageLengthCm: number;
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
  clarityProjectId: string | null;
  gtmId: string | null;
  metaPixelId: string | null;
  emailFromName: string;
  emailFromAddress: string;
  updatedAt: string;
}

export interface Testimonial {
  id: string;
  customerName: string;
  photoUrl: string | null;
  quote: string;
  rating: number;
  position: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductReview {
  id: string;
  productId: string;
  product: { name: string };
  customerId: string;
  customerName: string;
  rating: number;
  comment: string;
  approved: boolean;
  createdAt: string;
  /** Foto da cliente usando a peça, quando ela mandou. */
  photoUrl: string | null;
}

export type QuoteStatus = 'aberto' | 'aceito' | 'recusado';

export interface QuoteItem {
  id: string;
  quoteId: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface Quote {
  id: string;
  customerName: string | null;
  status: QuoteStatus;
  notes: string | null;
  total: number;
  items: QuoteItem[];
  createdAt: string;
  updatedAt: string;
}
