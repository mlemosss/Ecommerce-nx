'use client';

import { useState, type FormEvent } from 'react';
import { api } from '../lib/api';

/**
 * Troca da senha do administrador. Existe porque não havia nenhuma forma de
 * trocar a senha pelo produto — a única senha era a que veio no seed, e ela
 * estava versionada num repositório público.
 */
export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setDone(false);

    if (newPassword !== confirmPassword) {
      setError('A confirmação não bate com a nova senha.');
      return;
    }
    if (newPassword.length < 8) {
      setError('A nova senha precisa ter pelo menos 8 caracteres.');
      return;
    }

    setSaving(true);
    try {
      await api.patch('/auth/password', { currentPassword, newPassword });
      setDone(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError((err as Error)?.message ?? 'Não foi possível trocar a senha.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card mt-6">
      <h2 className="text-lg font-bold">Senha de acesso</h2>
      <p className="mt-1 text-sm text-black/60">
        Troque a senha do painel. A senha original do sistema é conhecida publicamente — enquanto
        não for trocada, qualquer pessoa consegue entrar aqui.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <div>
          <label htmlFor="senha-atual" className="mb-1 block text-sm font-semibold">
            Senha atual
          </label>
          <input
            id="senha-atual"
            type="password"
            required
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="input-field w-full"
          />
        </div>

        <div>
          <label htmlFor="senha-nova" className="mb-1 block text-sm font-semibold">
            Nova senha
          </label>
          <input
            id="senha-nova"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="input-field w-full"
          />
          <p className="mt-1 text-xs text-black/60">Mínimo de 8 caracteres.</p>
        </div>

        <div>
          <label htmlFor="senha-confirma" className="mb-1 block text-sm font-semibold">
            Repita a nova senha
          </label>
          <input
            id="senha-confirma"
            type="password"
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="input-field w-full"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {done && (
          <p role="status" className="text-sm font-semibold text-green-700">
            Senha trocada. Use a nova no próximo login.
          </p>
        )}

        <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
          {saving ? 'Trocando...' : 'Trocar senha'}
        </button>
      </form>
    </section>
  );
}
