import Link from 'next/link';

const tools = [
  { href: '/produtos', label: 'Produtos', icon: 'M20 7 12 3 4 7m16 0-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4', color: 'text-ink' },
  { href: '/estoque', label: 'Estoque', icon: 'M21 8V7l-3-4H6L3 7v1m18 0H3m18 0-1 12H4L3 8', color: 'text-blue-600' },
  { href: '/clientes', label: 'Clientes', icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M13 3.13a4 4 0 0 1 0 7.75M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z', color: 'text-ink' },
  { href: '/vendas', label: 'Vendas rápidas', icon: 'M3 3h2l.4 2M7 13h10l3-8H5.4M7 13 5.4 5M7 13l-1.2 4.6A1 1 0 0 0 6.76 19H18M9 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm9 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z', color: 'text-ink' },
  { href: '/despesas', label: 'Despesas', icon: 'M12 1v22m5-18H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6', color: 'text-orange-500' },
  { href: '/fiscal', label: 'Área Fiscal', icon: 'M9 12h6m-6 4h6M9 8h6M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z', color: 'text-purple-600' },
];

export default function HomePage() {
  return (
    <div className="px-4 pt-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-black/60">Oi, Administrador 💪</p>
          <h1 className="page-title">Seu painel</h1>
        </div>
        <span className="rounded-full bg-ink px-4 py-2 text-xs font-bold uppercase tracking-wide text-white">
          No Excuses
        </span>
      </div>

      <a
        href="http://localhost:3000"
        target="_blank"
        rel="noreferrer"
        className="card mt-6 block bg-ink text-white hover:opacity-90"
      >
        <p className="text-sm text-white/70">Ver como o cliente vê</p>
        <p className="mt-1 text-lg font-bold">Abrir Loja Virtual ↗</p>
      </a>

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-black/50">
        Suas ferramentas
      </h2>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {tools.map((tool) => (
          <Link key={tool.href} href={tool.href} className="tool-card">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className={`h-7 w-7 ${tool.color}`}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d={tool.icon} />
            </svg>
            <span className="text-sm font-semibold">{tool.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
