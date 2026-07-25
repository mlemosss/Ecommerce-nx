'use client';

import { useEffect, useState } from 'react';
import { TopBar } from '../../components/top-bar';
import { api, ApiError } from '../../lib/api';

interface MetaStatus {
  configured: boolean;
  connected?: boolean;
  catalogName?: string;
  productCount?: number;
  error?: string;
  message?: string;
}

interface SyncResult {
  itemsSent: number;
  handle: string | null;
}

export default function MetaIntegrationPage() {
  const [status, setStatus] = useState<MetaStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState('');

  function loadStatus() {
    api.get<MetaStatus>('/meta/status').then(setStatus);
  }

  useEffect(loadStatus, []);

  async function handleSync() {
    setSyncing(true);
    setError('');
    setResult(null);
    try {
      const res = await api.post<SyncResult>('/meta/sync', {});
      setResult(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao sincronizar com o Meta');
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div>
      <TopBar title="Integração Meta" />
      <div className="px-4 pt-4">
        <div className="card border border-blue-200 bg-blue-50 text-sm text-blue-900">
          <p className="font-semibold">Catálogo de produtos no Meta (Facebook/Instagram)</p>
          <p className="mt-1">
            Envia os produtos ativos para o seu catálogo do Meta Commerce Manager via Graph API, para
            uso em anúncios e no Instagram/Facebook Shop.
          </p>
        </div>

        {status === null && <p className="mt-4 text-center text-sm text-black/50">Carregando...</p>}

        {status && !status.configured && (
          <div className="card mt-4">
            <p className="text-sm font-semibold text-black/80">Integração não configurada</p>
            <p className="mt-1 text-sm text-black/60">{status.message}</p>
            <p className="mt-3 text-xs text-black/50">
              Configure <code>META_ACCESS_TOKEN</code> e <code>META_CATALOG_ID</code> nas variáveis de
              ambiente da API (arquivo <code>apps/api/.env</code>) e reinicie o servidor.
            </p>
          </div>
        )}

        {status?.configured && status.connected && (
          <div className="card mt-4">
            <p className="text-sm font-semibold text-emerald-700">✓ Conectado</p>
            <p className="mt-1 text-sm text-black/60">Catálogo: {status.catalogName}</p>
            <p className="text-sm text-black/60">Produtos no catálogo (Meta): {status.productCount}</p>
          </div>
        )}

        {status?.configured && status.connected === false && (
          <div className="card mt-4 border border-red-200 bg-red-50">
            <p className="text-sm font-semibold text-red-700">Erro de conexão</p>
            <p className="mt-1 text-sm text-red-600">{status.error}</p>
          </div>
        )}

        <button
          type="button"
          onClick={handleSync}
          disabled={syncing || !status?.configured}
          className="btn-primary mt-4 w-full"
        >
          {syncing ? 'Sincronizando...' : 'Sincronizar produtos agora'}
        </button>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        {result && (
          <div className="card mt-4 border border-emerald-200 bg-emerald-50">
            <p className="text-sm font-semibold text-emerald-700">Sincronização enviada!</p>
            <p className="mt-1 text-sm text-emerald-700">{result.itemsSent} variações enviadas.</p>
            {result.handle && (
              <p className="mt-1 break-all text-xs text-emerald-700/70">Lote: {result.handle}</p>
            )}
            <p className="mt-2 text-xs text-black/50">
              O processamento no Meta é assíncrono — pode levar alguns minutos para refletir no
              catálogo.
            </p>
          </div>
        )}

        <div className="card mt-6 opacity-80">
          <p className="text-xs font-semibold uppercase tracking-wide text-black/50">Importante</p>
          <p className="mt-2 text-xs text-black/60">
            Os produtos ainda não têm fotos reais cadastradas — o Meta pode rejeitar itens sem
            <code> image_link</code>. Assim que houver imagens reais, elas serão incluídas
            automaticamente na sincronização.
          </p>
        </div>
      </div>
    </div>
  );
}
