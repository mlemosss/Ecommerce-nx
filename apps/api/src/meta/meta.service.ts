import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { buildCatalogItems, toCsv, type CatalogItem } from './catalog-item';

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

  /**
   * URL pública da loja, usada no campo `link` de cada item.
   *
   * O padrão é o domínio real e não `localhost`: o feed é buscado pelo Meta a
   * partir da internet, e um link para localhost reprovaria o catálogo inteiro
   * sem deixar pista do motivo.
   */
  private storefrontUrl(): string {
    return (process.env.STOREFRONT_URL || 'https://www.noexcusenx.com.br').replace(/\/$/, '');
  }

  private getConfig(): MetaConfig | null {
    const accessToken = process.env.META_ACCESS_TOKEN;
    const catalogId = process.env.META_CATALOG_ID;
    if (!accessToken || !catalogId) return null;

    return {
      accessToken,
      catalogId,
      appId: process.env.META_APP_ID,
      appSecret: process.env.META_APP_SECRET,
      storefrontUrl: this.storefrontUrl(),
    };
  }

  /**
   * Itens do catálogo a partir dos produtos ativos.
   *
   * Produto sem foto é separado e reportado por nome: o Meta rejeita item sem
   * imagem, e um lote inteiro voltando com erro não diz qual peça faltou.
   */
  private async collectItems(): Promise<{ items: CatalogItem[]; withoutImage: string[] }> {
    const products = await this.prisma.product.findMany({
      where: { active: true },
      include: { variants: true },
      orderBy: { name: 'asc' },
    });

    const withoutImage: string[] = [];
    const storefrontUrl = this.storefrontUrl();

    const items = products.flatMap((product) => {
      const built = buildCatalogItems(product, storefrontUrl);
      if (built.length === 0 && product.variants.length > 0) withoutImage.push(product.name);
      return built;
    });

    return { items, withoutImage };
  }

  /**
   * Feed CSV que o Meta busca sozinho, sem token nenhum.
   *
   * É o caminho que dispensa credencial: em vez de a loja empurrar por Graph
   * API, o Commerce Manager agenda uma busca nesta URL e relê o catálogo de
   * hora em hora. Estoque e promoção acompanham sem ninguém clicar em nada.
   */
  async feedCsv(): Promise<string> {
    const { items } = await this.collectItems();
    return toCsv(items);
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

    const { items, withoutImage } = await this.collectItems();

    // Campo vazio é omitido: mandar `sale_price: ""` para um item fora de
    // promoção faz o Meta interpretar como preço promocional inválido.
    const requests = items.map((item) => ({
      method: 'UPDATE',
      data: Object.fromEntries(Object.entries(item).filter(([, value]) => value !== '')),
    }));

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
