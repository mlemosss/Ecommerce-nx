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
      <p
        role="status"
        className="border border-ink/15 bg-white px-6 py-4 text-sm font-medium text-ink"
      >
        Prontinho! Você vai receber nossas novidades e promoções em {email}.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-3 sm:flex-row">
      <label htmlFor="newsletter-email" className="sr-only">
        Seu melhor e-mail
      </label>
      <input
        id="newsletter-email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Seu melhor e-mail"
        className="w-full flex-1 border border-ink/20 bg-white px-5 py-4 text-sm text-ink placeholder:text-ink/50 focus:border-ink focus:outline-none"
      />
      <button type="submit" className="btn-primary shrink-0">
        Quero descontos
      </button>
    </form>
  );
}
