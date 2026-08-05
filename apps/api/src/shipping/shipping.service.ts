import { Injectable } from '@nestjs/common';
import { QuoteShippingDto } from './dto/shipping.dto';

// Peso estimado por categoria (kg). Padrões informados no plano; editáveis conforme
// medição real. Frete subdimensionado sai do bolso do lojista.
const CATEGORY_WEIGHT: Record<string, number> = {
  leggings: 0.3,
  shorts: 0.2,
  tops: 0.15,
  camisetas: 0.2,
  jaquetas: 0.5,
  acessorios: 0.3,
};
const DEFAULT_WEIGHT = 0.3;

export interface ShippingOption {
  id: string;
  name: string;
  company: string;
  price: number;
  deliveryTime: number | null;
}

interface MelhorEnvioService {
  id: number | string;
  name: string;
  price?: string | number;
  custom_price?: string | number;
  delivery_time?: number;
  company?: { name?: string };
  error?: string;
}

@Injectable()
export class ShippingService {
  isConfigured(): boolean {
    return Boolean(process.env.MELHOR_ENVIO_TOKEN && process.env.MELHOR_ENVIO_FROM_CEP);
  }

  private baseUrl(): string {
    return process.env.MELHOR_ENVIO_ENV === 'sandbox'
      ? 'https://sandbox.melhorenvio.com.br'
      : 'https://www.melhorenvio.com.br';
  }

  async quote(dto: QuoteShippingDto): Promise<{ configured: boolean; options: ShippingOption[]; error?: string }> {
    if (!this.isConfigured()) {
      return { configured: false, options: [] };
    }

    const weight = Math.max(
      0.1,
      dto.items.reduce(
        (sum, item) =>
          sum + (CATEGORY_WEIGHT[(item.category ?? '').toLowerCase()] ?? DEFAULT_WEIGHT) * item.quantity,
        0
      )
    );
    const insuranceValue =
      dto.subtotal ?? dto.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const toCep = (dto.toZipCode || '').replace(/\D/g, '');
    const fromCep = (process.env.MELHOR_ENVIO_FROM_CEP || '').replace(/\D/g, '');

    const body = {
      from: { postal_code: fromCep },
      to: { postal_code: toCep },
      package: { height: 10, width: 16, length: 20, weight },
      options: { insurance_value: insuranceValue, receipt: false, own_hand: false },
    };

    try {
      const res = await fetch(`${this.baseUrl()}/api/v2/me/shipment/calculate`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.MELHOR_ENVIO_TOKEN}`,
          'User-Agent': 'NO EXCUSE (contato@noexcuse.com.br)',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        return { configured: true, options: [], error: `Melhor Envio respondeu ${res.status}` };
      }

      const data = (await res.json()) as MelhorEnvioService[];
      const options: ShippingOption[] = (Array.isArray(data) ? data : [])
        .filter((service) => !service.error && service.price != null)
        .map((service) => ({
          id: String(service.id),
          name: service.name,
          company: service.company?.name ?? '',
          price: Number(service.custom_price ?? service.price),
          deliveryTime: service.delivery_time ?? null,
        }));

      return { configured: true, options };
    } catch (err) {
      return {
        configured: true,
        options: [],
        error: err instanceof Error ? err.message : 'Falha ao consultar o Melhor Envio.',
      };
    }
  }
}
