import Link from 'next/link';

const sections = [
  { href: '/produtos', label: 'Produtos', description: 'Cadastro, preços e variações' },
  { href: '/estoque', label: 'Estoque', description: 'Quantidade disponível por variação' },
  { href: '/clientes', label: 'Clientes', description: 'Base de clientes (CRM)' },
  { href: '/despesas', label: 'Despesas', description: 'Custos fixos e variáveis' },
  { href: '/fiscal', label: 'Área Fiscal', description: 'Notas emitidas (simulado)' },
];

export default function GerencialPage() {
  return (
    <div className="px-4 pt-8">
      <h1 className="page-title">Gerencial</h1>
      <p className="mt-1 text-sm text-black/60">Visão geral da sua operação.</p>

      <div className="mt-6 space-y-3">
        {sections.map((s) => (
          <Link key={s.href} href={s.href} className="card flex items-center justify-between">
            <div>
              <p className="font-semibold">{s.label}</p>
              <p className="text-sm text-black/50">{s.description}</p>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5 text-black/30">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ))}
      </div>
    </div>
  );
}
