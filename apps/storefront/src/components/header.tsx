'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { useCart } from '../lib/cart-context';
import { useCustomerAuth } from '../lib/customer-auth-context';
import { categories } from '../lib/products';

// Só entram no menu as categorias que têm produto. Camisetas, jaquetas e
// acessórios ainda estão vazias: mandar o cliente para uma vitrine sem nada é
// pior do que não ter a aba. Elas viram a página "Em breve".
const NAV_CATEGORIES = ['leggings', 'tops', 'shorts'];

// "Início" saiu do menu: o logo já leva para a home, e o espaço rende mais com
// Sale e Quem somos.
const navLinks = [
  { href: '/produtos', label: 'Produtos' },
  ...categories
    .filter((c) => NAV_CATEGORIES.includes(c.value))
    .map((c) => ({ href: `/produtos?categoria=${c.value}`, label: c.label })),
  { href: '/sale', label: 'Sale' },
  { href: '/em-breve', label: 'Em breve' },
  // Marca desconhecida perde venda por desconfiança, não por preço. O caminho
  // para as opiniões precisa estar no menu, e não escondido no fim da página
  // de cada peça.
  { href: '/avaliacoes', label: 'Avaliações' },
  { href: '/quem-somos', label: 'Quem somos' },
];

export function Header() {
  const { totalItems } = useCart();
  const { customer } = useCustomerAuth();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-white/90 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center" aria-label="NO EXCUSE">
          <Image src="/logo-nx.png" alt="NO EXCUSE" width={44} height={38} priority className="h-9 w-auto" />
        </Link>

        <nav className="hidden items-center gap-7 text-[11px] font-semibold uppercase tracking-[0.16em] lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="underline-offset-8 transition hover:underline"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/busca"
            className="flex h-10 w-10 items-center justify-center transition hover:opacity-60"
            aria-label="Buscar produtos"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
              <circle cx="11" cy="11" r="7" />
              <path strokeLinecap="round" d="m20 20-3.5-3.5" />
            </svg>
          </Link>
          <Link
            href={customer ? '/conta' : '/conta/entrar'}
            className="flex h-10 w-10 items-center justify-center transition hover:opacity-60"
            aria-label={customer ? 'Minha conta' : 'Entrar'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
              <circle cx="12" cy="8" r="4" />
              <path strokeLinecap="round" d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
          </Link>
          <Link
            href="/carrinho"
            className="relative flex h-10 w-10 items-center justify-center transition hover:opacity-60"
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
              <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-ink px-1 text-[10px] font-bold text-white">
                {totalItems}
              </span>
            )}
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex h-10 w-10 items-center justify-center lg:hidden"
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
              className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] transition hover:bg-paper"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
