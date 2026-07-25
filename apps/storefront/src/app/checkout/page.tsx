'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '../../lib/cart-context';
import { products } from '../../lib/products';
import { formatPrice } from '../../lib/format';
import { DEFAULT_SETTINGS, getSettings, validateCoupon } from '../../lib/api';

type PaymentMethod = 'pix' | 'cartao' | 'boleto';

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string; enabledKey: 'pixEnabled' | 'cardEnabled' | 'boletoEnabled' }[] = [
  { value: 'pix', label: 'Pix', enabledKey: 'pixEnabled' },
  { value: 'cartao', label: 'Cartão de crédito', enabledKey: 'cardEnabled' },
  { value: 'boleto', label: 'Boleto', enabledKey: 'boletoEnabled' },
];

function generateOrderNumber(): string {
  return `GW${Math.floor(100000 + Math.random() * 900000)}`;
}

export default function CheckoutPage() {
  const { items, subtotal, isLoaded, clearCart } = useCart();
  const router = useRouter();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [payment, setPayment] = useState<PaymentMethod>('pix');
  const [submitting, setSubmitting] = useState(false);

  const [couponCode, setCouponCode] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [couponMessage, setCouponMessage] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [appliedCode, setAppliedCode] = useState<string | null>(null);

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  const availablePayments = PAYMENT_OPTIONS.filter((option) => settings[option.enabledKey]);

  const shipping = subtotal >= settings.freeShippingThreshold ? 0 : settings.shippingFee;
  const total = Math.max(0, subtotal + shipping - appliedDiscount);

  async function handleApplyCoupon() {
    if (!couponCode.trim()) return;
    setApplyingCoupon(true);
    setCouponMessage('');
    try {
      const result = await validateCoupon(couponCode.trim(), subtotal);
      if (result.valid && result.discountAmount !== undefined) {
        setAppliedDiscount(result.discountAmount);
        setAppliedCode(result.code ?? couponCode.trim().toUpperCase());
        setCouponMessage(`Cupom aplicado! Desconto de ${formatPrice(result.discountAmount)}.`);
      } else {
        setAppliedDiscount(0);
        setAppliedCode(null);
        setCouponMessage(result.message ?? 'Cupom inválido.');
      }
    } finally {
      setApplyingCoupon(false);
    }
  }

  function handleRemoveCoupon() {
    setAppliedDiscount(0);
    setAppliedCode(null);
    setCouponCode('');
    setCouponMessage('');
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const orderNumber = generateOrderNumber();
    window.setTimeout(() => {
      clearCart();
      router.push(`/pedido-confirmado?pedido=${orderNumber}&total=${total.toFixed(2)}`);
    }, 600);
  }

  if (!isLoaded) {
    return <div className="container-page py-24 text-center text-black/50">Carregando...</div>;
  }

  if (items.length === 0) {
    return (
      <div className="container-page flex flex-col items-center gap-4 py-24 text-center">
        <h1 className="section-title">Seu carrinho está vazio</h1>
        <Link href="/produtos" className="btn-primary">
          Ver produtos
        </Link>
      </div>
    );
  }

  return (
    <div className="container-page py-10">
      <h1 className="section-title">Finalizar compra</h1>
      <p className="mt-2 text-sm text-black/50">
        Ambiente simulado para fins de demonstração — nenhum dado é processado de verdade.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 grid gap-10 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <fieldset className="rounded-2xl border border-black/10 p-6">
            <legend className="px-2 text-sm font-bold uppercase tracking-wide">Dados pessoais</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <input required placeholder="Nome completo" className="input-field sm:col-span-2" />
              <input required type="email" placeholder="E-mail" className="input-field" />
              <input required placeholder="Telefone" className="input-field" />
            </div>
          </fieldset>

          <fieldset className="rounded-2xl border border-black/10 p-6">
            <legend className="px-2 text-sm font-bold uppercase tracking-wide">Endereço de entrega</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <input required placeholder="CEP" className="input-field" />
              <input required placeholder="Cidade" className="input-field" />
              <input required placeholder="Endereço" className="input-field sm:col-span-2" />
              <input required placeholder="Número" className="input-field" />
              <input placeholder="Complemento" className="input-field" />
            </div>
          </fieldset>

          <fieldset className="rounded-2xl border border-black/10 p-6">
            <legend className="px-2 text-sm font-bold uppercase tracking-wide">Forma de pagamento</legend>
            <div className="flex flex-wrap gap-3">
              {availablePayments.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  onClick={() => setPayment(option.value)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                    payment === option.value
                      ? 'border-ink bg-ink text-white'
                      : 'border-black/15 hover:border-ink'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {payment === 'cartao' && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <input required placeholder="Número do cartão" className="input-field sm:col-span-2" />
                <input required placeholder="Nome impresso no cartão" className="input-field sm:col-span-2" />
                <input required placeholder="Validade (MM/AA)" className="input-field" />
                <input required placeholder="CVV" className="input-field" />
              </div>
            )}
            {payment === 'pix' && (
              <p className="mt-4 text-sm text-black/60">
                O código Pix será exibido após a confirmação do pedido.
              </p>
            )}
            {payment === 'boleto' && (
              <p className="mt-4 text-sm text-black/60">
                O boleto será gerado após a confirmação do pedido, com vencimento em 3 dias úteis.
              </p>
            )}
          </fieldset>
        </div>

        <div className="h-fit rounded-2xl border border-black/10 p-6">
          <h2 className="text-lg font-bold">Resumo do pedido</h2>
          <ul className="mt-4 space-y-2 text-sm text-black/70">
            {items.map((item) => {
              const product = products.find((p) => p.id === item.productId);
              if (!product) return null;
              return (
                <li key={`${item.productId}-${item.size}-${item.color}`} className="flex justify-between">
                  <span>
                    {product.name} × {item.quantity}
                  </span>
                  <span>{formatPrice(product.price * item.quantity)}</span>
                </li>
              );
            })}
          </ul>

          <div className="mt-4 border-t border-black/10 pt-4">
            {appliedCode ? (
              <div className="flex items-center justify-between rounded-xl bg-black/5 px-3 py-2 text-sm">
                <span>
                  Cupom <span className="font-semibold">{appliedCode}</span> aplicado
                </span>
                <button type="button" onClick={handleRemoveCoupon} className="text-black/50 hover:text-red-600">
                  Remover
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  placeholder="Cupom de desconto"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  className="input-field flex-1"
                />
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  disabled={applyingCoupon || !couponCode.trim()}
                  className="btn-secondary shrink-0 !px-4 disabled:opacity-60"
                >
                  {applyingCoupon ? 'Aplicando...' : 'Aplicar'}
                </button>
              </div>
            )}
            {couponMessage && !appliedCode && <p className="mt-2 text-xs text-red-600">{couponMessage}</p>}
          </div>

          <dl className="mt-4 space-y-2 border-t border-black/10 pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-black/60">Subtotal</dt>
              <dd>{formatPrice(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-black/60">Frete</dt>
              <dd>{shipping === 0 ? 'Grátis' : formatPrice(shipping)}</dd>
            </div>
            {appliedDiscount > 0 && (
              <div className="flex justify-between text-green-700">
                <dt>Desconto</dt>
                <dd>-{formatPrice(appliedDiscount)}</dd>
              </div>
            )}
          </dl>
          <div className="mt-4 flex justify-between border-t border-black/10 pt-4 text-lg font-bold">
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>
          <button type="submit" disabled={submitting} className="btn-primary mt-6 w-full disabled:opacity-60">
            {submitting ? 'Processando...' : 'Confirmar pedido'}
          </button>
        </div>
      </form>
    </div>
  );
}
