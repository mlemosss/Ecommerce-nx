export type Category =
  | 'leggings'
  | 'tops'
  | 'shorts'
  | 'camisetas'
  | 'jaquetas'
  | 'acessorios';

export interface Product {
  id: string;
  slug: string;
  name: string;
  category: Category;
  price: number;
  compareAtPrice?: number;
  colors: string[];
  sizes: string[];
  description: string;
  details: string[];
  rating: number;
  reviewCount: number;
  isNew?: boolean;
  isBestSeller?: boolean;
  gradient: [string, string];
}

export interface CartItem {
  productId: string;
  size: string;
  color: string;
  quantity: number;
}
