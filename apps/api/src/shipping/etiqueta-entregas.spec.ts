import { EtiquetaService } from './etiqueta.service';

/**
 * O pedido de avaliacao saia 3 dias depois da POSTAGEM. A data de entrega ja
 * estava no rastreio do Melhor Envio e era descartada: depois de "enviado",
 * ninguem mais perguntava a transportadora pelo pedido.
 */
const AGORA = new Date('2026-11-10T15:00:00.000Z');

function montar(rastreio: unknown, opcoes: { fetchFalha?: boolean; fetchStatus?: number } = {}) {
  const updateMany = jest.fn(async () => ({ count: 1 }));
  const findMany = jest.fn(async () => [
    { id: 'p-entregue', shipmentId: 'env-1' },
    { id: 'p-a-caminho', shipmentId: 'env-2' },
  ]);
  const prisma = { order: { findMany, updateMany } };
  const settings = { get: jest.fn(async () => ({ emailFromAddress: 'loja@noexcusenx.com.br' })) };
  const emailService = { sendOrderShipped: jest.fn(async () => undefined) };

  const fetchMock = jest.fn(async () => {
    if (opcoes.fetchFalha) throw new Error('rede');
    return {
      ok: (opcoes.fetchStatus ?? 200) < 400,
      status: opcoes.fetchStatus ?? 200,
      json: async () => rastreio,
    };
  });
  (global as unknown as { fetch: unknown }).fetch = fetchMock;

  const service = new EtiquetaService(prisma as never, settings as never, emailService as never);
  return { service, findMany, updateMany, fetchMock, emailService };
}

describe('EtiquetaService.varrerEntregas', () => {
  const tokenOriginal = process.env.MELHOR_ENVIO_TOKEN;
  beforeEach(() => {
    process.env.MELHOR_ENVIO_TOKEN = 'token-de-teste';
  });
  afterAll(() => {
    if (tokenOriginal === undefined) delete process.env.MELHOR_ENVIO_TOKEN;
    else process.env.MELHOR_ENVIO_TOKEN = tokenOriginal;
  });

  it('grava a entrega so de quem a transportadora diz que chegou', async () => {
    const t = montar({ 'env-1': { status: 'delivered' }, 'env-2': { status: 'posted' } });

    const r = await t.service.varrerEntregas(AGORA);

    expect(r).toEqual({ verificados: 2, entregues: 1 });
    expect(t.updateMany).toHaveBeenCalledTimes(1);
    expect(t.updateMany).toHaveBeenCalledWith({
      // Condicional: duas varreduras sobrepostas nao regravam a data.
      where: { id: 'p-entregue', deliveredAt: null },
      data: { deliveredAt: AGORA },
    });
  });

  it('so olha pedido enviado, ainda sem entrega e sem convite, dos ultimos 60 dias', async () => {
    const t = montar({});

    await t.service.varrerEntregas(AGORA);

    const { where } = t.findMany.mock.calls[0][0] as { where: Record<string, unknown> };
    expect(where).toMatchObject({
      status: 'enviado',
      shipmentId: { not: null },
      deliveredAt: null,
      reviewRequestSentAt: null,
    });
    const desde = (where.shippedAt as { gte: Date }).gte;
    expect(AGORA.getTime() - desde.getTime()).toBe(60 * 24 * 60 * 60 * 1000);
  });

  it('Melhor Envio fora do ar nao grava nada nem derruba a varredura', async () => {
    const t = montar({}, { fetchFalha: true });

    await expect(t.service.varrerEntregas(AGORA)).resolves.toEqual({ verificados: 2, entregues: 0 });
    expect(t.updateMany).not.toHaveBeenCalled();
  });

  it('resposta de erro da transportadora nao grava nada', async () => {
    const t = montar({}, { fetchStatus: 429 });

    await expect(t.service.varrerEntregas(AGORA)).resolves.toEqual({ verificados: 2, entregues: 0 });
    expect(t.updateMany).not.toHaveBeenCalled();
  });

  it('sem token do Melhor Envio nao consulta ninguem', async () => {
    delete process.env.MELHOR_ENVIO_TOKEN;
    const t = montar({});

    await expect(t.service.varrerEntregas(AGORA)).resolves.toEqual({ verificados: 0, entregues: 0 });
    expect(t.findMany).not.toHaveBeenCalled();
    expect(t.fetchMock).not.toHaveBeenCalled();
  });
});

describe('EtiquetaService.varrerPostagens — entrega ja na primeira vista', () => {
  beforeEach(() => {
    process.env.MELHOR_ENVIO_TOKEN = 'token-de-teste';
  });

  function montarPostagens(rastreio: unknown) {
    const t = montar(rastreio);
    t.findMany.mockResolvedValue([
      { id: 'p1', orderNumber: 'NX-1', shipmentId: 'env-1', trackingCode: null, items: [] },
    ] as never);
    return t;
  }

  it('pacote que ja chegou ganha a data de entrega junto com o envio', async () => {
    const t = montarPostagens({ 'env-1': { status: 'delivered', tracking: 'BR123' } });

    await t.service.varrerPostagens();

    const data = (t.updateMany.mock.calls[0][0] as { data: Record<string, unknown> }).data;
    expect(data).toMatchObject({ status: 'enviado', trackingCode: 'BR123' });
    expect(data.deliveredAt).toBeInstanceOf(Date);
  });

  it('pacote apenas postado nao ganha data de entrega', async () => {
    const t = montarPostagens({ 'env-1': { status: 'posted', tracking: 'BR123' } });

    await t.service.varrerPostagens();

    const data = (t.updateMany.mock.calls[0][0] as { data: Record<string, unknown> }).data;
    expect(data).not.toHaveProperty('deliveredAt');
    expect(t.emailService.sendOrderShipped).toHaveBeenCalledTimes(1);
  });
});
