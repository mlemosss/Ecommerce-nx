'use client';

import { useState, type FormEvent } from 'react';
import { registerStockAlert } from '../lib/api';

/**
 * "Avise-me quando chegar", na combinação que a pessoa escolheu.
 *
 * Aparece exatamente onde a venda morreria: ela chegou na peça, escolheu cor e
 * tamanho, e não tem. Sem isto a visita acaba ali e a loja nunca fica sabendo
 * que houve demanda — que é a informação que decide reposição.
 *
 * O e-mail é pedido para uma finalidade só, e a tela diz qual. Nada de caixa
 * de newsletter escondida junto: consentimento embutido em outro pedido não é
 * consentimento.
 */
export function StockAlertForm({
  productId,
  color,
  size,
}: {
  productId: string;
  color: string;
  size: string;
}) {
  const [email, setEmail] = useState('');
  const [estado, setEstado] = useState<'parado' | 'enviando' | 'pronto' | 'erro'>('parado');
  const [mensagem, setMensagem] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setEstado('enviando');
    const resultado = await registerStockAlert({ productId, color, size, email });

    if (resultado.ok) {
      setEstado('pronto');
      setEmail('');
    } else {
      setEstado('erro');
      setMensagem(resultado.message);
    }
  }

  if (estado === 'pronto') {
    return (
      <div className="border border-ink/15 bg-paper px-5 py-4" role="status">
        <p className="text-sm font-semibold">Pronto, vamos te avisar.</p>
        <p className="mt-1 text-sm text-ink/60">
          Assim que <span className="font-medium text-ink/80">{color}</span> no tamanho{' '}
          <span className="font-medium text-ink/80">{size}</span> voltar, você recebe um e-mail. Só
          esse — seu endereço não entra em nenhuma lista.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="border border-ink/15 bg-paper px-5 py-4">
      <p className="text-sm font-semibold">Avise-me quando chegar</p>
      <p className="mt-1 text-sm text-ink/60">
        Deixe seu e-mail e avisamos quando <span className="font-medium text-ink/80">{color}</span>{' '}
        no tamanho <span className="font-medium text-ink/80">{size}</span> voltar ao estoque.
      </p>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor="stock-alert-email">
          Seu e-mail
        </label>
        <input
          id="stock-alert-email"
          type="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (estado === 'erro') setEstado('parado');
          }}
          placeholder="seu@email.com"
          autoComplete="email"
          inputMode="email"
          className="input-field flex-1 bg-white"
        />
        <button
          type="submit"
          disabled={estado === 'enviando'}
          className="btn-primary shrink-0 disabled:opacity-60"
        >
          {estado === 'enviando' ? 'Enviando…' : 'Avise-me'}
        </button>
      </div>

      {estado === 'erro' && (
        <p className="mt-2 text-sm text-ink/70" role="alert">
          {mensagem}
        </p>
      )}
      <p className="mt-2 text-xs text-ink/45">
        Usamos seu e-mail só para este aviso. Depois de enviado, ele sai da lista.
      </p>
    </form>
  );
}
