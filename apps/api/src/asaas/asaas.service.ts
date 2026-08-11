import { Injectable, InternalServerErrorException } from '@nestjs/common';

type AsaasBillingType = 'PIX' | 'CREDIT_CARD' | 'BOLETO';

interface AsaasConfig {
  apiKey: string;
  baseUrl: string;
}

interface AsaasCustomerPayload {
  name: string;
  cpfCnpj: string;
  email?: string;
  mobilePhone?: string;
}

interface AsaasCustomer {
  id: string;
}

export interface AsaasCreditCard {
  holderName: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  ccv: string;
}

export interface AsaasCreditCardHolderInfo {
  name: string;
  email: string;
  cpfCnpj: string;
  postalCode: string;
  addressNumber: string;
  phone?: string;
  mobilePhone?: string;
}

interface AsaasPaymentPayload {
  customer: string;
  billingType: AsaasBillingType;
  value: number;
  dueDate: string;
  description?: string;
  externalReference?: string;
  installmentCount?: number;
  totalValue?: number;
  /** Checkout transparente: dados do cartão, repassados e nunca guardados. */
  creditCard?: AsaasCreditCard;
  creditCardHolderInfo?: AsaasCreditCardHolderInfo;
  /** O Asaas exige o IP de quem está pagando, não o do servidor. */
  remoteIp?: string;
}

interface AsaasPayment {
  id: string;
  status: string;
  invoiceUrl: string;
  bankSlipUrl?: string;
}

/** Status em que o Asaas considera o pagamento resolvido. */
export const ASAAS_PAID_STATUSES = new Set(['CONFIRMED', 'RECEIVED', 'RECEIVED_IN_CASH']);

@Injectable()
export class AsaasService {
  private getConfig(): AsaasConfig | null {
    const apiKey = process.env.ASAAS_API_KEY;
    if (!apiKey) return null;

    const baseUrl =
      process.env.ASAAS_ENV === 'production'
        ? 'https://api.asaas.com/v3'
        : 'https://api-sandbox.asaas.com/v3';

    return { apiKey, baseUrl };
  }

  isConfigured(): boolean {
    return this.getConfig() !== null;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const config = this.getConfig();
    if (!config) {
      throw new InternalServerErrorException(
        'Integração com o Asaas não configurada. Defina ASAAS_API_KEY nas variáveis de ambiente da API.'
      );
    }

    const res = await fetch(`${config.baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'no-excuse-ecommerce',
        access_token: config.apiKey,
        ...options.headers,
      },
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      const message = body?.errors?.[0]?.description || 'Erro ao comunicar com o Asaas';
      throw new InternalServerErrorException(message);
    }

    return body as T;
  }

  createCustomer(payload: AsaasCustomerPayload): Promise<AsaasCustomer> {
    return this.request<AsaasCustomer>('/customers', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  createPayment(payload: AsaasPaymentPayload): Promise<AsaasPayment> {
    return this.request<AsaasPayment>('/payments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
}
