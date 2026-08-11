'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { ChangePasswordForm } from '../../components/change-password-form';
import { TopBar } from '../../components/top-bar';
import { api, ApiError } from '../../lib/api';
import type { StoreSettings } from '../../lib/types';

export default function SettingsPage() {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<StoreSettings>('/settings').then(setSettings);
  }, []);

  function update<K extends keyof StoreSettings>(key: K, value: StoreSettings[K]) {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
    setSaved(false);
  }

  function updateValueProp(index: number, field: 'title' | 'description', value: string) {
    setSettings((prev) => {
      if (!prev) return prev;
      const valueProps = prev.valueProps.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      );
      return { ...prev, valueProps };
    });
    setSaved(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setError('');
    setSaving(true);
    try {
      const updated = await api.patch<StoreSettings>('/settings', {
        storeName: settings.storeName,
        contactEmail: settings.contactEmail || undefined,
        contactWhatsapp: settings.contactWhatsapp || undefined,
        shippingFee: settings.shippingFee,
        freeShippingThreshold: settings.freeShippingThreshold,
        aboutHeadline: settings.aboutHeadline || undefined,
        aboutBody: settings.aboutBody || undefined,
        shippingOriginZip: settings.shippingOriginZip || undefined,
        packageHeightCm: settings.packageHeightCm,
        packageWidthCm: settings.packageWidthCm,
        packageLengthCm: settings.packageLengthCm,
        pixEnabled: settings.pixEnabled,
        cardEnabled: settings.cardEnabled,
        boletoEnabled: settings.boletoEnabled,
        maxInstallments: settings.maxInstallments,
        instagramUrl: settings.instagramUrl || undefined,
        facebookUrl: settings.facebookUrl || undefined,
        heroTag: settings.heroTag,
        heroTitleLine1: settings.heroTitleLine1,
        heroTitleHighlight: settings.heroTitleHighlight,
        heroSubtitle: settings.heroSubtitle,
        heroPrimaryButtonLabel: settings.heroPrimaryButtonLabel,
        heroSecondaryButtonLabel: settings.heroSecondaryButtonLabel,
        newsletterTitle: settings.newsletterTitle,
        newsletterSubtitle: settings.newsletterSubtitle,
        valueProps: settings.valueProps,
        gtmId: settings.gtmId || undefined,
        metaPixelId: settings.metaPixelId || undefined,
        emailFromName: settings.emailFromName,
        emailFromAddress: settings.emailFromAddress,
      });
      setSettings(updated);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  }

  if (!settings) {
    return (
      <div>
        <TopBar title="Configurações" />
        <p className="px-4 pt-8 text-center text-sm text-black/50">Carregando...</p>
      </div>
    );
  }

  return (
    <div>
      <TopBar title="Configurações" />

      <form onSubmit={handleSubmit} className="space-y-5 px-4 pb-8 pt-4">
        {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}
        {saved && <p className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">Configurações salvas!</p>}

        <section className="card space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-black/50">Loja</p>
          <div>
            <label className="mb-1 block text-sm font-semibold">Nome da loja</label>
            <input
              required
              value={settings.storeName}
              onChange={(e) => update('storeName', e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold">E-mail de contato</label>
            <input
              type="email"
              value={settings.contactEmail ?? ''}
              onChange={(e) => update('contactEmail', e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold">WhatsApp de contato</label>
            <input
              placeholder="5511999999999"
              value={settings.contactWhatsapp ?? ''}
              onChange={(e) => update('contactWhatsapp', e.target.value)}
              className="input-field"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-semibold">Frete (R$)</label>
              <input
                required
                type="number"
                step="0.01"
                min="0"
                value={settings.shippingFee}
                onChange={(e) => update('shippingFee', Number(e.target.value))}
                className="input-field"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">Frete grátis a partir de (R$)</label>
              <input
                required
                type="number"
                step="0.01"
                min="0"
                value={settings.freeShippingThreshold}
                onChange={(e) => update('freeShippingThreshold', Number(e.target.value))}
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold">CEP de origem (de onde você despacha)</label>
            <input
              value={settings.shippingOriginZip ?? ''}
              onChange={(e) => update('shippingOriginZip', e.target.value)}
              placeholder="00000-000"
              className="input-field"
            />
            <p className="mt-1 text-xs text-black/60">
              É daqui que a cotação do Melhor Envio é calculada. Se estiver errado, o cliente paga um
              frete diferente do que você vai pagar na etiqueta.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold">Embalagem padrão (cm)</label>
            <div className="grid grid-cols-3 gap-3">
              {(
                [
                  ['packageHeightCm', 'Altura'],
                  ['packageWidthCm', 'Largura'],
                  ['packageLengthCm', 'Comprimento'],
                ] as const
              ).map(([field, label]) => (
                <div key={field}>
                  <input
                    type="number"
                    min="1"
                    value={settings[field] ?? ''}
                    onChange={(e) => update(field, Number(e.target.value))}
                    className="input-field w-full"
                    aria-label={label}
                  />
                  <p className="mt-1 text-xs text-black/60">{label}</p>
                </div>
              ))}
            </div>
            <p className="mt-1 text-xs text-black/60">
              Caixa maior que o informado é cobrada por cubagem pela transportadora — e a diferença
              sai do seu bolso.
            </p>
          </div>
        </section>

        <section className="card space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-black/50">Formas de pagamento</p>
          {(
            [
              { key: 'pixEnabled', label: 'Pix' },
              { key: 'cardEnabled', label: 'Cartão de crédito' },
              { key: 'boletoEnabled', label: 'Boleto' },
            ] as const
          ).map((option) => (
            <label key={option.key} className="flex items-center justify-between">
              <span className="text-sm">{option.label}</span>
              <input
                type="checkbox"
                checked={settings[option.key]}
                onChange={(e) => update(option.key, e.target.checked)}
                className="h-5 w-5"
              />
            </label>
          ))}
          <div>
            <label className="mb-1 block text-sm font-semibold">Máximo de parcelas sem juros</label>
            <input
              required
              type="number"
              min="1"
              value={settings.maxInstallments}
              onChange={(e) => update('maxInstallments', Number(e.target.value))}
              className="input-field"
            />
          </div>
        </section>

        <section className="card space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-black/50">
            Textos da página inicial
          </p>
          <div>
            <label className="mb-1 block text-sm font-semibold">Selo acima do título (ex: “Nova coleção”)</label>
            <input
              value={settings.heroTag}
              onChange={(e) => update('heroTag', e.target.value)}
              className="input-field"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-semibold">Título — 1ª linha</label>
              <input
                value={settings.heroTitleLine1}
                onChange={(e) => update('heroTitleLine1', e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">Título — destaque</label>
              <input
                value={settings.heroTitleHighlight}
                onChange={(e) => update('heroTitleHighlight', e.target.value)}
                className="input-field"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold">Frase de apoio</label>
            <textarea
              value={settings.heroSubtitle}
              onChange={(e) => update('heroSubtitle', e.target.value)}
              className="input-field"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-semibold">Botão principal</label>
              <input
                value={settings.heroPrimaryButtonLabel}
                onChange={(e) => update('heroPrimaryButtonLabel', e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">Botão secundário</label>
              <input
                value={settings.heroSecondaryButtonLabel}
                onChange={(e) => update('heroSecondaryButtonLabel', e.target.value)}
                className="input-field"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold">Título da seção de newsletter</label>
            <input
              value={settings.newsletterTitle}
              onChange={(e) => update('newsletterTitle', e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold">Frase da seção de newsletter</label>
            <textarea
              value={settings.newsletterSubtitle}
              onChange={(e) => update('newsletterSubtitle', e.target.value)}
              className="input-field"
              rows={2}
            />
          </div>
        </section>

        <section className="card space-y-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-black/50">
            Diferenciais (4 cards da home)
          </p>
          {settings.valueProps.map((item, index) => (
            <div key={index} className="space-y-2 border-t border-black/10 pt-3 first:border-0 first:pt-0">
              <input
                placeholder="Título"
                value={item.title}
                onChange={(e) => updateValueProp(index, 'title', e.target.value)}
                className="input-field"
              />
              <input
                placeholder="Descrição"
                value={item.description}
                onChange={(e) => updateValueProp(index, 'description', e.target.value)}
                className="input-field"
              />
            </div>
          ))}
        </section>

        <section className="card space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-black/50">Redes sociais</p>
          <div>
            <label className="mb-1 block text-sm font-semibold">Instagram</label>
            <input
              placeholder="https://instagram.com/..."
              value={settings.instagramUrl ?? ''}
              onChange={(e) => update('instagramUrl', e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold">Facebook</label>
            <input
              placeholder="https://facebook.com/..."
              value={settings.facebookUrl ?? ''}
              onChange={(e) => update('facebookUrl', e.target.value)}
              className="input-field"
            />
          </div>
        </section>

        <section className="card space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-black/50">E-mails automáticos</p>
          <div>
            <label className="mb-1 block text-sm font-semibold">Nome do remetente</label>
            <input
              value={settings.emailFromName}
              onChange={(e) => update('emailFromName', e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold">E-mail do remetente</label>
            <input
              type="email"
              value={settings.emailFromAddress}
              onChange={(e) => update('emailFromAddress', e.target.value)}
              className="input-field"
            />
          </div>
          <p className="text-xs text-black/40">
            Pra usar um e-mail com o domínio da loja (ex: pedidos@noexcuse.com.br), o domínio precisa estar
            verificado na sua conta Resend. Até lá, “onboarding@resend.dev” funciona pra testes.
          </p>
        </section>

        <section className="card space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-black/50">Rastreamento</p>
          <div>
            <label className="mb-1 block text-sm font-semibold">Google Tag Manager (ID do contêiner)</label>
            <input
              placeholder="GTM-XXXXXXX"
              value={settings.gtmId ?? ''}
              onChange={(e) => update('gtmId', e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold">Meta Pixel (ID do pixel)</label>
            <input
              placeholder="123456789012345"
              value={settings.metaPixelId ?? ''}
              onChange={(e) => update('metaPixelId', e.target.value)}
              className="input-field"
            />
          </div>
          <p className="text-xs text-black/40">
            Assim que preenchidos, os scripts do GTM e do Meta Pixel são carregados automaticamente em
            todas as páginas da loja.
          </p>
        </section>

        <section className="card space-y-4">
          <div>
            <h2 className="text-lg font-bold">Quem somos</h2>
            <p className="mt-1 text-sm text-black/60">
              Aparece na página <span className="font-semibold">/quem-somos</span> da loja. Deixe em
              branco para manter o texto padrão.
            </p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold">Título</label>
            <input
              placeholder="Somos a Isabella e a Layane."
              value={settings.aboutHeadline ?? ''}
              onChange={(e) => update('aboutHeadline', e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold">Texto</label>
            <textarea
              rows={6}
              placeholder="Conte a história de vocês. Deixe uma linha em branco entre os parágrafos."
              value={settings.aboutBody ?? ''}
              onChange={(e) => update('aboutBody', e.target.value)}
              className="input-field w-full"
            />
            <p className="mt-1 text-xs text-black/60">
              Uma linha em branco separa parágrafos na página.
            </p>
          </div>
        </section>

        <button type="submit" disabled={saving} className="btn-primary w-full">
          {saving ? 'Salvando...' : 'Salvar configurações'}
        </button>
      </form>

      {/* Fora do formulário acima: a troca de senha tem envio próprio. */}
      <ChangePasswordForm />
    </div>
  );
}
