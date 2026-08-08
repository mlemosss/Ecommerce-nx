interface OrderItemLike {
  productName: string;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number;
}

export interface OrderForEmail {
  orderNumber: string;
  customerName: string;
  total: number;
  subtotal: number;
  shipping: number;
  trackingCode?: string | null;
  items: OrderItemLike[];
}

export interface AbandonedCartForEmail {
  name?: string | null;
  itemsJson: string;
  total: number;
}

export interface EmailTemplate {
  subject: string;
  html: string;
}

function money(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

function itemsTable(items: OrderItemLike[]): string {
  const rows = items
    .map(
      (item) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #eee;font-size:14px;color:#111;">
            ${item.productName}<br/>
            <span style="color:#777;font-size:12px;">${item.color} / ${item.size} · ${item.quantity}x</span>
          </td>
          <td style="padding:10px 0;border-bottom:1px solid #eee;font-size:14px;color:#111;text-align:right;">
            ${money(item.unitPrice * item.quantity)}
          </td>
        </tr>`
    )
    .join('');
  return `<table style="width:100%;border-collapse:collapse;margin-top:16px;">${rows}</table>`;
}

function layout(storeName: string, title: string, bodyHtml: string, storefrontUrl: string): string {
  return `
  <div style="background:#f5f5f5;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;">
      <div style="background:#111111;padding:24px 32px;">
        <span style="color:#ffffff;font-size:20px;font-weight:800;letter-spacing:-0.5px;">${storeName}</span>
      </div>
      <div style="padding:32px;">
        <h1 style="margin:0 0 16px;font-size:20px;color:#111;">${title}</h1>
        ${bodyHtml}
      </div>
      <div style="background:#111111;padding:20px 32px;">
        <a href="${storefrontUrl}" style="color:#ffffff;font-size:12px;text-decoration:underline;">${storefrontUrl.replace('https://', '')}</a>
      </div>
    </div>
  </div>`;
}

/**
 * Link para definir a senha de uma conta criada por uma compra sem cadastro.
 * Confirmar o e-mail é o que impede que outra pessoa reivindique a conta.
 */
export function passwordSetupTemplate(
  storeName: string,
  storefrontUrl: string,
  data: { name: string; token: string }
): EmailTemplate {
  const link = `${storefrontUrl.replace(/\/$/, '')}/conta/definir-senha?token=${encodeURIComponent(
    data.token
  )}`;

  return {
    subject: `Conclua seu cadastro na ${storeName}`,
    html: layout(
      storeName,
      `Oi, ${firstName(data.name)}!`,
      `
      <p style="margin:0 0 16px;font-size:14px;color:#444;line-height:1.6;">
        Você já tem pedidos com esse e-mail, então a conta já existe. Para criar sua senha e
        acessar seus pedidos, clique no botão abaixo.
      </p>
      <p style="margin:0 0 24px;font-size:14px;color:#444;line-height:1.6;">
        O link vale por <strong>1 hora</strong> e só pode ser usado uma vez.
      </p>
      <a href="${link}" style="display:inline-block;background:#111111;color:#ffffff;padding:14px 28px;font-size:13px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;text-decoration:none;">
        Definir minha senha
      </a>
      <p style="margin:24px 0 0;font-size:12px;color:#777;line-height:1.6;">
        Se não foi você que pediu, ignore este e-mail — nada muda na sua conta.
      </p>`,
      storefrontUrl
    ),
  };
}

export function orderConfirmedTemplate(
  storeName: string,
  storefrontUrl: string,
  order: OrderForEmail
): EmailTemplate {
  const body = `
    <p style="color:#333;font-size:14px;line-height:1.6;">
      Oi, ${firstName(order.customerName)}! Recebemos o seu pedido <strong>#${order.orderNumber}</strong> e já
      estamos preparando tudo.
    </p>
    ${itemsTable(order.items)}
    <div style="margin-top:16px;font-size:14px;color:#333;">
      <div style="display:flex;justify-content:space-between;"><span>Subtotal</span><span>${money(order.subtotal)}</span></div>
      <div style="display:flex;justify-content:space-between;"><span>Frete</span><span>${money(order.shipping)}</span></div>
      <div style="display:flex;justify-content:space-between;font-weight:700;margin-top:8px;"><span>Total</span><span>${money(order.total)}</span></div>
    </div>`;
  return {
    subject: `Pedido #${order.orderNumber} confirmado — ${storeName}`,
    html: layout(storeName, 'Pedido recebido!', body, storefrontUrl),
  };
}

export function paymentApprovedTemplate(
  storeName: string,
  storefrontUrl: string,
  order: OrderForEmail
): EmailTemplate {
  const body = `
    <p style="color:#333;font-size:14px;line-height:1.6;">
      Boa, ${firstName(order.customerName)}! O pagamento do pedido <strong>#${order.orderNumber}</strong> foi
      confirmado e ele já entrou em preparação. Assim que sair pra entrega, avisamos por aqui.
    </p>`;
  return {
    subject: `Pagamento aprovado — pedido #${order.orderNumber}`,
    html: layout(storeName, 'Pagamento aprovado', body, storefrontUrl),
  };
}

export function orderShippedTemplate(
  storeName: string,
  storefrontUrl: string,
  order: OrderForEmail
): EmailTemplate {
  const tracking = order.trackingCode
    ? `<p style="color:#333;font-size:14px;">Código de rastreio: <strong>${order.trackingCode}</strong></p>`
    : '';
  const body = `
    <p style="color:#333;font-size:14px;line-height:1.6;">
      ${firstName(order.customerName)}, seu pedido <strong>#${order.orderNumber}</strong> saiu pra entrega!
    </p>
    ${tracking}`;
  return {
    subject: `Pedido #${order.orderNumber} enviado`,
    html: layout(storeName, 'Pedido a caminho', body, storefrontUrl),
  };
}

export function reviewRequestTemplate(
  storeName: string,
  storefrontUrl: string,
  order: OrderForEmail
): EmailTemplate {
  const body = `
    <p style="color:#333;font-size:14px;line-height:1.6;">
      ${firstName(order.customerName)}, esperamos que esteja treinando bem com o que comprou no pedido
      <strong>#${order.orderNumber}</strong>! Que tal deixar uma avaliação pra ajudar outros clientes?
    </p>
    <a href="${storefrontUrl}/conta" style="display:inline-block;margin-top:12px;background:#111;color:#fff;padding:12px 20px;border-radius:999px;font-size:13px;font-weight:700;text-decoration:none;">
      Avaliar meus produtos
    </a>`;
  return {
    subject: `O que achou da sua compra na ${storeName}?`,
    html: layout(storeName, 'Conta pra gente o que achou', body, storefrontUrl),
  };
}

export function abandonedCartTemplate(
  storeName: string,
  storefrontUrl: string,
  cart: AbandonedCartForEmail
): EmailTemplate {
  let items: OrderItemLike[] = [];
  try {
    items = JSON.parse(cart.itemsJson);
  } catch {
    items = [];
  }
  const body = `
    <p style="color:#333;font-size:14px;line-height:1.6;">
      ${cart.name ? `${firstName(cart.name)}, você` : 'Você'} deixou alguns itens no carrinho. Eles ainda estão
      te esperando!
    </p>
    ${itemsTable(items)}
    <div style="margin-top:16px;font-size:14px;color:#333;font-weight:700;">Total: ${money(cart.total)}</div>
    <a href="${storefrontUrl}/checkout" style="display:inline-block;margin-top:20px;background:#111;color:#fff;padding:12px 20px;border-radius:999px;font-size:13px;font-weight:700;text-decoration:none;">
      Finalizar compra
    </a>`;
  return {
    subject: `Você esqueceu algo no carrinho — ${storeName}`,
    html: layout(storeName, 'Seu carrinho está te esperando', body, storefrontUrl),
  };
}
