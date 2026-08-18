import { Injectable, InternalServerErrorException } from '@nestjs/common';

/**
 * UNDEFINED deixa a escolha da forma de pagamento com o cliente, na fatura do
 * Asaas. É o tipo certo para uma segunda via: sem os dados do cartão, que nunca
 * são guardados, não dá para repetir a cobrança original.
 */
type AsaasBillingType = 'PIX' | 'CREDIT_CARD' | 'BOLETO' | 'UNDEFINED';

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
  /**
   * Id do parcelamento, quando a cobranca faz parte de um.
   *
   * Compra em 2x ou 3x no cartao nao vira uma cobranca: vira um parcelamento
   * com uma cobranca por parcela. O Asaas recusa estornar uma delas sozinha —
   * "Nao e possivel estornar individualmente esta cobranca" — e exige estornar
   * o parcelamento inteiro.
   */
  installment?: string | null;
}

export interface AsaasPixQrCode {
  /** PNG do QR Code em base64, sem o prefixo data:. */
  encodedImage: string;
  /** O "copia e cola". */
  payload: string;
  expirationDate?: string;
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

  /**
   * Cobranças que o Asaas já tem para um pedido nosso.
   *
   * `externalReference` é o id do pedido, mandado na criação. Serve para saber
   * se uma cobrança existe do lado do Asaas mesmo quando o nosso banco não
   * registrou o vínculo — o caso em que a resposta da criação se perdeu no
   * caminho. Sem esta consulta, criar uma "segunda via" gera uma segunda
   * cobrança viva para o mesmo pedido, e o Asaas avisa a cliente sobre as
   * duas: ela paga uma, e a outra continua de pé.
   */
  listPaymentsByExternalReference(externalReference: string): Promise<{ data: AsaasPayment[] }> {
    return this.request<{ data: AsaasPayment[] }>(
      `/payments?externalReference=${encodeURIComponent(externalReference)}`
    );
  }

  /**
   * QR Code de uma cobrança Pix já criada, para exibir dentro da própria loja
   * em vez de mandar o cliente para a fatura do Asaas.
   *
   * O GET precisa ir sem corpo — com corpo, a API responde 403.
   */
  getPixQrCode(paymentId: string): Promise<AsaasPixQrCode> {
    return this.request<AsaasPixQrCode>(`/payments/${paymentId}/pixQrCode`);
  }

  /**
   * Devolve o dinheiro da cobrança.
   *
   * Sem `value`, estorna tudo. O Asaas devolve a cobrança com status
   * `REFUNDED`, e é esse retorno — e não o nosso otimismo — que autoriza marcar
   * o pedido como cancelado.
   */
  refundPayment(paymentId: string, description?: string): Promise<AsaasPayment> {
    return this.request<AsaasPayment>(`/payments/${paymentId}/refund`, {
      method: 'POST',
      body: JSON.stringify(description ? { description } : {}),
    });
  }

  getPayment(paymentId: string): Promise<AsaasPayment> {
    return this.request<AsaasPayment>(`/payments/${paymentId}`);
  }

  /**
   * Estorna o parcelamento inteiro.
   *
   * Compra em 2x ou 3x no cartao vira um parcelamento com uma cobranca por
   * parcela, e o Asaas se recusa a estornar uma delas isolada. Devolver "a
   * primeira parcela" tambem nao seria o que a cliente quer: ela quer o
   * dinheiro de volta, e o dinheiro e a compra toda.
   */
  refundInstallment(installmentId: string): Promise<unknown> {
    return this.request(`/installments/${installmentId}/refund`, { method: 'POST' });
  }
}
