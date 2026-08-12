'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { formatPrice } from '../../lib/format';
import { PurchaseEvent } from '../../components/purchase-event';
import { PixPayment } from '../../components/pix-payment';

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
  const paid = searchParams.get('pago') === '1';

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
        <p className="max-w-md text-ink/70">
          <span className="font-semibold text-ink">Pagamento aprovado.</span> Já estamos preparando
          seu pedido — você recebe o código de rastreio por e-mail assim que ele for postado.
        </p>
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
