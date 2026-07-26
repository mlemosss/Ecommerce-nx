'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { useCart } from '../lib/cart-context';
import { useCustomerAuth } from '../lib/customer-auth-context';
import { categories } from '../lib/products';

const navLinks = [
  { href: '/', label: 'Início' },
  { href: '/produtos', label: 'Todos os produtos' },
  ...categories.slice(0, 4).map((c) => ({ href: `/produtos?categoria=${c.value}`, label: c.label })),
];

export function Header() {
  const { totalItems } = useCart();
  const { customer } = useCustomerAuth();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-white/90 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center" aria-label="No Excuse">
          <Image src="/logo-nx.png" alt="No Excuse" width={44} height={38} priority className="h-9 w-auto" />
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium lg:flex">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="transition hover:text-volt2/80 hover:opacity-70">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/busca"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 transition hover:bg-ink hover:text-white"
            aria-label="Buscar produtos"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
              <circle cx="11" cy="11" r="7" />
              <path strokeLinecap="round" d="m20 20-3.5-3.5" />
            </svg>
          </Link>
          <Link
            href={customer ? '/conta' : '/conta/entrar'}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 transition hover:bg-ink hover:text-white"
            aria-label={customer ? 'Minha conta' : 'Entrar'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
              <circle cx="12" cy="8" r="4" />
              <path strokeLinecap="round" d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
          </Link>
          <Link
            href="/carrinho"
            className="relative flex h-10 w-10 items-center justify-center rounded-full border border-black/10 transition hover:bg-ink hover:text-white"
            aria-label="Ver carrinho"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 3h2l.4 2M7 13h10l3-8H5.4M7 13 5.4 5M7 13l-1.2 4.6A1 1 0 0 0 6.76 19H18M9 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm9 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
              />
            </svg>
            {totalItems > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-volt2 px-1 text-[10px] font-bold text-ink">
                {totalItems}
              </span>
            )}
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 lg:hidden"
            aria-label="Abrir menu"
            aria-expanded={open}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
              {open ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <nav className="flex flex-col gap-1 border-t border-black/5 bg-white px-4 py-3 shadow-lg lg:hidden">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-black/5"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
