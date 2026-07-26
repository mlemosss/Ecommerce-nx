import { BadRequestException, Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

interface PartnerConfig {
  partnerId: string;
  partnerKey: string;
  host: string;
  redirectUrl: string;
}

interface ShopeeCategory {
  categoryId: number;
  parentCategoryId: number;
  originalCategoryName: string;
  hasChildren: boolean;
}

@Injectable()
export class ShopeeService {
  constructor(private readonly prisma: PrismaService) {}

  private getPartnerConfig(): PartnerConfig | null {
    const partnerId = process.env.SHOPEE_PARTNER_ID;
    const partnerKey = process.env.SHOPEE_PARTNER_KEY;
    if (!partnerId || !partnerKey) return null;

    const host =
      process.env.SHOPEE_ENV === 'live'
        ? 'https://partner.shopeemobile.com'
        : 'https://partner.test-stable.shopeemobile.com';

    const apiPublicUrl = (process.env.API_PUBLIC_URL || 'http://localhost:3333/api').replace(/\/$/, '');
    const redirectUrl = `${apiPublicUrl}/shopee/callback`;

    return { partnerId, partnerKey, host, redirectUrl };
  }

  isConfigured(): boolean {
    return this.getPartnerConfig() !== null;
  }

  private sign(config: PartnerConfig, path: string, timestamp: number, shopAuth?: { accessToken: string; shopId: bigint }): string {
    const base = shopAuth
      ? `${config.partnerId}${path}${timestamp}${shopAuth.accessToken}${shopAuth.shopId}`
      : `${config.partnerId}${path}${timestamp}`;
    return crypto.createHmac('sha256', config.partnerKey).update(base).digest('hex');
  }

  private async getSession() {
    return this.prisma.shopeeIntegration.findUnique({ where: { id: 'singleton' } });
  }

  private async ensureValidAccessToken(): Promise<{ accessToken: string; shopId: bigint }> {
    const config = this.getPartnerConfig();
    if (!config) {
      throw new BadRequestException(
        'Integração com a Shopee não configurada. Defina SHOPEE_PARTNER_ID e SHOPEE_PARTNER_KEY.'
      );
    }

    const session = await this.getSession();
    if (!session?.accessToken || !session.refreshToken || !session.shopId) {
      throw new BadRequestException('Loja não conectada à Shopee. Conecte sua loja primeiro.');
    }

    const expiresSoon =
      !session.accessTokenExpiresAt || session.accessTokenExpiresAt.getTime() - Date.now() < 5 * 60 * 1000;

    if (!expiresSoon) {
      return { accessToken: session.accessToken, shopId: session.shopId };
    }

    // access_token expira em ~4h; renova usando o refresh_token (válido por ~30 dias, renovado a cada uso)
    const path = '/api/v2/auth/access_token/get';
    const timestamp = Math.floor(Date.now() / 1000);
    const sign = this.sign(config, path, timestamp);
    const res = await fetch(`${config.host}${path}?partner_id=${config.partnerId}&timestamp=${timestamp}&sign=${sign}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        refresh_token: session.refreshToken,
        shop_id: Number(session.shopId),
        partner_id: Number(config.partnerId),
      }),
    });
    const body = await res.json();
    if (!res.ok || body.error) {
      throw new BadRequestException(body.message || 'Não foi possível renovar a conexão com a Shopee. Conecte novamente.');
    }

    await this.prisma.shopeeIntegration.update({
      where: { id: 'singleton' },
      data: {
        accessToken: body.access_token,
        refreshToken: body.refresh_token,
        accessTokenExpiresAt: new Date(Date.now() + body.expire_in * 1000),
      },
    });

    return { accessToken: body.access_token, shopId: session.shopId };
  }

  getAuthorizeUrl(): { url: string } {
    const config = this.getPartnerConfig();
    if (!config) {
      throw new BadRequestException(
        'Integração com a Shopee não configurada. Defina SHOPEE_PARTNER_ID e SHOPEE_PARTNER_KEY.'
      );
    }
    const path = '/api/v2/shop/auth_partner';
    const timestamp = Math.floor(Date.now() / 1000);
    const sign = this.sign(config, path, timestamp);
    const url = `${config.host}${path}?partner_id=${config.partnerId}&timestamp=${timestamp}&sign=${sign}&redirect=${encodeURIComponent(config.redirectUrl)}`;
    return { url };
  }

  async handleCallback(code: string, shopId: string): Promise<void> {
    const config = this.getPartnerConfig();
    if (!config) throw new BadRequestException('Integração com a Shopee não configurada.');

    const path = '/api/v2/auth/token/get';
    const timestamp = Math.floor(Date.now() / 1000);
    const sign = this.sign(config, path, timestamp);
    const res = await fetch(`${config.host}${path}?partner_id=${config.partnerId}&timestamp=${timestamp}&sign=${sign}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, shop_id: Number(shopId), partner_id: Number(config.partnerId) }),
    });
    const body = await res.json();
    if (!res.ok || body.error) {
      throw new BadRequestException(body.message || 'Não foi possível concluir a conexão com a Shopee.');
    }

    await this.prisma.shopeeIntegration.upsert({
      where: { id: 'singleton' },
      create: {
        id: 'singleton',
        shopId: BigInt(shopId),
        accessToken: body.access_token,
        refreshToken: body.refresh_token,
        accessTokenExpiresAt: new Date(Date.now() + body.expire_in * 1000),
      },
      update: {
        shopId: BigInt(shopId),
        accessToken: body.access_token,
        refreshToken: body.refresh_token,
        accessTokenExpiresAt: new Date(Date.now() + body.expire_in * 1000),
      },
    });
  }

  async status() {
    const config = this.getPartnerConfig();
    if (!config) {
      return {
        configured: false,
        connected: false,
        message:
          'Defina SHOPEE_PARTNER_ID e SHOPEE_PARTNER_KEY nas variáveis de ambiente da API para ativar a integração.',
      };
    }

    const session = await this.getSession();
    if (!session?.accessToken) {
      return { configured: true, connected: false };
    }

    return {
      configured: true,
      connected: true,
      shopId: session.shopId?.toString(),
      defaultCategoryId: session.defaultCategoryId,
    };
  }

  private async shopRequest<T>(path: string, options: { method?: string; body?: unknown; query?: Record<string, string> } = {}): Promise<T> {
    const config = this.getPartnerConfig();
    if (!config) throw new BadRequestException('Integração com a Shopee não configurada.');
    const { accessToken, shopId } = await this.ensureValidAccessToken();

    const timestamp = Math.floor(Date.now() / 1000);
    const sign = this.sign(config, path, timestamp, { accessToken, shopId });
    const params = new URLSearchParams({
      partner_id: config.partnerId,
      timestamp: String(timestamp),
      sign,
      access_token: accessToken,
      shop_id: String(shopId),
      ...options.query,
    });

    const res = await fetch(`${config.host}${path}?${params.toString()}`, {
      method: options.method ?? 'GET',
      headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const body = await res.json();
    if (!res.ok || body.error) {
      throw new BadRequestException(body.message || 'Erro ao comunicar com a API da Shopee.');
    }
    return body as T;
  }

  async listCategories(): Promise<ShopeeCategory[]> {
    const body = await this.shopRequest<{ category_list: any[] }>('/api/v2/product/get_category');
    return (body.category_list || [])
      .filter((c) => !c.has_children)
      .map((c) => ({
        categoryId: c.category_id,
        parentCategoryId: c.parent_category_id,
        originalCategoryName: c.display_category_name || c.original_category_name,
        hasChildren: c.has_children,
      }));
  }

  async setDefaultCategory(categoryId: number): Promise<void> {
    await this.prisma.shopeeIntegration.update({
      where: { id: 'singleton' },
      data: { defaultCategoryId: categoryId },
    });
  }

  private async uploadImage(dataUrl: string): Promise<string> {
    const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) throw new BadRequestException('Imagem do produto em formato inválido para envio à Shopee.');
    const [, mimeType, base64] = match;
    const buffer = Buffer.from(base64, 'base64');

    const config = this.getPartnerConfig();
    if (!config) throw new BadRequestException('Integração com a Shopee não configurada.');
    const { accessToken, shopId } = await this.ensureValidAccessToken();

    const path = '/api/v2/media_space/upload_image';
    const timestamp = Math.floor(Date.now() / 1000);
    const sign = this.sign(config, path, timestamp, { accessToken, shopId });
    const params = new URLSearchParams({
      partner_id: config.partnerId,
      timestamp: String(timestamp),
      sign,
      access_token: accessToken,
      shop_id: String(shopId),
    });

    const form = new FormData();
    form.append('image', new Blob([buffer], { type: mimeType }), 'produto.jpg');

    const res = await fetch(`${config.host}${path}?${params.toString()}`, { method: 'POST', body: form });
    const body = await res.json();
    if (!res.ok || body.error) {
      throw new BadRequestException(body.message || 'Erro ao enviar imagem para a Shopee.');
    }
    return body.response.image_info.image_id;
  }

  async syncProducts() {
    const session = await this.getSession();
    if (!session?.defaultCategoryId) {
      throw new BadRequestException('Escolha uma categoria padrão da Shopee antes de sincronizar.');
    }

    const channels = await this.shopRequest<{ logistics_channel_list: any[] }>('/api/v2/logistics/get_channel_list');
    const logisticInfo = (channels.logistics_channel_list || [])
      .filter((c) => c.enabled)
      .map((c) => ({ logistic_id: c.logistics_channel_id, enabled: true }));

    const products = await this.prisma.product.findMany({ where: { active: true }, include: { variants: true } });

    const results: { productId: string; name: string; status: 'created' | 'updated' | 'error'; error?: string }[] = [];

    for (const product of products) {
      try {
        let images: string[] = [];
        try {
          images = JSON.parse(product.images);
        } catch {
          images = [];
        }
        const imageId = images[0] ? await this.uploadImage(images[0]) : null;
        const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);

        if (!product.shopeeItemId) {
          const created = await this.shopRequest<{ item_id: number }>('/api/v2/product/add_item', {
            method: 'POST',
            body: {
              category_id: session.defaultCategoryId,
              item_name: product.name,
              description: product.description || product.name,
              weight: '0.3',
              price_info: [{ currency: 'BRL', original_price: product.price }],
              stock_info_v2: { seller_stock: [{ stock: totalStock }] },
              logistic_info: logisticInfo,
              ...(imageId ? { image: { image_id_list: [imageId] } } : {}),
            },
          });
          await this.prisma.product.update({ where: { id: product.id }, data: { shopeeItemId: BigInt(created.item_id) } });
          results.push({ productId: product.id, name: product.name, status: 'created' });
        } else {
          await this.shopRequest('/api/v2/product/update_item', {
            method: 'POST',
            body: {
              item_id: Number(product.shopeeItemId),
              item_name: product.name,
              description: product.description || product.name,
              price_info: [{ currency: 'BRL', original_price: product.price }],
            },
          });
          await this.shopRequest('/api/v2/product/update_stock', {
            method: 'POST',
            body: {
              item_id: Number(product.shopeeItemId),
              stock_list: [{ model_id: 0, seller_stock: [{ stock: totalStock }] }],
            },
          });
          results.push({ productId: product.id, name: product.name, status: 'updated' });
        }
      } catch (err) {
        results.push({
          productId: product.id,
          name: product.name,
          status: 'error',
          error: err instanceof Error ? err.message : 'Erro desconhecido',
        });
      }
    }

    return {
      total: results.length,
      created: results.filter((r) => r.status === 'created').length,
      updated: results.filter((r) => r.status === 'updated').length,
      errors: results.filter((r) => r.status === 'error'),
    };
  }
}
