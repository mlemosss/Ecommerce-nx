'use client';

import { useEffect, useState } from 'react';
import { TopBar } from '../../components/top-bar';
import { api } from '../../lib/api';
import { formatDate, formatPrice } from '../../lib/format';
import type { Order, OrderStatus } from '../../lib/types';

const STATUS_LABEL: Record<OrderStatus, string> = {
  aguardando_pagamento: 'Aguardando pagamento',
  pago: 'Pago',
  enviado: 'Enviado',
  cancelado: 'Cancelado',
};

const STATUS_STYLE: Record<OrderStatus, string> = {
  aguardando_pagamento: 'bg-amber-100 text-amber-700',
  pago: 'bg-green-100 text-green-700',
  enviado: 'bg-blue-100 text-blue-700',
  cancelado: 'bg-black/10 text-black/50',
};

const PAYMENT_LABEL: Record<Order['paymentMethod'], string> = {
  pix: 'Pix',
  cartao: 'Cartão',
  boleto: 'Boleto',
};

const FILTERS: { value: OrderStatus | 'todos'; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'aguardando_pagamento', label: 'Aguardando' },
  { value: 'pago', label: 'Pagos' },
  { value: 'enviado', label: 'Enviados' },
  { value: 'cancelado', label: 'Cancelados' },
];

export function OrdersPageClient() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'todos'>('todos');
  const [search, setSearch] = useState('');
  const [copiado, setCopiado] = useState<string | null>(null);

  /**
   * O link tem que apontar para o domínio da loja, não para o do painel — os
   * dois vivem no mesmo endereço (`/admin`), então uma URL relativa levaria a
   * cliente para dentro do administrativo.
   */
  const lojaUrl = (
    process.env.NEXT_PUBLIC_STOREFRONT_URL ?? 'https://www.noexcusenx.com.br'
  ).replace(/\/$/, '');

  const [reloadKey, setReloadKey] = useState(0);
  const [error, setError] = useState('');
  // Rastreio digitado por pedido, antes de salvar.
  const [tracking, setTracking] = useState<Record<string, string>>({});
  const [emitindo, setEmitindo] = useState<string | null>(null);
  const [erroEtiqueta, setErroEtiqueta] = useState<Record<string, string>>({});
  const [saldo, setSaldo] = useState<number | null>(null);
  const [estornando, setEstornando] = useState<string | null>(null);

  function linkAvaliacao(order: Order): string {
    return `${lojaUrl}/avaliar/${order.reviewToken}`;
  }

  /**
   * Copiar e abrir o WhatsApp são síncronos de propósito.
   *
   * Cheguei a fazer os dois buscarem o token na API antes de agir, achando que
   * pedido antigo estava sem token. Estava errado: a migração que criou a
   * coluna já preencheu todo pedido existente. E o `await` quebrava os botões
   * no Safari, que só libera `window.open` e a área de transferência dentro do
   * clique — bloqueado, `window.open` devolve `null` sem lançar erro, então o
   * botão simplesmente não fazia nada, calado.
   *
   * Pedido sem token é o caso raríssimo de quem comprou na janela entre dois
   * deploys. Para esse, o botão vira "Gerar link" e aí sim chama a API.
   */
  function copiarLinkAvaliacao(order: Order) {
    navigator.clipboard
      .writeText(linkAvaliacao(order))
      .then(() => {
        setCopiado(order.id);
        setTimeout(() => setCopiado((atual) => (atual === order.id ? null : atual)), 2000);
      })
      .catch(() => setError('Não foi possível copiar o link.'));
  }

  /** Abre o WhatsApp já com a mensagem escrita, para a lojista só apertar enviar. */
  function linkWhatsApp(order: Order): string {
    const telefone = (order.customerPhone ?? '').replace(/\D/g, '');
    const primeiroNome = order.customerName.trim().split(/\s+/)[0] ?? '';
    const texto =
      `Oi, ${primeiroNome}! Aqui é da NO EXCUSE. ` +
      `Você recebeu o pedido #${order.orderNumber}? Se puder contar o que achou, ajuda muito ` +
      `quem está em dúvida no tamanho: ${linkAvaliacao(order)}`;
    const numero =
      telefone.length >= 10 ? (telefone.startsWith('55') ? telefone : `55${telefone}`) : '';
    return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
  }

  /** Só para o pedido raro que ficou sem token. Depois disso os botões são links. */
  async function gerarToken(order: Order) {
    setError('');
    try {
      const { reviewToken } = await api.post<{ reviewToken: string }>(
        `/orders/${order.id}/review-token`,
        {}
      );
      setOrders(
        (atuais) => atuais?.map((o) => (o.id === order.id ? { ...o, reviewToken } : o)) ?? atuais
      );
    } catch {
      setError('Não foi possível gerar o link de avaliação. Tente de novo.');
    }
  }

  // A busca vai para a API com um respiro, para não disparar a cada tecla.
  useEffect(() => {
    const handle = setTimeout(() => {
      const params = new URLSearchParams();
      if (statusFilter !== 'todos') params.set('status', statusFilter);
      const q = search.trim();
      if (q) params.set('q', q);
      const query = params.toString();

      api
        .get<Order[]>(`/orders${query ? `?${query}` : ''}`)
        .then((data) => {
          setOrders(data);
          setError('');
        })
        .catch((e) => setError(e?.message ?? 'Não foi possível carregar os pedidos.'));
    }, 250);

    return () => clearTimeout(handle);
  }, [statusFilter, search, reloadKey]);

  /**
   * Saldo da carteira do Melhor Envio, junto com a lista.
   *
   * Aparece antes de emitir, e não depois de falhar: descobrir que acabou o
   * crédito com o pacote embalado e a cliente esperando atrasa a entrega por um
   * dia inteiro. Falha em silêncio — saldo é conforto, não pré-requisito.
   */
  useEffect(() => {
    api
      .get<{ disponivel: number | null }>('/shipping/saldo')
      .then((r) => setSaldo(r.disponivel))
      .catch(() => setSaldo(null));
  }, [reloadKey]);

  function reload() {
    setReloadKey((key) => key + 1);
  }

  /**
   * Os dados de envio num bloco só, prontos para colar.
   *
   * A loja não emite etiqueta: quem emite é o Melhor Envio ou o site dos
   * Correios, e ali os campos são preenchidos um a um. Redigitar endereço de
   * uma tela para outra é como se troca o número da casa sem perceber — e o
   * pacote volta duas semanas depois.
   */
  function copiarParaEtiqueta(order: Order) {
    const linhas = [
      order.customerName,
      `CPF: ${order.customerDocument}`,
      `Telefone: ${order.customerPhone}`,
      '',
      `${order.street}, ${order.number}${order.complement ? ` - ${order.complement}` : ''}`,
      order.neighborhood ?? '',
      `${order.city}${order.state ? ` - ${order.state}` : ''}`,
      `CEP ${order.zipCode}`,
      '',
      `Pedido ${order.orderNumber}`,
    ];

    navigator.clipboard?.writeText(linhas.join('\n'));
    setCopiado(order.id);
  }

  /**
   * Os dados da venda no formato de quem vai digitar a nota.
   *
   * A loja não emite NF-e: emitir exige certificado digital e credenciamento na
   * SEFAZ, e quem faz isso é o emissor (SEBRAE, Bling, eNotas). O que a lojista
   * faz é abrir o emissor e redigitar destinatário, itens e valores — e é aí
   * que o CPF sai com um dígito trocado e a nota volta rejeitada.
   *
   * Destinatário, itens com quantidade e preço unitário, e os totais separados.
   * Frete e desconto vão em linha própria porque na nota eles são campos
   * próprios, e somados ao produto dariam base de cálculo errada.
   */
  function copiarParaNota(order: Order) {
    const linhas = [
      `PEDIDO ${order.orderNumber} — ${formatDate(order.createdAt)}`,
      '',
      'DESTINATÁRIO',
      order.customerName,
      `CPF: ${order.customerDocument}`,
      `${order.street}, ${order.number}${order.complement ? ` - ${order.complement}` : ''}`,
      `${order.neighborhood ?? ''} · ${order.city}${order.state ? ` - ${order.state}` : ''}`,
      `CEP ${order.zipCode}`,
      order.customerEmail,
      order.customerPhone,
      '',
      'ITENS',
      ...order.items.map(
        (i) =>
          `${i.quantity}x ${i.productName} (${i.color} / ${i.size}) — ` +
          `unit. ${formatPrice(i.unitPrice)} — total ${formatPrice(i.unitPrice * i.quantity)}`
      ),
      '',
      `Subtotal: ${formatPrice(order.subtotal)}`,
      ...(order.discount > 0
        ? [`Desconto${order.couponCode ? ` (${order.couponCode})` : ''}: -${formatPrice(order.discount)}`]
        : []),
      `Frete: ${order.pickup ? 'retirada em mãos' : formatPrice(order.shipping)}`,
      `TOTAL: ${formatPrice(order.total)}`,
    ];

    navigator.clipboard?.writeText(linhas.join('\n'));
    setCopiado(order.id);
  }

  /**
   * Compra a etiqueta no Melhor Envio. Gasta o saldo da carteira.
   *
   * Confirmação obrigatória, com o valor do frete na frente: é a única ação do
   * painel que tira dinheiro da conta, e um clique sem querer aqui vira um
   * pagamento sem volta. O servidor grava o envio antes de pagar, então nem
   * clique duplo nem recarregar a página compram duas.
   */
  async function gerarEtiqueta(order: Order) {
    const confirmado = window.confirm(
      [
        `Comprar a etiqueta do pedido ${order.orderNumber}?`,
        '',
        'O valor sai do saldo da sua carteira no Melhor Envio.',
        `Frete cobrado da cliente: ${formatPrice(order.shipping)}`,
      ].join('\n')
    );
    if (!confirmado) return;

    setEmitindo(order.id);
    setErroEtiqueta((prev) => ({ ...prev, [order.id]: '' }));
    try {
      await api.post(`/shipping/etiqueta/${order.id}`, {});
      setReloadKey((k) => k + 1);
    } catch (err) {
      setErroEtiqueta((prev) => ({
        ...prev,
        [order.id]: err instanceof Error ? err.message : 'Não consegui emitir agora.',
      }));
    } finally {
      setEmitindo(null);
    }
  }

  /**
   * Devolve o dinheiro no Asaas e cancela o pedido.
   *
   * A confirmação diz o valor e para quem, porque estorno de cartão não tem
   * botão de desfazer: o dinheiro sai da conta da loja e volta para a fatura da
   * cliente. O servidor estorna primeiro e só depois cancela — se o Asaas
   * recusar, o pedido continua pago, que é a verdade.
   */
  async function estornar(order: Order) {
    const confirmado = window.confirm(
      [
        `Estornar ${formatPrice(order.total)} do pedido ${order.orderNumber}?`,
        '',
        `O valor volta para ${order.customerName} e o pedido é cancelado.`,
        'A peça retorna ao estoque. Estorno de cartão não tem como desfazer.',
      ].join('\n')
    );
    if (!confirmado) return;

    setEstornando(order.id);
    setError('');
    try {
      await api.post(`/orders/${order.id}/estornar`, {});
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível estornar agora.');
    } finally {
      setEstornando(null);
    }
  }

  async function updateStatus(order: Order, status: OrderStatus, trackingCode?: string) {
    setUpdatingId(order.id);
    setError('');
    try {
      await api.patch(`/orders/${order.id}/status`, { status, trackingCode });
      reload();
    } catch (e) {
      // Ex.: reabrir um pedido cancelado sem estoque para repor a saída.
      setError((e as Error)?.message ?? 'Não foi possível mudar o status.');
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDelete(order: Order) {
    if (!window.confirm(`Apagar o pedido #${order.orderNumber}? Esta ação não pode ser desfeita.`)) return;
    setUpdatingId(order.id);
    setError('');
    try {
      await api.delete(`/orders/${order.id}`);
      reload();
    } catch (e) {
      setError((e as Error)?.message ?? 'Não foi possível apagar o pedido.');
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div>
      <TopBar title="Pedidos" />
      <div className="px-4 pt-4">
        {/* Saldo baixo avisa aqui, e não na hora de emitir. R$50 dá umas três
            etiquetas: é pouco o bastante para reabastecer com calma e muito o
            bastante para não virar aviso permanente. */}
        {saldo !== null && saldo < 50 && (
          <a
            href="https://melhorenvio.com.br/painel/carteira"
            target="_blank"
            rel="noreferrer"
            className="mb-3 block rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800"
          >
            <span className="font-semibold">Saldo no Melhor Envio: {formatPrice(saldo)}</span>
            <br />
            Dá para poucas etiquetas. Toque para adicionar crédito antes que falte.
          </a>
        )}

        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por número, nome ou e-mail"
          className="w-full rounded-full border border-black/10 px-4 py-2 text-sm outline-none focus:border-ink"
        />

        <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
          {FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setStatusFilter(filter.value)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                statusFilter === filter.value
                  ? 'bg-ink text-white'
                  : 'bg-black/5 text-black/60 hover:text-ink'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {error && (
          <p className="mt-3 rounded-2xl bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>
        )}

        {orders === null && <p className="mt-8 text-center text-sm text-black/50">Carregando...</p>}
        {orders && orders.length === 0 && (
          <p className="mt-8 text-center text-sm text-black/50">
            {search.trim() || statusFilter !== 'todos'
              ? 'Nenhum pedido encontrado com esse filtro.'
              : 'Nenhum pedido ainda.'}
          </p>
        )}

        <div className="mt-3 space-y-2">
          {orders?.map((order) => {
            const expanded = expandedId === order.id;
            const trackingValue = tracking[order.id] ?? order.trackingCode ?? '';
            return (
              <div key={order.id} className="card !p-3">
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : order.id)}
                  className="flex w-full items-center justify-between text-left"
                >
                  <div>
                    <p className="text-sm font-bold">#{order.orderNumber}</p>
                    <p className="text-xs text-black/50">
                      {order.customerName} · {formatDate(order.createdAt)} ·{' '}
                      {PAYMENT_LABEL[order.paymentMethod]}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{formatPrice(order.total)}</span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLE[order.status]}`}
                    >
                      {STATUS_LABEL[order.status]}
                    </span>
                  </div>
                </button>

                {expanded && (
                  <div className="mt-3 space-y-3 border-t border-black/10 pt-3 text-sm">
                    <div>
                      <p className="font-semibold">Contato</p>
                      <p className="text-black/60">{order.customerEmail}</p>
                      <p className="text-black/60">{order.customerPhone}</p>
                    </div>

                    {/* Link de avaliação, para mandar no WhatsApp.
                        Abre sem senha — quem comprou como convidado não tem
                        conta, e era isso que travava a avaliação até agora. */}
                    <div>
                      <p className="font-semibold">Avaliação</p>
                      <div className="mt-1 flex flex-wrap items-center gap-3">
                        {order.reviewToken ? (
                          <>
                            <button
                              type="button"
                              onClick={() => copiarLinkAvaliacao(order)}
                              className="rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-white"
                            >
                              {copiado === order.id ? 'Link copiado!' : 'Copiar link de avaliação'}
                            </button>
                            <a
                              href={linkWhatsApp(order)}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-semibold text-accent underline underline-offset-2"
                            >
                              Abrir no WhatsApp
                            </a>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => gerarToken(order)}
                            className="rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-white"
                          >
                            Gerar link de avaliação
                          </button>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-black/45">
                        Abre sem login. Vale só para este pedido e pode ser reenviado.
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold">Entrega</p>
                      {/* Retirada precisa gritar. O endereço continua aí porque
                          é o dado fiscal da cliente — mas se a lojista bater o
                          olho e postar, ela paga um frete que ninguém pediu. */}
                      {order.pickup ? (
                        <>
                          <p className="mt-1 inline-block rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">
                            RETIRADA EM HIGIENÓPOLIS — não postar
                          </p>
                          <p className="mt-1 text-xs text-black/45">
                            Combine dia e horário com a cliente. Endereço no cadastro:{' '}
                            {order.street}, {order.number} · {order.city}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-black/60">
                            {order.street}, {order.number}
                            {order.complement ? ` - ${order.complement}` : ''}
                            {order.neighborhood ? ` · ${order.neighborhood}` : ''}
                            <br />
                            {order.city}
                            {order.state ? ` - ${order.state}` : ''} · CEP {order.zipCode}
                          </p>
                          {(!order.neighborhood || !order.state) && (
                            <p className="mt-1 text-xs text-amber-700">
                              Bairro/UF não foram perguntados neste pedido. Consulte o CEP no site
                              dos Correios antes de emitir a etiqueta.
                            </p>
                          )}
                          {/* Onde postar é a pergunta seguinte a imprimir a
                              etiqueta, e o pacote não sai sem essa resposta.
                              Cada transportadora tem seus pontos: SEDEX é
                              agência dos Correios, Jadlog e Loggi são pontos
                              parceiros. O link abre o localizador do Melhor
                              Envio, que filtra pelo seu CEP. */}
                          {order.shippingServiceName && (
                            <p className="mt-2 text-xs text-black/60">
                              Transportadora:{' '}
                              <span className="font-semibold text-black/80">
                                {order.shippingServiceName}
                              </span>{' '}
                              ·{' '}
                              <a
                                href="https://melhorenvio.com.br/onde-postar"
                                target="_blank"
                                rel="noreferrer"
                                className="underline underline-offset-2"
                              >
                                onde postar
                              </a>
                            </p>
                          )}

                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            {order.shipmentLabelUrl ? (
                              <a
                                href={order.shipmentLabelUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white"
                              >
                                Abrir etiqueta (PDF)
                              </a>
                            ) : (
                              <button
                                type="button"
                                onClick={() => gerarEtiqueta(order)}
                                disabled={emitindo === order.id || order.status !== 'pago'}
                                className="rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                              >
                                {emitindo === order.id ? 'Emitindo...' : 'Gerar etiqueta'}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => copiarParaEtiqueta(order)}
                              className="rounded-lg bg-black/10 px-3 py-1.5 text-xs font-semibold text-black/70"
                            >
                              {copiado === order.id ? 'Copiado!' : 'Copiar dados de envio'}
                            </button>
                            {/* A loja não emite NF-e — isso exige certificado
                                digital e credenciamento na SEFAZ. O que dá para
                                tirar do caminho é a redigitação, que é onde o
                                CPF sai com um dígito trocado e a nota volta
                                rejeitada. */}
                            <button
                              type="button"
                              onClick={() => copiarParaNota(order)}
                              className="rounded-lg bg-black/10 px-3 py-1.5 text-xs font-semibold text-black/70"
                            >
                              Copiar dados para a nota
                            </button>
                          </div>
                          {erroEtiqueta[order.id] && (
                            <p className="mt-1 text-xs text-red-600">{erroEtiqueta[order.id]}</p>
                          )}
                        </>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold">Itens</p>
                      <ul className="mt-1 space-y-1 text-black/60">
                        {order.items.map((item) => (
                          <li key={item.id} className="flex justify-between">
                            <span>
                              {item.productName} ({item.color}/{item.size}) × {item.quantity}
                            </span>
                            <span>{formatPrice(item.unitPrice * item.quantity)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    {order.couponCode && (
                      <p className="text-black/60">
                        Cupom: <span className="font-semibold">{order.couponCode}</span> (-
                        {formatPrice(order.discount)})
                      </p>
                    )}
                    {order.asaasInvoiceUrl && (
                      <a
                        href={order.asaasInvoiceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="block text-accent underline"
                      >
                        Ver cobrança na Asaas
                      </a>
                    )}

                    <div>
                      <label
                        htmlFor={`rastreio-${order.id}`}
                        className="text-xs font-semibold text-black/60"
                      >
                        Código de rastreio
                      </label>
                      <input
                        id={`rastreio-${order.id}`}
                        value={trackingValue}
                        onChange={(e) =>
                          setTracking((current) => ({ ...current, [order.id]: e.target.value }))
                        }
                        placeholder="Opcional — vai no e-mail de envio"
                        className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm outline-none focus:border-ink"
                      />
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      {order.status !== 'pago' && (
                        <button
                          type="button"
                          disabled={updatingId === order.id}
                          onClick={() => updateStatus(order, 'pago')}
                          className="rounded-full bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-700 disabled:opacity-50"
                        >
                          Marcar como pago
                        </button>
                      )}
                      {order.status !== 'enviado' && order.status !== 'cancelado' && (
                        <button
                          type="button"
                          disabled={updatingId === order.id}
                          onClick={() =>
                            updateStatus(order, 'enviado', trackingValue.trim() || undefined)
                          }
                          className="rounded-full bg-blue-100 px-3 py-1.5 text-xs font-semibold text-blue-700 disabled:opacity-50"
                        >
                          Marcar como enviado
                        </button>
                      )}
                      {/* Estornar e cancelar são coisas diferentes, e a
                          diferença é dinheiro. "Cancelar" mexe só aqui: devolve
                          a peça ao estoque e fecha o pedido. "Estornar"
                          devolve o valor no Asaas antes de fazer tudo isso.
                          Pedido pago sem estorno deixa o dinheiro na conta e
                          ninguém vai atrás, porque a tela já diz cancelado. */}
                      {order.status !== 'cancelado' && (
                        <button
                          type="button"
                          disabled={updatingId === order.id}
                          onClick={() => updateStatus(order, 'cancelado')}
                          className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 disabled:opacity-50"
                        >
                          Cancelar sem estornar
                        </button>
                      )}
                      {order.status === 'pago' && (
                        <button
                          type="button"
                          disabled={estornando === order.id}
                          onClick={() => estornar(order)}
                          className="rounded-full bg-red-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                        >
                          {estornando === order.id ? 'Estornando...' : 'Estornar e cancelar'}
                        </button>
                      )}
                      {order.status !== 'aguardando_pagamento' && (
                        <button
                          type="button"
                          disabled={updatingId === order.id}
                          onClick={() => updateStatus(order, 'aguardando_pagamento')}
                          className="rounded-full bg-black/5 px-3 py-1.5 text-xs font-semibold text-black/60 disabled:opacity-50"
                        >
                          Voltar p/ aguardando
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={updatingId === order.id}
                        onClick={() => handleDelete(order)}
                        className="rounded-full bg-black/5 px-3 py-1.5 text-xs font-semibold text-black/60 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      >
                        Apagar
                      </button>
                    </div>

                    {order.status === 'cancelado' && (
                      <p className="text-xs text-black/50">
                        As peças deste pedido voltaram para o estoque.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
