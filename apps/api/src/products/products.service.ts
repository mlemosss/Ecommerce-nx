import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, UpdateProductDto, UpdateStockDto } from './dto/product.dto';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function withParsedImages<T extends { images: string }>(product: T): Omit<T, 'images'> & { images: string[] } {
  let images: string[];
  try {
    images = JSON.parse(product.images);
  } catch {
    images = [];
  }
  return { ...product, images };
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  private async uniqueSlug(name: string): Promise<string> {
    const base = slugify(name);
    let slug = base;
    let counter = 1;
    while (await this.prisma.product.findUnique({ where: { slug } })) {
      slug = `${base}-${counter}`;
      counter += 1;
    }
    return slug;
  }

  async findAll(params: { category?: string; search?: string }) {
    const products = await this.prisma.product.findMany({
      where: {
        ...(params.category ? { category: params.category } : {}),
        ...(params.search
          ? { name: { contains: params.search } }
          : {}),
      },
      include: { variants: true },
      orderBy: { name: 'asc' },
    });
    return products.map(withParsedImages);
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { variants: true },
    });
    if (!product) throw new NotFoundException('Produto não encontrado');
    return withParsedImages(product);
  }

  async findBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: { variants: true },
    });
    if (!product) throw new NotFoundException('Produto não encontrado');
    return withParsedImages(product);
  }

  async create(dto: CreateProductDto) {
    const slug = await this.uniqueSlug(dto.name);
    const product = await this.prisma.product.create({
      data: {
        name: dto.name,
        slug,
        category: dto.category,
        description: dto.description ?? '',
        costPrice: dto.costPrice,
        price: dto.price,
        compareAtPrice: dto.compareAtPrice,
        images: JSON.stringify(dto.images ?? []),
        active: dto.active ?? true,
        variants: {
          create: dto.variants.map((v) => ({
            color: v.color,
            size: v.size,
            stock: v.stock,
          })),
        },
      },
      include: { variants: true },
    });
    return withParsedImages(product);
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id);

    if (dto.variants) {
      await this.prisma.productVariant.deleteMany({ where: { productId: id } });
    }

    const product = await this.prisma.product.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.costPrice !== undefined ? { costPrice: dto.costPrice } : {}),
        ...(dto.price !== undefined ? { price: dto.price } : {}),
        ...(dto.compareAtPrice !== undefined ? { compareAtPrice: dto.compareAtPrice } : {}),
        ...(dto.images !== undefined ? { images: JSON.stringify(dto.images) } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
        ...(dto.variants
          ? {
              variants: {
                create: dto.variants.map((v) => ({
                  color: v.color,
                  size: v.size,
                  stock: v.stock,
                })),
              },
            }
          : {}),
      },
      include: { variants: true },
    });
    return withParsedImages(product);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.product.delete({ where: { id } });
    return { success: true };
  }

  async updateVariantStock(variantId: string, dto: UpdateStockDto) {
    const variant = await this.prisma.productVariant.findUnique({ where: { id: variantId } });
    if (!variant) throw new NotFoundException('Variação não encontrada');
    return this.prisma.productVariant.update({
      where: { id: variantId },
      data: { stock: dto.stock },
    });
  }

  async lowStock(threshold = 5) {
    return this.prisma.productVariant.findMany({
      where: { stock: { lte: threshold } },
      include: { product: true },
      orderBy: { stock: 'asc' },
    });
  }
}
