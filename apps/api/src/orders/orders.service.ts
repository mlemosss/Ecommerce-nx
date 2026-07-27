import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AsaasService } from '../asaas/asaas.service';
import { EmailService } from '../email/email.service';
import { AbandonedCartService } from '../abandoned-cart/abandoned-cart.service';
import { CreateOrderDto, UpdateOrderStatusDto } from './dto/order.dto';

const BILLING_TYPE: Record<CreateOrderDto['paymentMethod'], 'PIX' | 'CREDIT_CARD' | 'BOLETO'> = {
  pix: 'PIX',
  cartao: 'CREDIT_CARD',
  boleto: 'BOLETO',
};

const PAYMENT_DUE_DAYS = 3;

function generateOrderNumber(): string {
  return `NE${Math.floor(100000 + Math.random() * 900000)}`;
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly asaas: AsaasService,
    private readonly emailService: EmailService,
    private readonly abandonedCart: AbandonedCartService
  ) {}

  findAll() {
    return this.prisma.order.findMany({
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
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

    const order = await this.prisma.order.create({
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
    await this.findOne(id);
    const updated = await this.prisma.order.update({
      where: { id },
      data: {
        status: dto.status,
        ...(dto.status === 'enviado' ? { shippedAt: new Date(), trackingCode: dto.trackingCode } : {}),
      },
      include: { items: true },
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
    const order = await this.prisma.order.findFirst({ where: { asaasPaymentId } });
    if (!order) return null;
    return this.prisma.order.update({ where: { id: order.id }, data: { status: 'cancelado' } });
  }
}
