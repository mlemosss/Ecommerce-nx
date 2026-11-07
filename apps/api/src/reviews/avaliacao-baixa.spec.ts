import { lowRatingAlertTemplate } from '../email/email-templates';
import { ReviewsService } from './reviews.service';
import { isLowRating, LOW_RATING_MAX } from './review-moderation';

/**
 * Avaliacao baixa nao e publicada e a equipe e avisada. Nenhuma avaliacao
 * nasce aprovada, mas quem editava uma ja aprovada pelo link do pedido mantinha
 * o `approved: true`: o 5 virava 1, ou o texto e a foto trocavam, e o conteudo
 * novo ficava no ar sem passar por ninguem.
 */
const ORDEM = {
  id: 'ord-1',
  orderNumber: 'NX-1042',
  customerId: 'cli-1',
  customerName: 'Maria Souza',
  items: [{ productId: 'prod-1', productName: 'Legging Runner' }],
};

function montar() {
  const upsert = jest.fn(async (args: { create: { rating: number; comment: string } }) => ({
    id: 'rev-1',
    ...args.create,
  }));
  const prisma = {
    order: { findUnique: jest.fn(async () => ORDEM) },
    product: { findUnique: jest.fn(async () => ({ id: 'prod-1', name: 'Legging Runner' })) },
    productReview: {
      upsert,
      create: jest.fn(async (args: { data: Record<string, unknown> }) => ({ id: 'rev-2', ...args.data })),
    },
  };
  const uploads = { validateProductImage: jest.fn(() => ({ url: 'data:image/png;base64,AAAA' })) };
  const email = { sendLowRatingAlert: jest.fn(async () => undefined) };
  const service = new ReviewsService(prisma as never, uploads as never, email as never);
  return { service, prisma, upsert, email };
}

describe('regra de nota baixa', () => {
  it('ate 3 estrelas e baixa; 4 e 5 nao', () => {
    expect(LOW_RATING_MAX).toBe(3);
    expect([1, 2, 3].map(isLowRating)).toEqual([true, true, true]);
    expect([4, 5].map(isLowRating)).toEqual([false, false]);
  });
});

describe('ReviewsService.createFromToken', () => {
  it('avisa a equipe quando a nota e baixa, com pedido e texto', async () => {
    const t = montar();

    await t.service.createFromToken('tok', { productId: 'prod-1', rating: 2, comment: 'Rasgou na primeira lavagem' });

    expect(t.email.sendLowRatingAlert).toHaveBeenCalledWith({
      rating: 2,
      customerName: 'Maria Souza',
      comment: 'Rasgou na primeira lavagem',
      productName: 'Legging Runner',
      orderNumber: 'NX-1042',
    });
  });

  it('nao avisa quando a nota e boa', async () => {
    const t = montar();

    await t.service.createFromToken('tok', { productId: 'prod-1', rating: 5, comment: 'Amei' });

    expect(t.email.sendLowRatingAlert).not.toHaveBeenCalled();
  });

  it('editar uma avaliacao ja aprovada a devolve para a moderacao', async () => {
    const t = montar();

    await t.service.createFromToken('tok', { productId: 'prod-1', rating: 1, comment: 'Mudei de ideia' });

    const args = t.upsert.mock.calls[0][0] as { update: { approved?: boolean } };
    expect(args.update.approved).toBe(false);
  });

  it('a avaliacao nova nunca nasce aprovada', async () => {
    const t = montar();

    await t.service.createFromToken('tok', { productId: 'prod-1', rating: 5, comment: 'Amei' });

    const args = t.upsert.mock.calls[0][0] as { create: { approved?: boolean } };
    expect(args.create.approved).not.toBe(true);
  });

  it('e-mail que falha nao desfaz a avaliacao', async () => {
    const t = montar();
    t.email.sendLowRatingAlert.mockRejectedValueOnce(new Error('Resend fora do ar'));

    await expect(
      t.service.createFromToken('tok', { productId: 'prod-1', rating: 1, comment: 'Ruim' })
    ).resolves.toMatchObject({ rating: 1 });
  });
});

describe('ReviewsService.create (cliente logada)', () => {
  it('tambem avisa a equipe quando a nota e baixa', async () => {
    const t = montar();

    await t.service.create('cli-1', 'Maria Souza', { productId: 'prod-1', rating: 3, comment: 'Mais ou menos' });

    expect(t.email.sendLowRatingAlert).toHaveBeenCalledWith(
      expect.objectContaining({ rating: 3, productName: 'Legging Runner', orderNumber: null })
    );
  });
});

describe('lowRatingAlertTemplate', () => {
  const dados = {
    productName: 'Legging Runner',
    customerName: 'Maria',
    orderNumber: 'NX-1042',
    rating: 2,
    comment: 'Ruim',
  };

  it('escapa HTML do comentario, do nome e do produto', () => {
    const { html } = lowRatingAlertTemplate('NO EXCUSE', 'https://loja.test', {
      ...dados,
      productName: '<b>Legging</b>',
      customerName: '<img src=x onerror=alert(1)>',
      comment: '<script>alert(1)</script>',
    });

    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;script&gt;');
  });

  it('assunto traz a nota e nao aceita quebra de linha', () => {
    const { subject } = lowRatingAlertTemplate('NO EXCUSE', 'https://loja.test', {
      ...dados,
      productName: 'Legging\r\nBcc: x@y.z',
    });

    expect(subject).toMatch(/^Avaliação 2\/5/);
    expect(subject).not.toMatch(/[\r\n]/);
  });

  it('deixa claro que nao foi publicada e leva ao painel', () => {
    const { html } = lowRatingAlertTemplate('NO EXCUSE', 'https://loja.test', dados);

    expect(html).toContain('não foi publicada');
    expect(html).toContain('https://loja.test/admin/avaliacoes');
  });
});
