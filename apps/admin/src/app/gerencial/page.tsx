'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { formatPrice } from '../../lib/format';
import type { DashboardSummary } from '../../lib/types';
import { PendingIntegrations } from '../../components/pending-integrations';

const today = new Date().toLocaleDateString('pt-BR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

export default function FinancialDashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  useEffect(() => {
    api.get<DashboardSummary>('/dashboard/summary').then(setSummary);
  }, []);

  return (
    <div className="px-4 pt-8">
      <h1 className="page-title">Seu financeiro</h1>

      <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-black/50">
        Fluxo de caixa
      </h2>
      <p className="mt-1 text-sm capitalize text-black/60">{today}</p>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-emerald-50 p-4">
          <p className="flex items-center gap-1 text-xs text-emerald-700">↑ Entradas do dia</p>
          <p className="mt-1 text-lg font-bold text-emerald-700">
            {summary ? formatPrice(summary.todayIn) : '—'}
          </p>
        </div>
        <div className="rounded-2xl bg-orange-50 p-4">
          <p className="flex items-center gap-1 text-xs text-orange-700">↓ Saídas do dia</p>
          <p className="mt-1 text-lg font-bold text-orange-700">
            {summary ? formatPrice(summary.todayOut) : '—'}
          </p>
        </div>
      </div>

      <div className="card mt-3 flex items-center justify-between">
        <span className="text-sm text-black/60">Caixa atual</span>
        <span className="text-lg font-bold">{summary ? formatPrice(summary.cashBalance) : '—'}</span>
      </div>

      <PendingIntegrations />

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-black/50">
        Gerenciais
      </h2>
      <div className="mt-3 space-y-2">
        <div className="card flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-medium">📊 Receitas</span>
          <span className="rounded-lg border border-black/10 px-3 py-1 text-sm font-semibold text-emerald-700">
            Mês atual: {summary ? formatPrice(summary.monthRevenue) : '—'}
          </span>
        </div>
        <div className="card flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-medium">💸 Despesas</span>
          <span className="rounded-lg border border-black/10 px-3 py-1 text-sm font-semibold text-orange-600">
            Mês atual: {summary ? formatPrice(summary.monthExpenses) : '—'}
          </span>
        </div>
      </div>

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-black/50">
        Controle
      </h2>
      <div className="mt-3 space-y-2">
        <Link href="/estoque" className="card flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-medium">📦 Estoque</span>
          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
            Análise completa
          </span>
        </Link>
        <Link href="/fiscal" className="card flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-medium">🧾 Área Fiscal</span>
          <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
            Notas fiscais (simulado)
          </span>
        </Link>
        <div className="card flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-medium">💰 Lucro Bruto</span>
          <span className="font-semibold">{summary ? formatPrice(summary.grossProfit) : '—'}</span>
        </div>
        <Link href="/pagamentos-personalizados" className="card flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-medium">💳 Pagamentos personalizados</span>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
            Registrar pagamento
          </span>
        </Link>
        <Link href="/importar" className="card flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-medium">📥 Importar dados</span>
          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
            CSV ou XML
          </span>
        </Link>
        <Link href="/depoimentos" className="card flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-medium">💬 Depoimentos</span>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
            Com foto
          </span>
        </Link>
        <Link href="/avaliacoes" className="card flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-medium">⭐ Avaliações</span>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
            De produtos
          </span>
        </Link>
        <Link href="/shopee" className="card flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-medium">🛒 Shopee</span>
          <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
            Anunciar produtos
          </span>
        </Link>
        <Link href="/emails" className="card flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-medium">✉️ Fluxo de e-mails</span>
          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
            Ativar/desativar
          </span>
        </Link>
      </div>

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-black/50">
        Contas de clientes
      </h2>
      <div className="mt-3 space-y-2">
        <Link href="/contas" className="card flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-medium">📋 Abertas</span>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
            {summary?.openAccounts.count ?? 0}
          </span>
        </Link>
        <Link href="/contas?filtro=parceladas" className="card flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-medium">🗂️ Parceladas</span>
          <span className="rounded-full bg-fuchsia-100 px-3 py-1 text-xs font-bold text-fuchsia-700">
            {summary?.installmentSales.count ?? 0}
          </span>
        </Link>
        <Link href="/orcamentos" className="card flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-medium">🧮 Orçamentos</span>
          <span className="rounded-full bg-fuchsia-100 px-3 py-1 text-xs font-semibold text-fuchsia-700">
            Propostas de venda
          </span>
        </Link>
      </div>

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-black/50">
        Venda online
      </h2>
      <div className="mt-3 space-y-2">
        <Link href="/pedidos" className="card flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-medium">🧾 Pedidos</span>
          <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">
            Ver pedidos
          </span>
        </Link>
        <a
          href={process.env.NEXT_PUBLIC_STOREFRONT_URL ?? 'https://no-excuse-storefront.vercel.app'}
          target="_blank"
          rel="noreferrer"
          className="card flex items-center justify-between"
        >
          <span className="flex items-center gap-2 text-sm font-medium">🌐 Seu site</span>
          <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">
            Loja online
          </span>
        </a>
      </div>

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-black/50">
        Movimentações
      </h2>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Link href="/vendas/historico?periodo=mes" className="card">
          <p className="text-sm font-medium">Mês atual</p>
        </Link>
        <Link href="/vendas/historico" className="card">
          <p className="text-sm font-medium">Histórico</p>
        </Link>
      </div>
    </div>
  );
}
