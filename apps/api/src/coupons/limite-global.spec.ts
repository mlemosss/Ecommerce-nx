import { CouponsService } from './coupons.service';

/**
 * O limite global do cupom olhava `usageCount`, que so sobe no PAGAMENTO. Numa
 * promocao de 50 usos, 200 clientes criavam pedido antes de o primeiro Pix
 * cair, todos liam contador zero e todos ganhavam o desconto.
 */
function montar(
  coupon: Partial<{ usageLimit: number | null; usageCount: number }>,
  pedidosComOCupom: number
) {
  const count = jest.fn(async () => pedidosComOCupom);
  const prisma = {
    coupon: {
      findUnique: jest.fn(async () => ({
        code: 'ESTREIA20',
        active: true,
        discountType: 'percentage',
        discountValue: 20,
        firstPurchaseOnly: false,
        startsAt: null,
        expiresAt: null,
        usageLimit: 50,
        usageCount: 0,
        usageLimitPerDocument: null,
        minOrderValue: null,
        ...coupon,
      })),
    },
    order: { count },
  };
  const service = new CouponsService(prisma as never);
  const validar = () => service.validate({ code: 'estreia20', orderTotal: 300 } as never);
  return { validar, count };
}

describe('CouponsService.validate — limite global de usos', () => {
  it('recusa quando os pedidos em aberto ja ocupam todos os usos', async () => {
    // Nenhum pago ainda: usageCount segue zero.
    const t = montar({ usageLimit: 50, usageCount: 0 }, 50);

    const r = await t.validar();

    expect(r.valid).toBe(false);
    expect(r.message).toMatch(/limite de usos/);
  });

  it('aceita enquanto ha vaga contando os pedidos em aberto', async () => {
    const t = montar({ usageLimit: 50, usageCount: 0 }, 49);

    await expect(t.validar()).resolves.toMatchObject({ valid: true });
  });

  it('continua respeitando um usageCount mais alto que os pedidos', async () => {
    // Ajustado na mao, ou de pedidos apagados: o maior dos dois vale.
    const t = montar({ usageLimit: 50, usageCount: 50 }, 3);

    await expect(t.validar()).resolves.toMatchObject({ valid: false });
  });

  it('pedido cancelado nao ocupa uso', async () => {
    const t = montar({ usageLimit: 50, usageCount: 0 }, 0);

    await t.validar();

    expect(t.count).toHaveBeenCalledWith({
      where: { couponCode: 'ESTREIA20', status: { notIn: ['cancelado'] } },
    });
  });

  it('cupom sem limite nem consulta os pedidos', async () => {
    const t = montar({ usageLimit: null }, 9999);

    await expect(t.validar()).resolves.toMatchObject({ valid: true });
    expect(t.count).not.toHaveBeenCalled();
  });
});
