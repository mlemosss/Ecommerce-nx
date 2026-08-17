'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '../../lib/cart-context';
import { useProducts } from '../../lib/products-context';
import { useCustomerAuth } from '../../lib/customer-auth-context';
import { getVariantPrice } from '../../lib/products';
import { findVariant } from '../../lib/availability';
import {
  trackInitiateCheckout,
  trackPurchase,
  type PixelItem,
} from '../../lib/pixel';
import { formatPrice } from '../../lib/format';
import { discountPercentFor, parseTiers } from '../../lib/progressive-discount';
import {
  createOrder,
  DEFAULT_SETTINGS,
  getCustomerProfile,
  getSettings,
  OrderError,
  quoteShipping,
  type ShippingOption,
  trackAbandonedCart,
  validateCoupon,
} from '../../lib/api';

/** Mesma chave do contexto de login: o token do cliente mora aqui. */
const TOKEN_KEY = 'no-excuse:customer-token';

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
  // Dados do cartão: vivem só no estado desta tela e vão embora com ela.
  const [cardHolder, setCardHolder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCcv, setCardCcv] = useState('');
  const [installments, setInstallments] = useState(1);
  // Desmarcado por padrão: consentimento pré-marcado não vale.
  const [wantsReminder, setWantsReminder] = useState(false);
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

  /**
   * Endereço salvo em "Meus dados" preenche o checkout.
   *
   * A tela de conta diz "preencha para o frete já vir calculado no próximo
   * pedido", e essa promessa não era cumprida: só nome, e-mail e telefone
   * vinham do cadastro, e a cliente redigitava o endereço inteiro toda vez.
   *
   * `prev ||` em tudo: o que ela já escreveu nesta tela sempre ganha.
   */
  useEffect(() => {
    if (!customer) return;
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) return;

    getCustomerProfile(token).then((perfil) => {
      if (!perfil) return;
      setZipCode((prev) => prev || perfil.zipCode || '');
      setStreet((prev) => prev || perfil.street || '');
      setNumber((prev) => prev || perfil.number || '');
      setComplement((prev) => prev || perfil.complement || '');
      setCity((prev) => prev || perfil.city || '');
      setDocument((prev) => prev || perfil.documentNumber || '');
    });
  }, [customer]);

  /**
   * O carrinho traduzido para o que o Pixel entende.
   *
   * `content_ids` precisa trazer o id da VARIAÇÃO — o mesmo da coluna `id` do
   * feed do catálogo. Cor e tamanho vêm do carrinho como texto; a variação é
   * localizada no catálogo carregado. Item cuja variação não existir mais fica
   * de fora: id inventado casa com nada e só suja a taxa de correspondência.
   */
  function itensDoPixel(): PixelItem[] {
    return items.flatMap((item) => {
      const product = products.find((p) => p.id === item.productId);
      const variante = product && findVariant(product, item.color, item.size);
      if (!product || !variante?.id) return [];
      return [
        {
          variantId: variante.id,
          quantity: item.quantity,
          unitPrice: getVariantPrice(product, item.color, item.size),
        },
      ];
    });
  }

  /**
   * InitiateCheckout, uma vez por visita à tela.
   *
   * É o evento de otimização com volume de verdade: compra é rara demais para
   * a Meta aprender, e "chegou no checkout" acontece muitas vezes mais. Espera
   * o catálogo carregar, senão sairia sem `content_ids`.
   */
  const checkoutDisparado = useRef(false);
  useEffect(() => {
    if (checkoutDisparado.current) return;
    if (!isLoaded || items.length === 0 || products.length === 0) return;
    const doPixel = itensDoPixel();
    if (doPixel.length === 0) return;
    checkoutDisparado.current = true;
    trackInitiateCheckout(doPixel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, items.length, products.length]);

  const availablePayments = PAYMENT_OPTIONS.filter((option) => settings[option.enabledKey]);

  const freeShipping = subtotal >= settings.freeShippingThreshold;
  const selectedShipping = shippingOptions.find((o) => o.id === selectedShippingId) ?? null;
  const shipping = freeShipping ? 0 : selectedShipping ? selectedShipping.price : settings.shippingFee;

  // Desconto progressivo por quantidade de peças. Não soma com cupom: vale o
  // maior dos dois — a mesma regra que o servidor aplica ao cobrar.
  const tiers = parseTiers(settings.progressiveDiscount);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const progressivePercent = discountPercentFor(totalItems, tiers);
  const progressiveDiscount = Math.round(((subtotal * progressivePercent) / 100) * 100) / 100;
  const discount = Math.min(subtotal, Math.max(progressiveDiscount, appliedDiscount));
  const usingProgressive = progressiveDiscount >= appliedDiscount && progressiveDiscount > 0;

  const total = Math.max(0, subtotal + shipping - discount);

  useEffect(() => {
    // Sem o aceite explícito, o e-mail não sai daqui. Antes ele era enviado
    // 1,5s depois de ser digitado, sem o cliente clicar em nada.
    if (!wantsReminder || !isValidEmail(email) || items.length === 0) return;
    const timeout = setTimeout(() => {
      void trackAbandonedCart({
        email,
        name: name || undefined,
        optIn: true,
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
  }, [wantsReminder, email, name, items, products, total]);

  async function handleApplyCoupon() {
    if (!couponCode.trim()) return;
    setApplyingCoupon(true);
    setCouponMessage('');
    try {
      // O CPF vai junto porque o cupom de estreia é conferido por documento.
      const result = await validateCoupon(couponCode.trim(), subtotal, document);
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

  /** "12/28" e "12/2028" viram 2028. */
  function expiryYearFull(value: string): string {
    const year = value.split('/')[1]?.trim() ?? '';
    return year.length === 2 ? `20${year}` : year;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (payment === 'cartao') {
      const digits = cardNumber.replace(/\D/g, '');
      if (digits.length < 13) {
        setError('Confira o número do cartão.');
        return;
      }
      if (!/^\d{2}\/\d{2}(\d{2})?$/.test(cardExpiry.trim())) {
        setError('Informe a validade no formato MM/AA.');
        return;
      }
      if (cardCcv.trim().length < 3) {
        setError('Confira o código de segurança (CVV).');
        return;
      }
      if (cardHolder.trim().length < 3) {
        setError('Informe o nome como está impresso no cartão.');
        return;
      }
    }

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
        discount,
        couponCode: appliedCode ?? undefined,
        total,
        paymentMethod: payment,
        ...(payment === 'cartao'
          ? {
              creditCard: {
                holderName: cardHolder.trim(),
                number: cardNumber.replace(/\D/g, ''),
                expiryMonth: cardExpiry.slice(0, 2),
                expiryYear: expiryYearFull(cardExpiry),
                ccv: cardCcv.trim(),
              },
              installmentCount: installments,
            }
          : {}),
      });

      // Purchase antes de esvaziar o carrinho: é a última vez que os itens
      // existem nesta tela, e a de confirmação só recebe número e total pela
      // URL — sem `content_ids` o Meta registra a venda mas o catálogo não a
      // enxerga, que é exatamente o sintoma de correspondência 0%.
      //
      // O eventID é o número do pedido: estável e único, então F5 na tela de
      // obrigado não vira uma segunda venda.
      trackPurchase({ orderNumber: result.order.orderNumber, items: itensDoPixel() });

      clearCart();

      // O QR Code é grande demais para a URL: vai pela sessão da aba, que a
      // tela de confirmação lê em seguida.
      if (result.pix) {
        window.sessionStorage.setItem('no-excuse:pix', JSON.stringify(result.pix));
      } else {
        window.sessionStorage.removeItem('no-excuse:pix');
      }

      const params = new URLSearchParams({
        pedido: result.order.orderNumber,
        total: total.toFixed(2),
      });
      // Cartão aprovado na hora não precisa da fatura do Asaas.
      if (result.paymentUrl && !result.paid) params.set('pagamento', result.paymentUrl);
      if (result.paid) params.set('pago', '1');
      if (result.paymentWarning) params.set('aviso', result.paymentWarning);
      router.push(`/pedido-confirmado?${params.toString()}`);
    } catch (err) {
      setError(err instanceof OrderError ? err.message : 'Não foi possível finalizar o pedido. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!isLoaded) {
    return (
      <div className="container-page py-24 text-center text-sm text-ink/60" role="status">
        Carregando...
      </div>
    );
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
    <div className="container-page py-14 sm:py-16">
      <p className="eyebrow text-ink/50">Checkout</p>
      <h1 className="section-title mt-3">Finalizar compra</h1>
      <p className="mt-3 text-sm text-ink/60">
        Você será redirecionado para uma página segura para concluir o pagamento.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 grid gap-10 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <fieldset className="border border-line p-6 sm:p-7">
            <legend className="px-2 text-[11px] font-bold uppercase tracking-[0.18em]">Dados pessoais</legend>
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

          <label className="flex cursor-pointer items-start gap-3 border border-line p-5 text-sm">
            <input
              type="checkbox"
              checked={wantsReminder}
              onChange={(e) => setWantsReminder(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-ink"
            />
            <span className="leading-relaxed text-ink/75">
              Se eu não finalizar agora, quero receber um lembrete deste carrinho por e-mail. Você
              pode sair da lista com um clique, no próprio e-mail.
            </span>
          </label>

          <fieldset className="border border-line p-6 sm:p-7">
            <legend className="px-2 text-[11px] font-bold uppercase tracking-[0.18em]">Endereço de entrega</legend>
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

          <fieldset className="border border-line p-6 sm:p-7">
            <legend className="px-2 text-[11px] font-bold uppercase tracking-[0.18em]">Frete</legend>
            {freeShipping ? (
              <p className="text-xs font-bold uppercase tracking-[0.14em]">
                Frete grátis nesta compra
              </p>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <p className="text-sm text-ink/70">
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
                {shippingError && <p className="mt-2 text-xs text-ink/60">{shippingError}</p>}
                {shippingOptions.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {(showAllShipping ? shippingOptions : shippingOptions.slice(0, 5)).map((option) => (
                      <label
                        key={option.id}
                        className={`flex cursor-pointer items-center gap-3 border-2 p-3 transition ${
                          selectedShippingId === option.id
                            ? 'border-ink bg-paper'
                            : 'border-line hover:border-ink/40'
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
                            <span className="block text-xs text-ink/60">
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

          <fieldset className="border border-line p-6 sm:p-7">
            <legend className="px-2 text-[11px] font-bold uppercase tracking-[0.18em]">Forma de pagamento</legend>
            <div className="flex flex-wrap gap-3">
              {availablePayments.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  onClick={() => setPayment(option.value)}
                  aria-pressed={payment === option.value}
                  className={`border px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] transition ${
                    payment === option.value
                      ? 'border-ink bg-ink text-white'
                      : 'border-ink/15 hover:border-ink'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {payment === 'cartao' && (
              <div className="mt-5 space-y-4">
                <div>
                  <label htmlFor="card-number" className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em]">
                    Número do cartão
                  </label>
                  <input
                    id="card-number"
                    inputMode="numeric"
                    autoComplete="cc-number"
                    placeholder="0000 0000 0000 0000"
                    maxLength={23}
                    value={cardNumber}
                    onChange={(e) =>
                      setCardNumber(
                        e.target.value
                          .replace(/\D/g, '')
                          .slice(0, 19)
                          .replace(/(\d{4})(?=\d)/g, '$1 ')
                      )
                    }
                    className="input-field w-full"
                  />
                </div>

                <div>
                  <label htmlFor="card-holder" className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em]">
                    Nome impresso no cartão
                  </label>
                  <input
                    id="card-holder"
                    autoComplete="cc-name"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value)}
                    className="input-field w-full"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="card-expiry" className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em]">
                      Validade
                    </label>
                    <input
                      id="card-expiry"
                      inputMode="numeric"
                      autoComplete="cc-exp"
                      placeholder="MM/AA"
                      maxLength={5}
                      value={cardExpiry}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
                        setCardExpiry(
                          digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits
                        );
                      }}
                      className="input-field w-full"
                    />
                  </div>
                  <div>
                    <label htmlFor="card-ccv" className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em]">
                      CVV
                    </label>
                    <input
                      id="card-ccv"
                      inputMode="numeric"
                      autoComplete="cc-csc"
                      placeholder="000"
                      maxLength={4}
                      value={cardCcv}
                      onChange={(e) => setCardCcv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      className="input-field w-full"
                    />
                  </div>
                </div>

                {settings.maxInstallments > 1 && (
                  <div>
                    <label htmlFor="card-installments" className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em]">
                      Parcelas
                    </label>
                    <select
                      id="card-installments"
                      value={installments}
                      onChange={(e) => setInstallments(Number(e.target.value))}
                      className="input-field w-full bg-white"
                    >
                      {Array.from({ length: settings.maxInstallments }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>
                          {n}x de {formatPrice(total / n)} sem juros
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <p className="text-xs leading-relaxed text-ink/60">
                  {/* Dizia "direto para a Asaas", e não é o que acontece: os dados
                      passam pelo servidor da loja antes de seguir para a
                      processadora. Não são gravados em lugar nenhum — não existe
                      campo de cartão no banco nem em log —, mas a frase antiga
                      descrevia um caminho que o código não faz. */}
                  Os dados do cartão trafegam por conexão segura, são usados apenas para cobrar
                  este pedido pela Asaas, nossa processadora de pagamentos, e não são guardados.
                </p>
              </div>
            )}
            {payment === 'pix' && (
              <p className="mt-4 text-sm text-ink/70">
                O código Pix será exibido após a confirmação do pedido.
              </p>
            )}
            {payment === 'boleto' && (
              <p className="mt-4 text-sm text-ink/70">
                O boleto será gerado após a confirmação do pedido, com vencimento em 3 dias úteis.
              </p>
            )}
          </fieldset>
        </div>

        <div className="h-fit bg-paper p-6 sm:p-7">
          <p className="eyebrow text-ink/50">Resumo do pedido</p>
          <ul className="mt-4 space-y-2 text-sm text-ink/75">
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

          <div className="mt-4 border-t border-line pt-4">
            {appliedCode ? (
              <div className="flex items-center justify-between border border-ink/15 bg-white px-3 py-2 text-sm">
                <span>
                  Cupom <span className="font-semibold">{appliedCode}</span> aplicado
                </span>
                <button type="button" onClick={handleRemoveCoupon} className="text-ink/60 hover:text-red-600">
                  Remover
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  placeholder="Cupom de desconto"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  className="input-field flex-1 bg-white"
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

          <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink/70">Subtotal</dt>
              <dd>{formatPrice(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink/70">
                Frete{!freeShipping && selectedShipping ? ` · ${selectedShipping.company}` : ''}
              </dt>
              <dd>{shipping === 0 ? 'Grátis' : formatPrice(shipping)}</dd>
            </div>
            {discount > 0 && (
              <div className="flex justify-between font-semibold">
                <dt>
                  Desconto
                  {usingProgressive ? ` · ${progressivePercent}% por ${totalItems} peças` : ''}
                </dt>
                <dd>-{formatPrice(discount)}</dd>
              </div>
            )}
          </dl>
          <div className="mt-4 flex items-baseline justify-between border-t border-ink/15 pt-4">
            <span className="eyebrow">Total</span>
            <span className="text-xl font-black tracking-tight">{formatPrice(total)}</span>
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
