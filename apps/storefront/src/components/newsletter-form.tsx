'use client';

import { useState, type FormEvent } from 'react';

export function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email) return;
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <p className="rounded-full bg-white/10 px-6 py-3 text-sm font-medium text-white">
        Prontinho! Você vai receber nossas novidades e promoções em {email}.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-3 sm:flex-row">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Seu melhor e-mail"
        className="w-full flex-1 rounded-full border border-white/20 bg-white/5 px-5 py-3 text-sm text-white placeholder:text-white/40 focus:border-volt2 focus:outline-none"
      />
      <button type="submit" className="btn-primary bg-volt2 text-ink hover:bg-white">
        Quero descontos
      </button>
    </form>
  );
}
