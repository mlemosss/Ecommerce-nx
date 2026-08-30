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
import { MetaCapiService } from '../meta/meta-capi.service';
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

/**
 * Cobranças que ainda dá para pagar — lista branca, não lista negra.
 *
 * Era o contrário: uma lista de status "mortos", e tudo que não estivesse nela
 * era adotado como segunda via. Lista negra erra para o lado perigoso. Faltava
 * `OVERDUE` (fatura vencida: a cliente clicaria num link morto, e a adoção é
 * definitiva — `ensureOpenPayment` nunca reconsidera) e faltavam os status
 * pagos, o que é pior: o caso que a função existe para resolver é "a criação
 * deu certo e a resposta se perdeu", e o passo seguinte natural é a cliente ter
 * pago aquela cobrança. Adotá-la como pendente mandava quem já pagou para uma
 * fatura de novo.
 *
 * Com lista branca, status desconhecido não é adotado — o pior caso vira uma
 * cobrança a mais, não uma cliente cobrada duas vezes.
 */
const REUSABLE_ASAAS_STATUSES = new Set(['PENDING', 'AWAITING_RISK_ANALYSIS']);

/**
 * O que fazer quando a peça não está mais lá na hora de dar baixa.
 *
 * `recusar` — derruba a operação. É o certo quando ainda dá para desfazer:
 * a lojista marcando um pedido como pago na mão prefere o erro a um estoque
 * que mente.
 *
 * `zerar` — baixa o que houver e segue. É o certo quando o dinheiro **já
 * entrou**. Recusar aí não devolve a peça nem o pagamento: só deixa o pedido
 * preso em "aguardando" com o valor na conta, invisível para as duas partes.
 */
type FaltaDeEstoque = 'recusar' | 'zerar';

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
    private readonly abandonedCart: AbandonedCartService,
    private readonly metaCapi: MetaCapiService
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
   * simultâneas disputarem a última peça, só uma consegue baixar. O que
   * acontece com a outra depende de `quandoFalta`.
   */
  private async moveStock(
    tx: Prisma.TransactionClient,
    items: StockItem[],
    direction: 'saida' | 'entrada',
    quandoFalta: FaltaDeEstoque = 'recusar'
  ) {
    for (const item of items) {
      const variant = await tx.productVariant.findFirst({
        where: { productId: item.productId, color: item.color, size: item.size },
        select: { id: true, stock: true },
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
      if (count > 0) continue;

      if (quandoFalta === 'recusar') {
        throw new ConflictException(
          `Estoque insuficiente para ${item.productName} (${item.color}/${item.size}).`
        );
      }

      // Venda acima do estoque. Debita a quantidade INTEIRA, deixando o saldo
      // negativo, e grita no log.
      //
      // Zerar em vez de negativar parecia mais limpo e não era: a devolução
      // (cancelamento, estorno, exclusão do pedido) credita `item.quantity`
      // cheio. Estoque 1, pedido pago de 3: zerava, e o estorno devolvia 3 —
      // a loja passava a anunciar 3 peças que não existem, cada uma capaz de
      // repetir o mesmo caminho. O erro se multiplicava a cada estorno.
      //
      // Negativo é assimetria nenhuma e, de quebra, é o aviso mais honesto que
      // existe: "-2" no painel quer dizer duas peças devendo.
      await tx.productVariant.update({
        where: { id: variant.id },
        data: { stock: { decrement: item.quantity } },
      });
      this.logger.error(
        `VENDA ACIMA DO ESTOQUE: ${item.productName} (${item.color}/${item.size}) — ` +
          `pagas ${item.quantity}, havia ${variant.stock}. ` +
          `Faltam ${item.quantity - variant.stock} peças para entregar este pedido.`
      );
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
    nextStatus: string,
    quandoFalta: FaltaDeEstoque = 'recusar'
  ) {
    const before = this.holdsStock(order, order.status);
    const after = this.holdsStock(order, nextStatus);
    if (before === after) return;
    await this.moveStock(tx, order.items, after ? 'saida' : 'entrada', quandoFalta);
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

    /**
     * Retirada não tem frete, e precisa sair antes da cotação.
     *
     * Sem esta linha o pedido de retirada seria cobrado: o valor informado é
     * zero, zero não bate com nenhuma opção da transportadora, e a regra
     * abaixo aplicaria "a mais barata da cotação" — exatamente a proteção
     * contra frete forjado, disparando contra a cliente que escolheu buscar a
     * peça em mãos.
     */
    if (dto.pickup) return 0;

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
        neighborhood: dto.neighborhood || undefined,
        state: dto.state || undefined,
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
        neighborhood: dto.neighborhood,
        state: dto.state,
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
          // Sem bairro e UF não se emite etiqueta dos Correios. Ficam no
          // pedido, e não só no cadastro: o endereço de quem comprou é o do
          // dia da compra, e o cadastro muda quando a pessoa se muda.
          neighborhood: dto.neighborhood,
          state: dto.state,
          shippingServiceId: dto.shippingServiceId,
          shippingServiceName: dto.shippingServiceName,
          trackingConsent: dto.trackingConsent === true,
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
          pickup: dto.pickup ?? false,
          metaFbp: dto.metaFbp,
          metaFbc: dto.metaFbc,
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

    /**
     * Existe cobrança no Asaas? A pergunta que decide se dá para cancelar.
     *
     * Não dá para responder pelo banco: se for justamente a gravação que
     * falhar, `asaasPaymentId` continua nulo e o cancelamento dispararia com o
     * cartão já cobrado. Esta variável guarda o fato — a chamada voltou com um
     * id —, que é o que realmente importa.
     */
    let cobrancaCriada: string | null = null;

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

      cobrancaCriada = payment.id;

      // A COBRANÇA EXISTE A PARTIR DAQUI. Gravar o vínculo é a primeira coisa
      // que se faz, sozinha, antes de estoque, cupom ou e-mail.
      //
      // Antes tudo isso vivia numa transação só: se a baixa de estoque
      // falhasse, ela levava junto o `asaasPaymentId`, e o pagamento ficava
      // órfão — cobrado no cartão do cliente, sem nenhum pedido apontando para
      // ele. Nem o webhook achava depois.
      const comCobranca = await this.prisma.order.update({
        where: { id: order.id },
        data: {
          asaasCustomerId: customer.id,
          asaasPaymentId: payment.id,
          asaasInvoiceUrl: payment.invoiceUrl,
        },
        include: { items: true },
      });

      const paidNow = ASAAS_PAID_STATUSES.has(payment.status);
      let updated = comCobranca;

      if (paidNow) {
        try {
          updated = await this.prisma.$transaction(async (tx) => {
            // O MESMO updateMany condicional do webhook, e não um update
            // direto.
            //
            // Gravar `asaasPaymentId` antes desta transação conserta o
            // pagamento órfão, mas abre uma porta: o pedido passa a ser
            // encontrável pelo webhook enquanto esta transação ainda roda. No
            // cartão o `PAYMENT_CONFIRMED` chega na hora, cai em outra
            // instância, e as duas baixavam estoque e contavam cupom — uma
            // venda, duas saídas, `usageCount` +2. Pior: com `zerar` a segunda
            // baixa nem dá erro, zera a variação e registra "VENDA ACIMA DO
            // ESTOQUE" para uma venda que não existiu.
            //
            // Quem encontrar o pedido fora de "pago" primeiro faz o trabalho;
            // o outro vê `count === 0` e sai sem efeito.
            const { count } = await tx.order.updateMany({
              where: { id: order.id, status: { not: 'pago' } },
              data: { status: 'pago' },
            });

            if (count > 0) {
              // Cartão aprovado na hora já sai do estoque: não faz sentido
              // esperar o webhook para um pagamento que a resposta já
              // confirmou. `zerar`: o dinheiro entrou, e recusar não o devolve.
              await this.syncStock(tx, comCobranca, 'pago', 'zerar');
              // O cupom era contado só no webhook, e o webhook desiste de um
              // pedido que já está pago — então compra no cartão aprovada na
              // hora nunca gastava uso nenhum do cupom.
              await this.syncCouponUsage(tx, comCobranca, 'pago');
            }

            return tx.order.findUniqueOrThrow({
              where: { id: order.id },
              include: { items: true },
            });
          });
        } catch (err) {
          // Pagamento aprovado e escrituração falhou. O pedido NÃO é
          // cancelado: o dinheiro está na conta. Fica em "aguardando" e o
          // webhook do Asaas, que chega em seguida, refaz a baixa.
          this.logger.error(
            `Pedido ${order.orderNumber}: pagamento aprovado, mas a baixa falhou. ` +
              `O webhook deve corrigir. Erro: ${err}`
          );
        }
      }

      // DAQUI PARA BAIXO NADA PODE DERRUBAR A COMPRA.
      //
      // E-mail e QR Code são acessórios de uma compra que já aconteceu: o
      // dinheiro está na conta e o pedido está gravado. Estavam dentro do
      // `try` de fora, e uma falha ali — `sendOrderConfirmed` consulta o banco
      // para achar o remetente, e banco serverless pisca — caía no `catch`, que
      // devolvia BadRequest. A loja então dizia "não foi possível finalizar o
      // pedido, tente novamente" com o cartão já cobrado, e o carrinho seguia
      // cheio: a cliente tentava de novo e era cobrada duas vezes.
      try {
        // "Pedido confirmado" só sai quando existe pagamento. Enquanto não há,
        // o e-mail é o de cobrança, com o caminho para pagar — dizer
        // "confirmado" sem um centavo pago fazia a cliente achar que tinha
        // terminado e a lojista achar que tinha vendido.
        if (paidNow) {
          await this.emailService.sendOrderConfirmed(updated, { paid: true });
          // Cartão aprovado na hora: o dinheiro já entrou, então a compra vale
          // para a Meta agora. O webhook chega em seguida e não conta de novo —
          // ele desiste de pedido que já está pago, e o `event_id` é o mesmo
          // número de pedido nos dois caminhos.
          await this.metaCapi.sendPurchase(updated);
        } else {
          await this.emailService.sendOrderAwaitingPayment(updated);
        }
      } catch (err) {
        this.logger.error(`Falha ao enviar o e-mail do pedido ${order.orderNumber}: ${err}`);
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
      //
      // Cancelar SÓ se nenhuma cobrança chegou a existir. Cliente cobrado com
      // o pedido cancelado era o pior desfecho possível — dinheiro fora, peça
      // não reservada, e ninguém sabendo.
      //
      // A trava é `cobrancaCriada`, não o banco: se for a própria gravação do
      // vínculo que falhar, `asaasPaymentId` continua nulo e um `where` por ele
      // cancelaria o pedido cobrado. A variável guarda o fato.
      if (payingWithCard) {
        if (cobrancaCriada) {
          this.logger.error(
            `Pedido ${order.orderNumber} falhou DEPOIS de a cobrança ${cobrancaCriada} existir. ` +
              `NÃO cancelado de propósito — conferir no Asaas se houve captura. Erro: ${err}`
          );
        } else {
          await this.prisma.order.updateMany({
            where: { id: order.id, asaasPaymentId: null },
            data: { status: 'cancelado' },
          });
        }
        throw new BadRequestException(message);
      }

      // Pix/boleto: o pedido vale, só o link falhou. Avisa sem derrubar a
      // compra — e manda para Meus Pedidos, onde a segunda via é gerada na
      // hora em que a pessoa abrir.
      await this.emailService.sendOrderAwaitingPayment(order);
      return { order, paymentUrl: null, paid: false, paymentWarning: message };
    }
  }

  /**
   * Devolve o dinheiro e cancela o pedido, nessa ordem.
   *
   * A ordem e o ponto. Cancelar primeiro e estornar depois deixa a janela em
   * que o pedido consta cancelado, a peca voltou ao estoque, e o dinheiro
   * continua na conta da loja - e ninguem vai atras, porque a tela ja diz
   * cancelado. Estornando primeiro, uma falha para o processo inteiro e o
   * pedido segue pago, que e verdade.
   *
   * Nao aceita pedido ja cancelado nem pedido sem cobranca no Asaas. Pagamento
   * combinado por fora (Pix na mao, dinheiro) nao tem o que estornar aqui: o
   * caminho e cancelar e devolver por onde recebeu.
   */
  /**
   * Só responde se o pedido já foi pago.
   *
   * A tela de confirmação pergunta isso de tempos em tempos enquanto a cliente
   * paga o Pix em outro aplicativo. Uma coluna, um booleano — nada mais sai
   * daqui, porque o endereço é público.
   */
  async isPaid(id: string): Promise<{ pago: boolean }> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      select: { status: true },
    });
    return { pago: order ? DEBITED_STATUSES.has(order.status) : false };
  }

  async refund(id: string) {
    const order = await this.findOne(id);

    if (order.status === 'cancelado') {
      throw new BadRequestException('Este pedido já está cancelado.');
    }
    if (!order.asaasPaymentId) {
      throw new BadRequestException(
        'Este pedido não tem cobrança no Asaas. Cancele e devolva o valor pelo mesmo caminho em que recebeu.'
      );
    }

    // Parcelado no cartão é um parcelamento com uma cobrança por parcela, e o
    // Asaas recusa estornar uma delas sozinha. Descobrir isso antes evita a
    // mensagem "Não é possível estornar individualmente esta cobrança", que não
    // diz o que fazer a seguir.
    const cobranca = await this.asaas.getPayment(order.asaasPaymentId);

    if (cobranca.installment) {
      await this.asaas.refundInstallment(cobranca.installment);
    } else {
      await this.asaas.refundPayment(
        order.asaasPaymentId,
        `Estorno do pedido ${order.orderNumber} — NO EXCUSE`
      );
    }

    // Só depois do dinheiro devolvido: a peça volta ao estoque e o uso do
    // cupom é liberado, pelos mesmos helpers do webhook.
    const cancelado = await this.prisma.$transaction(async (tx) => {
      await this.syncStock(tx, order, 'cancelado');
      await this.syncCouponUsage(tx, order, 'cancelado');
      return tx.order.update({
        where: { id },
        data: { status: 'cancelado' },
        include: { items: true },
      });
    });

    // O e-mail sai depois do estorno confirmado e do pedido fechado. Falhar
    // aqui nao pode desfazer um dinheiro que ja voltou.
    try {
      await this.emailService.sendOrderRefunded(cancelado);
    } catch (erro) {
      this.logger.error(
        `Estorno do pedido ${order.orderNumber} feito, mas o aviso por e-mail falhou: ${erro}`
      );
    }

    this.logger.log(`Pedido ${order.orderNumber} estornado no Asaas e cancelado.`);
    return cancelado;
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto) {
    const current = await this.findOne(id);
    // Só quem realmente moveu o pedido para "pago" avisa a cliente. Comparar
    // com `current.status` não bastava: marcar pago, marcar enviado por engano
    // e voltar para pago mandava o segundo "pagamento aprovado", porque o
    // status anterior era "enviado" e não "pago".
    const virouPago = dto.status === 'pago' && !DEBITED_STATUSES.has(current.status);

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

    // Pagamento fora do Asaas — Pix direto, transferência, combinado no
    // WhatsApp — só existe aqui. Desde que "Pedido confirmado" passou a
    // depender do dinheiro entrar, o webhook virou o único lugar que confirma,
    // e quem pagava por fora ficava com a última mensagem da loja dizendo
    // "falta o pagamento". A cliente pagou e tudo que ela tem diz que não.
    if (virouPago) {
      await this.emailService.sendPaymentApproved(updated);
      await this.metaCapi.sendPurchase(updated);
    }

    return updated;
  }

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

    // Condicional, não `update` direto: dois cliques seguidos gravariam tokens
    // diferentes, e o segundo mataria o link que o primeiro já colou numa
    // conversa de WhatsApp. Quem perde a corrida lê o token do vencedor.
    await this.prisma.order.updateMany({
      where: { id: order.id, reviewToken: null },
      data: { reviewToken: generateReviewToken() },
    });

    const atual = await this.prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      select: { reviewToken: true },
    });
    return { reviewToken: atual.reviewToken as string };
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
      // Primeiro pergunta ao Asaas se já existe cobrança para este pedido.
      //
      // "Sem cobrança" era decidido só pelo nosso banco. Mas o caminho que
      // deixa `asaasPaymentId` nulo é justamente aquele em que a criação deu
      // certo do lado do Asaas e a resposta se perdeu — então criar outra
      // deixava DUAS cobranças vivas para o mesmo pedido. E o Asaas avisa a
      // cliente sobre as duas: ela paga uma, a outra segue de pé, e a que ela
      // pagou pode ser a que o nosso banco não conhece.
      const existentes = await this.asaas
        .listPaymentsByExternalReference(order.id)
        .then((r) => r.data ?? [])
        .catch((err) => {
          // Sem resposta do Asaas seguimos criando, como antes. Fica no log
          // porque é aqui que uma cobrança duplicada pode nascer.
          this.logger.warn(
            `Não deu para consultar cobranças do pedido ${order.orderNumber}: ${err}`
          );
          return [];
        });

      // Cobrança já paga: a criação tinha dado certo, a resposta se perdeu, e a
      // cliente pagou. Vincula e confirma — mandá-la para uma fatura seria
      // pedir o mesmo dinheiro duas vezes.
      const jaPaga = existentes.find((p) => ASAAS_PAID_STATUSES.has(p.status));
      if (jaPaga) {
        this.logger.warn(
          `Pedido ${order.orderNumber} já estava PAGO no Asaas (cobrança ${jaPaga.id}) ` +
            'sem vínculo no banco. Confirmando agora.'
        );
        await this.prisma.order.updateMany({
          where: { id: order.id, asaasPaymentId: null },
          data: { asaasPaymentId: jaPaga.id, asaasInvoiceUrl: jaPaga.invoiceUrl },
        });
        await this.markPaidByAsaasPaymentId(jaPaga.id, order.id);
        return this.prisma.order.findUniqueOrThrow({ where: { id: order.id } });
      }

      const aproveitavel = existentes.find((p) => REUSABLE_ASAAS_STATUSES.has(p.status));

      if (aproveitavel) {
        this.logger.warn(
          `Pedido ${order.orderNumber} já tinha cobrança ${aproveitavel.id} no Asaas ` +
            'sem vínculo no banco. Adotada em vez de criar outra.'
        );
        await this.prisma.order.updateMany({
          where: { id: order.id, asaasPaymentId: null },
          data: { asaasPaymentId: aproveitavel.id, asaasInvoiceUrl: aproveitavel.invoiceUrl },
        });
        return this.prisma.order.findUniqueOrThrow({ where: { id: order.id } });
      }

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

      // Grava só se o pedido continuar sem cobrança.
      //
      // Dois cliques em "Pagar este pedido", ou duas abas, chegam juntos aqui:
      // os dois leem `asaasPaymentId` nulo e os dois criam cobrança. Com um
      // update simples, a segunda sobrescrevia a primeira — e se a cliente
      // tivesse pago a que perdeu, o webhook chegaria com um id que o pedido
      // nao tem mais e o pagamento sumiria. A condição no `where` faz a
      // segunda achar zero linhas e desistir.
      const { count } = await this.prisma.order.updateMany({
        where: { id: order.id, asaasPaymentId: null },
        data: {
          asaasCustomerId,
          asaasPaymentId: payment.id,
          asaasInvoiceUrl: payment.invoiceUrl,
        },
      });

      if (count === 0) {
        // A cobrança recém-criada fica órfã e vence sozinha. É inofensiva: o
        // link dela nunca chegou a sair daqui.
        this.logger.warn(
          `Cobrança concorrente no pedido ${order.orderNumber}. Mantida a que gravou primeiro.`
        );
      } else {
        this.logger.log(`Segunda via de cobrança criada para o pedido ${order.orderNumber}.`);
      }

      return this.prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    } catch (err) {
      this.logger.error(
        `Não foi possível criar a segunda via do pedido ${order.orderNumber}: ${err}`
      );
      return order;
    }
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
  async markPaidByAsaasPaymentId(asaasPaymentId: string, externalReference?: string) {
    // `externalReference` é o id do pedido, que a loja manda ao criar a
    // cobrança. Serve de rede: se a resposta do Asaas se perdeu e o
    // `asaasPaymentId` nunca chegou a ser gravado, o pagamento seria de um
    // pedido que a busca não encontra — dinheiro recebido, pedido eternamente
    // "aguardando". Pelo externalReference ele volta a encontrar o dono, e o
    // id é gravado de uma vez.
    let order = await this.prisma.order.findFirst({
      where: { asaasPaymentId },
      include: { items: true },
    });

    if (!order && externalReference) {
      // Sem `asaasPaymentId: null` no filtro, de propósito. O pedido pode já
      // ter OUTRA cobrança gravada e a cliente ter pago esta — acontece quando
      // a primeira criação se perdeu no caminho e o Asaas avisou a cliente
      // sobre as duas. Exigir vínculo nulo aqui deixava justamente esse
      // pagamento sem dono.
      order = await this.prisma.order.findFirst({
        where: { id: externalReference },
        include: { items: true },
      });
      if (order) {
        this.logger.warn(
          `Pagamento ${asaasPaymentId} chegou sem vínculo; casado com o pedido ` +
            `${order.orderNumber} pelo externalReference` +
            (order.asaasPaymentId
              ? ` (que já tinha a cobrança ${order.asaasPaymentId} — conferir cobrança em duplicidade).`
              : '.')
        );
        await this.prisma.order.updateMany({
          where: { id: order.id, asaasPaymentId: null },
          data: { asaasPaymentId },
        });
      }
    }

    // Evento de pagamento que não casa com pedido nenhum é dinheiro entrando
    // sem destino. Antes saía calado, indistinguível de um evento repetido.
    if (!order) {
      this.logger.error(
        `Pagamento ${asaasPaymentId} confirmado no Asaas e não achou pedido nenhum` +
          `${externalReference ? ` (externalReference: ${externalReference})` : ' (sem externalReference)'}.`
      );
      return null;
    }

    if (order.status === 'pago') return order;

    const updated = await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.order.updateMany({
        where: { id: order.id, status: { not: 'pago' } },
        data: { status: 'pago' },
      });
      // Outro evento do mesmo pagamento chegou primeiro e já fez tudo.
      if (count === 0) return null;

      // É aqui que a peça sai do estoque e o cupom conta de verdade.
      //
      // `zerar`, e não `recusar`: o dinheiro já está na conta. Recusar aqui
      // desfazia a transação inteira, o webhook respondia erro, o Asaas
      // reenviava, e o mesmo erro se repetia — o pedido ficava preso em
      // "aguardando pagamento" para sempre, pago e invisível. Vender acima do
      // estoque é problema para a lojista resolver com a cliente; perder o
      // registro do pagamento não tem conserto.
      await this.syncStock(tx, order, 'pago', 'zerar');
      await this.syncCouponUsage(tx, order, 'pago');

      return tx.order.findUnique({ where: { id: order.id }, include: { items: true } });
    });

    if (!updated) return order;
    await this.emailService.sendPaymentApproved(updated);
    // A compra só vira Purchase quando o dinheiro entra. Pix que ninguém paga
    // não é venda, e contá-lo ensinaria a Meta a procurar mais gente parecida
    // com quem abandona o pagamento.
    await this.metaCapi.sendPurchase(updated);
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

    // Pedido pago ou enviado não é cancelado por evento do Asaas, nenhum.
    //
    // O código passou a aceitar que um pedido tenha duas cobranças (uma criada
    // e perdida, outra gerada como segunda via) e que a cliente pague a que o
    // banco não conhecia. O log pede para a lojista conferir a duplicidade —
    // e o que ela faz é apagar a cobrança sobrando no painel do Asaas. Isso
    // dispara PAYMENT_DELETED da cobrança vinculada, e o pedido pago era
    // cancelado com o estoque devolvido, às vezes de peça já postada.
    //
    // Estorno e chargeback de verdade continuam chegando aqui e ficam no log:
    // desfazer uma venda entregue é decisão de gente, não de webhook.
    if (DEBITED_STATUSES.has(order.status)) {
      this.logger.error(
        `Evento de cancelamento no pedido ${order.orderNumber}, que está "${order.status}". ` +
          'Ignorado de propósito — conferir no Asaas e resolver na mão se for estorno real.'
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
