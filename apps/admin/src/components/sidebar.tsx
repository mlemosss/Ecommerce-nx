'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogoutButton } from './logout-button';

interface NavItem {
  href: string;
  label: string;
  icon: string;
  section?: string;
}

const items: NavItem[] = [
  { href: '/', label: 'Início', icon: 'M3 11.5 12 4l9 7.5M5 10v10h14V10' },
  { href: '/pedidos', label: 'Pedidos', icon: 'M3 3h2l.4 2M7 13h10l3-8H5.4M7 13 5.4 5M7 13l-1.2 4.6A1 1 0 0 0 6.76 19H18M9 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm9 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z' },
  { href: '/produtos', label: 'Produtos', icon: 'M20 7 12 3 4 7m16 0-8 4m8-4v10l-8 4m0-10L4 7m8 4v10' },
  { href: '/estoque', label: 'Estoque', icon: 'M21 8V7l-3-4H6L3 7v1m18 0H3m18 0-1 12H4L3 8' },
  { href: '/clientes', label: 'Clientes', icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M13 3.13a4 4 0 0 1 0 7.75M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z' },
  { href: '/vendas', label: 'Vendas rápidas', icon: 'M3 3h2l.4 2M7 13h10l3-8H5.4', section: 'Financeiro' },
  { href: '/despesas', label: 'Despesas', icon: 'M12 1v22m5-18H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' },
  { href: '/fiscal', label: 'Área Fiscal', icon: 'M9 12h6m-6 4h6M9 8h6M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z' },
  { href: '/cupons', label: 'Cupons', icon: 'M9 5H4a1 1 0 0 0-1 1v3a2 2 0 0 1 0 4v3a1 1 0 0 0 1 1h5m0-12h11a1 1 0 0 1 1 1v3a2 2 0 0 0 0 4v3a1 1 0 0 1-1 1H9m0-12v12' },
  { href: '/meta', label: 'Integração Meta', icon: 'M18 8a3 3 0 1 0-2.83-4H8.83A3 3 0 1 0 6 8c0 .35.06.69.17 1L4.5 12.6a3 3 0 1 0 1.6 2.2l3.5-2a3 3 0 0 0 4.8 0l3.5 2a3 3 0 1 0 1.6-2.2L18.83 9c.11-.31.17-.65.17-1Z', section: 'Canais' },
  { href: '/configuracoes', label: 'Configurações', icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 1-.1 1.2l2.1 1.6-2 3.5-2.5-1a7.5 7.5 0 0 1-2 1.2L14.5 21h-5l-.4-2.5a7.5 7.5 0 0 1-2-1.2l-2.5 1-2-3.5 2.1-1.6a7.4 7.4 0 0 1 0-2.4L2.6 8.2l2-3.5 2.5 1a7.5 7.5 0 0 1 2-1.2L9.5 2h5l.4 2.5a7.5 7.5 0 0 1 2 1.2l2.5-1 2 3.5-2.1 1.6c.07.4.1.79.1 1.2Z' },
];

export function Sidebar() {
  const pathname = usePathname();
  if (pathname === '/login') return null;

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col overflow-y-auto border-r border-black/10 bg-white px-3 py-4 md:flex">
      <div className="flex items-center gap-2 px-3 pb-4">
        <span className="text-lg font-black tracking-tighter">
          N<span className="text-accent">X</span>
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-black/40">Gerencial</span>
      </div>

      <nav className="flex flex-col gap-0.5">
        {items.map((item) => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <span key={item.href}>
              {item.section && (
                <p className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-widest text-black/40">
                  {item.section}
                </p>
              )}
              <Link
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  active ? 'bg-ink text-white' : 'text-black/60 hover:bg-black/5 hover:text-ink'
                }`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-[18px] w-[18px] shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
                {item.label}
              </Link>
            </span>
          );
        })}
      </nav>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-black/10 pt-3">
        <span className="rounded-full bg-ink px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white">
          No Excuse
        </span>
        <LogoutButton />
      </div>
    </aside>
  );
}
