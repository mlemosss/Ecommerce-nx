import { Suspense } from 'react';
import { SetPasswordClient } from './set-password-client';

export const metadata = {
  title: 'Definir senha — NO EXCUSE',
};

export default function SetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="container-page py-24 text-center text-sm text-ink/60">Carregando...</div>
      }
    >
      <SetPasswordClient />
    </Suspense>
  );
}
