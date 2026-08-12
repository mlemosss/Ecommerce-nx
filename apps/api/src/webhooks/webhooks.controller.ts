import { Body, Controller, Headers, Logger, Post, UnauthorizedException } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { OrdersService } from '../orders/orders.service';

const PAID_EVENTS = new Set(['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED']);
const CANCELLED_EVENTS = new Set([
  'PAYMENT_REFUNDED',
  'PAYMENT_DELETED',
  'PAYMENT_CHARGEBACK_REQUESTED',
  // Boleto/Pix vencido sem pagamento. Sem isto o pedido ficava em "aguardando
  // pagamento" para sempre, sujando o painel. Se o cliente pagar em atraso, o
  // evento de recebimento chega depois e devolve o pedido para "pago".
  'PAYMENT_OVERDUE',
]);

interface AsaasWebhookBody {
  event: string;
  payment?: { id: string };
}

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly ordersService: OrdersService) {}

  @Public()
  @Post('asaas')
  async handleAsaas(
    @Headers('asaas-access-token') token: string | undefined,
    @Body() body: AsaasWebhookBody
  ) {
    // Falha fechada. Antes, sem a variável definida a validação era pulada
    // inteira e qualquer um podia marcar pedido como pago — o que hoje também
    // movimenta estoque. Sem token configurado, ninguém entra.
    const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN;
    if (!expectedToken) {
      this.logger.error(
        'ASAAS_WEBHOOK_TOKEN não configurada: webhook do Asaas recusado. ' +
          'Defina a variável na API e o mesmo valor no painel do Asaas.'
      );
      throw new UnauthorizedException('Webhook não configurado');
    }
    if (token !== expectedToken) {
      throw new UnauthorizedException('Token de webhook inválido');
    }

    const paymentId = body.payment?.id;
    if (paymentId) {
      if (PAID_EVENTS.has(body.event)) {
        await this.ordersService.markPaidByAsaasPaymentId(paymentId);
      } else if (CANCELLED_EVENTS.has(body.event)) {
        await this.ordersService.markCancelledByAsaasPaymentId(paymentId);
      }
    }

    return { received: true };
  }
}
