import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

/**
 * `Purchase` para a API de Conversões da Meta, enviado pelo servidor.
 *
 * É o único evento que a loja manda daqui, e é de propósito. Ele decide
 * orçamento de campanha — a Meta otimiza a entrega para achar mais gente
 * parecida com quem comprou. Por isso ele não pode vir do navegador: uma rota
 * que aceita "compra" do cliente é uma rota que aceita compra inventada, e
 * campanha otimizada em cima de comprador falso queima dinheiro de verdade.
 *
 * Aqui o valor vem do pedido no banco, e o disparo acontece quando o pagamento
 * é confirmado — não quando o pedido é criado. Pix que ninguém paga não é
 * venda, e contá-lo ensinaria a Meta a procurar gente que abandona o
 * pagamento.
 */

const GRAPH_VERSION = 'v26.0';

const sha256 = (valor: string) => createHash('sha256').update(valor, 'utf8').digest('hex');

/** Ver `apps/storefront/src/lib/meta-hash.ts` — as regras e os porquês estão lá. */
function hashEmail(bruto?: string | null): string | undefined {
  if (!bruto) return undefined;
  const email = String(bruto).trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? sha256(email) : undefined;
}

function hashPhoneBR(bruto?: string | null): string | undefined {
  if (!bruto) return undefined;
  let d = String(bruto).replace(/\D/g, '');
  // Comprimento, nunca prefixo: o DDD 55 é Santa Maria/RS.
  if (d.length === 10 || d.length === 11) d = `55${d}`;
  else if (d.length !== 12 && d.length !== 13) return undefined;
  return d.startsWith('55') ? sha256(d) : undefined;
}

function hashSimples(bruto?: string | null, apenasLetras = false): string | undefined {
  if (!bruto) return undefined;
  let v = String(bruto).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  v = apenasLetras ? v.replace(/[^a-z]/g, '') : v.replace(/\D/g, '');
  return v ? sha256(v) : undefined;
}

interface PedidoParaCapi {
  id: string;
  orderNumber: string;
  total: number;
  customerEmail: string;
  customerPhone: string;
  city: string | null;
  zipCode: string | null;
  metaFbp: string | null;
  metaFbc: string | null;
  /** Aceitou os cookies de medição na hora da compra. Sem isso, não sai nada. */
  trackingConsent: boolean;
  items: { productId: string; color: string; size: string; quantity: number; unitPrice: number }[];
}

@Injectable()
export class MetaCapiService {
  private readonly logger = new Logger(MetaCapiService.name);

  constructor(private readonly prisma: PrismaService) {}

  private getConfig(): { token: string; pixelId: string } | null {
    const token = process.env.META_CAPI_TOKEN;
    const pixelId = process.env.META_PIXEL_ID;
    return token && pixelId ? { token, pixelId } : null;
  }

  /**
   * Manda a compra. Falhar aqui nunca derruba nada: o pedido já aconteceu, e
   * medição não pode quebrar venda.
   *
   * `event_id` é o número do pedido, o mesmo que o navegador usa em `eventID`.
   * É só isso que impede a Meta de contar a mesma compra duas vezes, e a
   * janela de comparação é de 48 horas a partir do primeiro recebido.
   */
  async sendPurchase(pedido: PedidoParaCapi): Promise<void> {
    const config = this.getConfig();
    if (!config) return;

    /**
     * Sem aceite, não sai nada. Nem hash.
     *
     * A política promete em negrito: "nada disso acontece se você recusar". O
     * navegador cumpria — sem aceite o Pixel nem carrega. Este caminho não:
     * rodava na confirmação do pagamento e mandava e-mail e telefone com hash
     * para a Meta sem consultar ninguém, porque a escolha morria no navegador
     * e o servidor não tinha como saber dela.
     *
     * Hash não desfaz o problema: e-mail com SHA-256 continua identificando a
     * mesma pessoa do outro lado — é justamente para isso que ele é mandado.
     *
     * Pedido gravado antes desta mudança tem `false` e não gera evento.
     * Perder medição de alguns pedidos é barato; contrariar por escrito o que
     * a política promete, não.
     */
    if (!pedido.trackingConsent) {
      this.logger.log(
        `Purchase do pedido ${pedido.orderNumber} não enviado: a cliente não aceitou os cookies de medição.`
      );
      return;
    }

    try {
      // `content_ids` tem que ser o id da variação, o mesmo do feed do
      // catálogo. O item do pedido guarda cor e tamanho como texto — para
      // sobreviver a peça renomeada —, então a variação é procurada agora.
      const variantes = pedido.items.length
        ? await this.prisma.productVariant.findMany({
            where: {
              OR: pedido.items.map((i) => ({
                productId: i.productId,
                color: i.color,
                size: i.size,
              })),
            },
            select: { id: true, productId: true, color: true, size: true },
          })
        : [];

      const idDa = new Map(
        variantes.map((v) => [`${v.productId}|${v.color}|${v.size}`, v.id])
      );

      const contents = pedido.items
        .map((i) => ({
          id: idDa.get(`${i.productId}|${i.color}|${i.size}`),
          quantity: i.quantity,
          item_price: i.unitPrice,
        }))
        .filter((c): c is { id: string; quantity: number; item_price: number } => Boolean(c.id));

      // Evento sem id de variação casa com nada e ainda entra no denominador
      // da taxa de correspondência. Melhor não mandar.
      if (contents.length === 0) {
        this.logger.warn(
          `Purchase do pedido ${pedido.orderNumber} não enviado: nenhuma variação encontrada.`
        );
        return;
      }

      const userData: Record<string, unknown> = {
        ...(hashEmail(pedido.customerEmail) ? { em: [hashEmail(pedido.customerEmail)] } : {}),
        ...(hashPhoneBR(pedido.customerPhone) ? { ph: [hashPhoneBR(pedido.customerPhone)] } : {}),
        ...(hashSimples(pedido.city, true) ? { ct: [hashSimples(pedido.city, true)] } : {}),
        ...(hashSimples(pedido.zipCode) ? { zp: [hashSimples(pedido.zipCode)] } : {}),
        country: [sha256('br')],
        // Sem hash: hashear estes quebra a correspondência.
        ...(pedido.metaFbp ? { fbp: pedido.metaFbp } : {}),
        ...(pedido.metaFbc ? { fbc: pedido.metaFbc } : {}),
      };

      const res = await fetch(
        `https://graph.facebook.com/${GRAPH_VERSION}/${config.pixelId}/events`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data: [
              {
                event_name: 'Purchase',
                event_time: Math.floor(Date.now() / 1000),
                event_id: pedido.orderNumber,
                event_source_url: `${
                  process.env.STOREFRONT_URL ?? 'https://www.noexcusenx.com.br'
                }/pedido-confirmado`,
                action_source: 'website',
                user_data: userData,
                custom_data: {
                  content_ids: contents.map((c) => c.id),
                  content_type: 'product',
                  contents,
                  num_items: contents.reduce((s, c) => s + c.quantity, 0),
                  // Do banco, nunca do cliente.
                  value: pedido.total,
                  currency: 'BRL',
                },
              },
            ],
            // No corpo, não na URL: a query string vaza para log de acesso e
            // trace de proxy.
            access_token: config.token,
          }),
        }
      );

      if (!res.ok) {
        // Token revogado derruba 100% do envio pelo servidor enquanto o
        // Gerenciador de Eventos continua verde por causa do pixel do
        // navegador. Sem este log, ninguém percebe. Só o status: a resposta de
        // erro da Meta pode ecoar o payload, e ali dentro vão os hashes.
        this.logger.error(
          `Purchase do pedido ${pedido.orderNumber} recusado pela Meta: HTTP ${res.status}`
        );
        return;
      }

      this.logger.log(`Purchase do pedido ${pedido.orderNumber} enviado à Meta.`);
    } catch (err) {
      this.logger.error(`Falha ao enviar Purchase do pedido ${pedido.orderNumber}: ${err}`);
    }
  }
}
