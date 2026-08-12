import { Injectable } from '@nestjs/common';
import { SettingsService } from '../settings/settings.service';
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

// Último recurso do CEP de origem. A ordem real é: Configurações do admin →
// env MELHOR_ENVIO_FROM_CEP → este valor. Cotar a partir do CEP errado faz o
// cliente pagar um frete que não é o que a loja vai pagar na etiqueta.
const DEFAULT_FROM_CEP = '01233001';

// Embalagem padrão (cm), usada quando as Configurações não trazem outra.
const DEFAULT_PACKAGE = { height: 10, width: 16, length: 20 };

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
  constructor(private readonly settings: SettingsService) {}

  isConfigured(): boolean {
    return Boolean(process.env.MELHOR_ENVIO_TOKEN);
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
    const settings = await this.settings.get().catch(() => null);

    const toCep = (dto.toZipCode || '').replace(/\D/g, '');
    const fromCep = (
      settings?.shippingOriginZip ||
      process.env.MELHOR_ENVIO_FROM_CEP ||
      DEFAULT_FROM_CEP
    ).replace(/\D/g, '');

    const body = {
      from: { postal_code: fromCep },
      to: { postal_code: toCep },
      package: {
        height: settings?.packageHeightCm ?? DEFAULT_PACKAGE.height,
        width: settings?.packageWidthCm ?? DEFAULT_PACKAGE.width,
        length: settings?.packageLengthCm ?? DEFAULT_PACKAGE.length,
        weight,
      },
      options: { insurance_value: insuranceValue, receipt: false, own_hand: false },
    };

    try {
      const res = await fetch(`${this.baseUrl()}/api/v2/me/shipment/calculate`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.MELHOR_ENVIO_TOKEN}`,
          // O Melhor Envio pede um contato aqui. Vem das Configurações para não
          // repetir o erro de deixar endereço chumbado — e ainda por cima num
          // domínio que não é o da loja.
          'User-Agent': `NO EXCUSE (${
            settings?.emailFromAddress || settings?.contactEmail || 'vendas@noexcusenx.com.br'
          })`,
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
