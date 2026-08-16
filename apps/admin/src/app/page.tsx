import Link from 'next/link';
import { LogoutButton } from '../components/logout-button';
import { Dashboard } from '../components/dashboard';

const tools = [
  { href: '/pedidos', label: 'Pedidos', icon: 'M6 2h9l3 3v17l-3-2-3 2-3-2-3 2V2Zm3 6h6M9 12h6M9 16h4', color: 'text-emerald-600' },
  { href: '/produtos', label: 'Produtos', icon: 'M20 7 12 3 4 7m16 0-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4', color: 'text-ink' },
  { href: '/estoque', label: 'Estoque', icon: 'M21 8V7l-3-4H6L3 7v1m18 0H3m18 0-1 12H4L3 8', color: 'text-blue-600' },
  { href: '/avise-me', label: 'Avise-me', icon: 'M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0', color: 'text-amber-600' },
  // Sai de dentro de Gerencial para o menu principal: com o link de avaliação
  // sem login funcionando, aprovar avaliação vira tarefa de rotina.
  { href: '/avaliacoes', label: 'Avaliações', icon: 'm12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1L12 2Z', color: 'text-amber-500' },
  { href: '/clientes', label: 'Clientes', icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M13 3.13a4 4 0 0 1 0 7.75M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z', color: 'text-ink' },
  { href: '/vendas', label: 'Vendas rápidas', icon: 'M3 3h2l.4 2M7 13h10l3-8H5.4M7 13 5.4 5M7 13l-1.2 4.6A1 1 0 0 0 6.76 19H18M9 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm9 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z', color: 'text-ink' },
  { href: '/despesas', label: 'Despesas', icon: 'M12 1v22m5-18H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6', color: 'text-orange-500' },
  { href: '/fiscal', label: 'Área Fiscal', icon: 'M9 12h6m-6 4h6M9 8h6M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z', color: 'text-purple-600' },
  { href: '/meta', label: 'Integração Meta', icon: 'M18 8a3 3 0 1 0-2.83-4H8.83A3 3 0 1 0 6 8c0 .35.06.69.17 1L4.5 12.6a3 3 0 1 0 1.6 2.2l3.5-2a3 3 0 0 0 4.8 0l3.5 2a3 3 0 1 0 1.6-2.2L18.83 9c.11-.31.17-.65.17-1Z', color: 'text-blue-700' },
  { href: '/cupons', label: 'Cupons', icon: 'M9 5H4a1 1 0 0 0-1 1v3a2 2 0 0 1 0 4v3a1 1 0 0 0 1 1h5m0-12h11a1 1 0 0 1 1 1v3a2 2 0 0 0 0 4v3a1 1 0 0 1-1 1H9m0-12v12', color: 'text-pink-600' },
  { href: '/configuracoes', label: 'Configurações', icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 1-.1 1.2l2.1 1.6-2 3.5-2.5-1a7.5 7.5 0 0 1-2 1.2L14.5 21h-5l-.4-2.5a7.5 7.5 0 0 1-2-1.2l-2.5 1-2-3.5 2.1-1.6a7.4 7.4 0 0 1 0-2.4L2.6 8.2l2-3.5 2.5 1a7.5 7.5 0 0 1 2-1.2L9.5 2h5l.4 2.5a7.5 7.5 0 0 1 2 1.2l2.5-1 2 3.5-2.1 1.6c.07.4.1.79.1 1.2Z', color: 'text-gray-600' },
];

export default function HomePage() {
  return (
    <div className="px-4 pt-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-black/60">Oi, Administrador 💪</p>
          <h1 className="page-title">Seu painel</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-ink px-4 py-2 text-xs font-bold uppercase tracking-wide text-white">
            NO EXCUSE
          </span>
          <LogoutButton />
        </div>
      </div>

      <a
        href={process.env.NEXT_PUBLIC_STOREFRONT_URL ?? 'https://www.noexcusenx.com.br'}
        target="_blank"
        rel="noreferrer"
        className="card mt-6 block bg-ink text-white hover:opacity-90"
      >
        <p className="text-sm text-white/70">Ver como o cliente vê</p>
        <p className="mt-1 text-lg font-bold">Abrir Loja Virtual ↗</p>
      </a>

      <Dashboard />

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-black/50">
        Suas ferramentas
      </h2>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
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
