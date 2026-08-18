const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api';

export interface ValueProp {
  title: string;
  description: string;
}

export interface StoreSettings {
  storeName: string;
  contactEmail: string | null;
  contactWhatsapp: string | null;
  legalName: string | null;
  cnpj: string | null;
  shippingFee: number;
  freeShippingThreshold: number;
  pixEnabled: boolean;
  cardEnabled: boolean;
  boletoEnabled: boolean;
  maxInstallments: number;
  instagramUrl: string | null;
  facebookUrl: string | null;
  heroTag: string;
  heroTitleLine1: string;
  heroTitleHighlight: string;
  heroSubtitle: string;
  heroPrimaryButtonLabel: string;
  heroSecondaryButtonLabel: string;
  newsletterTitle: string;
  newsletterSubtitle: string;
  valueProps: ValueProp[];
  clarityProjectId: string | null;
  gtmId: string | null;
  metaPixelId: string | null;
  googleAdsId: string | null;
  googleAdsConversionLabel: string | null;
  /** JSON: [{ minItems, percent }] do desconto progressivo. */
  progressiveDiscount: string;
  /** JSON: [{ category, size, bust, waist, hip }] da tabela de medidas. */
  sizeGuide: string;
  promoBannerText: string | null;
  promoBannerEndsAt: string | null;
  /** Página "Quem somos" — editável em Configurações. */
  aboutHeadline: string | null;
  aboutBody: string | null;
}

export const DEFAULT_SETTINGS: StoreSettings = {
  storeName: 'NO EXCUSE',
  // Contato preenchido, e nao nulo, de proposito. Estes valores so entram em
  // cena quando a API nao responde - e foi exatamente ai, na queda de
  // 18/08/2026, que o botao do WhatsApp sumiu do rodape. O unico canal que
  // continuava funcionando desapareceu justamente quando era o unico que
  // restava. Se mudar em Configuracoes, mudar aqui tambem.
  contactEmail: 'noexcusenx@gmail.com',
  contactWhatsapp: '5511999520369',
  legalName: null,
  cnpj: null,
  shippingFee: 19.9,
  // Só vale se a API não responder; deve espelhar o que está em Configurações,
  // senão a loja promete um frete grátis diferente do que vai praticar.
  freeShippingThreshold: 499.9,
  pixEnabled: true,
  cardEnabled: true,
  boletoEnabled: true,
  maxInstallments: 3,
  instagramUrl: null,
  facebookUrl: null,
  heroTag: 'Nova coleção',
  heroTitleLine1: 'Treine sem',
  heroTitleHighlight: 'limites.',
  heroSubtitle:
    'Roupas de academia pensadas para quem treina de verdade: compressão certa, respirabilidade e caimento que acompanham cada repetição.',
  heroPrimaryButtonLabel: 'Ver produtos',
  heroSecondaryButtonLabel: 'Explorar leggings',
  newsletterTitle: 'Ganhe 10% na primeira compra',
  newsletterSubtitle: 'Cadastre seu e-mail e receba um cupom exclusivo, além de novidades de lançamentos.',
  valueProps: [
    { title: 'Troca grátis em 7 dias', description: 'Não serviu ou não gostou? Trocamos sem burocracia.' },
    { title: 'Entrega para todo o Brasil', description: 'Envio rastreado com prazos exibidos no checkout.' },
    {
      title: 'Tecido testado em treino real',
      description: 'Compressão, respirabilidade e durabilidade validadas por atletas.',
    },
    { title: 'Pagamento seguro', description: 'Pix, cartão em até 3x sem juros ou boleto.' },
  ],
  clarityProjectId: null,
  gtmId: null,
  metaPixelId: null,
  googleAdsId: null,
  googleAdsConversionLabel: null,
  progressiveDiscount: '[]',
  sizeGuide: '[]',
  promoBannerText: null,
  promoBannerEndsAt: null,
  aboutHeadline: null,
  aboutBody: null,
};

export async function getSettings(): Promise<StoreSettings> {
  try {
    const res = await fetch(`${API_URL}/settings`, { next: { revalidate: 60 } });
    if (!res.ok) return DEFAULT_SETTINGS;
    return await res.json();
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export interface Testimonial {
  id: string;
  customerName: string;
  photoUrl: string | null;
  quote: string;
  rating: number;
}

export async function getTestimonials(): Promise<Testimonial[]> {
  try {
    const res = await fetch(`${API_URL}/testimonials`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export interface ProductReview {
  id: string;
  customerName: string;
  rating: number;
  comment: string;
  /** Foto da cliente usando a peça, quando ela mandou. */
  photoUrl: string | null;
  createdAt: string;
}

export interface ProductReviewsResult {
  reviews: ProductReview[];
  average: number;
  count: number;
}

export async function getProductReviews(productId: string): Promise<ProductReviewsResult> {
  try {
    const res = await fetch(`${API_URL}/reviews/product/${productId}`, { next: { revalidate: 60 } });
    if (!res.ok) return { reviews: [], average: 0, count: 0 };
    return await res.json();
  } catch {
    return { reviews: [], average: 0, count: 0 };
  }
}

export interface CouponValidationResult {
  valid: boolean;
  message?: string;
  code?: string;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  discountAmount?: number;
}

/**
 * `customerDocument` só é usado pelos cupons de primeira compra, para conferir
 * se o CPF já tem pedido. Vai vazio quando o campo ainda não foi preenchido — a
 * API responde pedindo o CPF em vez de aprovar às cegas.
 */
export async function validateCoupon(
  code: string,
  orderTotal: number,
  customerDocument?: string
): Promise<CouponValidationResult> {
  try {
    const res = await fetch(`${API_URL}/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, orderTotal, customerDocument }),
    });
    if (!res.ok) return { valid: false, message: 'Não foi possível validar o cupom agora.' };
    return await res.json();
  } catch {
    return { valid: false, message: 'Não foi possível validar o cupom agora.' };
  }
}

export interface CreateOrderItemInput {
  productId: string;
  productName: string;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number;
}

export interface CreateOrderInput {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerDocument: string;
  zipCode: string;
  city: string;
  neighborhood?: string;
  state?: string;
  street: string;
  number: string;
  complement?: string;
  items: CreateOrderItemInput[];
  subtotal: number;
  shipping: number;
  /** Retirada em maos: o servidor zera o frete e a lojista combina a entrega. */
  pickup?: boolean;
  discount: number;
  couponCode?: string;
  total: number;
  paymentMethod: 'pix' | 'cartao' | 'boleto';
  /**
   * Cartão: vai por HTTPS para a API da loja e de lá para o Asaas. Nada é
   * gravado — não há campo de cartão no schema nem log com o número.
   *
   * Passar pelo próprio servidor coloca a loja no escopo do PCI-DSS, que é o
   * que a tokenização no navegador existe para evitar. Enquanto isso não
   * mudar, o texto do checkout descreve este caminho como ele é.
   */
  creditCard?: {
    holderName: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    ccv: string;
  };
  installmentCount?: number;
}

export interface CreateOrderResult {
  order: { id: string; orderNumber: string };
  paymentUrl: string | null;
  /** Cartão aprovado na hora: não precisa mandar o cliente para a fatura. */
  paid?: boolean;
  /** Pix: QR Code para pagar sem sair da loja. */
  pix?: { encodedImage: string; payload: string; expirationDate?: string } | null;
  paymentWarning: string | null;
}

export class OrderError extends Error {}

export interface TrackAbandonedCartInput {
  email: string;
  name?: string;
  /** Para o resgate por WhatsApp, sob o mesmo consentimento do e-mail. */
  phone?: string;
  /** Sem isto o servidor descarta: lembrete de carrinho exige opt-in. */
  optIn?: boolean;
  items: CreateOrderItemInput[];
  total: number;
}

export async function trackAbandonedCart(input: TrackAbandonedCartInput): Promise<void> {
  try {
    await fetch(`${API_URL}/abandoned-cart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  } catch {
    // melhor esforço: se falhar, não atrapalha o checkout do cliente
  }
}

/**
 * Lê um cookie pelo nome. Só existe no navegador.
 *
 * Os identificadores de clique da Meta (`_fbp`, `_fbc`) são cookies da loja, e
 * a API vive em outro domínio — eles não viajam sozinhos. Vão no corpo do
 * pedido para ficarem guardados junto dele, porque a compra só é mandada à
 * Meta quando o pagamento confirma, às vezes muito depois, quando não há mais
 * navegador nenhum por perto.
 */
function lerCookie(nome: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const achado = document.cookie
    .split('; ')
    .find((parte) => parte.startsWith(`${nome}=`));
  return achado ? decodeURIComponent(achado.slice(nome.length + 1)) : undefined;
}

export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const res = await fetch(`${API_URL}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...input,
      metaFbp: lerCookie('_fbp'),
      metaFbc: lerCookie('_fbc'),
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = Array.isArray(body?.message) ? body.message.join(', ') : body?.message;
    throw new OrderError(message || 'Não foi possível registrar o pedido agora.');
  }
  return res.json();
}

export interface ShippingOption {
  id: string;
  name: string;
  company: string;
  price: number;
  deliveryTime: number | null;
}

export interface ShippingQuoteResult {
  configured: boolean;
  options: ShippingOption[];
  error?: string;
}

export interface ShippingQuoteInput {
  toZipCode: string;
  subtotal: number;
  items: { category?: string; quantity: number; unitPrice: number }[];
}

/** Cota o frete no Melhor Envio. Best-effort: se falhar, devolve lista vazia e o
 * checkout usa o frete fixo, sem travar. */
export async function quoteShipping(input: ShippingQuoteInput): Promise<ShippingQuoteResult> {
  try {
    const res = await fetch(`${API_URL}/shipping/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) return { configured: false, options: [] };
    return res.json();
  } catch {
    return { configured: false, options: [] };
  }
}

/**
 * "Avise-me quando chegar". Devolve sempre um objeto em vez de lançar: é um
 * formulário secundário na página de produto e uma exceção aqui derrubaria a
 * tela inteira por causa de um aviso opcional.
 */
export async function registerStockAlert(data: {
  productId: string;
  color: string;
  size: string;
  email: string;
}): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch(`${API_URL}/stock-alerts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (res.ok) return { ok: true, message: '' };

    const body = await res.json().catch(() => ({}));
    const message = Array.isArray(body?.message) ? body.message[0] : body?.message;
    return { ok: false, message: message || 'Não foi possível registrar agora. Tente de novo.' };
  } catch {
    return { ok: false, message: 'Não foi possível registrar agora. Tente de novo.' };
  }
}

export interface ReviewLinkProduct {
  productId: string;
  productName: string;
  avaliacao: { rating: number; comment: string; photoUrl: string | null } | null;
}

export interface ReviewLinkData {
  orderNumber: string;
  firstName: string;
  produtos: ReviewLinkProduct[];
}

/**
 * Abre a tela de avaliação pelo token do pedido. Sem cache: a pessoa pode
 * voltar no link para mudar o que escreveu, e uma resposta guardada mostraria
 * o formulário vazio de novo.
 */
export async function getReviewLink(token: string): Promise<ReviewLinkData | null> {
  try {
    const res = await fetch(`${API_URL}/reviews/link/${encodeURIComponent(token)}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function submitReviewLink(
  token: string,
  data: { productId: string; rating: number; comment: string; photoUrl?: string }
): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch(`${API_URL}/reviews/link/${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) return { ok: true, message: '' };
    const body = await res.json().catch(() => ({}));
    const message = Array.isArray(body?.message) ? body.message[0] : body?.message;
    return { ok: false, message: message || 'Não foi possível enviar agora. Tente de novo.' };
  } catch {
    return { ok: false, message: 'Não foi possível enviar agora. Tente de novo.' };
  }
}

export interface AvaliacaoPublica {
  id: string;
  photoUrl: string | null;
  rating: number;
  comment: string;
  customerName: string;
  productName: string;
  productSlug: string;
  createdAt: string;
  compraVerificada: boolean;
}

/** Tudo que foi aprovado, com média e total, para a página de avaliações. */
export async function getAvaliacoesPublicas(): Promise<{
  total: number;
  media: number;
  avaliacoes: AvaliacaoPublica[];
}> {
  try {
    const res = await fetch(`${API_URL}/reviews/publicas`, { next: { revalidate: 60 } });
    if (!res.ok) return { total: 0, media: 0, avaliacoes: [] };
    return await res.json();
  } catch {
    return { total: 0, media: 0, avaliacoes: [] };
  }
}

export interface FotoDoMural {
  id: string;
  photoUrl: string;
  rating: number;
  comment: string;
  customerName: string;
  /** Nulo quando a foto veio de uma avaliação da loja, sem peça atrás. */
  productName: string | null;
  productSlug: string | null;
  createdAt: string;
}

/**
 * As fotos que as clientes mandaram, de todas as peças.
 *
 * Cache de um minuto, igual ao resto do catálogo: aprovar uma avaliação no
 * painel tem que refletir na loja rápido, mas não a cada visita.
 */
export async function getMural(): Promise<FotoDoMural[]> {
  try {
    const res = await fetch(`${API_URL}/reviews/mural`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

/**
 * Avaliação da loja, mandada pelo link público — sem pedido e sem login.
 *
 * Existe porque as primeiras clientes compraram antes de o site existir: elas
 * não têm pedido no sistema, e são justamente quem tem o que dizer. O servidor
 * grava sempre como pendente; a lojista aprova em Depoimentos.
 */
export async function submitStoreReview(data: {
  customerName?: string;
  anonima?: boolean;
  email: string;
  rating: number;
  quote: string;
  photoUrl?: string;
  website?: string;
}): Promise<{ ok: true } | { ok: false; erro: string }> {
  try {
    const res = await fetch(`${API_URL}/testimonials/avaliar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) return { ok: true };
    const body = await res.json().catch(() => ({}));
    const message = Array.isArray(body?.message) ? body.message[0] : body?.message;
    return { ok: false, erro: message || 'Não foi possível enviar agora. Tente de novo.' };
  } catch {
    return { ok: false, erro: 'Não foi possível enviar agora. Tente de novo.' };
  }
}

export interface OrderPayment {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  paymentMethod: string;
  asaasInvoiceUrl: string | null;
  pix: { encodedImage: string; payload: string; expirationDate?: string } | null;
  alreadyPaid: boolean;
}

/**
 * Como pagar um pedido em aberto. Exige o token do cliente: a API casa o
 * pedido com o dono antes de responder, então ninguém vê pagamento alheio.
 */
export async function getOrderPayment(
  token: string,
  orderId: string
): Promise<OrderPayment | null> {
  try {
    const res = await fetch(`${API_URL}/customer-auth/me/orders/${orderId}/payment`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** Cadastro completo de quem está logado, incluindo endereço de entrega. */
export interface CustomerProfile {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  documentNumber: string | null;
  zipCode: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
}

export async function getCustomerProfile(token: string): Promise<CustomerProfile | null> {
  try {
    const res = await fetch(`${API_URL}/customer-auth/me/profile`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Salva o cadastro. Devolve a mensagem de erro da API em vez de um booleano:
 * "não foi possível salvar" não diz à pessoa qual campo corrigir.
 */
export async function saveCustomerProfile(
  token: string,
  dados: Partial<Omit<CustomerProfile, 'id' | 'email' | 'documentNumber'>>
): Promise<{ ok: true; profile: CustomerProfile } | { ok: false; erro: string }> {
  try {
    const res = await fetch(`${API_URL}/customer-auth/me/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(dados),
    });
    const corpo = await res.json().catch(() => null);
    if (!res.ok) {
      const message = corpo?.message;
      return {
        ok: false,
        erro: Array.isArray(message)
          ? message[0]
          : message || 'Não foi possível salvar agora. Tente de novo em instantes.',
      };
    }
    return { ok: true, profile: corpo };
  } catch {
    return { ok: false, erro: 'Sem conexão com a loja. Verifique a internet e tente de novo.' };
  }
}
