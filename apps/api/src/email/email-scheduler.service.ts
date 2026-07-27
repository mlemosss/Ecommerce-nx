import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from './email.service';

const REVIEW_REQUEST_DELAY_MS = 3 * 24 * 60 * 60 * 1000; // 3 dias após o envio
const ABANDONED_CART_DELAY_MS = 2 * 60 * 60 * 1000; // 2 horas sem finalizar a compra
const ABANDONED_CART_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // ignora carrinhos muito antigos

@Injectable()
export class EmailSchedulerService {
  private readonly logger = new Logger(EmailSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService
  ) {}

  async runScheduled() {
    const now = new Date();

    const ordersForReview = await this.prisma.order.findMany({
      where: {
        status: 'enviado',
        reviewRequestSentAt: null,
        shippedAt: { lte: new Date(now.getTime() - REVIEW_REQUEST_DELAY_MS) },
      },
      include: { items: true },
    });

    for (const order of ordersForReview) {
      await this.emailService.sendReviewRequest(order);
      await this.prisma.order.update({
        where: { id: order.id },
        data: { reviewRequestSentAt: now },
      });
    }

    const abandonedCarts = await this.prisma.abandonedCart.findMany({
      where: {
        recovered: false,
        remindedAt: null,
        updatedAt: {
          lte: new Date(now.getTime() - ABANDONED_CART_DELAY_MS),
          gte: new Date(now.getTime() - ABANDONED_CART_MAX_AGE_MS),
        },
      },
    });

    for (const cart of abandonedCarts) {
      await this.emailService.sendAbandonedCartReminder(cart);
      await this.prisma.abandonedCart.update({
        where: { id: cart.id },
        data: { remindedAt: now },
      });
    }

    this.logger.log(
      `E-mails agendados processados: ${ordersForReview.length} pedidos de avaliação, ${abandonedCarts.length} lembretes de carrinho.`
    );

    return {
      reviewRequestsSent: ordersForReview.length,
      abandonedCartRemindersSent: abandonedCarts.length,
    };
  }
}
