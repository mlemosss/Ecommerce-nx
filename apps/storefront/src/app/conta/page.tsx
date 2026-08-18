'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCustomerAuth } from '../../lib/customer-auth-context';
import { useProducts } from '../../lib/products-context';
import { formatPrice } from '../../lib/format';
import { ProductCard } from '../../components/product-card';
import { PrivacyActions } from '../../components/privacy-actions';
import { OrderPaymentPanel } from '../../components/order-payment';
import { ProfileForm } from '../../components/profile-form';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api';
const TOKEN_KEY = 'no-excuse:customer-token';

interface OrderItem {
  id: string;
  productName: string;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number;
}

interface OrderSummary {
  id: string;
  orderNumber: string;
  subtotal: number;
  shipping: number;
  discount: number;
  couponCode: string | null;
  total: number;
  status: string;
  paymentMethod: string;
  createdAt: string;
  items: OrderItem[];
}

const STATUS_LABEL: Record<string, string> = {
  aguardando_pagamento: 'Aguardando pagamento',
  pago: 'Pago',
  enviado: 'Enviado',
  cancelado: 'Cancelado',
};

const PAGAMENTO_LABEL: Record<string, string> = {
  pix: 'Pix',
  cartao: 'Cartão de crédito',
  boleto: 'Boleto',
};

/** Verde para pago, âmbar para o que ainda depende da cliente, cinza para o resto. */
const STATUS_ESTILO: Record<string, string> = {
  aguardando_pagamento: 'bg-amber-100 text-amber-900',
  pago: 'bg-emerald-100 text-emerald-900',
  enviado: 'bg-emerald-100 text-emerald-900',
  cancelado: 'bg-ink/10 text-ink/60',
};

export default function AccountPage() {
  const { customer, isLoaded, favoriteIds, logout } = useCustomerAuth();
  const { products } = useProducts();
  const router = useRouter();
  const [orders, setOrders] = useState<OrderSummary[] | null>(null);
  // Guardado no estado para o painel de pagamento poder chamar a API do cliente
  // sem reler o localStorage a cada render.
  const [authToken, setAuthToken] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && !customer) {
      router.replace('/conta/entrar');
    }
  }, [isLoaded, customer, router]);

  useEffect(() => {
    if (!customer) return;
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    setAuthToken(token);

    fetch(`${API_URL}/customer-auth/me/orders`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => (res.ok ? res.json() : []))
      .then(setOrders)
      .catch(() => setOrders([]));
  }, [customer]);

  const favoriteProducts = useMemo(
    () => products.filter((p) => favoriteIds.has(p.id)),
    [products, favoriteIds]
  );

  if (!customer) {
    return (
      <div className="container-page py-24 text-center text-sm text-ink/60" role="status">
        Carregando...
      </div>
    );
  }

  return (
    <div className="container-page py-14 sm:py-16">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-ink/50">Minha conta</p>
          <h1 className="section-title mt-3">Olá, {customer.name.split(' ')[0]}</h1>
        </div>
        <button
          type="button"
          onClick={() => {
            logout();
            router.push('/');
          }}
          className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/60 underline underline-offset-4 transition hover:text-ink"
        >
          Sair
        </button>
      </div>

      <ProfileForm token={authToken} />

      <section className="mt-12">
        <p className="eyebrow text-ink/50">Meus pedidos</p>
        {orders === null && (
          <p className="mt-4 text-sm text-ink/60" role="status">
            Carregando...
          </p>
        )}
        {orders?.length === 0 && (
          <p className="mt-4 text-sm text-ink/60">Você ainda não fez nenhum pedido.</p>
        )}
        {orders && orders.length > 0 && (
          <ul className="mt-4 border-t border-line">
            {orders.map((order) => (
              <li key={order.id} className="border-b border-line py-5 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em]">
                      #{order.orderNumber}
                    </p>
                    <p className="mt-1.5 text-xs text-ink/50">
                      {new Date(order.createdAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })}
                      {order.paymentMethod &&
                        ` · ${PAGAMENTO_LABEL[order.paymentMethod] ?? order.paymentMethod}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold">{formatPrice(order.total)}</span>
                    <span
                      className={`ml-3 inline-block rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] ${
                        STATUS_ESTILO[order.status] ?? 'bg-ink/10 text-ink/60'
                      }`}
                    >
                      {STATUS_LABEL[order.status] ?? order.status}
                    </span>
                  </div>
                </div>

                {/* Cancelado é onde a pessoa vem procurar o dinheiro. Sem o
                    prazo aqui, ela escreve no WhatsApp no terceiro dia, no
                    quinto e no oitavo — cada vez achando que foi esquecida. */}
                {order.status === 'cancelado' && (
                  <p className="mt-3 bg-paper px-4 py-3 text-xs leading-relaxed text-ink/70">
                    Pedido cancelado e valor estornado. No cartão de crédito o estorno pode levar{' '}
                    <strong>até 10 dias úteis</strong> para aparecer na fatura — o prazo é do banco
                    emissor. No Pix, volta em até um dia útil. Passou disso e não apareceu? Fale com
                    a gente.
                  </p>
                )}

                {/* A nota do pedido. Antes a conta mostrava só número, status e
                    total — quem quisesse conferir o que comprou, em que tamanho,
                    ou se o cupom entrou, precisava caçar o e-mail de confirmação. */}
                {order.items.length > 0 && (
                  <div className="mt-4 bg-paper p-4">
                    <ul className="space-y-2">
                      {order.items.map((item) => (
                        <li key={item.id} className="flex justify-between gap-4 text-sm">
                          <span className="text-ink/75">
                            {item.quantity}× {item.productName}
                            <span className="text-ink/50">
                              {' '}
                              · {item.color} · {item.size}
                            </span>
                          </span>
                          <span className="shrink-0 tabular-nums text-ink/75">
                            {formatPrice(item.unitPrice * item.quantity)}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <dl className="mt-4 space-y-1.5 border-t border-line pt-3 text-sm">
                      <div className="flex justify-between text-ink/60">
                        <dt>Subtotal</dt>
                        <dd className="tabular-nums">{formatPrice(order.subtotal)}</dd>
                      </div>
                      <div className="flex justify-between text-ink/60">
                        <dt>Frete</dt>
                        <dd className="tabular-nums">
                          {order.shipping > 0 ? formatPrice(order.shipping) : 'Grátis'}
                        </dd>
                      </div>
                      {order.discount > 0 && (
                        <div className="flex justify-between font-semibold text-emerald-700">
                          <dt>Desconto{order.couponCode ? ` · ${order.couponCode}` : ''}</dt>
                          <dd className="tabular-nums">−{formatPrice(order.discount)}</dd>
                        </div>
                      )}
                      <div className="flex justify-between border-t border-line pt-2 font-bold">
                        <dt>Total</dt>
                        <dd className="tabular-nums">{formatPrice(order.total)}</dd>
                      </div>
                    </dl>
                  </div>
                )}

                {/* Pedido em aberto tinha o status e nada mais: quem fechou a
                    aba do checkout perdia o QR do Pix e ficava sem caminho
                    nenhum para pagar. */}
                {order.status === 'aguardando_pagamento' && (
                  <OrderPaymentPanel orderId={order.id} token={authToken} />
                )}

                {/* O convite para avaliar vive no e-mail que sai depois da
                    entrega — e e-mail de loja pequena cai em "Promoções". Quem
                    volta aqui para conferir o pedido é justamente quem já
                    recebeu a peça; o caminho para escrever tem que estar
                    debaixo do pedido, não só numa caixa de entrada. */}
                {order.status === 'enviado' && (
                  <Link
                    href="/avaliar-loja"
                    className="mt-4 inline-block text-sm font-semibold underline underline-offset-4"
                  >
                    Avaliar esta compra
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-12">
        <p className="eyebrow text-ink/50">Meus favoritos</p>
        {favoriteProducts.length === 0 && (
          <p className="mt-4 text-sm text-ink/60">
            Você ainda não favoritou nenhum produto.{' '}
            <Link href="/produtos" className="underline underline-offset-4">
              Ver produtos
            </Link>
          </p>
        )}
        {favoriteProducts.length > 0 && (
          <div className="mt-6 grid grid-cols-2 gap-x-2 gap-y-8 sm:gap-x-3 md:grid-cols-3 lg:grid-cols-4">
            {favoriteProducts.map((product) => (
              <ProductCard key={product.id} product={product} showBadge={false} />
            ))}
          </div>
        )}
      </section>

      <PrivacyActions />
    </div>
  );
}
