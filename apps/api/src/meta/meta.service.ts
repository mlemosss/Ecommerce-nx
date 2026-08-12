import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { parseImages, toPublicImageUrls } from '../products/product-images';
import { effectivePrice, isOnSale } from '../products/pricing';

const GRAPH_API_VERSION = 'v21.0';
const GRAPH_BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

interface MetaConfig {
  accessToken: string;
  catalogId: string;
  appId?: string;
  appSecret?: string;
  storefrontUrl: string;
}

@Injectable()
export class MetaService {
  constructor(private readonly prisma: PrismaService) {}

  private getConfig(): MetaConfig | null {
    const accessToken = process.env.META_ACCESS_TOKEN;
    const catalogId = process.env.META_CATALOG_ID;
    if (!accessToken || !catalogId) return null;

    return {
      accessToken,
      catalogId,
      appId: process.env.META_APP_ID,
      appSecret: process.env.META_APP_SECRET,
      storefrontUrl: process.env.STOREFRONT_URL || 'http://localhost:3000',
    };
  }

  isConfigured(): boolean {
    return this.getConfig() !== null;
  }

  async status() {
    const config = this.getConfig();
    if (!config) {
      return {
        configured: false,
        message:
          'Defina META_ACCESS_TOKEN e META_CATALOG_ID nas variáveis de ambiente da API para ativar a integração.',
      };
    }

    const url = `${GRAPH_BASE_URL}/${config.catalogId}?fields=name,product_count&access_token=${encodeURIComponent(
      config.accessToken
    )}`;

    const res = await fetch(url);
    const body = await res.json();

    if (!res.ok) {
      return {
        configured: true,
        connected: false,
        error: body?.error?.message || 'Não foi possível conectar ao catálogo do Meta.',
      };
    }

    return {
      configured: true,
      connected: true,
      catalogName: body.name,
      productCount: body.product_count,
    };
  }

  async syncProducts() {
    const config = this.getConfig();
    if (!config) {
      throw new BadRequestException(
        'Integração com o Meta não configurada. Defina META_ACCESS_TOKEN e META_CATALOG_ID.'
      );
    }

    const products = await this.prisma.product.findMany({
      where: { active: true },
      include: { variants: true },
    });

    // O Meta rejeita item sem imagem. Produto sem foto é separado e reportado,
    // em vez de fazer o lote inteiro voltar com erro.
    const withoutImage: string[] = [];

    const requests = products.flatMap((product) => {
      const images = toPublicImageUrls(product.id, parseImages(product.images));
      if (images.length === 0) {
        withoutImage.push(product.name);
        return [];
      }

      const onSale = isOnSale(product);
      // Em promoção, o Meta espera o preço cheio em `price` e o promocional em
      // `sale_price` — é assim que ele mostra o "de/por" no anúncio.
      const fullPrice = onSale ? (product.compareAtPrice as number) : product.price;

      return product.variants.map((variant) => {
        const unitPrice = effectivePrice(product, variant.price);
        return {
          method: 'UPDATE',
          data: {
            id: variant.id,
            item_group_id: product.id,
            title: product.name,
            description: product.description || product.name,
            availability: variant.stock > 0 ? 'in stock' : 'out of stock',
            inventory: variant.stock,
            condition: 'new',
            price: `${(onSale ? fullPrice : unitPrice).toFixed(2)} BRL`,
            ...(onSale ? { sale_price: `${unitPrice.toFixed(2)} BRL` } : {}),
            link: `${config.storefrontUrl}/produtos/${product.slug}`,
            image_link: images[0],
            ...(images.length > 1 ? { additional_image_link: images.slice(1, 10).join(',') } : {}),
            brand: 'No Excuse',
            color: variant.color,
            size: variant.size,
          },
        };
      });
    });

    if (requests.length === 0) {
      throw new BadRequestException(
        withoutImage.length > 0
          ? `Nenhum produto pôde ser enviado: todos estão sem foto (${withoutImage.join(', ')}). O Meta não aceita item sem imagem.`
          : 'Nenhum produto ativo para sincronizar.'
      );
    }

    const url = `${GRAPH_BASE_URL}/${config.catalogId}/items_batch`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_token: config.accessToken,
        item_type: 'PRODUCT_ITEM',
        allow_upsert: true,
        requests,
      }),
    });

    const body = await res.json();

    if (!res.ok) {
      throw new BadRequestException(
        body?.error?.message || 'Erro ao enviar produtos para o Meta Commerce Catalog.'
      );
    }

    return {
      itemsSent: requests.length,
      /** Produtos deixados de fora por não terem foto. */
      skippedWithoutImage: withoutImage,
      handle: body.handles?.[0] ?? null,
      raw: body,
    };
  }

  async batchStatus(handle: string) {
    const config = this.getConfig();
    if (!config) {
      throw new BadRequestException('Integração com o Meta não configurada.');
    }

    const url = `${GRAPH_BASE_URL}/${handle}?access_token=${encodeURIComponent(config.accessToken)}`;
    const res = await fetch(url);
    const body = await res.json();

    if (!res.ok) {
      throw new BadRequestException(body?.error?.message || 'Erro ao consultar status do lote.');
    }

    return body;
  }
}
