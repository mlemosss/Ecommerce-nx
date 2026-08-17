export type Category =
  | 'leggings'
  | 'tops'
  | 'shorts'
  | 'camisetas'
  | 'jaquetas'
  | 'acessorios';

export interface ProductVariant {
  /** Chave da variação. É o `content_ids` que o Pixel manda para o catálogo. */
  id: string;
  color: string;
  size: string;
  stock: number;
  price: number;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  category: Category;
  price: number;
  priceRange?: { min: number; max: number } | null;
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
