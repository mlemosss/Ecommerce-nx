'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { formatPrice } from '../../lib/format';
import { PurchaseEvent } from '../../components/purchase-event';
import { PixPayment } from '../../components/pix-payment';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api';

export function OrderConfirmationClient({
  googleAdsId,
  googleAdsConversionLabel,
}: {
  googleAdsId?: string | null;
  googleAdsConversionLabel?: string | null;
}) {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get('pedido');
  const totalParam = searchParams.get('total');
  const total = totalParam ? Number(totalParam) : null;
  const paymentUrl = searchParams.get('pagamento');
  const warning = searchParams.get('aviso');
  const orderId = searchParams.get('id');
  const pagoNaHora = searchParams.get('pago') === '1';

  /**
   * A tela espera o Pix cair.
   *
   * Quem paga por Pix sai da loja, abre o banco, paga e volta — e encontrava a
   * mesma tela de antes, com o QR Code e "falta o pagamento". Não havia como
   * saber que tinha dado certo a não ser esperando o e-mail, e no meio disso a
   * pessoa paga de novo ou escreve no WhatsApp perguntando.
   *
   * Pergunta a cada cinco segundos por dez minutos. Passado isso, o e-mail de
   * confirmação já resolve e ficar consultando para sempre só gasta banco à
   * toa — foi consulta demais que derrubou a loja em 18/08.
   */
  const [pagoAgora, setPagoAgora] = useState(false);
  const paid = pagoNaHora || pagoAgora;

  useEffect(() => {
    if (!orderId || pagoNaHora) return;

    let parar = false;
    let tentativas = 0;
    const LIMITE = 120; // 120 x 5s = 10 minutos

    async function conferir() {
      if (parar || tentativas >= LIMITE) return;
      tentativas += 1;
      try {
        const res = await fetch(`${API_URL}/orders/${orderId}/pago`, { cache: 'no-store' });
        if (res.ok) {
          const { pago } = (await res.json()) as { pago: boolean };
          if (pago) {
            setPagoAgora(true);
            return;
          }
        }
      } catch {
        // Sem rede ou API fora: tenta de novo no próximo ciclo.
      }
      if (!parar) setTimeout(conferir, 5000);
    }

    const inicio = setTimeout(conferir, 5000);
    return () => {
      parar = true;
      clearTimeout(inicio);
    };
  }, [orderId, pagoNaHora]);

  return (
    <div className="container-page flex flex-col items-center gap-4 py-24 text-center">
      {orderNumber && total !== null && (
        <PurchaseEvent
          orderNumber={orderNumber}
          total={total}
          googleAdsId={googleAdsId}
          googleAdsConversionLabel={googleAdsConversionLabel}
        />
      )}
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-ink text-white">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
          className="h-8 w-8"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <p className="eyebrow text-ink/50">Tudo certo</p>
      <h1 className="section-title">Pedido recebido!</h1>
      {orderNumber && (
        <p className="text-ink/70">
          Número do pedido: <span className="font-semibold text-ink">{orderNumber}</span>
        </p>
      )}
      {total !== null && (
        <p className="text-ink/70">
          Total: <span className="font-semibold text-ink">{formatPrice(total)}</span>
        </p>
      )}

      {!paid && <PixPayment />}

      {paid ? (
        <div className="max-w-md">
          {pagoAgora && (
            <p className="mb-3 bg-ink px-4 py-3 text-sm font-semibold text-white" role="status">
              Pagamento confirmado! Recebemos seu Pix.
            </p>
          )}
          <p className="text-ink/70">
            <span className="font-semibold text-ink">Pagamento aprovado.</span> Já estamos preparando
            seu pedido — você recebe o código de rastreio por e-mail assim que ele for postado.
          </p>
        </div>
      ) : paymentUrl ? (
        <>
          <p className="max-w-md text-ink/70">
            Falta só o pagamento. Clique abaixo para concluir numa página segura.
          </p>
          <a href={paymentUrl} className="btn-primary mt-2">
            Pagar agora
          </a>
        </>
      ) : (
        <p className="max-w-md text-ink/70">
          {warning ?? 'Vamos entrar em contato pelo e-mail ou telefone informado para combinar o pagamento.'}
        </p>
      )}

      <Link href="/produtos" className="btn-secondary mt-4">
        Continuar comprando
      </Link>
    </div>
  );
}
