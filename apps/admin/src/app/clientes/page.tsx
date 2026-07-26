'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { TopBar } from '../../components/top-bar';
import { api } from '../../lib/api';
import { initials } from '../../lib/format';
import type { Customer } from '../../lib/types';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get<Customer[]>('/customers').then(setCustomers);
  }, []);

  const filtered = useMemo(() => {
    if (!customers) return [];
    const term = search.trim().toLowerCase();
    return term ? customers.filter((c) => c.name.toLowerCase().includes(term)) : customers;
  }, [customers, search]);

  const grouped = useMemo(() => {
    const groups: Record<string, Customer[]> = {};
    for (const customer of filtered) {
      const letter = customer.name[0]?.toUpperCase() ?? '#';
      groups[letter] = groups[letter] ?? [];
      groups[letter].push(customer);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  return (
    <div>
      <TopBar
        title="Clientes"
        rightAction={
          <Link href="/clientes/novo" className="btn-primary !px-4 !py-2 text-xs">
            + Adicionar
          </Link>
        }
      />

      <div className="px-4 pt-4">
        <div className="flex items-center justify-between gap-2">
          <h1 className="page-title">Lista de clientes</h1>
          <Link href="/importar?tipo=clientes" className="text-xs font-semibold text-accent underline">
            Importar CSV/XML
          </Link>
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar cliente"
          className="input-field mt-4"
        />

        {customers && (
          <p className="mt-3 inline-block rounded-full border border-black/10 px-3 py-1 text-xs font-medium">
            {filtered.length} clientes na lista
          </p>
        )}

        {customers === null && <p className="mt-8 text-center text-sm text-black/50">Carregando...</p>}

        {grouped.map(([letter, items]) => (
          <div key={letter} className="mt-4">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-black/5 text-sm font-semibold">
              {letter}
            </span>
            <div className="mt-2 space-y-2">
              {items.map((customer) => (
                <Link
                  key={customer.id}
                  href={`/clientes/${customer.id}`}
                  className="flex items-center gap-3 rounded-2xl bg-neutral-100 p-3"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-semibold shadow-sm">
                    {initials(customer.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{customer.name}</p>
                    {customer.phone && <p className="text-xs text-black/50">{customer.phone}</p>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
