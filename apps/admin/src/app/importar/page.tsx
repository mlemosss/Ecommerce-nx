'use client';

import { Suspense, useState, type ChangeEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { TopBar } from '../../components/top-bar';
import { api, ApiError } from '../../lib/api';

type Kind = 'clientes' | 'produtos';

interface ImportResult {
  total: number;
  created: number;
  updated: number;
  errors: { row: number; message: string }[];
}

const CONFIG: Record<
  Kind,
  { label: string; endpoint: string; columns: string[]; required: string[] }
> = {
  clientes: {
    label: 'Clientes',
    endpoint: '/imports/customers',
    columns: [
      'name',
      'personType (PF/PJ)',
      'documentNumber',
      'phone',
      'email',
      'zipCode',
      'street',
      'number',
      'complement',
      'neighborhood',
      'city',
      'state',
    ],
    required: ['name'],
  },
  produtos: {
    label: 'Produtos',
    endpoint: '/imports/products',
    columns: ['name', 'category', 'price', 'costPrice', 'compareAtPrice', 'color', 'size', 'stock'],
    required: ['name', 'category', 'price', 'costPrice', 'color', 'size'],
  },
};

function ImportSection({ kind }: { kind: Kind }) {
  const config = CONFIG[kind];
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    const format = ext === 'xml' ? 'xml' : ext === 'csv' ? 'csv' : null;
    if (!format) {
      setError('Envie um arquivo .csv ou .xml');
      return;
    }

    setError('');
    setResult(null);
    setLoading(true);
    try {
      const content = await file.text();
      const res = await api.post<ImportResult>(config.endpoint, { format, content });
      setResult(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao importar arquivo');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card space-y-3">
      <p className="text-sm font-semibold uppercase tracking-wide text-black/50">{config.label}</p>

      <p className="text-sm text-black/60">
        Colunas esperadas ({config.required.length < config.columns.length ? 'obrigatórias em negrito' : 'todas obrigatórias'}):
      </p>
      <p className="rounded-xl bg-black/5 p-3 text-xs">
        {config.columns.map((col, i) => {
          const name = col.split(' ')[0];
          const isRequired = config.required.includes(name);
          return (
            <span key={col}>
              {i > 0 && ', '}
              <span className={isRequired ? 'font-bold' : ''}>{col}</span>
            </span>
          );
        })}
      </p>

      <label className="btn-primary block w-full cursor-pointer text-center">
        {loading ? 'Importando...' : `Escolher arquivo CSV ou XML de ${config.label.toLowerCase()}`}
        <input type="file" accept=".csv,.xml" onChange={handleFile} disabled={loading} className="hidden" />
      </label>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

      {result && (
        <div className="space-y-2">
          <p className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
            {result.total} linha(s) processada(s): {result.created} criado(s), {result.updated} atualizado(s)
            {result.errors.length > 0 && `, ${result.errors.length} com erro`}.
          </p>
          {result.errors.length > 0 && (
            <ul className="space-y-1 rounded-xl bg-red-50 p-3 text-xs text-red-700">
              {result.errors.map((err) => (
                <li key={err.row}>
                  Linha {err.row}: {err.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

function ImportPageContent() {
  const searchParams = useSearchParams();
  const initial = searchParams.get('tipo') === 'produtos' ? 'produtos' : 'clientes';
  const [tab, setTab] = useState<Kind>(initial as Kind);

  return (
    <div>
      <TopBar title="Importar dados" />

      <div className="space-y-4 px-4 pb-8 pt-4">
        <div className="flex gap-2">
          {(['clientes', 'produtos'] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={`flex-1 rounded-full border px-4 py-2 text-sm font-medium transition ${
                tab === k ? 'border-ink bg-ink text-white' : 'border-black/10'
              }`}
            >
              {CONFIG[k].label}
            </button>
          ))}
        </div>

        <ImportSection key={tab} kind={tab} />
      </div>
    </div>
  );
}

export default function ImportPage() {
  return (
    <Suspense fallback={<div className="px-4 pt-24 text-center text-sm text-black/50">Carregando...</div>}>
      <ImportPageContent />
    </Suspense>
  );
}
