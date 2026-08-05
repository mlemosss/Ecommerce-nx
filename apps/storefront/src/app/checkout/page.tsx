'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '../../lib/cart-context';
import { useProducts } from '../../lib/products-context';
import { useCustomerAuth } from '../../lib/customer-auth-context';
import { getVariantPrice } from '../../lib/products';
import { formatPrice } from '../../lib/format';
import {
  createOrder,
  DEFAULT_SETTINGS,
  getSettings,
  OrderError,
  quoteShipping,
  type ShippingOption,
  trackAbandonedCart,
  validateCoupon,
} from '../../lib/api';

type PaymentMethod = 'pix' | 'cartao' | 'boleto';

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string; enabledKey: 'pixEnabled' | 'cardEnabled' | 'boletoEnabled' }[] = [
  { value: 'pix', label: 'Pix', enabledKey: 'pixEnabled' },
  { value: 'cartao', label: 'Cartão de crédito', enabledKey: 'cardEnabled' },
  { value: 'boleto', label: 'Boleto', enabledKey: 'boletoEnabled' },
];

export default function CheckoutPage() {
  const { items, subtotal, isLoaded, clearCart } = useCart();
  const { products } = useProducts();
  const { customer } = useCustomerAuth();
  const router = useRouter();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [payment, setPayment] = useState<PaymentMethod>('pix');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [document, setDocument] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [city, setCity] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');

  const [couponCode, setCouponCode] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [couponMessage, setCouponMessage] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [appliedCode, setAppliedCode] = useState<string | null>(null);

  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [selectedShippingId, setSelectedShippingId] = useState<string | null>(null);
  const [quotingShipping, setQuotingShipping] = useState(false);
  const [shippingError, setShippingError] = useState('');
  const [showAllShipping, setShowAllShipping] = useState(false);

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  useEffect(() => {
    if (!customer) return;
    setName((prev) => prev || customer.name);
    setEmail((prev) => prev || customer.email || '');
    setPhone((prev) => prev || customer.phone || '');
  }, [customer]);

  const availablePayments = PAYMENT_OPTIONS.filter((option) => settings[option.enabledKey]);

  const freeShipping = subtotal >= settings.freeShippingThreshold;
  const selectedShipping = shippingOptions.find((o) => o.id === selectedShippingId) ?? null;
  const shipping = freeShipping ? 0 : selectedShipping ? selectedShipping.price : settings.shippingFee;
  const total = Math.max(0, subtotal + shipping - appliedDiscount);

  useEffect(() => {
    if (!isValidEmail(email) || items.length === 0) return;
    const timeout = setTimeout(() => {
      void trackAbandonedCart({
        email,
        name: name || undefined,
        items: items.map((item) => {
          const product = products.find((p) => p.id === item.productId);
          return {
            productId: item.productId,
            productName: product?.name ?? item.productId,
            size: item.size,
            color: item.color,
            quantity: item.quantity,
            unitPrice: product ? getVariantPrice(product, item.color, item.size) : 0,
          };
        }),
        total,
      });
    }, 1500);
    return () => clearTimeout(timeout);
  }, [email, name, items, products, total]);

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

  async function handleQuoteShipping() {
    const digits = zipCode.replace(/\D/g, '');
    if (digits.length !== 8) return;
    setQuotingShipping(true);
    setShippingError('');
    try {
      const result = await quoteShipping({
        toZipCode: digits,
        subtotal,
        items: items.map((item) => {
          const product = products.find((p) => p.id === item.productId);
          return {
            category: product?.category,
            quantity: item.quantity,
            unitPrice: product ? getVariantPrice(product, item.color, item.size) : 0,
          };
        }),
      });
      if (!result.configured || result.options.length === 0) {
        setShippingOptions([]);
        if (result.error) {
          setShippingError('Não foi possível calcular o frete agora. Usaremos o frete padrão.');
        }
      } else {
        const sorted = [...result.options].sort((a, b) => a.price - b.price);
        setShippingOptions(sorted);
        setSelectedShippingId((prev) => (prev && sorted.some((o) => o.id === prev) ? prev : sorted[0].id));
      }
    } finally {
      setQuotingShipping(false);
    }
  }

  // Cota o frete automaticamente quando o CEP fica completo (e não é frete grátis).
  useEffect(() => {
    if (freeShipping) return;
    if (zipCode.replace(/\D/g, '').length !== 8) return;
    const timeout = setTimeout(() => void handleQuoteShipping(), 700);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zipCode, subtotal, items.length, freeShipping]);

  // Preenche endereço automaticamente pelo CEP (ViaCEP), como as boas lojas fazem.
  useEffect(() => {
    const digits = zipCode.replace(/\D/g, '');
    if (digits.length !== 8) return;
    let cancelled = false;
    fetch(`https://viacep.com.br/ws/${digits}/json/`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { logradouro?: string; localidade?: string; erro?: boolean } | null) => {
        if (cancelled || !data || data.erro) return;
        if (data.localidade) setCity(data.localidade);
        if (data.logradouro) setStreet((prev) => prev || data.logradouro || '');
      })
      .catch(() => {
        // sem CEP válido: o cliente digita o endereço manualmente.
      });
    return () => {
      cancelled = true;
    };
  }, [zipCode]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const result = await createOrder({
        customerName: name,
        customerEmail: email,
        customerPhone: phone,
        customerDocument: document,
        zipCode,
        city,
        street,
        number,
        complement: complement || undefined,
        items: items.map((item) => {
          const product = products.find((p) => p.id === item.productId);
          return {
            productId: item.productId,
            productName: product?.name ?? item.productId,
            size: item.size,
            color: item.color,
            quantity: item.quantity,
            unitPrice: product ? getVariantPrice(product, item.color, item.size) : 0,
          };
        }),
        subtotal,
        shipping,
        discount: appliedDiscount,
        couponCode: appliedCode ?? undefined,
        total,
        paymentMethod: payment,
      });

      clearCart();
      const params = new URLSearchParams({
        pedido: result.order.orderNumber,
        total: total.toFixed(2),
      });
      if (result.paymentUrl) params.set('pagamento', result.paymentUrl);
      if (result.paymentWarning) params.set('aviso', result.paymentWarning);
      router.push(`/pedido-confirmado?${params.toString()}`);
    } catch (err) {
      setError(err instanceof OrderError ? err.message : 'Não foi possível finalizar o pedido. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
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
        Você será redirecionado para uma página segura para concluir o pagamento.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 grid gap-10 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <fieldset className="rounded-2xl border border-black/10 p-6">
            <legend className="px-2 text-sm font-bold uppercase tracking-wide">Dados pessoais</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <input
                required
                placeholder="Nome completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field sm:col-span-2"
              />
              <input
                required
                type="email"
                placeholder="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
              />
              <input
                required
                placeholder="Telefone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input-field"
              />
              <input
                required
                placeholder="CPF"
                value={document}
                onChange={(e) => setDocument(e.target.value)}
                className="input-field sm:col-span-2"
              />
            </div>
          </fieldset>

          <fieldset className="rounded-2xl border border-black/10 p-6">
            <legend className="px-2 text-sm font-bold uppercase tracking-wide">Endereço de entrega</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <input
                required
                placeholder="CEP"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                className="input-field"
              />
              <input
                required
                placeholder="Cidade"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="input-field"
              />
              <input
                required
                placeholder="Endereço"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                className="input-field sm:col-span-2"
              />
              <input
                required
                placeholder="Número"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                className="input-field"
              />
              <input
                placeholder="Complemento"
                value={complement}
                onChange={(e) => setComplement(e.target.value)}
                className="input-field"
              />
            </div>
          </fieldset>

          <fieldset className="rounded-2xl border border-black/10 p-6">
            <legend className="px-2 text-sm font-bold uppercase tracking-wide">Frete</legend>
            {freeShipping ? (
              <p className="text-sm font-medium text-green-700">Frete grátis nesta compra! 🎉</p>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <p className="text-sm text-black/60">
                    {zipCode.replace(/\D/g, '').length === 8
                      ? 'Escolha a forma de envio:'
                      : 'Preencha o CEP acima para calcular o frete.'}
                  </p>
                  {zipCode.replace(/\D/g, '').length === 8 && (
                    <button
                      type="button"
                      onClick={handleQuoteShipping}
                      disabled={quotingShipping}
                      className="ml-auto shrink-0 text-xs font-semibold underline underline-offset-2 disabled:opacity-50"
                    >
                      {quotingShipping ? 'Calculando...' : 'Recalcular'}
                    </button>
                  )}
                </div>
                {shippingError && <p className="mt-2 text-xs text-black/50">{shippingError}</p>}
                {shippingOptions.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {(showAllShipping ? shippingOptions : shippingOptions.slice(0, 5)).map((option) => (
                      <label
                        key={option.id}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3 transition ${
                          selectedShippingId === option.id
                            ? 'border-ink bg-black/[0.03]'
                            : 'border-black/10 hover:border-black/20'
                        }`}
                      >
                        <input
                          type="radio"
                          name="shipping"
                          checked={selectedShippingId === option.id}
                          onChange={() => setSelectedShippingId(option.id)}
                          className="accent-ink"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold">
                            {option.company} {option.name}
                          </span>
                          {option.deliveryTime != null && (
                            <span className="block text-xs text-black/50">
                              Entrega em até {option.deliveryTime}{' '}
                              {option.deliveryTime === 1 ? 'dia útil' : 'dias úteis'}
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 text-sm font-bold">{formatPrice(option.price)}</span>
                      </label>
                    ))}
                    {shippingOptions.length > 5 && (
                      <button
                        type="button"
                        onClick={() => setShowAllShipping((v) => !v)}
                        className="text-xs font-semibold underline underline-offset-2"
                      >
                        {showAllShipping ? 'Ver menos' : `Ver todas as ${shippingOptions.length} opções`}
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
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
              <p className="mt-4 text-sm text-black/60">
                Você vai inserir os dados do cartão numa página segura, depois de confirmar o pedido.
              </p>
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
                  <span>{formatPrice(getVariantPrice(product, item.color, item.size) * item.quantity)}</span>
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
              <dt className="text-black/60">
                Frete{!freeShipping && selectedShipping ? ` · ${selectedShipping.company}` : ''}
              </dt>
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
          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={submitting} className="btn-primary mt-6 w-full disabled:opacity-60">
            {submitting ? 'Processando...' : 'Confirmar pedido'}
          </button>
        </div>
      </form>
    </div>
  );
}
