import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AsaasService } from '../asaas/asaas.service';
import { EmailService } from '../email/email.service';
import { AbandonedCartService } from '../abandoned-cart/abandoned-cart.service';
import { CreateOrderDto, FindOrdersQueryDto, UpdateOrderStatusDto } from './dto/order.dto';

const BILLING_TYPE: Record<CreateOrderDto['paymentMethod'], 'PIX' | 'CREDIT_CARD' | 'BOLETO'> = {
  pix: 'PIX',
  cartao: 'CREDIT_CARD',
  boleto: 'BOLETO',
};

const PAYMENT_DUE_DAYS = 3;

/**
 * Pedidos criados antes desta data foram gravados por uma versão que não dava
 * baixa no estoque. Devolver estoque ao cancelá-los inventaria peças que nunca
 * saíram, então a movimentação só vale para pedidos daqui em diante.
 */
const STOCK_TRACKED_SINCE = new Date('2026-08-06T00:00:00.000Z');

interface StockItem {
  productId: string;
  productName: string;
  color: string;
  size: string;
  quantity: number;
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

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: { items: true } });
    if (!order) throw new NotFoundException('Pedido não encontrado');
    return order;
  }

  async create(dto: CreateOrderDto) {
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

    // O pedido e a baixa de estoque vão na mesma transação: ou a venda entra com
    // o estoque já debitado, ou não entra.
    const order = await this.prisma.$transaction(async (tx) => {
      await this.moveStock(tx, dto.items, 'saida');

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
          subtotal: dto.subtotal,
          shipping: dto.shipping,
          discount: dto.discount,
          couponCode: dto.couponCode,
          total: dto.total,
          paymentMethod: dto.paymentMethod,
          items: {
            create: dto.items.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              size: item.size,
              color: item.color,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            })),
          },
        },
        include: { items: true },
      });
    }, { timeout: 15000 });

    await this.emailService.sendOrderConfirmed(order);
    await this.abandonedCart.markRecovered(dto.customerEmail);

    if (!this.asaas.isConfigured()) {
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
        value: dto.total,
        dueDate: dueDate.toISOString().slice(0, 10),
        description: `Pedido ${order.orderNumber}`,
        externalReference: order.id,
      });

      const updated = await this.prisma.order.update({
        where: { id: order.id },
        data: {
          asaasCustomerId: customer.id,
          asaasPaymentId: payment.id,
          asaasInvoiceUrl: payment.invoiceUrl,
        },
        include: { items: true },
      });

      return { order: updated, paymentUrl: payment.invoiceUrl, paymentWarning: null };
    } catch (err) {
      // O pedido já foi criado; devolve aviso mas não derruba o checkout do cliente.
      return {
        order,
        paymentUrl: null,
        paymentWarning:
          err instanceof Error ? err.message : 'Não foi possível gerar o link de pagamento agora.',
      };
    }
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto) {
    const current = await this.findOne(id);

    const updated = await this.prisma.$transaction(async (tx) => {
      if (this.tracksStock(current)) {
        // Cancelar devolve as peças; reabrir um pedido cancelado tira de novo.
        if (dto.status === 'cancelado' && current.status !== 'cancelado') {
          await this.moveStock(tx, current.items, 'entrada');
        } else if (current.status === 'cancelado' && dto.status !== 'cancelado') {
          await this.moveStock(tx, current.items, 'saida');
        }
      }

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
    const order = await this.prisma.order.findFirst({ where: { asaasPaymentId } });
    if (!order || order.status === 'pago') return order;
    const updated = await this.prisma.order.update({
      where: { id: order.id },
      data: { status: 'pago' },
      include: { items: true },
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
      if (this.tracksStock(order)) {
        await this.moveStock(tx, order.items, 'entrada');
      }
      return tx.order.update({ where: { id: order.id }, data: { status: 'cancelado' } });
    });
  }

  async remove(id: string) {
    const order = await this.findOne(id);

    await this.prisma.$transaction(async (tx) => {
      // Apagar um pedido que ainda não foi cancelado equivale a cancelá-lo:
      // as peças voltam para o estoque.
      if (this.tracksStock(order) && order.status !== 'cancelado') {
        await this.moveStock(tx, order.items, 'entrada');
      }
      await tx.orderItem.deleteMany({ where: { orderId: id } });
      await tx.order.delete({ where: { id } });
    });

    return { deleted: true };
  }
}
