import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailFlowService } from '../email-flow/email-flow.service';
import {
  abandonedCartTemplate,
  AbandonedCartForEmail,
  backInStockTemplate,
  boletoExpiredTemplate,
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
/** Domínio canônico da loja — o mesmo que o storefront declara na tag `canonical`. */
const CANONICAL_STOREFRONT_URL = 'https://www.noexcusenx.com.br';

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

  /**
   * Host `.vercel.app` cai no domínio canônico. `STOREFRONT_URL` na produção
   * ainda aponta para `no-excuse-storefront.vercel.app`, e todo link de e-mail
   * saía por lá — um endereço que não é o da marca e que a própria loja declara
   * como não-canônico. Trocar a variável na Vercel continua sendo o certo.
   */
  private getStorefrontUrl(): string {
    const configured = (process.env.STOREFRONT_URL || CANONICAL_STOREFRONT_URL).replace(/\/$/, '');
    return /(^|\/\/)([^/]*\.)?vercel\.app$/i.test(configured) ? CANONICAL_STOREFRONT_URL : configured;
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

  /**
   * O cupom de recuperação vem das Configurações e é opcional: sem ele o
   * e-mail sai como aviso de cancelamento, sem oferta. Anunciar um código que
   * o lojista não criou é pior do que não anunciar nada — a pessoa digita e
   * leva "cupom inválido" justamente no momento em que voltou.
   */
  async sendBoletoExpired(order: OrderForEmail & { customerEmail: string }): Promise<void> {
    const { storeName } = await this.getSender();
    const settings = await this.prisma.storeSettings.findUnique({ where: { id: SETTINGS_ID } });
    const code = settings?.winbackCouponCode?.trim();
    const percent = settings?.winbackCouponPercent ?? 0;
    const coupon = code && percent > 0 ? { code: code.toUpperCase(), percent } : null;

    const template = boletoExpiredTemplate(storeName, this.getStorefrontUrl(), order, coupon);
    await this.sendIfEnabled('boleto_vencido', order.customerEmail, template);
  }

  /**
   * Aviso de reposicao. Nao passa pelo sendIfEnabled: a pessoa pediu este
   * e-mail especificamente, e desligar deixaria a loja com o endereco dela sem
   * nunca cumprir o que prometeu na tela.
   */
  async sendBackInStock(data: {
    email: string;
    productName: string;
    slug: string;
    color: string;
    size: string;
  }): Promise<void> {
    const { storeName } = await this.getSender();
    const template = backInStockTemplate(storeName, this.getStorefrontUrl(), data);
    await this.dispatch(data.email, template);
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

  async sendAbandonedCartReminder(
    cart: AbandonedCartForEmail & { email: string; id?: string }
  ): Promise<void> {
    const { storeName } = await this.getSender();
    const template = abandonedCartTemplate(storeName, this.getStorefrontUrl(), cart);
    await this.sendIfEnabled('carrinho_abandonado', cart.email, template);
  }
}
