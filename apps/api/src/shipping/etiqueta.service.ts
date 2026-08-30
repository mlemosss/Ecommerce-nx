import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EmailService } from '../email/email.service';
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
    private readonly settings: SettingsService,
    private readonly emailService: EmailService
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

    if (!settings.shippingOriginZip) {
      throw new BadRequestException(
        'Preencha o CEP de origem em Configurações → Frete antes de emitir.'
      );
    }

    // Rua, bairro, cidade e UF saem do CEP. Pedir que a lojista digite quatro
    // campos que os Correios já sabem é convidar a "Sta. Cecília" onde a
    // transportadora espera "Santa Cecília" — e é um passo a mais entre a venda
    // e o pacote postado. Fica gravado: a consulta acontece uma vez só.
    const origem = await this.completarOrigem(settings);

    if (!origem.number) {
      throw new BadRequestException(
        'Falta o número do endereço de quem posta. Preencha em Configurações → Frete (o resto o CEP já preencheu).'
      );
    }
    if (!origem.street || !origem.district || !origem.city || !origem.state) {
      throw new BadRequestException(
        'Não consegui completar o endereço de origem pelo CEP. Preencha à mão em Configurações → Frete.'
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
            address: origem.street,
            complement: settings.shippingOriginComplement ?? '',
            number: origem.number,
            district: origem.district,
            city: origem.city,
            state_abbr: origem.state,
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

  /**
   * Completa o endereço de origem pelo CEP e grava o que faltava.
   *
   * O CEP sabe rua, bairro, cidade e UF; só o número da porta é que ninguém
   * adivinha. Fazer isto no servidor tira quatro campos do caminho entre a
   * venda e o pacote postado — e tira também a chance de a abreviação digitada
   * à mão não bater com o que a transportadora espera.
   *
   * Grava o resultado: a consulta acontece uma vez, não a cada etiqueta. Se o
   * ViaCEP não responder, devolve o que já existe e quem decide o que fazer é
   * quem chamou.
   */
  private async completarOrigem(settings: {
    shippingOriginZip: string | null;
    shippingOriginStreet: string | null;
    shippingOriginNumber: string | null;
    shippingOriginDistrict: string | null;
    shippingOriginCity: string | null;
    shippingOriginState: string | null;
  }) {
    const atual = {
      street: settings.shippingOriginStreet,
      number: settings.shippingOriginNumber,
      district: settings.shippingOriginDistrict,
      city: settings.shippingOriginCity,
      state: settings.shippingOriginState,
    };

    const completo = atual.street && atual.district && atual.city && atual.state;
    if (completo) return atual;

    const cep = (settings.shippingOriginZip ?? '').replace(/\D/g, '');
    if (cep.length !== 8) return atual;

    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      if (!res.ok) return atual;
      const data = (await res.json()) as {
        logradouro?: string;
        bairro?: string;
        localidade?: string;
        uf?: string;
        erro?: boolean;
      };
      if (data.erro) return atual;

      const completado = {
        street: atual.street || data.logradouro || null,
        number: atual.number,
        district: atual.district || data.bairro || null,
        city: atual.city || data.localidade || null,
        state: atual.state || data.uf || null,
      };

      await this.prisma.storeSettings.update({
        where: { id: 'singleton' },
        data: {
          shippingOriginStreet: completado.street,
          shippingOriginDistrict: completado.district,
          shippingOriginCity: completado.city,
          shippingOriginState: completado.state,
        },
      });

      return completado;
    } catch {
      // ViaCEP fora do ar não pode ser o motivo de uma etiqueta não sair.
      return atual;
    }
  }

  /**
   * Marca como enviado o que a transportadora já recebeu.
   *
   * Antes, "Enviado" dependia de a lojista lembrar de voltar ao painel depois
   * de sair da agência — e é exatamente aí que ninguém lembra. Quem esperava o
   * rastreio era a cliente, que ficava sem notícia com o pacote já a caminho.
   *
   * Uma consulta só para todos os pedidos pendentes: a API aceita a lista
   * inteira de uma vez. Roda junto com a varredura de e-mails, a cada meia
   * hora, e não custa nada quando não há nada para verificar.
   *
   * `delivered` também entra: se o pacote andou tão rápido que pulou a janela,
   * o pedido não pode ficar eternamente "pago" enquanto a peça já está no
   * corpo de alguém.
   */
  async varrerPostagens(): Promise<{ verificados: number; postados: number }> {
    if (!process.env.MELHOR_ENVIO_TOKEN) return { verificados: 0, postados: 0 };

    const pendentes = await this.prisma.order.findMany({
      where: { status: 'pago', shipmentId: { not: null }, shippedAt: null },
      include: { items: true },
    });
    if (pendentes.length === 0) return { verificados: 0, postados: 0 };

    const settings = await this.settings.get().catch(() => null);
    const contato =
      settings?.emailFromAddress || settings?.contactEmail || 'vendas@noexcusenx.com.br';

    let rastreios: Record<string, { status?: string; tracking?: string }> = {};
    try {
      const res = await fetch(`${this.baseUrl()}/api/v2/me/shipment/tracking`, {
        method: 'POST',
        headers: this.cabecalhos(contato),
        body: JSON.stringify({ orders: pendentes.map((p) => p.shipmentId) }),
      });
      if (!res.ok) return { verificados: pendentes.length, postados: 0 };
      rastreios = await res.json();
    } catch {
      // Melhor Envio fora do ar: tenta de novo na próxima passagem. Nada aqui
      // pode falhar de um jeito que impeça a varredura de e-mails de rodar.
      return { verificados: pendentes.length, postados: 0 };
    }

    let postados = 0;
    for (const pedido of pendentes) {
      const info = rastreios[pedido.shipmentId as string];
      const status = info?.status;
      if (status !== 'posted' && status !== 'delivered') continue;

      // `updateMany` condicional: se a lojista marcou "Enviado" na mão entre a
      // consulta e agora, o e-mail não sai duas vezes.
      const marcou = await this.prisma.order.updateMany({
        where: { id: pedido.id, status: 'pago' },
        data: {
          status: 'enviado',
          shippedAt: new Date(),
          ...(info?.tracking ? { trackingCode: info.tracking } : {}),
        },
      });
      if (marcou.count === 0) continue;

      postados += 1;
      try {
        await this.emailService.sendOrderShipped({
          ...pedido,
          trackingCode: info?.tracking ?? pedido.trackingCode,
        });
      } catch (erro) {
        this.logger.error(
          `Pedido ${pedido.orderNumber} marcado como enviado, mas o e-mail falhou: ${erro}`
        );
      }
    }

    if (postados > 0) {
      this.logger.log(`${postados} pedido(s) postados na transportadora e avisados por e-mail.`);
    }
    return { verificados: pendentes.length, postados };
  }

  /**
   * Saldo da carteira do Melhor Envio.
   *
   * Existe para o painel avisar antes, e não na hora. Descobrir que acabou o
   * saldo com o pacote embalado e a cliente esperando é o tipo de surpresa que
   * atrasa uma entrega por um dia inteiro — e o aviso custa uma consulta.
   *
   * Falha em silêncio: saldo é conforto, não pré-requisito. Se o Melhor Envio
   * não responder, a tela simplesmente não mostra o número.
   */
  async saldo(): Promise<{ disponivel: number | null }> {
    if (!process.env.MELHOR_ENVIO_TOKEN) return { disponivel: null };

    try {
      const settings = await this.settings.get().catch(() => null);
      const contato =
        settings?.emailFromAddress || settings?.contactEmail || 'vendas@noexcusenx.com.br';

      const res = await fetch(`${this.baseUrl()}/api/v2/me/balance`, {
        headers: this.cabecalhos(contato),
      });
      if (!res.ok) return { disponivel: null };

      const data = (await res.json()) as { balance?: number | string };
      const valor = Number(data.balance);
      return { disponivel: Number.isFinite(valor) ? valor : null };
    } catch {
      return { disponivel: null };
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
