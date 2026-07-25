import { Body, Controller, Headers, Post, UnauthorizedException } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { OrdersService } from '../orders/orders.service';

const PAID_EVENTS = new Set(['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED']);
const CANCELLED_EVENTS = new Set([
  'PAYMENT_REFUNDED',
  'PAYMENT_DELETED',
  'PAYMENT_CHARGEBACK_REQUESTED',
]);

interface AsaasWebhookBody {
  event: string;
  payment?: { id: string };
}

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly ordersService: OrdersService) {}

  @Public()
  @Post('asaas')
  async handleAsaas(
    @Headers('asaas-access-token') token: string | undefined,
    @Body() body: AsaasWebhookBody
  ) {
    const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN;
    if (expectedToken && token !== expectedToken) {
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
