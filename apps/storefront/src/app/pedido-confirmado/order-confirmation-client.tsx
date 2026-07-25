'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { formatPrice } from '../../lib/format';

export function OrderConfirmationClient() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get('pedido');
  const totalParam = searchParams.get('total');
  const total = totalParam ? Number(totalParam) : null;

  return (
    <div className="container-page flex flex-col items-center gap-4 py-24 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-volt2 text-ink">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-8 w-8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h1 className="section-title">Pedido confirmado!</h1>
      {orderNumber && (
        <p className="text-black/60">
          Número do pedido: <span className="font-semibold text-ink">{orderNumber}</span>
        </p>
      )}
      {total !== null && (
        <p className="text-black/60">
          Total pago: <span className="font-semibold text-ink">{formatPrice(total)}</span>
        </p>
      )}
      <p className="max-w-md text-black/60">
        Enviamos os detalhes para o seu e-mail. Este é um pedido simulado para fins de demonstração.
      </p>
      <Link href="/produtos" className="btn-primary mt-4">
        Continuar comprando
      </Link>
    </div>
  );
}
