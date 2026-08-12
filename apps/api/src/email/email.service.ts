import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailFlowService } from '../email-flow/email-flow.service';
import {
  abandonedCartTemplate,
  AbandonedCartForEmail,
  orderConfirmedTemplate,
  orderShippedTemplate,
  OrderForEmail,
  passwordSetupTemplate,
  paymentApprovedTemplate,
  reviewRequestTemplate,
  EmailTemplate,
} from './email-templates';

const RESEND_URL = 'https://api.resend.com/emails';
const SETTINGS_ID = 'singleton';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private warnedMissingKey = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailFlow: EmailFlowService
  ) {}

  isConfigured(): boolean {
    return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim().length > 0);
  }

  private getStorefrontUrl(): string {
    return process.env.STOREFRONT_URL || 'https://no-excuse-storefront.vercel.app';
  }

  private async getSender(): Promise<{ storeName: string; fromName: string; fromAddress: string }> {
    const settings = await this.prisma.storeSettings.findUnique({ where: { id: SETTINGS_ID } });
    return {
      storeName: settings?.storeName || 'NO EXCUSE',
      fromName: settings?.emailFromName || 'NO EXCUSE',
      fromAddress: settings?.emailFromAddress || 'onboarding@resend.dev',
    };
  }

  private async dispatch(to: string, template: EmailTemplate): Promise<void> {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      if (!this.warnedMissingKey) {
        this.logger.warn('RESEND_API_KEY não configurada — envio de e-mails desativado (no-op).');
        this.warnedMissingKey = true;
      }
      return;
    }

    try {
      const { fromName, fromAddress } = await this.getSender();
      const res = await fetch(RESEND_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${fromName} <${fromAddress}>`,
          to: [to],
          subject: template.subject,
          html: template.html,
        }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        this.logger.error(`Falha ao enviar e-mail via Resend (status ${res.status}): ${body}`);
      } else {
        const body = await res.json().catch(() => ({}));
        this.logger.log(`E-mail enviado via Resend (id ${body?.id ?? '?'}) para ${to}: "${template.subject}"`);
      }
    } catch (err) {
      this.logger.error(`Erro ao enviar e-mail via Resend: ${err instanceof Error ? err.message : err}`);
    }
  }

  private async sendIfEnabled(stepKey: string, to: string, template: EmailTemplate): Promise<void> {
    try {
      const enabled = await this.emailFlow.isEnabled(stepKey);
      if (!enabled) return;
      await this.dispatch(to, template);
    } catch (err) {
      this.logger.error(
        `Erro ao processar envio de e-mail (${stepKey}): ${err instanceof Error ? err.message : err}`
      );
    }
  }

  async sendOrderConfirmed(
    order: OrderForEmail & { customerEmail: string },
    options: { paid?: boolean } = {}
  ): Promise<void> {
    const { storeName } = await this.getSender();
    const template = orderConfirmedTemplate(storeName, this.getStorefrontUrl(), order, options);
    await this.sendIfEnabled('pedido_confirmado', order.customerEmail, template);
  }

  async sendPaymentApproved(order: OrderForEmail & { customerEmail: string }): Promise<void> {
    const { storeName } = await this.getSender();
    const template = paymentApprovedTemplate(storeName, this.getStorefrontUrl(), order);
    await this.sendIfEnabled('pagamento_aprovado', order.customerEmail, template);
  }

  async sendOrderShipped(order: OrderForEmail & { customerEmail: string }): Promise<void> {
    const { storeName } = await this.getSender();
    const template = orderShippedTemplate(storeName, this.getStorefrontUrl(), order);
    await this.sendIfEnabled('pedido_enviado', order.customerEmail, template);
  }

  async sendReviewRequest(order: OrderForEmail & { customerEmail: string }): Promise<void> {
    const { storeName } = await this.getSender();
    const template = reviewRequestTemplate(storeName, this.getStorefrontUrl(), order);
    await this.sendIfEnabled('pedido_avaliacao', order.customerEmail, template);
  }

  /**
   * Não passa pelo `sendIfEnabled`: os outros e-mails são marketing/aviso e o
   * lojista pode desligar. Este é o único caminho para a pessoa concluir o
   * cadastro — desligar deixaria o cliente sem saída.
   */
  async sendPasswordSetup(data: { email: string; name: string; token: string }): Promise<void> {
    const { storeName } = await this.getSender();
    const template = passwordSetupTemplate(storeName, this.getStorefrontUrl(), data);
    await this.dispatch(data.email, template);
  }

  async sendAbandonedCartReminder(cart: AbandonedCartForEmail & { email: string }): Promise<void> {
    const { storeName } = await this.getSender();
    const template = abandonedCartTemplate(storeName, this.getStorefrontUrl(), cart);
    await this.sendIfEnabled('carrinho_abandonado', cart.email, template);
  }
}
