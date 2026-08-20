import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from './email.service';
import { EtiquetaService } from '../shipping/etiqueta.service';
import { StockAlertsService } from '../stock-alerts/stock-alerts.service';

const REVIEW_REQUEST_DELAY_MS = 3 * 24 * 60 * 60 * 1000; // 3 dias após o envio
const ABANDONED_CART_DELAY_MS = 2 * 60 * 60 * 1000; // 2 horas sem finalizar a compra
const ABANDONED_CART_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // ignora carrinhos muito antigos

@Injectable()
export class EmailSchedulerService {
  private readonly logger = new Logger(EmailSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    @Inject(forwardRef(() => StockAlertsService))
    private readonly stockAlerts: StockAlertsService,
    // Circular de propósito: a etiqueta manda e-mail, e o varredor de e-mails
    // é quem pergunta à transportadora se o pacote já foi postado.
    @Inject(forwardRef(() => EtiquetaService))
    private readonly etiqueta: EtiquetaService
  ) {}

  async runScheduled() {
    const now = new Date();

    // Pedido postado vira "Enviado" sozinho, com o rastreio da transportadora.
    // Antes isso dependia de a lojista lembrar de voltar ao painel depois de
    // sair da agência — e quem esperava era a cliente, sem notícia, com o
    // pacote já a caminho.
    await this.etiqueta.varrerPostagens().catch((erro) => {
      this.logger.error(`Varredura de postagens falhou: ${erro}`);
    });

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
        // Só quem pediu para receber.
        optIn: true,
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

    // Avisos de "voltou ao estoque". Ficam aqui, e não onde o estoque muda,
    // porque o estoque sobe por três caminhos — tela de estoque, cancelamento
    // de pedido e cadastro de variação nova — e pendurar a chamada nos três
    // garante que o quarto, quando existir, seja esquecido.
    const { notified } = await this.stockAlerts.notifyRestocked().catch((err) => {
      this.logger.error(`Falha ao processar avisos de reposição: ${err}`);
      return { notified: 0 };
    });

    this.logger.log(
      `E-mails agendados processados: ${ordersForReview.length} pedidos de avaliação, ` +
        `${abandonedCarts.length} lembretes de carrinho, ${notified} avisos de reposição.`
    );

    return {
      reviewRequestsSent: ordersForReview.length,
      abandonedCartRemindersSent: abandonedCarts.length,
      backInStockNotified: notified,
    };
  }
}
