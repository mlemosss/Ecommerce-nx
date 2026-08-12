'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api';

/**
 * Descadastro de um clique, aberto pelo link no rodapé do e-mail.
 *
 * Acontece sozinho ao abrir a página: obrigar a clicar mais uma vez, ou a fazer
 * login, é exatamente o atrito que a LGPD não admite para o direito de oposição.
 */
export function UnsubscribeClient() {
  const searchParams = useSearchParams();
  const cartId = searchParams.get('c') ?? '';
  const [state, setState] = useState<'loading' | 'done' | 'error'>('loading');

  useEffect(() => {
    if (!cartId) {
      setState('error');
      return;
    }
    fetch(`${API_URL}/abandoned-cart/${encodeURIComponent(cartId)}/unsubscribe`, {
      method: 'POST',
    })
      .then((res) => setState(res.ok ? 'done' : 'error'))
      .catch(() => setState('error'));
  }, [cartId]);

  return (
    <div className="container-page flex flex-col items-center gap-5 py-28 text-center">
      <p className="eyebrow text-ink/50">Descadastro</p>

      {state === 'loading' && (
        <p className="text-sm text-ink/60" role="status">
          Removendo seu e-mail...
        </p>
      )}

      {state === 'done' && (
        <>
          <h1 className="section-title">Pronto, você saiu da lista</h1>
          <p className="max-w-md text-sm leading-relaxed text-ink/60">
            Apagamos seu e-mail dos lembretes de carrinho. Você continua recebendo apenas os avisos
            dos pedidos que fizer.
          </p>
        </>
      )}

      {state === 'error' && (
        <>
          <h1 className="section-title">Link inválido</h1>
          <p className="max-w-md text-sm leading-relaxed text-ink/60">
            Esse link não é válido ou o e-mail já tinha sido removido. Se continuar recebendo,
            responda o e-mail que a gente resolve.
          </p>
        </>
      )}

      <Link href="/produtos" className="btn-primary mt-2">
        Ver produtos
      </Link>
    </div>
  );
}
