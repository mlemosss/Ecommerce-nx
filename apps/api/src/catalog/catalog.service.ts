import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
  variants: { color: string; size: string; stock: number }[];
}) {
  let images: string[];
  try {
    images = JSON.parse(product.images);
  } catch {
    images = [];
  }

  const colors = Array.from(new Set(product.variants.map((v) => v.color)));
  const sizes = Array.from(new Set(product.variants.map((v) => v.size)));
  const isNew = Date.now() - product.createdAt.getTime() < NEW_WINDOW_DAYS * 24 * 60 * 60 * 1000;

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    category: product.category,
    description: product.description,
    price: product.price,
    compareAtPrice: product.compareAtPrice,
    images,
    colors,
    sizes,
    variants: product.variants,
    isNew,
  };
}

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(category?: string) {
    const products = await this.prisma.product.findMany({
      where: { active: true, ...(category ? { category } : {}) },
      include: { variants: { select: { color: true, size: true, stock: true } } },
      orderBy: { name: 'asc' },
    });
    return products.map(toCatalogProduct);
  }

  async findBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: { variants: { select: { color: true, size: true, stock: true } } },
    });
    if (!product || !product.active) throw new NotFoundException('Produto não encontrado');
    return toCatalogProduct(product);
  }
}
