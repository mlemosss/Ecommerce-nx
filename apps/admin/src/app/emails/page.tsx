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

export default function EmailFlowPage() {
  const [steps, setSteps] = useState<EmailFlowStep[] | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  function load() {
    api.get<EmailFlowStep[]>('/email-flow').then(setSteps);
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
            Escolha quais e-mails fazem parte da jornada do cliente. Os que estiverem "Ativo" são
            enviados automaticamente nos momentos certos.
          </p>
          <p className="mt-2 text-xs text-blue-700/80">
            O envio de verdade depende da integração com a Resend — enquanto ela não estiver configurada
            (veja em Gerencial &gt; Pendências), essas escolhas ficam salvas e prontas pra quando o envio
            for ativado.
          </p>
        </div>

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
