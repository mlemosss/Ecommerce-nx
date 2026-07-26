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
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await register({ name, email, password, phone: phone || undefined });
      router.push('/conta');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar conta');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container-page flex min-h-[70vh] flex-col items-center justify-center py-12">
      <div className="w-full max-w-sm">
        <h1 className="section-title text-center">Criar conta</h1>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <input
            required
            placeholder="Nome completo"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-full border border-black/10 px-5 py-3 text-sm focus:border-ink focus:outline-none"
          />
          <input
            required
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-full border border-black/10 px-5 py-3 text-sm focus:border-ink focus:outline-none"
          />
          <input
            placeholder="Telefone (opcional)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-full border border-black/10 px-5 py-3 text-sm focus:border-ink focus:outline-none"
          />
          <input
            required
            type="password"
            minLength={6}
            placeholder="Senha (mín. 6 caracteres)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-full border border-black/10 px-5 py-3 text-sm focus:border-ink focus:outline-none"
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? 'Criando conta...' : 'Criar conta'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-black/60">
          Já tem conta?{' '}
          <Link href="/conta/entrar" className="font-semibold underline underline-offset-4">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
