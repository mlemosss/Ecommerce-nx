import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  buildImageMeta,
  parseImageMeta,
  parseImages,
  urlsFromMeta,
} from '../products/product-images';
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
  images: string[];
  createdAt: Date;
  variants: { id: string; color: string; size: string; stock: number; price: number | null }[];
}) {
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
    images: product.images,
    colors,
    sizes,
    variants,
    isNew,
  };
}

/**
 * Colunas que o catálogo precisa — e `images` não é uma delas.
 *
 * Sem este `select`, o Prisma devolve a linha inteira, e nesta tabela a linha
 * inteira inclui as fotos em base64. Cada leitura do catálogo arrastava ~3,7 MB
 * de dentro do Postgres para montar dez strings de URL. A resposta que chegava
 * ao navegador era pequena, então ninguém via — mas a conta de transferência do
 * banco via, e em 18 dias ela estourou os 5 GB do plano e suspendeu o banco.
 */
const CAMPOS_DO_CATALOGO = {
  id: true,
  name: true,
  slug: true,
  category: true,
  description: true,
  price: true,
  compareAtPrice: true,
  imageMeta: true,
  active: true,
  createdAt: true,
  variants: { select: { id: true, color: true, size: true, stock: true, price: true } },
} as const;

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calcula a ficha das fotos de quem ainda não tem, uma vez só.
   *
   * `imageMeta` nulo é produto que nunca passou por aqui depois da mudança.
   * Estes — e só estes — pagam uma leitura das fotos, que já sai gravada. Da
   * segunda visita em diante ninguém mais lê base64 nenhum.
   */
  private async fichaDasFotos(ids: string[]): Promise<Map<string, string[]>> {
    if (ids.length === 0) return new Map();

    const pendentes = await this.prisma.product.findMany({
      where: { id: { in: ids } },
      select: { id: true, images: true },
    });

    const porProduto = new Map<string, string[]>();
    for (const p of pendentes) {
      const meta = buildImageMeta(parseImages(p.images));
      porProduto.set(p.id, urlsFromMeta(p.id, meta));
      await this.prisma.product.update({
        where: { id: p.id },
        data: { imageMeta: JSON.stringify(meta) },
      });
    }
    return porProduto;
  }

  private async comFotos<T extends { id: string; imageMeta: string | null }>(produtos: T[]) {
    const semFicha = produtos.filter((p) => p.imageMeta === null).map((p) => p.id);
    const calculadas = await this.fichaDasFotos(semFicha);

    return produtos.map((p) => ({
      ...p,
      images: calculadas.get(p.id) ?? urlsFromMeta(p.id, parseImageMeta(p.imageMeta) ?? []),
    }));
  }

  async findAll(category?: string) {
    const products = await this.prisma.product.findMany({
      where: { active: true, ...(category ? { category } : {}) },
      select: CAMPOS_DO_CATALOGO,
      orderBy: { name: 'asc' },
    });
    return (await this.comFotos(products)).map(toCatalogProduct);
  }

  async findBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      select: CAMPOS_DO_CATALOGO,
    });
    if (!product || !product.active) throw new NotFoundException('Produto não encontrado');
    const [comFotos] = await this.comFotos([product]);
    return toCatalogProduct(comFotos);
  }
}
