import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ASAAS_PAID_STATUSES, AsaasService } from '../asaas/asaas.service';
import { CouponsService } from '../coupons/coupons.service';
import { EmailService } from '../email/email.service';
import { AbandonedCartService } from '../abandoned-cart/abandoned-cart.service';
import { effectivePrice } from '../products/pricing';
import { discountPercentFor, parseTiers } from '../products/progressive-discount';
import { SettingsService } from '../settings/settings.service';
import { CreateOrderDto, FindOrdersQueryDto, UpdateOrderStatusDto } from './dto/order.dto';

const BILLING_TYPE: Record<CreateOrderDto['paymentMethod'], 'PIX' | 'CREDIT_CARD' | 'BOLETO'> = {
  pix: 'PIX',
  cartao: 'CREDIT_CARD',
  boleto: 'BOLETO',
};

const PAYMENT_DUE_DAYS = 3;

/**
 * Deploy da versão que passou a movimentar estoque. Pedidos anteriores nunca
 * tiveram baixa, então devolver estoque ao cancelá-los inventaria peças que
 * nunca saíram: para eles não se movimenta nada.
 */
const STOCK_TRACKED_SINCE = new Date('2026-08-06T15:37:00.000Z');

/**
 * A partir daqui o estoque sai no **pagamento**, não na criação do pedido.
 *
 * `POST /orders` é público (é o checkout da loja), então debitar na criação dava
 * a qualquer visitante anônimo um jeito de zerar o estoque de todas as variações
 * — bastava ler `GET /catalog/products`, que publica o saldo, e pedir a
 * quantidade exata. Com a baixa no pagamento, ninguém sem token mexe em estoque.
 *
 * Pedidos criados na janela entre as duas datas nasceram na versão que debitava
 * na criação: eles seguram estoque mesmo enquanto aguardam pagamento, e por isso
 * não podem ser debitados de novo ao serem pagos.
 */
const DEBIT_ON_PAYMENT_SINCE = new Date('2026-08-06T23:55:00.000Z');

/** Status em que o pedido segura estoque, no modelo novo. */
const DEBITED_STATUSES = new Set(['pago', 'enviado']);

interface StockItem {
  productId: string;
  productName: string;
  color: string;
  size: string;
  quantity: number;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function generateOrderNumber(): string {
  return `NE${Math.floor(100000 + Math.random() * 900000)}`;
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

/** "2026-08-06" vira 2026-08-07T00:00 (limite exclusivo, cobre o dia todo);
 * uma data com hora é usada como veio. */
function endOfDayIfDateOnly(value: string): Date {
  const date = new Date(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return date;
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly asaas: AsaasService,
    private readonly coupons: CouponsService,
    private readonly settings: SettingsService,
    private readonly emailService: EmailService,
    private readonly abandonedCart: AbandonedCartService
  ) {}

  findAll(query: FindOrdersQueryDto = {}) {
    const createdAt: Prisma.DateTimeFilter = {};
    if (query.from) createdAt.gte = new Date(query.from);
    // Data sem hora ("2026-08-06") vira o dia inteiro: filtra até o fim dele.
    if (query.to) createdAt.lt = endOfDayIfDateOnly(query.to);

    const q = query.q?.trim();

    return this.prisma.order.findMany({
      where: {
        ...(query.status ? { status: query.status } : {}),
        ...(query.from || query.to ? { createdAt } : {}),
        ...(q
          ? {
              OR: [
                { orderNumber: { contains: q, mode: 'insensitive' } },
                { customerName: { contains: q, mode: 'insensitive' } },
                { customerEmail: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
      ...(query.limit ? { take: query.limit } : {}),
    });
  }

  /**
   * Movimenta o estoque das variações de um pedido. 'saida' é a venda, 'entrada'
   * é a devolução (cancelamento ou exclusão do pedido).
   *
   * A saída usa update condicional (`stock >= quantity`): se duas compras
   * simultâneas disputarem a última peça, só uma consegue baixar e a outra
   * recebe erro em vez de deixar o estoque negativo.
   */
  private async moveStock(
    tx: Prisma.TransactionClient,
    items: StockItem[],
    direction: 'saida' | 'entrada'
  ) {
    for (const item of items) {
      const variant = await tx.productVariant.findFirst({
        where: { productId: item.productId, color: item.color, size: item.size },
        select: { id: true },
      });
      // Sem variação correspondente (produto apagado, cor/tamanho renomeado) não
      // há o que movimentar — e isso não é motivo para derrubar a venda.
      if (!variant) continue;

      if (direction === 'entrada') {
        await tx.productVariant.update({
          where: { id: variant.id },
          data: { stock: { increment: item.quantity } },
        });
        continue;
      }

      const { count } = await tx.productVariant.updateMany({
        where: { id: variant.id, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity } },
      });
      if (count === 0) {
        throw new ConflictException(
          `Estoque insuficiente para ${item.productName} (${item.color}/${item.size}).`
        );
      }
    }
  }

  private tracksStock(order: { createdAt: Date }): boolean {
    return order.createdAt.getTime() >= STOCK_TRACKED_SINCE.getTime();
  }

  /** O pedido segura estoque neste status? */
  private holdsStock(order: { createdAt: Date }, status: string): boolean {
    if (!this.tracksStock(order)) return false;
    // Janela da versão que debitava na criação: segura estoque até ser cancelado.
    if (order.createdAt.getTime() < DEBIT_ON_PAYMENT_SINCE.getTime()) {
      return status !== 'cancelado';
    }
    return DEBITED_STATUSES.has(status);
  }

  /** Ajusta o estoque quando a mudança de status muda quem segura a peça. */
  private async syncStock(
    tx: Prisma.TransactionClient,
    order: { createdAt: Date; status: string; items: StockItem[] },
    nextStatus: string
  ) {
    const before = this.holdsStock(order, order.status);
    const after = this.holdsStock(order, nextStatus);
    if (before === after) return;
    await this.moveStock(tx, order.items, after ? 'saida' : 'entrada');
  }

  /**
   * Confere disponibilidade sem escrever nada e devolve os itens já com o preço
   * do catálogo. A conferência é só um aviso antecipado: a baixa de verdade
   * acontece no pagamento.
   */
  private async priceItems(tx: Prisma.TransactionClient, items: CreateOrderDto['items']) {
    const priced: {
      productId: string;
      productName: string;
      size: string;
      color: string;
      quantity: number;
      unitPrice: number;
    }[] = [];

    for (const item of items) {
      const variant = await tx.productVariant.findFirst({
        where: { productId: item.productId, color: item.color, size: item.size },
        select: {
          stock: true,
          price: true,
          product: { select: { name: true, price: true, compareAtPrice: true, active: true } },
        },
      });

      if (!variant) {
        // Sem variação correspondente, o preço do produto vale — e não há
        // estoque a conferir.
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          select: { name: true, price: true, active: true },
        });
        if (!product || !product.active) {
          throw new BadRequestException(`Produto indisponível: ${item.productName}`);
        }
        priced.push({
          productId: item.productId,
          productName: product.name,
          size: item.size,
          color: item.color,
          quantity: item.quantity,
          unitPrice: product.price,
        });
        continue;
      }

      if (!variant.product.active) {
        throw new BadRequestException(`Produto indisponível: ${variant.product.name}`);
      }
      if (variant.stock < item.quantity) {
        throw new ConflictException(
          `Estoque insuficiente para ${variant.product.name} (${item.color}/${item.size}).`
        );
      }

      priced.push({
        productId: item.productId,
        productName: variant.product.name,
        size: item.size,
        color: item.color,
        quantity: item.quantity,
        // Mesma função que o catálogo usa: em promoção vale o preço promocional
        // do produto; fora dela, o preço da variação quando existe.
        unitPrice: effectivePrice(variant.product, variant.price),
      });
    }

    return priced;
  }

  /**
   * Desconto do pedido, calculado aqui e não aceito do cliente.
   *
   * O progressivo (por quantidade de peças) e o cupom **não se somam**: vale o
   * maior dos dois. Somar os dois abriria a porta para 30% + cupom, o que come
   * a margem sem ninguém decidir por isso.
   */
  private async resolveDiscount(
    code: string | undefined,
    subtotal: number,
    items: { quantity: number }[]
  ): Promise<number> {
    const settings = await this.settings.get().catch(() => null);
    const tiers = parseTiers(settings?.progressiveDiscount);
    const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
    const percent = discountPercentFor(totalItems, tiers);
    const progressive = round2((subtotal * percent) / 100);

    let coupon = 0;
    let couponCode: string | null = null;
    if (code?.trim()) {
      const result = await this.coupons.validate({ code, orderTotal: subtotal });
      if ('discountAmount' in result && result.valid) {
        coupon = round2(Math.min(subtotal, result.discountAmount));
        couponCode = result.code;
      }
    }

    // Só conta uso quando o cupom foi de fato o desconto aplicado. Sem isto o
    // `usageLimit` era decorativo: o mesmo cupom rodava infinitas vezes.
    if (couponCode && coupon > 0 && coupon >= progressive) {
      await this.prisma.coupon
        .update({ where: { code: couponCode }, data: { usageCount: { increment: 1 } } })
        .catch(() => undefined);
    }

    return Math.min(subtotal, Math.max(progressive, coupon));
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: { items: true } });
    if (!order) throw new NotFoundException('Pedido não encontrado');
    return order;
  }

  /** `remoteIp` é o IP de quem está comprando — o Asaas exige no cartão. */
  async create(dto: CreateOrderDto, remoteIp?: string) {
    const customer = await this.prisma.customer.upsert({
      where: { email: dto.customerEmail },
      update: {
        name: dto.customerName,
        phone: onlyDigits(dto.customerPhone) || undefined,
        documentNumber: onlyDigits(dto.customerDocument) || undefined,
        city: dto.city || undefined,
        zipCode: dto.zipCode || undefined,
        street: dto.street || undefined,
        number: dto.number || undefined,
        complement: dto.complement || undefined,
      },
      create: {
        name: dto.customerName,
        email: dto.customerEmail,
        phone: onlyDigits(dto.customerPhone),
        documentNumber: onlyDigits(dto.customerDocument),
        city: dto.city,
        zipCode: dto.zipCode,
        street: dto.street,
        number: dto.number,
        complement: dto.complement,
      },
    });

    const order = await this.prisma.$transaction(async (tx) => {
      // Preço vem do catálogo, nunca do corpo da requisição: `POST /orders` é
      // público, então aceitar `unitPrice`/`total` do cliente deixaria qualquer
      // pessoa comprar qualquer peça pelo valor que quisesse.
      const items = await this.priceItems(tx, dto.items);
      const subtotal = round2(items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0));
      const discount = await this.resolveDiscount(dto.couponCode, subtotal, items);
      // O frete é o único valor que legitimamente vem do cliente (é a cotação
      // que ele escolheu no checkout); aqui só se garante que não é negativo.
      const shipping = Math.max(0, dto.shipping ?? 0);
      const total = round2(Math.max(0, subtotal + shipping - discount));

      return tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          customerId: customer.id,
          customerName: dto.customerName,
          customerEmail: dto.customerEmail,
          customerPhone: dto.customerPhone,
          customerDocument: onlyDigits(dto.customerDocument),
          zipCode: dto.zipCode,
          city: dto.city,
          street: dto.street,
          number: dto.number,
          complement: dto.complement,
          subtotal,
          shipping,
          discount,
          couponCode: discount > 0 ? dto.couponCode : null,
          total,
          paymentMethod: dto.paymentMethod,
          items: { create: items },
        },
        include: { items: true },
      });
    }, { timeout: 15000 });

    await this.abandonedCart.markRecovered(dto.customerEmail);

    const payingWithCard = dto.paymentMethod === 'cartao' && Boolean(dto.creditCard);

    if (!this.asaas.isConfigured()) {
      await this.emailService.sendOrderConfirmed(order);
      return {
        order,
        paymentUrl: null,
        paymentWarning:
          'Pagamento online ainda não configurado. Entraremos em contato para combinar o pagamento.',
      };
    }

    try {
      const customer = await this.asaas.createCustomer({
        name: dto.customerName,
        cpfCnpj: onlyDigits(dto.customerDocument),
        email: dto.customerEmail,
        mobilePhone: onlyDigits(dto.customerPhone),
      });

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + PAYMENT_DUE_DAYS);

      const payment = await this.asaas.createPayment({
        customer: customer.id,
        billingType: BILLING_TYPE[dto.paymentMethod],
        // Valor cobrado é o calculado pelo servidor, não o que o cliente mandou.
        value: order.total,
        dueDate: dueDate.toISOString().slice(0, 10),
        description: `Pedido ${order.orderNumber}`,
        externalReference: order.id,
        // Parcelamento: a loja anuncia 3x, então precisa pedir ao Asaas.
        ...(dto.paymentMethod === 'cartao' && dto.installmentCount && dto.installmentCount > 1
          ? { installmentCount: dto.installmentCount, totalValue: order.total }
          : {}),
        // Checkout transparente. Estes campos não são gravados em lugar nenhum.
        ...(payingWithCard
          ? {
              creditCard: dto.creditCard,
              creditCardHolderInfo: {
                name: dto.customerName,
                email: dto.customerEmail,
                cpfCnpj: onlyDigits(dto.customerDocument),
                postalCode: onlyDigits(dto.zipCode),
                addressNumber: dto.number,
                mobilePhone: onlyDigits(dto.customerPhone),
              },
              remoteIp,
            }
          : {}),
      });

      const paidNow = ASAAS_PAID_STATUSES.has(payment.status);

      const updated = await this.prisma.$transaction(async (tx) => {
        // Cartão aprovado na hora já sai do estoque: não faz sentido esperar o
        // webhook para um pagamento que a resposta já confirmou.
        if (paidNow) await this.syncStock(tx, order, 'pago');
        return tx.order.update({
          where: { id: order.id },
          data: {
            asaasCustomerId: customer.id,
            asaasPaymentId: payment.id,
            asaasInvoiceUrl: payment.invoiceUrl,
            ...(paidNow ? { status: 'pago' } : {}),
          },
          include: { items: true },
        });
      });

      // Um e-mail só. Quando o cartão é aprovado na hora, a confirmação já
      // avisa que o pagamento passou — mandar "pagamento aprovado" em seguida
      // seria a segunda mensagem quase idêntica em segundos.
      await this.emailService.sendOrderConfirmed(updated, { paid: paidNow });

      // Pix: traz o QR Code para a loja exibir na própria tela de confirmação,
      // em vez de mandar o cliente para a fatura do Asaas. Se falhar, o link
      // continua valendo — não é motivo para derrubar a compra.
      let pix: { encodedImage: string; payload: string; expirationDate?: string } | null = null;
      if (dto.paymentMethod === 'pix' && !paidNow) {
        try {
          pix = await this.asaas.getPixQrCode(payment.id);
        } catch {
          pix = null;
        }
      }

      return {
        order: updated,
        paymentUrl: payment.invoiceUrl,
        paid: paidNow,
        pix,
        paymentWarning: null,
      };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Não foi possível processar o pagamento agora.';

      // Cartão recusado: o pedido não pode ficar pendurado como se fosse acontecer.
      // Cancela e devolve o motivo para o cliente tentar de novo.
      if (payingWithCard) {
        await this.prisma.order.update({
          where: { id: order.id },
          data: { status: 'cancelado' },
        });
        throw new BadRequestException(message);
      }

      // Pix/boleto: o pedido vale, só o link falhou. Avisa sem derrubar a compra.
      await this.emailService.sendOrderConfirmed(order);
      return { order, paymentUrl: null, paid: false, paymentWarning: message };
    }
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto) {
    const current = await this.findOne(id);

    const updated = await this.prisma.$transaction(async (tx) => {
      // Marcar como pago tira do estoque; cancelar devolve.
      await this.syncStock(tx, current, dto.status);

      return tx.order.update({
        where: { id },
        data: {
          status: dto.status,
          ...(dto.status === 'enviado'
            ? { shippedAt: new Date(), trackingCode: dto.trackingCode }
            : {}),
        },
        include: { items: true },
      });
    });

    if (dto.status === 'enviado') {
      await this.emailService.sendOrderShipped(updated);
    }

    return updated;
  }

  async markPaidByAsaasPaymentId(asaasPaymentId: string) {
    const order = await this.prisma.order.findFirst({
      where: { asaasPaymentId },
      include: { items: true },
    });
    if (!order || order.status === 'pago') return order;

    const updated = await this.prisma.$transaction(async (tx) => {
      // É aqui que a peça sai do estoque de verdade.
      await this.syncStock(tx, order, 'pago');
      return tx.order.update({
        where: { id: order.id },
        data: { status: 'pago' },
        include: { items: true },
      });
    });
    await this.emailService.sendPaymentApproved(updated);
    return updated;
  }

  async markCancelledByAsaasPaymentId(asaasPaymentId: string) {
    const order = await this.prisma.order.findFirst({
      where: { asaasPaymentId },
      include: { items: true },
    });
    if (!order || order.status === 'cancelado') return order;

    return this.prisma.$transaction(async (tx) => {
      await this.syncStock(tx, order, 'cancelado');
      return tx.order.update({ where: { id: order.id }, data: { status: 'cancelado' } });
    });
  }

  async remove(id: string) {
    const order = await this.findOne(id);

    await this.prisma.$transaction(async (tx) => {
      // Apagar um pedido equivale a cancelá-lo: se ele segurava peça, devolve.
      await this.syncStock(tx, order, 'cancelado');
      await tx.orderItem.deleteMany({ where: { orderId: id } });
      await tx.order.delete({ where: { id } });
    });

    return { deleted: true };
  }
}
