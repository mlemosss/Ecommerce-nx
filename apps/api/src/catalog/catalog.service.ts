import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { parseImages, toPublicImageUrls } from '../products/product-images';
import { effectivePrice } from '../products/pricing';

const NEW_WINDOW_DAYS = 14;

function toCatalogProduct(product: {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  images: string;
  createdAt: Date;
  variants: { id: string; color: string; size: string; stock: number; price: number | null }[];
}) {
  const images = toPublicImageUrls(product.id, parseImages(product.images));

  const variants = product.variants.map((v) => ({
    // O id da variação vai para o navegador porque é a chave que o catálogo do
    // Meta usa: o `content_ids` dos eventos do Pixel precisa ser exatamente o
    // mesmo valor da coluna `id` do feed. Divergiu, a taxa de correspondência
    // fica em 0% para sempre e o anúncio dinâmico não acha a peça que a pessoa
    // acabou de ver.
    id: v.id,
    color: v.color,
    size: v.size,
    stock: v.stock,
    price: effectivePrice(product, v.price),
  }));
  const colors = Array.from(new Set(variants.map((v) => v.color)));
  const sizes = Array.from(new Set(variants.map((v) => v.size)));
  const isNew = Date.now() - product.createdAt.getTime() < NEW_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const prices = variants.map((v) => v.price);
  const minPrice = prices.length ? Math.min(...prices) : product.price;
  const maxPrice = prices.length ? Math.max(...prices) : product.price;

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    category: product.category,
    description: product.description,
    price: minPrice,
    priceRange: minPrice === maxPrice ? null : { min: minPrice, max: maxPrice },
    compareAtPrice: product.compareAtPrice,
    images,
    colors,
    sizes,
    variants,
    isNew,
  };
}

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(category?: string) {
    const products = await this.prisma.product.findMany({
      where: { active: true, ...(category ? { category } : {}) },
      include: { variants: { select: { id: true, color: true, size: true, stock: true, price: true } } },
      orderBy: { name: 'asc' },
    });
    return products.map(toCatalogProduct);
  }

  async findBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: { variants: { select: { id: true, color: true, size: true, stock: true, price: true } } },
    });
    if (!product || !product.active) throw new NotFoundException('Produto não encontrado');
    return toCatalogProduct(product);
  }
}
