import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, ReplaceCatalogDto, UpdateProductDto, UpdateStockDto } from './dto/product.dto';

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
          ? { name: { contains: params.search, mode: 'insensitive' } }
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
            price: v.price,
            costPrice: v.costPrice,
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
                  price: v.price,
                  costPrice: v.costPrice,
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

    const soldVariant = await this.prisma.productVariant.findFirst({
      where: { productId: id, saleItems: { some: {} } },
    });
    if (soldVariant) {
      throw new ConflictException(
        'Este produto já tem vendas registradas e não pode ser excluído. Desative-o para tirá-lo da loja.'
      );
    }

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

  /**
   * Apaga todo o catálogo atual (produtos, variações e vendas ligadas a eles)
   * e insere os produtos informados no lugar. Operação destrutiva e irreversível,
   * pensada para reset completo do catálogo a partir de um inventário real.
   */
  async replaceCatalog(dto: ReplaceCatalogDto) {
    if (!dto.confirmDeleteAll) {
      throw new BadRequestException(
        'Envie confirmDeleteAll=true para confirmar a substituição total do catálogo (apaga produtos, variações e vendas ligadas a eles).'
      );
    }

    return this.prisma.$transaction(
      async (tx) => {
        await tx.sale.deleteMany({});
        await tx.product.deleteMany({});

        const created = [];
        for (const p of dto.products) {
          const slug = slugify(p.name);
          const prices = p.variants.map((v) => v.price);
          const costs = p.variants.map((v) => v.costPrice);
          const product = await tx.product.create({
            data: {
              name: p.name,
              slug,
              category: p.category,
              description: p.description ?? '',
              price: mode(prices),
              costPrice: mode(costs),
              images: '[]',
              active: true,
              variants: {
                create: p.variants.map((v) => ({
                  color: v.color,
                  size: v.size,
                  stock: v.stock,
                  price: v.price,
                  costPrice: v.costPrice,
                })),
              },
            },
            include: { variants: true },
          });
          created.push(product);
        }

        return {
          productsCreated: created.length,
          variantsCreated: created.reduce((sum, p) => sum + p.variants.length, 0),
        };
      },
      { timeout: 30000 }
    );
  }
}

function mode(values: number[]): number {
  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best = values[0];
  let bestCount = 0;
  for (const [v, count] of counts) {
    if (count > bestCount) {
      best = v;
      bestCount = count;
    }
  }
  return best;
}
