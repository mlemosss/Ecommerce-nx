'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { TopBar } from '../../components/top-bar';
import { api, ApiError } from '../../lib/api';

interface ShopeeStatus {
  configured: boolean;
  connected: boolean;
  shopId?: string;
  defaultCategoryId?: number | null;
  message?: string;
}

interface ShopeeCategory {
  categoryId: number;
  originalCategoryName: string;
}

interface SyncResult {
  total: number;
  created: number;
  updated: number;
  errors: { name: string; error?: string }[];
}

function ShopeeIntegrationPageContent() {
  const searchParams = useSearchParams();
  const connectedParam = searchParams.get('connected');

  const [status, setStatus] = useState<ShopeeStatus | null>(null);
  const [categories, setCategories] = useState<ShopeeCategory[] | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState('');

  function loadStatus() {
    api.get<ShopeeStatus>('/shopee/status').then(setStatus);
  }

  useEffect(loadStatus, []);

  useEffect(() => {
    if (status?.connected) {
      api.get<ShopeeCategory[]>('/shopee/categories').then(setCategories).catch(() => setCategories([]));
    }
  }, [status?.connected]);

  async function handleConnect() {
    setConnecting(true);
    setError('');
    try {
      const { url } = await api.get<{ url: string }>('/shopee/authorize-url');
      window.location.href = url;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao iniciar conexão com a Shopee');
      setConnecting(false);
    }
  }

  async function handleSetCategory(categoryId: number) {
    setSavingCategory(true);
    setError('');
    try {
      await api.post('/shopee/categories/default', { categoryId });
      loadStatus();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao salvar categoria');
    } finally {
      setSavingCategory(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    setError('');
    setResult(null);
    try {
      const res = await api.post<SyncResult>('/shopee/sync', {});
      setResult(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao sincronizar com a Shopee');
    } finally {
      setSyncing(false);
    }
  }

  const filteredCategories = useMemo(() => {
    if (!categories) return [];
    const term = categoryFilter.trim().toLowerCase();
    const list = term ? categories.filter((c) => c.originalCategoryName.toLowerCase().includes(term)) : categories;
    return list.slice(0, 50);
  }, [categories, categoryFilter]);

  return (
    <div>
      <TopBar title="Integração Shopee" />
      <div className="px-4 pt-4">
        <div className="card border border-orange-200 bg-orange-50 text-sm text-orange-900">
          <p className="font-semibold">Anunciar produtos na Shopee</p>
          <p className="mt-1">
            Conecta sua loja à Shopee (via Shopee Open Platform) e publica seus produtos ativos como
            anúncios, mantendo estoque e preço sincronizados.
          </p>
        </div>

        {connectedParam === '1' && (
          <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Loja conectada à Shopee com sucesso!
          </p>
        )}
        {connectedParam === '0' && (
          <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            Não foi possível concluir a conexão com a Shopee. Tente novamente.
          </p>
        )}

        {status === null && <p className="mt-4 text-center text-sm text-black/50">Carregando...</p>}

        {status && !status.configured && (
          <div className="card mt-4">
            <p className="text-sm font-semibold text-black/80">Integração não configurada</p>
            <p className="mt-1 text-sm text-black/60">{status.message}</p>
            <p className="mt-3 text-xs text-black/50">
              Configure <code>SHOPEE_PARTNER_ID</code>, <code>SHOPEE_PARTNER_KEY</code> e{' '}
              <code>SHOPEE_ENV</code> (<code>live</code> ou <code>test</code>) nas variáveis de ambiente da
              API, além de <code>API_PUBLIC_URL</code> e <code>ADMIN_PUBLIC_URL</code>, e reinicie o
              servidor. Essas credenciais vêm do cadastro como desenvolvedor em{' '}
              <code>open.shopee.com</code>.
            </p>
          </div>
        )}

        {status?.configured && !status.connected && (
          <div className="card mt-4">
            <p className="text-sm font-semibold text-black/80">Loja ainda não conectada</p>
            <p className="mt-1 text-sm text-black/60">
              Clique para autorizar o acesso com a conta da sua loja na Shopee.
            </p>
            <button type="button" onClick={handleConnect} disabled={connecting} className="btn-primary mt-3 w-full">
              {connecting ? 'Redirecionando...' : 'Conectar com Shopee'}
            </button>
          </div>
        )}

        {status?.configured && status.connected && (
          <>
            <div className="card mt-4">
              <p className="text-sm font-semibold text-emerald-700">✓ Loja conectada</p>
              <p className="mt-1 text-sm text-black/60">Shop ID: {status.shopId}</p>
            </div>

            <div className="card mt-4">
              <p className="text-sm font-semibold">Categoria padrão</p>
              <p className="mt-1 text-xs text-black/50">
                Todo produto publicado vai usar essa categoria da Shopee (ex.: Esporte e Lazer &gt; Roupas
                Femininas para Fitness).
              </p>
              {status.defaultCategoryId && (
                <p className="mt-2 text-sm text-emerald-700">Categoria atual: #{status.defaultCategoryId}</p>
              )}
              <input
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                placeholder="Pesquisar categoria..."
                className="input-field mt-2"
              />
              {categories === null && <p className="mt-2 text-xs text-black/40">Carregando categorias...</p>}
              <div className="mt-2 max-h-56 space-y-1 overflow-y-auto">
                {filteredCategories.map((c) => (
                  <button
                    key={c.categoryId}
                    type="button"
                    disabled={savingCategory}
                    onClick={() => handleSetCategory(c.categoryId)}
                    className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${
                      status.defaultCategoryId === c.categoryId ? 'bg-orange-100 font-semibold' : 'hover:bg-black/5'
                    }`}
                  >
                    {c.originalCategoryName}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleSync}
              disabled={syncing || !status.defaultCategoryId}
              className="btn-primary mt-4 w-full"
            >
              {syncing ? 'Sincronizando...' : 'Sincronizar produtos agora'}
            </button>
            {!status.defaultCategoryId && (
              <p className="mt-1 text-xs text-black/40">Escolha uma categoria padrão antes de sincronizar.</p>
            )}
          </>
        )}

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        {result && (
          <div className="card mt-4 border border-emerald-200 bg-emerald-50">
            <p className="text-sm font-semibold text-emerald-700">Sincronização concluída</p>
            <p className="mt-1 text-sm text-emerald-700">
              {result.created} criado(s), {result.updated} atualizado(s) de {result.total}.
            </p>
            {result.errors.length > 0 && (
              <div className="mt-2 text-xs text-red-600">
                {result.errors.map((e) => (
                  <p key={e.name}>
                    {e.name}: {e.error}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="card mt-6 opacity-80">
          <p className="text-xs font-semibold uppercase tracking-wide text-black/50">Importante</p>
          <p className="mt-2 text-xs text-black/60">
            Produtos são publicados sem variações nativas de cor/tamanho da Shopee (usa preço e estoque
            total do produto) — anúncios com variação por cor e tamanho ficam como próximo passo.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ShopeeIntegrationPage() {
  return (
    <Suspense fallback={<div className="px-4 pt-24 text-center text-sm text-black/50">Carregando...</div>}>
      <ShopeeIntegrationPageContent />
    </Suspense>
  );
}
