'use client';

import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface PendingIntegration {
  key: string;
  name: string;
  codeReady: boolean;
  configured: boolean;
  missingEnvVars: string[];
  instructions: string[];
  envExample: string;
}

export function PendingIntegrations() {
  const [items, setItems] = useState<PendingIntegration[] | null>(null);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<PendingIntegration[]>('/integrations/pending')
      .then((data) => {
        setItems(data);
        const firstPending = data.find((i) => !i.configured);
        if (firstPending) setOpenKey(firstPending.key);
      })
      .catch(() => setItems([]));
  }, []);

  if (items === null) return null;

  const pending = items.filter((i) => !i.configured);
  const done = items.filter((i) => i.configured);

  if (items.length === 0) return null;

  async function copyEnv(item: PendingIntegration) {
    try {
      await navigator.clipboard.writeText(item.envExample);
      setCopiedKey(item.key);
      setTimeout(() => setCopiedKey((k) => (k === item.key ? null : k)), 2000);
    } catch {
      // clipboard indisponível: usuário pode selecionar o texto manualmente
    }
  }

  return (
    <>
      <h2 className="mt-8 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-black/50">
        Pendências de configuração
        {pending.length > 0 && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
            {pending.length}
          </span>
        )}
      </h2>
      <div className="mt-3 space-y-2">
        {pending.map((item) => {
          const isOpen = openKey === item.key;
          return (
            <div key={item.key} className="card !p-0 overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenKey(isOpen ? null : item.key)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <span className="text-sm font-medium">{item.name}</span>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                    item.codeReady ? 'bg-amber-100 text-amber-700' : 'bg-black/10 text-black/50'
                  }`}
                >
                  {item.codeReady ? 'Falta configurar' : 'Aguardando chaves'}
                </span>
              </button>
              {isOpen && (
                <div className="border-t border-black/5 px-4 py-3">
                  {!item.codeReady && (
                    <p className="mb-2 text-xs text-black/50">
                      Ainda não construí essa integração — assim que você me passar as chaves, eu construo e
                      configuro.
                    </p>
                  )}
                  <ol className="list-decimal space-y-1.5 pl-4 text-sm text-black/70">
                    {item.instructions.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                  <div className="mt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wide text-black/40">
                        Variáveis de ambiente
                      </span>
                      <button
                        type="button"
                        onClick={() => copyEnv(item)}
                        className="text-xs font-semibold text-accent"
                      >
                        {copiedKey === item.key ? 'Copiado!' : 'Copiar'}
                      </button>
                    </div>
                    <pre className="mt-1 overflow-x-auto rounded-lg bg-black/5 p-3 text-xs">{item.envExample}</pre>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {done.map((item) => (
          <div key={item.key} className="card flex items-center justify-between !p-3">
            <span className="text-sm font-medium">{item.name}</span>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
              Configurado
            </span>
          </div>
        ))}
      </div>
    </>
  );
}
