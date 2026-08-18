import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';

/**
 * Compra e imprime a etiqueta pelo Melhor Envio.
 *
 * São quatro chamadas em sequência, e a segunda gasta dinheiro:
 *
 *   1. `/cart`      cria o envio (grátis, reversível)
 *   2. `/checkout`  PAGA a etiqueta com o saldo da carteira
 *   3. `/generate`  emite junto à transportadora
 *   4. `/print`     devolve o PDF
 *
 * Toda a preocupação aqui é com a etapa 2 acontecer uma vez só. Se a resposta
 * do `/cart` se perder na rede, uma segunda tentativa criaria um segundo envio
 * e pagaria duas vezes pelo mesmo pacote — por isso o id do envio é gravado
 * antes de qualquer compra, e a partir dele o caminho é sempre o mesmo envio.
 *
 * As etapas 3 e 4 são idempotentes do lado do Melhor Envio: repetir devolve o
 * que já existe.
 */
@Injectable()
export class EtiquetaService {
  private readonly logger = new Logger(EtiquetaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService
  ) {}

  private baseUrl(): string {
    return process.env.MELHOR_ENVIO_ENV === 'sandbox'
      ? 'https://sandbox.melhorenvio.com.br'
      : 'https://www.melhorenvio.com.br';
  }

  private cabecalhos(contato: string): Record<string, string> {
    return {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.MELHOR_ENVIO_TOKEN}`,
      'User-Agent': `NO EXCUSE (${contato})`,
    };
  }

  private async chamar<T>(caminho: string, body: unknown, contato: string): Promise<T> {
    const res = await fetch(`${this.baseUrl()}/api/v2/me${caminho}`, {
      method: 'POST',
      headers: this.cabecalhos(contato),
      body: JSON.stringify(body),
    });

    const texto = await res.text();
    if (!res.ok) {
      // A mensagem do Melhor Envio vai inteira para a tela: "saldo
      // insuficiente" e "endereço de origem incompleto" pedem ações
      // diferentes, e um "erro 422" genérico não diz qual das duas é.
      this.logger.error(`Melhor Envio ${caminho} respondeu ${res.status}: ${texto}`);
      let detalhe = texto.slice(0, 300);
      try {
        const json = JSON.parse(texto);
        detalhe = json.message ?? json.error ?? detalhe;
      } catch {
        /* resposta não-JSON: fica o texto cru mesmo */
      }
      throw new BadRequestException(`Melhor Envio: ${detalhe}`);
    }

    return JSON.parse(texto) as T;
  }

  async gerar(orderId: string) {
    if (!process.env.MELHOR_ENVIO_TOKEN) {
      throw new BadRequestException('Melhor Envio não está configurado (falta o token).');
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Pedido não encontrado');

    // Já comprada: devolve a mesma etiqueta. É o que impede o clique repetido
    // de virar uma segunda cobrança.
    if (order.shipmentLabelUrl) {
      return { url: order.shipmentLabelUrl, trackingCode: order.trackingCode, jaExistia: true };
    }

    if (order.pickup) {
      throw new BadRequestException('Este pedido é retirada em mãos — não tem etiqueta.');
    }
    if (order.status === 'aguardando_pagamento') {
      throw new BadRequestException('O pedido ainda não foi pago. Não poste antes de receber.');
    }
    if (order.status === 'cancelado') {
      throw new BadRequestException('Pedido cancelado.');
    }

    const settings = await this.settings.get();
    const contato = settings.emailFromAddress || settings.contactEmail || 'vendas@noexcusenx.com.br';

    const faltando: string[] = [];
    if (!settings.shippingOriginZip) faltando.push('CEP');
    if (!settings.shippingOriginStreet) faltando.push('rua');
    if (!settings.shippingOriginNumber) faltando.push('número');
    if (!settings.shippingOriginDistrict) faltando.push('bairro');
    if (!settings.shippingOriginCity) faltando.push('cidade');
    if (!settings.shippingOriginState) faltando.push('UF');
    if (faltando.length > 0) {
      throw new BadRequestException(
        `Complete o endereço de quem posta em Configurações → Frete: falta ${faltando.join(', ')}.`
      );
    }
    if (!settings.cnpj) {
      throw new BadRequestException('Preencha o CNPJ da loja em Configurações antes de emitir.');
    }
    if (!order.neighborhood || !order.state) {
      throw new BadRequestException(
        'Este pedido não tem bairro ou UF. Confira o CEP com a cliente e complete antes de emitir.'
      );
    }

    let shipmentId = order.shipmentId;

    if (!shipmentId) {
      if (!order.shippingServiceId) {
        throw new BadRequestException(
          'Este pedido não guardou a transportadora escolhida. Emita esta etiqueta pelo site do Melhor Envio; os próximos pedidos já saem com ela.'
        );
      }

      const carrinho = await this.chamar<{ id: string }>(
        '/cart',
        {
          service: Number(order.shippingServiceId),
          from: {
            name: settings.legalName || settings.storeName,
            phone: (settings.contactWhatsapp ?? '').replace(/\D/g, ''),
            email: contato,
            company_document: (settings.cnpj ?? '').replace(/\D/g, ''),
            address: settings.shippingOriginStreet,
            complement: settings.shippingOriginComplement ?? '',
            number: settings.shippingOriginNumber,
            district: settings.shippingOriginDistrict,
            city: settings.shippingOriginCity,
            state_abbr: settings.shippingOriginState,
            country_id: 'BR',
            postal_code: (settings.shippingOriginZip ?? '').replace(/\D/g, ''),
          },
          to: {
            name: order.customerName,
            phone: (order.customerPhone ?? '').replace(/\D/g, ''),
            email: order.customerEmail,
            document: (order.customerDocument ?? '').replace(/\D/g, ''),
            address: order.street,
            complement: order.complement ?? '',
            number: order.number,
            district: order.neighborhood,
            city: order.city,
            state_abbr: order.state,
            country_id: 'BR',
            postal_code: (order.zipCode ?? '').replace(/\D/g, ''),
          },
          products: order.items.map((item) => ({
            name: `${item.productName} ${item.color} ${item.size}`.trim(),
            quantity: item.quantity,
            unitary_value: item.unitPrice,
          })),
          volumes: [
            {
              height: settings.packageHeightCm,
              width: settings.packageWidthCm,
              length: settings.packageLengthCm,
              weight: this.pesoEstimado(order.items),
            },
          ],
          options: {
            insurance_value: order.subtotal,
            receipt: false,
            own_hand: false,
            reverse: false,
            non_commercial: false,
          },
        },
        contato
      );

      shipmentId = carrinho.id;

      // Gravado antes de pagar, e só se ainda estiver vazio. Se dois cliques
      // chegarem juntos, o segundo não sobrescreve o envio do primeiro — e
      // ninguém paga duas etiquetas para o mesmo pacote.
      const gravou = await this.prisma.order.updateMany({
        where: { id: order.id, shipmentId: null },
        data: { shipmentId },
      });
      if (gravou.count === 0) {
        const atual = await this.prisma.order.findUnique({
          where: { id: order.id },
          select: { shipmentId: true },
        });
        shipmentId = atual?.shipmentId ?? shipmentId;
      }
    }

    await this.chamar('/shipment/checkout', { orders: [shipmentId] }, contato);
    await this.chamar('/shipment/generate', { orders: [shipmentId] }, contato);

    const impressao = await this.chamar<{ url: string }>(
      '/shipment/print',
      { mode: 'private', orders: [shipmentId] },
      contato
    );

    const rastreio = await this.buscarRastreio(shipmentId, contato);

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        shipmentLabelUrl: impressao.url,
        ...(rastreio ? { trackingCode: rastreio } : {}),
      },
    });

    return { url: impressao.url, trackingCode: rastreio, jaExistia: false };
  }

  /**
   * O código de rastreio, quando a transportadora já devolveu.
   *
   * Sai numa consulta separada porque nem sempre existe no instante da emissão:
   * algumas transportadoras levam minutos. Falhar aqui não pode desfazer uma
   * etiqueta já paga — por isso o erro é engolido e o código fica para depois.
   */
  private async buscarRastreio(shipmentId: string, contato: string): Promise<string | null> {
    try {
      const res = await fetch(`${this.baseUrl()}/api/v2/me/shipment/tracking`, {
        method: 'POST',
        headers: this.cabecalhos(contato),
        body: JSON.stringify({ orders: [shipmentId] }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as Record<string, { tracking?: string }>;
      return data[shipmentId]?.tracking ?? null;
    } catch {
      return null;
    }
  }

  /** Mesma tabela da cotação: o peso da etiqueta tem que bater com o cotado. */
  private pesoEstimado(items: { quantity: number }[]): number {
    return Math.max(
      0.1,
      items.reduce((soma, item) => soma + 0.3 * item.quantity, 0)
    );
  }
}
