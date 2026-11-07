import { OrdersService } from './orders.service';

/**
 * O Asaas manda dois eventos de pagamento pela mesma cobrança:
 * `PAYMENT_CONFIRMED` na compra e `PAYMENT_RECEIVED` quando o dinheiro é
 * liquidado. No Pix os dois chegam quase juntos; no cartão o segundo chega
 * ~30 dias depois — com a peça já enviada e na casa da cliente.
 *
 * Duas clientes receberam "pagamento aprovado — seu pedido entrou em
 * preparação" semanas depois de receberem a encomenda por causa disso.
 */
const PEDIDO_BASE = {
  id: 'ped-1',
  orderNumber: 'NX-1042',
  createdAt: new Date('2026-09-01T12:00:00.000Z'),
  couponCode: null,
  asaasPaymentId: 'pay_123',
  items: [
    {
      productId: 'prod-1',
      productName: 'Top Alpha',
      color: 'Preto',
      size: 'M',
      quantity: 1,
    },
  ],
};

function montar(status: string, opcoes: { updateManyCount?: number } = {}) {
  const updateMany = jest.fn(async () => ({ count: opcoes.updateManyCount ?? 1 }));
  const variantUpdateMany = jest.fn(async () => ({ count: 1 }));
  const order = { ...PEDIDO_BASE, status };

  const tx = {
    order: {
      updateMany,
      findUnique: jest.fn(async () => ({ ...order, status: 'pago' })),
    },
    productVariant: {
      findFirst: jest.fn(async () => ({ id: 'var-1', stock: 10 })),
      updateMany: variantUpdateMany,
      update: jest.fn(async () => ({})),
    },
    coupon: { updateMany: jest.fn(async () => ({ count: 0 })) },
  };

  const prisma = {
    order: { findFirst: jest.fn(async () => order) },
    $transaction: jest.fn(async (fn: (t: unknown) => unknown) => fn(tx)),
  };
  const emailService = { sendPaymentApproved: jest.fn(async () => undefined) };
  const metaCapi = { sendPurchase: jest.fn(async () => undefined) };

  const service = new OrdersService(
    prisma as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    emailService as never,
    {} as never,
    metaCapi as never
  );

  return { service, prisma, tx, emailService, metaCapi, updateMany, variantUpdateMany };
}

describe('markPaidByAsaasPaymentId — evento de pagamento repetido', () => {
  it('ignora o evento tardio de um pedido já enviado', async () => {
    const t = montar('enviado');

    const resultado = await t.service.markPaidByAsaasPaymentId('pay_123');

    expect(resultado?.status).toBe('enviado');
    expect(t.prisma.$transaction).not.toHaveBeenCalled();
    // O e-mail diz "entrou em preparação" — para quem já recebeu a peça.
    expect(t.emailService.sendPaymentApproved).not.toHaveBeenCalled();
    // O `event_id` da Meta é o número do pedido, mas a deduplicação dela só
    // cobre ~48h: um mês depois, o mesmo Purchase conta como venda nova.
    expect(t.metaCapi.sendPurchase).not.toHaveBeenCalled();
  });

  it('ignora o evento repetido de um pedido já pago', async () => {
    const t = montar('pago');

    await t.service.markPaidByAsaasPaymentId('pay_123');

    expect(t.prisma.$transaction).not.toHaveBeenCalled();
    expect(t.emailService.sendPaymentApproved).not.toHaveBeenCalled();
  });

  it('confirma o pedido que ainda aguardava pagamento', async () => {
    const t = montar('aguardando_pagamento');

    await t.service.markPaidByAsaasPaymentId('pay_123');

    expect(t.emailService.sendPaymentApproved).toHaveBeenCalledTimes(1);
    expect(t.metaCapi.sendPurchase).toHaveBeenCalledTimes(1);
    // A peça sai do estoque só aqui.
    expect(t.variantUpdateMany).toHaveBeenCalledTimes(1);
  });

  it('não reescreve por cima de nenhum status que já segura estoque', async () => {
    const t = montar('aguardando_pagamento');

    await t.service.markPaidByAsaasPaymentId('pay_123');

    const where = t.updateMany.mock.calls[0][0].where;
    expect(where.status.notIn).toEqual(expect.arrayContaining(['pago', 'enviado']));
  });

  it('desiste sem efeito quando outro evento venceu a corrida', async () => {
    // Os dois POSTs do Pix caem em instâncias serverless diferentes e leem o
    // mesmo status antigo; quem perde o `updateMany` condicional não faz nada.
    const t = montar('aguardando_pagamento', { updateManyCount: 0 });

    await t.service.markPaidByAsaasPaymentId('pay_123');

    expect(t.emailService.sendPaymentApproved).not.toHaveBeenCalled();
    expect(t.metaCapi.sendPurchase).not.toHaveBeenCalled();
  });
});
