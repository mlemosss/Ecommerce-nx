import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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

    const requests = products.flatMap((product) =>
      product.variants.map((variant) => ({
        method: 'UPDATE',
        data: {
          id: variant.id,
          item_group_id: product.id,
          title: product.name,
          description: product.description || product.name,
          availability: variant.stock > 0 ? 'in stock' : 'out of stock',
          condition: 'new',
          price: `${product.price.toFixed(2)} BRL`,
          link: `${config.storefrontUrl}/produtos/${product.slug}`,
          brand: 'No Excuse',
          color: variant.color,
          size: variant.size,
        },
      }))
    );

    if (requests.length === 0) {
      throw new BadRequestException('Nenhum produto ativo para sincronizar.');
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
