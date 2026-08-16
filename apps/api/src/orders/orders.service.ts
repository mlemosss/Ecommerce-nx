import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ASAAS_PAID_STATUSES, AsaasService } from '../asaas/asaas.service';
import { CouponsService } from '../coupons/coupons.service';
import { EmailService } from '../email/email.service';
import { AbandonedCartService } from '../abandoned-cart/abandoned-cart.service';
import { effectivePrice } from '../products/pricing';
import { discountPercentFor, parseTiers } from '../products/progressive-discount';
import { SettingsService } from '../settings/settings.service';
import { ShippingService } from '../shipping/shipping.service';
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

/**
 * Token do link de avaliação. 32 caracteres hexadecimais de `randomUUID`, que é
 * criptograficamente aleatório — `Math.random` não serve aqui, porque quem
 * adivinhasse um token conseguiria escrever avaliação em pedido alheio.
 */
function generateReviewToken(): string {
  return randomUUID().replace(/-/g, '');
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
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly asaas: AsaasService,
    private readonly coupons: CouponsService,
    private readonly settings: SettingsService,
    private readonly shipping: ShippingService,
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

  /**
   * Ajusta o uso do cupom quando a mudança de status muda se o pedido vale.
   *
   * A janela é a mesma do estoque (`pago`/`enviado`): enquanto o pedido segura
   * a peça, ele também consome um uso do cupom. Antes o uso era contado na
   * criação do pedido e nunca devolvido — e `POST /orders` é público, então
   * qualquer pessoa queimava o `usageLimit` de um cupom criando pedidos que
   * nunca pagaria, sem precisar de token nenhum. Um cupom de 50 usos morria em
   * minutos com 3 vendas reais.
   *
   * Os três caminhos que mexem em status (webhook de pagamento, webhook de
   * cancelamento e a tela do admin) passam por aqui, para não divergirem.
   */
  private async syncCouponUsage(
    tx: Prisma.TransactionClient,
    order: { couponCode: string | null; status: string },
    nextStatus: string
  ) {
    if (!order.couponCode) return;

    const before = DEBITED_STATUSES.has(order.status);
    const after = DEBITED_STATUSES.has(nextStatus);
    if (before === after) return;

    await tx.coupon.updateMany({
      // Na devolução, o `gt: 0` evita contagem negativa se algo já tiver
      // zerado o contador por fora.
      where: after ? { code: order.couponCode } : { code: order.couponCode, usageCount: { gt: 0 } },
      data: after ? { usageCount: { increment: 1 } } : { usageCount: { decrement: 1 } },
    });
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
        // Variação que não existe é recusada, não cobrada.
        //
        // Antes isto caía num fallback que cobrava o preço do produto e seguia
        // sem conferir estoque. Como a vitrine oferecia o produto cartesiano
        // cor × tamanho, 47 das 97 combinações do catálogo não existiam — e
        // cada uma virava pedido pago de uma peça que a loja não tem. O
        // `moveStock` depois também pulava o item, então nem no estoque
        // aparecia.
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          select: { name: true, active: true },
        });
        throw new BadRequestException(
          !product || !product.active
            ? `Produto indisponível: ${item.productName}`
            : `${product.name} não está disponível em ${item.color} / ${item.size}. ` +
              'Escolha outra cor ou tamanho.'
        );
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
   * Confere o frete que veio do checkout contra uma cotação nova.
   *
   * O valor chega do cliente porque é a transportadora que ele escolheu. Aceitar
   * sem conferir deixava forçar frete zero. A regra: acima do valor de frete
   * grátis, zero; senão, o valor só passa se bater com alguma opção cotada
   * agora — caso contrário vale a mais barata.
   *
   * Se a cotação falhar (token vencido, transportadora fora do ar), aceita o que
   * veio: serviço externo indisponível não pode impedir a venda.
   */
  private async resolveShipping(
    dto: CreateOrderDto,
    subtotal: number,
    items: { quantity: number; unitPrice: number; productId: string }[]
  ): Promise<number> {
    const informed = Math.max(0, dto.shipping ?? 0);

    const settings = await this.settings.get().catch(() => null);
    if (settings && subtotal >= settings.freeShippingThreshold) return 0;

    try {
      const products = await this.prisma.product.findMany({
        where: { id: { in: items.map((i) => i.productId) } },
        select: { id: true, category: true },
      });
      const categoryOf = new Map(products.map((p) => [p.id, p.category]));

      const quote = await this.shipping.quote({
        toZipCode: dto.zipCode,
        subtotal,
        items: items.map((item) => ({
          category: categoryOf.get(item.productId),
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      });

      if (!quote.configured || quote.options.length === 0) return informed;

      const matches = quote.options.some((option) => Math.abs(option.price - informed) < 0.01);
      if (matches) return informed;

      const cheapest = Math.min(...quote.options.map((o) => o.price));
      this.logger.warn(
        `Frete informado (${informed}) não bate com nenhuma cotação; aplicando a mais barata (${cheapest}).`
      );
      return round2(cheapest);
    } catch {
      return informed;
    }
  }

  /**
   * Desconto do pedido, calculado aqui e não aceito do cliente.
   *
   * O progressivo (por quantidade de peças) e o cupom **não se somam**: vale o
   * maior dos dois. Somar os dois abriria a porta para 30% + cupom, o que come
   * a margem sem ninguém decidir por isso.
   */
  /**
   * Desconto do pedido e qual cupom, se algum, foi de fato o aplicado.
   *
   * Progressivo e cupom não somam: vale o maior dos dois. O `appliedCoupon` só
   * vem preenchido quando o cupom ganhou — antes o pedido gravava o código
   * digitado sempre que houvesse qualquer desconto, então um cupom expirado
   * aparecia como aplicado num pedido cujo desconto veio da faixa de peças, e
   * qualquer relatório de eficácia de cupom ficava inutilizável.
   *
   * Não conta uso aqui. `POST /orders` é público: contar na criação deixava
   * qualquer pessoa queimar o `usageLimit` criando pedidos que nunca pagaria.
   * O uso é contado no pagamento, em `markPaidByAsaasPaymentId`.
   */
  private async resolveDiscount(
    code: string | undefined,
    subtotal: number,
    items: { quantity: number }[],
    customerDocument?: string
  ): Promise<{ discount: number; appliedCoupon: string | null }> {
    const settings = await this.settings.get().catch(() => null);
    const tiers = parseTiers(settings?.progressiveDiscount);
    const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
    const percent = discountPercentFor(totalItems, tiers);
    const progressive = round2((subtotal * percent) / 100);

    let coupon = 0;
    let couponCode: string | null = null;
    if (code?.trim()) {
      // O CPF vai junto: cupom de primeira compra é conferido aqui, no
      // servidor, e não só na tela. Sem isto bastava um POST direto para
      // aplicar o desconto de estreia em todo pedido.
      const result = await this.coupons.validate({
        code,
        orderTotal: subtotal,
        customerDocument,
      });
      if ('discountAmount' in result && result.valid) {
        coupon = round2(Math.min(subtotal, result.discountAmount));
        couponCode = result.code;
      }
    }

    const couponWins = Boolean(couponCode) && coupon > 0 && coupon >= progressive;
    return {
      discount: Math.min(subtotal, Math.max(progressive, coupon)),
      appliedCoupon: couponWins ? couponCode : null,
    };
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
      const { discount, appliedCoupon } = await this.resolveDiscount(
        dto.couponCode,
        subtotal,
        items,
        dto.customerDocument
      );
      const shipping = await this.resolveShipping(dto, subtotal, items);
      const total = round2(Math.max(0, subtotal + shipping - discount));

      return tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          reviewToken: generateReviewToken(),
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
          // Só o cupom que de fato venceu o progressivo. Gravar `dto.couponCode`
          // sempre que houvesse desconto registrava cupom expirado como aplicado.
          couponCode: appliedCoupon,
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
      await this.emailService.sendOrderAwaitingPayment(order);
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

      // "Pedido confirmado" só sai quando existe pagamento. Enquanto não há, o
      // e-mail é o de cobrança, com o caminho para pagar — dizer "confirmado"
      // sem um centavo pago fazia a cliente achar que tinha terminado e a
      // lojista achar que tinha vendido.
      if (paidNow) {
        await this.emailService.sendOrderConfirmed(updated, { paid: true });
      } else {
        await this.emailService.sendOrderAwaitingPayment(updated);
      }

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

      // Pix/boleto: o pedido vale, só o link falhou. Avisa sem derrubar a
      // compra — e manda para Meus Pedidos, onde a segunda via é gerada na
      // hora em que a pessoa abrir.
      await this.emailService.sendOrderAwaitingPayment(order);
      return { order, paymentUrl: null, paid: false, paymentWarning: message };
    }
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto) {
    const current = await this.findOne(id);

    const updated = await this.prisma.$transaction(async (tx) => {
      // Marcar como pago tira do estoque e conta o cupom; cancelar devolve os
      // dois. Passa pelos mesmos helpers do webhook para não divergirem.
      await this.syncStock(tx, current, dto.status);
      await this.syncCouponUsage(tx, current, dto.status);

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

  /**
   * Confirma o pagamento: baixa o estoque, conta o uso do cupom e avisa o
   * cliente.
   *
   * A trava de idempotência é o `updateMany` condicional, não o `if` acima
   * dele. O Asaas dispara `PAYMENT_CONFIRMED` e `PAYMENT_RECEIVED` — no Pix
   * quase juntos —, e em serverless os dois POSTs caem em instâncias
   * diferentes: as duas liam "aguardando_pagamento" e as duas baixavam
   * estoque. Com o update condicional, só a primeira encontra o pedido no
   * status anterior; a segunda vê `count === 0` e desiste sem efeito nenhum.
   */
  /**
   * Garante que um pedido em aberto tenha cobrança no Asaas, criando uma se
   * faltar.
   *
   * Um pedido chega aqui sem cobrança por dois caminhos, os dois de propósito:
   * a loja rodou sem `ASAAS_API_KEY`, ou a chamada ao Asaas falhou no checkout
   * e o pedido foi mantido — no Pix e no boleto a compra vale, só o link
   * falhou. O que faltava era a volta: o cliente abria "Pagar este pedido" e
   * não havia nada para mostrar.
   *
   * A segunda via sai como UNDEFINED: os dados do cartão não são guardados em
   * lugar nenhum, então não dá para repetir a forma original — e a fatura do
   * Asaas com tipo indefinido é justamente a tela onde a pessoa escolhe entre
   * Pix, boleto e cartão.
   *
   * Falha do Asaas não é erro para quem pediu: devolve o pedido como está e
   * quem chamou mostra o caminho do WhatsApp.
   */
  /**
   * Token do link de avaliação, criando um se o pedido ainda não tiver.
   *
   * O token passou a ser gerado no checkout, mas nenhum pedido anterior a isso
   * ganhou o seu — e no painel o botão "Copiar link de avaliação" só existia
   * quando o campo estava preenchido. Resultado: justamente as primeiras
   * clientes, as que já receberam a peça e teriam o que dizer, eram as que a
   * lojista não conseguia convidar.
   *
   * Criar sob demanda também evita ter que mexer no banco de produção para
   * corrigir pedidos antigos.
   */
  async ensureReviewToken(orderId: string): Promise<{ reviewToken: string }> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, reviewToken: true },
    });
    if (!order) throw new NotFoundException('Pedido não encontrado');
    if (order.reviewToken) return { reviewToken: order.reviewToken };

    const updated = await this.prisma.order.update({
      where: { id: order.id },
      data: { reviewToken: generateReviewToken() },
      select: { reviewToken: true },
    });
    return { reviewToken: updated.reviewToken as string };
  }

  async ensureOpenPayment(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Pedido não encontrado');

    const semCobranca = !order.asaasPaymentId;
    if (order.status !== 'aguardando_pagamento' || !semCobranca) return order;
    if (!this.asaas.isConfigured()) {
      this.logger.warn(
        `Pedido ${order.orderNumber} está sem cobrança e o Asaas não está configurado.`
      );
      return order;
    }

    try {
      const asaasCustomerId =
        order.asaasCustomerId ??
        (
          await this.asaas.createCustomer({
            name: order.customerName,
            cpfCnpj: onlyDigits(order.customerDocument),
            email: order.customerEmail,
            mobilePhone: onlyDigits(order.customerPhone),
          })
        ).id;

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + PAYMENT_DUE_DAYS);

      const payment = await this.asaas.createPayment({
        customer: asaasCustomerId,
        billingType: 'UNDEFINED',
        value: order.total,
        dueDate: dueDate.toISOString().slice(0, 10),
        description: `Pedido ${order.orderNumber}`,
        externalReference: order.id,
      });

      this.logger.log(`Segunda via de cobrança criada para o pedido ${order.orderNumber}.`);

      return this.prisma.order.update({
        where: { id: order.id },
        data: {
          asaasCustomerId,
          asaasPaymentId: payment.id,
          asaasInvoiceUrl: payment.invoiceUrl,
        },
      });
    } catch (err) {
      this.logger.error(
        `Não foi possível criar a segunda via do pedido ${order.orderNumber}: ${err}`
      );
      return order;
    }
  }

  async markPaidByAsaasPaymentId(asaasPaymentId: string) {
    const order = await this.prisma.order.findFirst({
      where: { asaasPaymentId },
      include: { items: true },
    });
    if (!order || order.status === 'pago') return order;

    const updated = await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.order.updateMany({
        where: { id: order.id, status: { not: 'pago' } },
        data: { status: 'pago' },
      });
      // Outro evento do mesmo pagamento chegou primeiro e já fez tudo.
      if (count === 0) return null;

      // É aqui que a peça sai do estoque e o cupom conta de verdade.
      await this.syncStock(tx, order, 'pago');
      await this.syncCouponUsage(tx, order, 'pago');

      return tx.order.findUnique({ where: { id: order.id }, include: { items: true } });
    });

    if (!updated) return order;
    await this.emailService.sendPaymentApproved(updated);
    return updated;
  }

  /**
   * Cancela o pedido a partir de um evento do Asaas e devolve as peças.
   *
   * `expired` marca o vencimento de boleto, que é diferente de estorno e de
   * chargeback: ele só diz que ninguém pagou aquele boleto. Se o pedido já
   * está pago ou enviado, foi pago por outro caminho (Pix, transferência, a
   * lojista marcou na mão) — cancelar aí virava o pedido postado em
   * "cancelado" e devolvia ao estoque uma peça que já saiu de casa.
   */
  async markCancelledByAsaasPaymentId(asaasPaymentId: string, options: { expired?: boolean } = {}) {
    const order = await this.prisma.order.findFirst({
      where: { asaasPaymentId },
      include: { items: true },
    });
    if (!order || order.status === 'cancelado') return order;

    if (options.expired && order.status !== 'aguardando_pagamento') {
      this.logger.warn(
        `Boleto do pedido ${order.orderNumber} venceu, mas ele já está "${order.status}". ` +
          'Cancelamento ignorado: pagamento veio por outro caminho.'
      );
      return order;
    }

    const cancelled = await this.prisma.$transaction(async (tx) => {
      // A peça e o uso do cupom voltam juntos: cancelamento não pode ir
      // secando o cupom com vendas desfeitas.
      await this.syncStock(tx, order, 'cancelado');
      await this.syncCouponUsage(tx, order, 'cancelado');

      return tx.order.update({ where: { id: order.id }, data: { status: 'cancelado' } });
    });

    // Quem gerou boleto e não pagou desistiu por atrito, não por preço: vale
    // um convite de volta. Fora da transação de propósito — falha de e-mail
    // não pode desfazer o cancelamento nem prender o estoque.
    if (options.expired && order.customerEmail) {
      await this.emailService
        .sendBoletoExpired({ ...order, customerEmail: order.customerEmail })
        .catch((err) => this.logger.error(`Falha no e-mail de boleto vencido: ${err}`));
    }

    return cancelled;
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
