'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/vendas', label: 'Vendas', icon: 'M3 3h2l.4 2M7 13h10l3-8H5.4M7 13 5.4 5M7 13l-1.2 4.6A1 1 0 0 0 6.76 19H18M9 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm9 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z' },
  { href: '/', label: 'Início', icon: 'M3 11.5 12 4l9 7.5M5 10v10h14V10' },
  { href: '/gerencial', label: 'Gerencial', icon: 'M12 2v6m0 8v6m10-10h-6M8 12H2m15.36-6.36-4.24 4.24m-6.24 0L2.64 5.64m0 12.72 4.24-4.24m6.24 0 4.24 4.24' },
];

export function BottomNav() {
  const pathname = usePathname();

  if (pathname === '/login') return null;

  return (
    <nav className="sticky bottom-0 z-40 flex border-t border-black/10 bg-white">
      {tabs.map((tab) => {
        const active = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium ${
              active ? 'text-accent' : 'text-black/60'
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
            </svg>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
