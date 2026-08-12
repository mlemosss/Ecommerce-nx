'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useCustomerAuth } from '../lib/customer-auth-context';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api';
const TOKEN_KEY = 'no-excuse:customer-token';

/**
 * Direitos do titular na própria conta: baixar os dados e excluir a conta.
 * A política de privacidade promete os dois — prometer sem entregar é pior do
 * que não prometer.
 */
export function PrivacyActions() {
  const { logout } = useCustomerAuth();
  const router = useRouter();
  const [busy, setBusy] = useState<'export' | 'delete' | null>(null);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);

  function token() {
    return window.localStorage.getItem(TOKEN_KEY);
  }

  async function handleExport() {
    setBusy('export');
    setError('');
    try {
      const res = await fetch(`${API_URL}/customer-auth/me/export`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) throw new Error('Não foi possível gerar seus dados agora.');
      const data = await res.json();

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'meus-dados-no-excuse.json';
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível gerar seus dados agora.');
    } finally {
      setBusy(null);
    }
  }

  async function handleDelete() {
    setBusy('delete');
    setError('');
    try {
      const res = await fetch(`${API_URL}/customer-auth/me`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) throw new Error('Não foi possível excluir a conta agora.');
      logout();
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível excluir a conta agora.');
      setBusy(null);
    }
  }

  return (
    <section className="mt-12 border-t border-line pt-8">
      <p className="eyebrow text-ink/50">Seus dados</p>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleExport}
          disabled={busy !== null}
          className="btn-secondary !px-6 !py-3 disabled:opacity-60"
        >
          {busy === 'export' ? 'Gerando...' : 'Baixar meus dados'}
        </button>

        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/60 underline underline-offset-4 transition hover:text-ink"
          >
            Excluir minha conta
          </button>
        ) : (
          <div className="w-full border border-ink/20 bg-paper p-5">
            <p className="text-sm font-semibold">Excluir a conta é definitivo.</p>
            <p className="mt-2 text-sm leading-relaxed text-ink/70">
              Seu cadastro, favoritos e avaliações são apagados. Os pedidos continuam registrados
              por exigência fiscal, mas deixam de ter seus dados pessoais.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleDelete}
                disabled={busy !== null}
                className="btn-primary !px-6 !py-3 disabled:opacity-60"
              >
                {busy === 'delete' ? 'Excluindo...' : 'Confirmar exclusão'}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/60 underline underline-offset-4"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </section>
  );
}
