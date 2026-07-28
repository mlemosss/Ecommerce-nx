'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { TopBar } from '../../components/top-bar';
import { api, ApiError } from '../../lib/api';
import { formatPrice } from '../../lib/format';
import type { Customer, PaymentMethod, Product } from '../../lib/types';

interface CartLine {
  variantId: string;
  productName: string;
  color: string;
  size: string;
  price: number;
  quantity: number;
  maxStock: number;
}

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: 'pix', label: 'Pix' },
  { value: 'cartao', label: 'Cartão' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'boleto', label: 'Boleto' },
];

export function SalesPageClient() {
  const searchParams = useSearchParams();
  const preselectedCustomerId = searchParams.get('clienteId') ?? '';

  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerId, setCustomerId] = useState(preselectedCustomerId);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [newCustomerError, setNewCustomerError] = useState('');
  const [payment, setPayment] = useState<PaymentMethod>('pix');
  const [openAccount, setOpenAccount] = useState(false);
  const [installments, setInstallments] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<{ id: string; total: number; status: string } | null>(
    null
  );

  useEffect(() => {
    api.get<Product[]>('/products').then(setProducts);
    api.get<Customer[]>('/customers').then(setCustomers);
  }, []);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? products.filter((p) => p.name.toLowerCase().includes(term)) : products;
  }, [products, search]);

  const total = cart.reduce((sum, line) => sum + line.price * line.quantity, 0);

  function addToCart(product: Product, variantId: string) {
    const variant = product.variants.find((v) => v.id === variantId);
    if (!variant || variant.stock <= 0) return;

    setCart((prev) => {
      const existing = prev.find((l) => l.variantId === variantId);
      if (existing) {
        if (existing.quantity >= variant.stock) return prev;
        return prev.map((l) =>
          l.variantId === variantId ? { ...l, quantity: l.quantity + 1 } : l
        );
      }
      return [
        ...prev,
        {
          variantId,
          productName: product.name,
          color: variant.color,
          size: variant.size,
          price: variant.price ?? product.price,
          quantity: 1,
          maxStock: variant.stock,
        },
      ];
    });
  }

  function updateQuantity(variantId: string, quantity: number) {
    setCart((prev) =>
      quantity <= 0
        ? prev.filter((l) => l.variantId !== variantId)
        : prev.map((l) => (l.variantId === variantId ? { ...l, quantity: Math.min(quantity, l.maxStock) } : l))
    );
  }

  async function handleCreateCustomer() {
    if (!newCustomerName.trim()) {
      setNewCustomerError('Informe o nome do cliente.');
      return;
    }
    setCreatingCustomer(true);
    setNewCustomerError('');
    try {
      const created = await api.post<Customer>('/customers', {
        name: newCustomerName.trim(),
        phone: newCustomerPhone.trim() || undefined,
      });
      setCustomers((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setCustomerId(created.id);
      setShowNewCustomer(false);
      setNewCustomerName('');
      setNewCustomerPhone('');
    } catch (err) {
      setNewCustomerError(err instanceof ApiError ? err.message : 'Erro ao criar cliente');
    } finally {
      setCreatingCustomer(false);
    }
  }

  async function handleConfirm() {
    if (cart.length === 0) return;
    if (openAccount && !customerId) {
      setError('Selecione um cliente para deixar a conta em aberto.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const sale = await api.post<{ id: string; total: number; status: string }>('/sales', {
        customerId: customerId || undefined,
        paymentMethod: payment,
        status: openAccount ? 'conta_aberta' : 'concluida',
        installments: payment === 'cartao' ? installments : 1,
        items: cart.map((l) => ({ productVariantId: l.variantId, quantity: l.quantity })),
      });
      setReceipt(sale);
      setCart([]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao registrar venda');
    } finally {
      setSubmitting(false);
    }
  }

  if (receipt) {
    return (
      <div>
        <TopBar title="Venda registrada" />
        <div className="flex flex-col items-center gap-3 px-4 pt-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-8 w-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="page-title">
            {receipt.status === 'conta_aberta' ? 'Conta aberta!' : 'Venda concluída!'}
          </p>
          <p className="text-black/60">Total: {formatPrice(receipt.total)}</p>
          <button type="button" onClick={() => setReceipt(null)} className="btn-primary mt-4">
            Nova venda
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <TopBar title="Vendas rápidas" />
      <div className="px-4 pt-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar produto"
          className="input-field"
        />

        <div className="mt-4 max-h-64 space-y-2 overflow-y-auto">
          {filteredProducts.map((product) => {
            const prices = product.variants.map((v) => v.price ?? product.price);
            const minPrice = Math.min(...prices, product.price);
            const maxPrice = Math.max(...prices, product.price);
            return (
              <div key={product.id} className="card !p-3">
                <p className="text-sm font-semibold">{product.name}</p>
                <p className="text-xs text-black/50">
                  {minPrice === maxPrice
                    ? formatPrice(minPrice)
                    : `${formatPrice(minPrice)} – ${formatPrice(maxPrice)}`}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {product.variants.map((variant) => (
                    <button
                      key={variant.id}
                      type="button"
                      disabled={variant.stock <= 0}
                      onClick={() => addToCart(product, variant.id)}
                      className="rounded-lg border border-black/10 px-2 py-1 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      {variant.color}/{variant.size} ({variant.stock}) · {formatPrice(variant.price ?? product.price)}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 border-t border-black/10 pt-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-black/50">Carrinho</p>
          {cart.length === 0 && <p className="mt-2 text-sm text-black/40">Nenhum item selecionado.</p>}
          <div className="mt-2 space-y-2">
            {cart.map((line) => (
              <div key={line.variantId} className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 flex-1 truncate">
                  {line.productName} ({line.color}/{line.size})
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => updateQuantity(line.variantId, line.quantity - 1)}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-black/5"
                  >
                    −
                  </button>
                  <span className="w-6 text-center">{line.quantity}</span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(line.variantId, line.quantity + 1)}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-black/5"
                  >
                    +
                  </button>
                </div>
                <span className="w-20 shrink-0 text-right font-semibold">
                  {formatPrice(line.price * line.quantity)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between">
            <label className="mb-1 block text-sm font-semibold">Cliente (opcional)</label>
            <button
              type="button"
              onClick={() => setShowNewCustomer((v) => !v)}
              className="text-xs font-semibold text-accent underline"
            >
              {showNewCustomer ? 'Cancelar' : '+ Novo cliente'}
            </button>
          </div>

          {showNewCustomer ? (
            <div className="space-y-2 rounded-2xl border border-black/10 p-3">
              <input
                autoFocus
                placeholder="Nome do cliente"
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                className="input-field"
              />
              <input
                placeholder="Telefone (opcional)"
                value={newCustomerPhone}
                onChange={(e) => setNewCustomerPhone(e.target.value)}
                className="input-field"
              />
              {newCustomerError && <p className="text-xs text-red-600">{newCustomerError}</p>}
              <button
                type="button"
                onClick={handleCreateCustomer}
                disabled={creatingCustomer}
                className="btn-primary w-full !py-2 text-sm disabled:opacity-60"
              >
                {creatingCustomer ? 'Criando...' : 'Criar e selecionar'}
              </button>
            </div>
          ) : (
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="input-field"
            >
              <option value="">Consumidor não identificado</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="mt-4">
          <label className="mb-2 block text-sm font-semibold">Forma de pagamento</label>
          <div className="flex flex-wrap gap-2">
            {PAYMENT_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setPayment(option.value)}
                className={`rounded-full border px-4 py-2 text-sm font-medium ${
                  payment === option.value ? 'border-ink bg-ink text-white' : 'border-black/10'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          {payment === 'cartao' && (
            <div className="mt-3">
              <label className="mb-1 block text-sm font-semibold">Parcelas</label>
              <select
                value={installments}
                onChange={(e) => setInstallments(Number(e.target.value))}
                className="input-field"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}x{n > 1 ? ` de ${formatPrice(total / n)}` : ' à vista'}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={openAccount}
            onChange={(e) => setOpenAccount(e.target.checked)}
            className="h-4 w-4 accent-accent"
          />
          Deixar conta em aberto (fiado)
        </label>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-6 flex items-center justify-between border-t border-black/10 pt-4">
          <span className="text-sm text-black/50">Total</span>
          <span className="text-xl font-bold">{formatPrice(total)}</span>
        </div>

        <button
          type="button"
          disabled={cart.length === 0 || submitting}
          onClick={handleConfirm}
          className="btn-primary mt-4 w-full"
        >
          {submitting ? 'Registrando...' : openAccount ? 'Abrir conta' : 'Confirmar venda'}
        </button>
      </div>
    </div>
  );
}
