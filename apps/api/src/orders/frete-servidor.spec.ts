import { OrdersService } from './orders.service';

/**
 * O frete vinha do cliente. Com a cotacao fora do ar - e o token do Melhor
 * Envio vence - o servidor aceitava `shipping: 0` de qualquer um, num
 * `POST /orders` publico e sem limite de taxa. E mesmo com a cotacao no ar,
 * bastava o valor bater com ALGUMA opcao: dava para pedir o SEDEX e pagar o
 * preco do PAC.
 */
const ITENS = [{ productId: 'prod-1', quantity: 1, unitPrice: 150 }];
const PAC = { id: '1', name: 'PAC', company: 'Correios', price: 24, deliveryTime: 6 };
const SEDEX = { id: '2', name: 'SEDEX', company: 'Correios', price: 52, deliveryTime: 2 };

function montar(opcoes: {
  settings?: { freeShippingThreshold: number; shippingFee: number } | null;
  quote?: { configured: boolean; options: (typeof PAC)[] } | 'erro';
}) {
  const settings = {
    get: jest.fn(async () => {
      if (opcoes.settings === null) throw new Error('banco fora');
      return opcoes.settings ?? { freeShippingThreshold: 199.9, shippingFee: 21.5 };
    }),
  };
  const shipping = {
    quote: jest.fn(async () => {
      if (opcoes.quote === 'erro') throw new Error('Melhor Envio fora do ar');
      return opcoes.quote ?? { configured: true, options: [PAC, SEDEX] };
    }),
  };
  const prisma = { product: { findMany: jest.fn(async () => [{ id: 'prod-1', category: 'tops' }]) } };

  const service = new OrdersService(
    prisma as never,
    {} as never,
    {} as never,
    settings as never,
    shipping as never,
    {} as never,
    {} as never,
    {} as never
  );

  return (dto: Record<string, unknown>, subtotal = 150) =>
    (
      service as unknown as {
        resolveShipping: (d: unknown, s: number, i: unknown) => Promise<number>;
      }
    ).resolveShipping({ zipCode: '01310100', ...dto }, subtotal, ITENS);
}

describe('resolveShipping — o frete e do servidor', () => {
  describe('cotacao indisponivel: vale o frete padrao, nunca o numero do cliente', () => {
    it('integracao sem token (configured: false)', async () => {
      const frete = montar({ quote: { configured: false, options: [] } });

      await expect(frete({ shipping: 0 })).resolves.toBe(21.5);
    });

    it('transportadora respondeu erro (sem opcoes)', async () => {
      const frete = montar({ quote: { configured: true, options: [] } });

      await expect(frete({ shipping: 0 })).resolves.toBe(21.5);
    });

    it('transportadora fora do ar (excecao)', async () => {
      const frete = montar({ quote: 'erro' });

      await expect(frete({ shipping: 0 })).resolves.toBe(21.5);
    });

    it('nem as Configuracoes respondem: usa o padrao de fabrica', async () => {
      const frete = montar({ settings: null, quote: 'erro' });

      await expect(frete({ shipping: 0 })).resolves.toBe(19.9);
    });

    it('um frete informado ALTO tambem nao passa: vale o padrao', async () => {
      const frete = montar({ quote: { configured: false, options: [] } });

      await expect(frete({ shipping: 999 })).resolves.toBe(21.5);
    });
  });

  describe('cotacao no ar', () => {
    it('o servico escolhido manda no preco: SEDEX pedido, preco do PAC pago', async () => {
      const frete = montar({});

      await expect(frete({ shippingServiceId: '2', shipping: 24 })).resolves.toBe(52);
    });

    it('servico escolhido com o valor certo passa', async () => {
      const frete = montar({});

      await expect(frete({ shippingServiceId: '1', shipping: 24 })).resolves.toBe(24);
    });

    it('frete zero forjado com cotacao no ar cai na opcao mais barata', async () => {
      const frete = montar({});

      await expect(frete({ shipping: 0 })).resolves.toBe(24);
    });

    it('servico inexistente na cotacao: segue a regra do valor informado', async () => {
      const frete = montar({});

      await expect(frete({ shippingServiceId: '99', shipping: 52 })).resolves.toBe(52);
      await expect(frete({ shippingServiceId: '99', shipping: 1 })).resolves.toBe(24);
    });

    it('sem id de servico, valor que bate com uma opcao passa', async () => {
      const frete = montar({});

      await expect(frete({ shipping: 52 })).resolves.toBe(52);
    });
  });

  describe('o que nao pode mudar', () => {
    it('retirada em maos e sempre zero', async () => {
      const frete = montar({ quote: 'erro' });

      await expect(frete({ pickup: true, shipping: 50 })).resolves.toBe(0);
    });

    it('acima do minimo de frete gratis e zero, mesmo sem cotacao', async () => {
      const frete = montar({ quote: 'erro' });

      await expect(frete({ shipping: 30 }, 250)).resolves.toBe(0);
    });
  });
});
