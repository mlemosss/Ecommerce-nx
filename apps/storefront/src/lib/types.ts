export type Category =
  | 'leggings'
  | 'tops'
  | 'shorts'
  | 'camisetas'
  | 'jaquetas'
  | 'acessorios';

export interface ProductVariant {
  color: string;
  size: string;
  stock: number;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  category: Category;
  price: number;
  compareAtPrice?: number | null;
  colors: string[];
  sizes: string[];
  description: string;
  details?: string[];
  rating?: number;
  reviewCount?: number;
  isNew?: boolean;
  isBestSeller?: boolean;
  gradient: [string, string];
  images?: string[];
  variants?: ProductVariant[];
}

export interface CartItem {
  productId: string;
  size: string;
  color: string;
  quantity: number;
}
