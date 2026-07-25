export interface ProductVariant {
  id: string;
  productId: string;
  color: string;
  size: string;
  stock: number;
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

export interface DashboardSummary {
  cashBalance: number;
  todayIn: number;
  todayOut: number;
  monthRevenue: number;
  monthExpenses: number;
  grossProfit: number;
  openAccounts: { count: number; total: number };
  installmentSales: { count: number; total: number };
}

export type CouponDiscountType = 'percentage' | 'fixed';

export interface Coupon {
  id: string;
  code: string;
  discountType: CouponDiscountType;
  discountValue: number;
  minOrderValue: number | null;
  usageLimit: number | null;
  usageCount: number;
  active: boolean;
  startsAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StoreSettings {
  id: string;
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
  updatedAt: string;
}
