import { isReviewRequestDue, reviewRequestDueAt } from './review-eligibility';

/**
 * "O que achou da sua compra?" chegava com a peça ainda no caminhão: o prazo
 * contava 3 dias da postagem, e PAC para fora de SP leva de 5 a 12.
 */
const DIA = 24 * 60 * 60 * 1000;
const POSTADO = new Date('2026-11-02T12:00:00.000Z');
const agora = (diasDepoisDaPostagem: number) => new Date(POSTADO.getTime() + diasDepoisDaPostagem * DIA);

const RASTREADO = { pickup: false, shipmentId: 'env-1', shippedAt: POSTADO, deliveredAt: null };

describe('isReviewRequestDue', () => {
  it('nao pede avaliacao de pacote rastreado ainda a caminho, mesmo passados 3 dias', () => {
    expect(isReviewRequestDue(RASTREADO, agora(3))).toBe(false);
    expect(isReviewRequestDue(RASTREADO, agora(8))).toBe(false);
  });

  it('nunca pede avaliacao de pacote rastreado cuja entrega nao foi confirmada', () => {
    // Pode estar extraviado ou devolvido.
    expect(isReviewRequestDue(RASTREADO, agora(60))).toBe(false);
    expect(reviewRequestDueAt(RASTREADO)).toBeNull();
  });

  it('pede 2 dias depois da entrega confirmada', () => {
    const entregue = { ...RASTREADO, deliveredAt: agora(6) };

    expect(isReviewRequestDue(entregue, agora(7))).toBe(false);
    expect(isReviewRequestDue(entregue, agora(8))).toBe(true);
  });

  it('a entrega confirmada vale mais do que o tipo de pedido', () => {
    const entregue = { pickup: true, shipmentId: null, shippedAt: POSTADO, deliveredAt: agora(1) };

    expect(isReviewRequestDue(entregue, agora(2))).toBe(false);
    expect(isReviewRequestDue(entregue, agora(3))).toBe(true);
  });

  it('retirada em maos: 3 dias depois de entregue na mao', () => {
    const retirada = { pickup: true, shipmentId: null, shippedAt: POSTADO, deliveredAt: null };

    expect(isReviewRequestDue(retirada, agora(2))).toBe(false);
    expect(isReviewRequestDue(retirada, agora(3))).toBe(true);
  });

  it('postado na mao, sem rastreio: espera 10 dias', () => {
    const manual = { pickup: false, shipmentId: null, shippedAt: POSTADO, deliveredAt: null };

    expect(isReviewRequestDue(manual, agora(9))).toBe(false);
    expect(isReviewRequestDue(manual, agora(10))).toBe(true);
  });

  it('pedido sem data de envio nunca e elegivel', () => {
    const semData = { pickup: false, shipmentId: null, shippedAt: null, deliveredAt: null };

    expect(isReviewRequestDue(semData, agora(999))).toBe(false);
  });
});
