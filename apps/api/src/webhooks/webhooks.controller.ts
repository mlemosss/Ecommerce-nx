import { Body, Controller, Headers, Logger, Post, UnauthorizedException } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { OrdersService } from '../orders/orders.service';

const PAID_EVENTS = new Set(['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED']);
const CANCELLED_EVENTS = new Set([
  'PAYMENT_REFUNDED',
  'PAYMENT_DELETED',
  'PAYMENT_CHARGEBACK_REQUESTED',
]);
/**
 * Boleto/Pix vencido sem pagamento. Sem isto o pedido ficava em "aguardando
 * pagamento" para sempre, sujando o painel. Fica separado dos demais porque
 * vencimento não é estorno: ele só afirma que aquele boleto não foi pago, e
 * pedido já pago ou enviado não pode ser cancelado por causa dele. Se o cliente
 * pagar em atraso, o evento de recebimento chega depois e devolve para "pago".
 */
const EXPIRED_EVENT = 'PAYMENT_OVERDUE';

interface AsaasWebhookBody {
  event: string;
  payment?: { id: string; externalReference?: string | null };
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
        // O externalReference (id do pedido) vai junto: é a rede para o caso de o
        // vínculo não ter sido gravado no checkout.
        await this.ordersService.markPaidByAsaasPaymentId(
          paymentId,
          body.payment?.externalReference ?? undefined
        );
      } else if (body.event === EXPIRED_EVENT) {
        await this.ordersService.markCancelledByAsaasPaymentId(paymentId, { expired: true });
      } else if (CANCELLED_EVENTS.has(body.event)) {
        await this.ordersService.markCancelledByAsaasPaymentId(paymentId);
      }
    }

    return { received: true };
  }
}
