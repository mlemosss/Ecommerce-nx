import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface EmailFlowStepDefinition {
  key: string;
  order: number;
  name: string;
  description: string;
  trigger: string;
  defaultEnabled: boolean;
}

const STEP_DEFINITIONS: EmailFlowStepDefinition[] = [
  {
    key: 'pedido_confirmado',
    order: 1,
    name: 'Pedido confirmado',
    description: 'Confirma pro cliente que o pedido foi recebido, com o resumo dos itens comprados.',
    trigger: 'Enviado assim que o cliente finaliza a compra.',
    defaultEnabled: true,
  },
  {
    key: 'pagamento_aprovado',
    order: 2,
    name: 'Pagamento aprovado',
    description: 'Avisa que o pagamento foi confirmado e o pedido entrou em preparação.',
    trigger: 'Enviado quando o Asaas confirma o pagamento (Pix, cartão ou boleto).',
    defaultEnabled: true,
  },
  {
    key: 'pedido_enviado',
    order: 3,
    name: 'Pedido enviado',
    description: 'Informa que o pedido saiu pra entrega, com o código de rastreio.',
    trigger: 'Enviado quando você marca o pedido como enviado no admin.',
    defaultEnabled: true,
  },
  {
    key: 'carrinho_abandonado',
    order: 4,
    name: 'Carrinho abandonado',
    description: 'Lembra o cliente dos itens deixados no carrinho, incentivando a finalizar a compra.',
    trigger: 'Enviado algumas horas depois de o cliente deixar itens no carrinho sem comprar.',
    defaultEnabled: false,
  },
  {
    key: 'pedido_estornado',
    order: 6,
    name: 'Estorno enviado',
    description:
      'Avisa que o valor foi devolvido e, principalmente, quanto tempo leva para aparecer na fatura.',
    trigger: 'Enviado quando você estorna o pedido pelo painel.',
    defaultEnabled: true,
  },
  {
    key: 'boleto_vencido',
    order: 5,
    name: 'Boleto vencido',
    description:
      'Avisa que o boleto venceu e o pedido foi cancelado, com um cupom para a pessoa voltar e comprar de novo.',
    trigger: 'Enviado quando o Asaas informa que o boleto venceu sem pagamento.',
    defaultEnabled: true,
  },
  {
    key: 'pedido_avaliacao',
    order: 6,
    name: 'Pedido de avaliação',
    description:
      'Convida o cliente a avaliar os produtos que comprou, com link direto pra tela de avaliação na loja.',
    trigger: 'Enviado alguns dias depois de o pedido ser marcado como enviado.',
    defaultEnabled: true,
  },
];

@Injectable()
export class EmailFlowService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const rows = await this.prisma.emailFlowStep.findMany();
    const byKey = new Map(rows.map((r) => [r.key, r]));

    const missing = STEP_DEFINITIONS.filter((def) => !byKey.has(def.key));
    if (missing.length > 0) {
      await this.prisma.emailFlowStep.createMany({
        data: missing.map((def) => ({ key: def.key, enabled: def.defaultEnabled })),
        skipDuplicates: true,
      });
      const refreshed = await this.prisma.emailFlowStep.findMany();
      refreshed.forEach((r) => byKey.set(r.key, r));
    }

    return STEP_DEFINITIONS.sort((a, b) => a.order - b.order).map((def) => ({
      key: def.key,
      name: def.name,
      description: def.description,
      trigger: def.trigger,
      enabled: byKey.get(def.key)?.enabled ?? def.defaultEnabled,
    }));
  }

  async setEnabled(key: string, enabled: boolean) {
    if (!STEP_DEFINITIONS.some((def) => def.key === key)) {
      throw new NotFoundException('Etapa de email não encontrada');
    }
    await this.prisma.emailFlowStep.upsert({
      where: { key },
      create: { key, enabled },
      update: { enabled },
    });
    return this.list();
  }

  async isEnabled(key: string): Promise<boolean> {
    const step = await this.prisma.emailFlowStep.findUnique({ where: { key } });
    if (step) return step.enabled;
    return STEP_DEFINITIONS.find((def) => def.key === key)?.defaultEnabled ?? false;
  }
}
