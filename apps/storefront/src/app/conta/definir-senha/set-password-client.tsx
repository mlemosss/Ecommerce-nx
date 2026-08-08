'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api';
const TOKEN_KEY = 'no-excuse:customer-token';

export function SetPasswordClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('A confirmação não bate com a senha.');
      return;
    }
    if (password.length < 8) {
      setError('A senha precisa ter pelo menos 8 caracteres.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/customer-auth/set-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.message ?? 'Não foi possível definir a senha.');
      }
      // Já vem autenticado: o token do link valeu como confirmação do e-mail.
      if (body?.token) window.localStorage.setItem(TOKEN_KEY, body.token);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível definir a senha.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <div className="container-page flex flex-col items-center gap-4 py-24 text-center">
        <p className="eyebrow text-ink/50">Minha conta</p>
        <h1 className="section-title">Link inválido</h1>
        <p className="max-w-md text-sm text-ink/60">
          Abra o link que enviamos no seu e-mail. Ele vale por 1 hora e só pode ser usado uma vez.
        </p>
        <Link href="/conta/cadastro" className="btn-primary mt-2">
          Tentar de novo
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="container-page flex flex-col items-center gap-4 py-24 text-center">
        <p className="eyebrow text-ink/50">Tudo certo</p>
        <h1 className="section-title">Senha criada</h1>
        <p className="max-w-md text-sm text-ink/60">
          Sua conta está pronta. Seus pedidos anteriores já aparecem em Minha conta.
        </p>
        <Link href="/conta" className="btn-primary mt-2">
          Ir para minha conta
        </Link>
      </div>
    );
  }

  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-14">
      <div className="w-full max-w-sm">
        <p className="eyebrow text-center text-ink/50">Minha conta</p>
        <h1 className="section-title mt-3 text-center">Definir senha</h1>
        <p className="mt-4 text-center text-sm text-ink/60">
          Você já tem pedidos com esse e-mail. Crie uma senha para acessá-los.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="senha" className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em]">
              Nova senha
            </label>
            <input
              id="senha"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-ink/20 px-5 py-4 text-sm focus:border-ink focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="senha-confirma"
              className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em]"
            >
              Repita a senha
            </label>
            <input
              id="senha-confirma"
              type="password"
              required
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full border border-ink/20 px-5 py-4 text-sm focus:border-ink focus:outline-none"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button type="submit" disabled={submitting} className="btn-primary w-full disabled:opacity-60">
            {submitting ? 'Salvando...' : 'Criar senha'}
          </button>
        </form>
      </div>
    </div>
  );
}
