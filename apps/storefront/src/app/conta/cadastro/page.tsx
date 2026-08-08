'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useCustomerAuth } from '../../../lib/customer-auth-context';

export default function RegisterPage() {
  const { register } = useCustomerAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pendingMessage, setPendingMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setPendingMessage('');
    setSubmitting(true);
    try {
      const result = await register({ name, email, password, phone: phone || undefined });
      if (result.pendingEmailConfirmation) {
        setPendingMessage(result.message ?? 'Enviamos um link para o seu e-mail.');
        return;
      }
      router.push('/conta');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar conta');
    } finally {
      setSubmitting(false);
    }
  }

  if (pendingMessage) {
    return (
      <div className="container-page flex flex-col items-center gap-4 py-24 text-center">
        <p className="eyebrow text-ink/50">Quase lá</p>
        <h1 className="section-title">Confira seu e-mail</h1>
        <p className="max-w-md text-sm leading-relaxed text-ink/70">{pendingMessage}</p>
        <p className="max-w-md text-xs text-ink/60">
          O link vale por 1 hora. Se não chegar, veja a caixa de spam.
        </p>
        <Link href="/produtos" className="btn-secondary mt-2">
          Continuar comprando
        </Link>
      </div>
    );
  }

  return (
    <div className="container-page flex min-h-[70vh] flex-col items-center justify-center py-12">
      <div className="w-full max-w-sm">
        <p className="eyebrow text-center text-ink/50">Minha conta</p>
        <h1 className="section-title mt-3 text-center">Criar conta</h1>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <input
            required
            placeholder="Nome completo"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-ink/20 px-5 py-4 text-sm focus:border-ink focus:outline-none"
          />
          <input
            required
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-ink/20 px-5 py-4 text-sm focus:border-ink focus:outline-none"
          />
          <input
            placeholder="Telefone (opcional)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full border border-ink/20 px-5 py-4 text-sm focus:border-ink focus:outline-none"
          />
          <input
            required
            type="password"
            minLength={6}
            placeholder="Senha (mín. 6 caracteres)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-ink/20 px-5 py-4 text-sm focus:border-ink focus:outline-none"
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? 'Criando conta...' : 'Criar conta'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink/70">
          Já tem conta?{' '}
          <Link href="/conta/entrar" className="font-semibold underline underline-offset-4">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
