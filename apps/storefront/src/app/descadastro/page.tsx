import { Suspense } from 'react';
import { UnsubscribeClient } from './unsubscribe-client';

export const metadata = {
  title: 'Descadastro — NO EXCUSE',
  robots: { index: false, follow: false },
};

export default function UnsubscribePage() {
  return (
    <Suspense
      fallback={
        <div className="container-page py-24 text-center text-sm text-ink/60">Carregando...</div>
      }
    >
      <UnsubscribeClient />
    </Suspense>
  );
}
