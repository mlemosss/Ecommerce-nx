'use client';

import { useEffect, useState } from 'react';
import { TopBar } from '../../components/top-bar';
import { api } from '../../lib/api';

interface EmailFlowStep {
  key: string;
  name: string;
  description: string;
  trigger: string;
  enabled: boolean;
}

interface PendingIntegration {
  key: string;
  configured: boolean;
}

export default function EmailFlowPage() {
  const [steps, setSteps] = useState<EmailFlowStep[] | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [resendConfigured, setResendConfigured] = useState<boolean | null>(null);

  function load() {
    api.get<EmailFlowStep[]>('/email-flow').then(setSteps);
    api
      .get<PendingIntegration[]>('/integrations/pending')
      .then((items) => setResendConfigured(items.find((i) => i.key === 'resend')?.configured ?? false))
      .catch(() => setResendConfigured(null));
  }

  useEffect(load, []);

  async function toggle(step: EmailFlowStep) {
    setPending(step.key);
    try {
      const updated = await api.patch<EmailFlowStep[]>(`/email-flow/${step.key}`, { enabled: !step.enabled });
      setSteps(updated);
    } finally {
      setPending(null);
    }
  }

  const activeCount = steps?.filter((s) => s.enabled).length ?? 0;

  return (
    <div>
      <TopBar title="Fluxo de e-mails" />
      <div className="px-4 pt-4">
        <div className="card border border-blue-200 bg-blue-50 text-sm text-blue-900">
          <p className="font-semibold">E-mails automáticos pro cliente</p>
          <p className="mt-1">
            Escolha quais e-mails fazem parte da jornada do cliente. Os que estiverem “Ativo” são
            enviados automaticamente nos momentos certos.
          </p>
          {resendConfigured === false && (
            <p className="mt-2 text-xs text-blue-700/80">
              A chave do Resend ainda não foi configurada — enquanto isso, essas escolhas ficam salvas mas
              nenhum e-mail é enviado de verdade. Veja em Gerencial &gt; Pendências como configurar.
            </p>
          )}
        </div>

        {resendConfigured === false && (
          <div className="mt-3 card border border-amber-200 bg-amber-50 text-sm text-amber-900">
            <p className="font-semibold">⚠️ Chave do Resend ainda não configurada</p>
            <p className="mt-1 text-xs text-amber-800/80">
              O código de envio já está pronto. Assim que a variável RESEND_API_KEY for configurada na
              Vercel, os e-mails abaixo passam a ser enviados automaticamente.
            </p>
          </div>
        )}
        {resendConfigured === true && (
          <div className="mt-3 card border border-emerald-200 bg-emerald-50 text-sm text-emerald-900">
            <p className="font-semibold">✓ Resend configurado</p>
            <p className="mt-1 text-xs text-emerald-800/80">
              Os e-mails ativos abaixo estão sendo enviados de verdade pros clientes.
            </p>
          </div>
        )}

        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-black/40">
          {activeCount} de {steps?.length ?? 0} etapas ativas
        </p>

        <div className="mt-3">
          {steps === null && <p className="py-8 text-center text-sm text-black/50">Carregando...</p>}
          {steps?.map((step, index) => (
            <div key={step.key} className="relative flex gap-4 pb-6 last:pb-0">
              {index < steps.length - 1 && (
                <span
                  className={`absolute left-[19px] top-10 h-[calc(100%-2rem)] w-0.5 ${
                    step.enabled ? 'bg-ink/20' : 'bg-black/10'
                  }`}
                />
              )}
              <div
                className={`z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  step.enabled ? 'bg-ink text-white' : 'bg-black/10 text-black/40'
                }`}
              >
                {index + 1}
              </div>
              <div className={`card mt-0 flex-1 !p-4 ${!step.enabled ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{step.name}</p>
                    <p className="mt-1 text-sm text-black/60">{step.description}</p>
                    <p className="mt-2 text-xs text-black/40">{step.trigger}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggle(step)}
                    disabled={pending === step.key}
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold disabled:opacity-60 ${
                      step.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-black/10 text-black/50'
                    }`}
                  >
                    {step.enabled ? 'Ativo' : 'Desativado'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
