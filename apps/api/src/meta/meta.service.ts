import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { buildCatalogItems, toCsv, type CatalogItem } from './catalog-item';
import {
  buildImageMeta,
  parseImageMeta,
  parseImages,
  urlsFromMeta,
} from '../products/product-images';

const GRAPH_API_VERSION = 'v21.0';
const GRAPH_BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

/** Domínio canônico da loja — o mesmo que o storefront declara na tag `canonical`. */
const CANONICAL_STOREFRONT_URL = 'https://www.noexcusenx.com.br';

/**
 * Onde as fotos de produto realmente são servidas.
 *
 * Fixo de propósito. O resto da API monta URL de imagem a partir do host de
 * quem pediu, o que é certo no catálogo — a loja chama a API direto. No feed
 * não é: ele também é servido pelo domínio da loja, por reescrita, e ali o host
 * de quem pediu é `noexcusenx.com.br`, que não serve `/api/images`. Como o
 * cache da borda é por URL e não por host, a primeira resposta gravada
 * contaminava as duas — e o Meta rejeita item com imagem inacessível.
 */
const IMAGE_BASE_URL = (process.env.API_PUBLIC_URL || 'https://noexcuse-api.vercel.app/api').replace(
  /\/$/,
  ''
);

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
   *
   * Hosts de deploy da Vercel são trocados pelo domínio canônico. `STOREFRONT_URL`
   * na produção ainda aponta para `no-excuse-storefront.vercel.app`, que responde
   * mas não é o domínio da marca: mandaria o tráfego do anúncio para um endereço
   * que a própria loja declara como não-canônico na tag `canonical`, e o Meta
   * cruza as duas coisas. Trocar a variável na Vercel continua sendo o certo —
   * isto aqui só garante que o feed não saia errado enquanto isso não acontece.
   */
  private storefrontUrl(): string {
    const configured = (process.env.STOREFRONT_URL || CANONICAL_STOREFRONT_URL).replace(/\/$/, '');
    return /(^|\/\/)([^/]*\.)?vercel\.app$/i.test(configured) ? CANONICAL_STOREFRONT_URL : configured;
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
    // Sem `select`, a linha inteira vem — e nesta tabela ela traz as fotos em
    // base64. O Meta relê este feed de hora em hora, de vários lugares: era a
    // leitura mais cara e mais frequente do banco. Aqui só a ficha das fotos
    // atravessa, e as fotos ficam onde estão.
    const products = await this.prisma.product.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        slug: true,
        category: true,
        description: true,
        price: true,
        compareAtPrice: true,
        imageMeta: true,
        variants: true,
      },
      orderBy: { name: 'asc' },
    });

    // Produto que ainda não passou pelo catálogo depois da mudança não tem
    // ficha. Só esses pagam uma leitura das fotos; o catálogo grava a ficha na
    // primeira visita e eles somem desta lista.
    const semFicha = products.filter((p) => p.imageMeta === null).map((p) => p.id);
    const pendentes = semFicha.length
      ? await this.prisma.product.findMany({
          where: { id: { in: semFicha } },
          select: { id: true, images: true },
        })
      : [];
    const fotosPendentes = new Map(
      pendentes.map((p) => [p.id, buildImageMeta(parseImages(p.images))])
    );

    const withoutImage: string[] = [];
    const storefrontUrl = this.storefrontUrl();

    const items = products.flatMap((product) => {
      const meta = fotosPendentes.get(product.id) ?? parseImageMeta(product.imageMeta) ?? [];
      // `buildCatalogItems` recebe `images` como JSON de strings e deixa URL
      // http passar intacta — então entregar as URLs prontas dispensa mudar a
      // assinatura dele e o teste que cobre a conversão.
      const built = buildCatalogItems(
        { ...product, images: JSON.stringify(urlsFromMeta(product.id, meta, IMAGE_BASE_URL)) },
        storefrontUrl,
        IMAGE_BASE_URL
      );
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
