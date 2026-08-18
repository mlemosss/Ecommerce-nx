interface OrderItemLike {
  productName: string;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number;
}

export interface OrderForEmail {
  orderNumber: string;
  /** Token do link de avaliação sem login. Nulo em pedido antigo. */
  reviewToken?: string | null;
  customerName: string;
  total: number;
  subtotal: number;
  shipping: number;
  /** Retirada em maos: o e-mail nao fala em entrega nem em rastreio. */
  pickup?: boolean;
  /** Cartao volta em ate 10 dias uteis; Pix volta em um. O aviso muda. */
  paymentMethod?: string;
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
  order: OrderForEmail,
  // Cartão aprovado na hora: em vez de mandar dois e-mails quase iguais em
  // segundos, este já sai dizendo que o pagamento passou.
  options: { paid?: boolean } = {}
): EmailTemplate {
  const body = `
    <p style="color:#333;font-size:14px;line-height:1.6;">
      Oi, ${firstName(order.customerName)}! Recebemos o seu pedido <strong>#${order.orderNumber}</strong> e já
      estamos preparando tudo.
    </p>
    ${
      options.paid
        ? `<p style="color:#111;font-size:14px;line-height:1.6;font-weight:700;">
             Pagamento aprovado. Você recebe o código de rastreio assim que o pedido for postado.
           </p>`
        : ''
    }
    ${itemsTable(order.items)}
    <div style="margin-top:16px;font-size:14px;color:#333;">
      <div style="display:flex;justify-content:space-between;"><span>Subtotal</span><span>${money(order.subtotal)}</span></div>
      <div style="display:flex;justify-content:space-between;"><span>${
        order.pickup ? 'Retirada em Higienópolis' : 'Frete'
      }</span><span>${order.pickup ? 'Grátis' : money(order.shipping)}</span></div>
      <div style="display:flex;justify-content:space-between;font-weight:700;margin-top:8px;"><span>Total</span><span>${money(order.total)}</span></div>
    </div>`;
  return {
    subject: `Pedido #${order.orderNumber} confirmado — ${storeName}`,
    html: layout(storeName, 'Pedido recebido!', body, storefrontUrl),
  };
}

/**
 * Pedido registrado, pagamento ainda não.
 *
 * Antes saía "Pedido confirmado!" no instante em que o pedido era gravado,
 * mesmo sem um centavo pago. Quem não concluía o Pix ficava com um e-mail
 * dizendo que estava tudo certo, e a lojista com um pedido parado que a cliente
 * achava que já tinha comprado.
 *
 * O botão leva para Meus Pedidos, e não para uma fatura fixa: o link do Asaas
 * vence, o da conta não, e é lá que a pessoa escolhe entre Pix, boleto e
 * cartão. Se ela não tiver senha, a própria tela oferece o caminho.
 */
export function orderAwaitingPaymentTemplate(
  storeName: string,
  storefrontUrl: string,
  order: OrderForEmail
): EmailTemplate {
  const body = `
    <p style="color:#333;font-size:14px;line-height:1.6;">
      Oi, ${firstName(order.customerName)}! Separamos o seu pedido
      <strong>#${order.orderNumber}</strong>, mas ele ainda não está fechado: falta o pagamento.
    </p>
    <p style="color:#333;font-size:14px;line-height:1.6;">
      É só clicar no botão abaixo, abrir o pedido em <strong>Meus Pedidos</strong> e escolher como
      quer pagar — <strong>Pix, boleto ou cartão</strong>. O Pix cai na hora.
    </p>
    <p style="margin:24px 0;">
      <a href="${storefrontUrl}/conta"
         style="display:inline-block;background:#0b0b0d;color:#fff;text-decoration:none;
                padding:14px 28px;font-size:12px;font-weight:bold;letter-spacing:2px;
                text-transform:uppercase;">Pagar meu pedido</a>
    </p>
    ${itemsTable(order.items)}
    <div style="margin-top:16px;font-size:14px;color:#333;">
      <div style="display:flex;justify-content:space-between;"><span>Subtotal</span><span>${money(order.subtotal)}</span></div>
      <div style="display:flex;justify-content:space-between;"><span>${
        order.pickup ? 'Retirada em Higienópolis' : 'Frete'
      }</span><span>${order.pickup ? 'Grátis' : money(order.shipping)}</span></div>
      <div style="display:flex;justify-content:space-between;font-weight:700;margin-top:8px;"><span>Total</span><span>${money(order.total)}</span></div>
    </div>
    <p style="color:#888;font-size:12px;line-height:1.6;margin-top:20px;">
      As peças ficam guardadas para você, mas só saem do estoque quando o pagamento é confirmado.
      Qualquer dúvida, chama a gente no WhatsApp.
    </p>`;

  return {
    subject: `Seu pedido está quase finalizado — falta o pagamento`,
    html: layout(storeName, 'Falta pouco!', body, storefrontUrl),
  };
}

export function paymentApprovedTemplate(
  storeName: string,
  storefrontUrl: string,
  order: OrderForEmail
): EmailTemplate {
  // Leva a nota do pedido: agora que a confirmação só sai depois do pagamento,
  // este é o e-mail que a cliente vai guardar como comprovante do que comprou.
  const body = `
    <p style="color:#333;font-size:14px;line-height:1.6;">
      Boa, ${firstName(order.customerName)}! O pagamento do pedido <strong>#${order.orderNumber}</strong> foi
      confirmado${
        order.pickup
          ? ' e já estamos separando as peças. Entramos em contato para combinar dia e horário da retirada, em Higienópolis.'
          : ' e ele já entrou em preparação. Assim que sair pra entrega, avisamos por aqui.'
      }
    </p>
    ${itemsTable(order.items)}
    <div style="margin-top:16px;font-size:14px;color:#333;">
      <div style="display:flex;justify-content:space-between;"><span>Subtotal</span><span>${money(order.subtotal)}</span></div>
      <div style="display:flex;justify-content:space-between;"><span>${
        order.pickup ? 'Retirada em Higienópolis' : 'Frete'
      }</span><span>${order.pickup ? 'Grátis' : money(order.shipping)}</span></div>
      <div style="display:flex;justify-content:space-between;font-weight:700;margin-top:8px;"><span>Total pago</span><span>${money(order.total)}</span></div>
    </div>`;
  return {
    subject: `Pagamento aprovado — pedido #${order.orderNumber}`,
    html: layout(storeName, 'Pagamento aprovado', body, storefrontUrl),
  };
}

/**
 * Aviso de estorno.
 *
 * O prazo é o assunto do e-mail inteiro. Dinheiro devolvido no cartão não
 * aparece na hora: leva até dez dias úteis, e é nesses dez dias que a cliente
 * escreve "cadê meu dinheiro" — três vezes, cada vez mais brava, porque
 * ninguém disse a ela que ia demorar.
 *
 * Dizer antes transforma três mensagens em nenhuma.
 */
export function orderRefundedTemplate(
  storeName: string,
  storefrontUrl: string,
  order: OrderForEmail
): EmailTemplate {
  const body = `
    <p style="color:#333;font-size:14px;line-height:1.6;">
      Oi, ${firstName(order.customerName)}. O pedido <strong>#${order.orderNumber}</strong> foi cancelado e
      estornamos <strong>${money(order.total)}</strong> para você.
    </p>
    <p style="color:#333;font-size:14px;line-height:1.6;">
      ${
        order.paymentMethod === 'cartao'
          ? 'O valor volta para o mesmo cartão usado na compra. <strong>Pode levar até 10 dias úteis</strong> para aparecer na sua fatura — o prazo é do banco emissor, e nem nós nem o Asaas conseguimos acelerar. Dependendo da data de fechamento, pode cair como crédito na fatura seguinte.'
          : 'O valor volta para a mesma conta de onde saiu o pagamento, normalmente em até um dia útil.'
      }
    </p>
    ${itemsTable(order.items)}
    <p style="color:#666;font-size:13px;line-height:1.6;margin-top:16px;">
      Se passar do prazo e você não vir o estorno, responde este e-mail que a gente resolve.
    </p>`;

  return {
    subject: `Estorno do pedido #${order.orderNumber}`,
    html: layout(storeName, 'Estorno a caminho', body, storefrontUrl),
  };
}

/**
 * Boleto venceu sem pagamento: o pedido foi cancelado e as peças voltaram ao
 * estoque. O e-mail não é só um aviso de cancelamento — quem gerou boleto
 * demonstrou intenção de compra e desistiu por atrito, não por preço. O cupom
 * dá um motivo concreto para voltar.
 *
 * O código do cupom vem de fora porque quem decide qual é a campanha é o
 * lojista, não este arquivo.
 */
export function boletoExpiredTemplate(
  storeName: string,
  storefrontUrl: string,
  order: OrderForEmail,
  coupon: { code: string; percent: number } | null
): EmailTemplate {
  const oferta = coupon
    ? `
    <p style="color:#333;font-size:14px;line-height:1.6;">
      Se ainda quiser as peças, use o cupom <strong style="font-size:16px;letter-spacing:1px;">${coupon.code}</strong>
      e leve com <strong>${coupon.percent}% de desconto</strong> no valor da compra.
    </p>
    <p style="margin:24px 0;">
      <a href="${storefrontUrl}/produtos"
         style="display:inline-block;background:#0b0b0d;color:#fff;text-decoration:none;
                padding:14px 28px;font-size:12px;font-weight:bold;letter-spacing:2px;
                text-transform:uppercase;">Comprar com ${coupon.percent}% off</a>
    </p>`
    : `
    <p style="margin:24px 0;">
      <a href="${storefrontUrl}/produtos"
         style="display:inline-block;background:#0b0b0d;color:#fff;text-decoration:none;
                padding:14px 28px;font-size:12px;font-weight:bold;letter-spacing:2px;
                text-transform:uppercase;">Ver produtos</a>
    </p>`;

  const body = `
    <p style="color:#333;font-size:14px;line-height:1.6;">
      ${firstName(order.customerName)}, o boleto do pedido <strong>#${order.orderNumber}</strong> venceu sem
      pagamento, então ele foi cancelado e as peças voltaram para a loja. Nada foi cobrado de você.
    </p>
    ${oferta}
    <p style="color:#888;font-size:12px;line-height:1.6;">
      Se você pagou o boleto e recebeu este e-mail, responda que a gente resolve — pagamento em atraso
      pode levar alguns dias para ser reconhecido.
    </p>`;

  return {
    subject: `Seu boleto venceu — mas dá pra recomeçar`,
    html: layout(storeName, 'Pedido cancelado', body, storefrontUrl),
  };
}

/**
 * Agradecimento imediato a quem pediu aviso de reposição.
 *
 * Sai na hora do cadastro, não quando a peça volta — a reposição pode demorar
 * semanas, e quem acabou de deixar o e-mail está com a loja aberta agora. O
 * e-mail reconhece o pedido, mostra o que já existe no tamanho dela e oferece
 * um motivo para comprar hoje.
 *
 * `outras` vem vazia quando não há nada disponível naquele tamanho; nesse caso
 * o e-mail não inventa vitrine, só confirma o cadastro. O cupom é opcional pelo
 * mesmo motivo dos outros: anunciar código que a loja não criou faz a pessoa
 * digitar e levar "cupom inválido".
 */
export function stockAlertWelcomeTemplate(
  storeName: string,
  storefrontUrl: string,
  data: {
    productName: string;
    color: string;
    size: string;
    outras: { name: string; slug: string; price: number; imageUrl?: string }[];
    coupon: { code: string; percent: number } | null;
  }
): EmailTemplate {
  const vitrine =
    data.outras.length > 0
      ? `
    <p style="color:#333;font-size:14px;line-height:1.6;margin-top:24px;">
      Enquanto isso, estas peças estão disponíveis no <strong>tamanho ${data.size}</strong>:
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin-top:12px;">
      ${data.outras
        .map(
          (p) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #eee;">
          <a href="${storefrontUrl}/produtos/${p.slug}" style="color:#0b0b0d;text-decoration:none;font-size:14px;font-weight:600;">
            ${p.name}
          </a>
          <span style="color:#888;font-size:14px;"> — ${money(p.price)}</span>
        </td>
      </tr>`
        )
        .join('')}
    </table>`
      : '';

  const oferta = data.coupon
    ? `
    <p style="color:#333;font-size:14px;line-height:1.6;margin-top:24px;">
      E se levar alguma hoje, use o cupom
      <strong style="font-size:16px;letter-spacing:1px;">${data.coupon.code}</strong> —
      são <strong>${data.coupon.percent}% de desconto</strong>.
    </p>`
    : '';

  const body = `
    <p style="color:#333;font-size:14px;line-height:1.6;">
      Obrigada por passar na loja! Anotamos que você quer
      <strong>${data.productName}</strong> em ${data.color}, tamanho ${data.size} — assim que
      chegar, você é avisada por aqui.
    </p>
    <p style="color:#333;font-size:14px;line-height:1.6;">
      Nossas peças são feitas em poliamida com elastano: compressão que sustenta sem apertar,
      tecido opaco, proteção solar FPS 50+ e secagem rápida. Feito para treino de verdade.
    </p>
    ${vitrine}
    ${oferta}
    <p style="margin:28px 0;">
      <a href="${storefrontUrl}/produtos"
         style="display:inline-block;background:#0b0b0d;color:#fff;text-decoration:none;
                padding:14px 28px;font-size:12px;font-weight:bold;letter-spacing:2px;
                text-transform:uppercase;">Ver a loja</a>
    </p>
    <p style="color:#888;font-size:12px;line-height:1.6;">
      Você recebeu este e-mail porque pediu aviso sobre uma peça. Seu endereço é usado só para
      isso e não entra em nenhuma lista.
    </p>`;

  return {
    subject: `Anotado! Avisamos quando ${data.productName} ${data.size} chegar`,
    html: layout(storeName, 'Pedido anotado', body, storefrontUrl),
  };
}

/**
 * A peça que a pessoa esperava voltou ao estoque.
 *
 * Vai direto para a página do produto, com cor e tamanho no texto para ela
 * reconhecer o que pediu — quem se cadastra em duas peças diferentes recebe
 * dois e-mails e precisa saber qual é qual.
 *
 * Sem urgência inventada ("corre que acaba!"): o estoque é pequeno de verdade
 * e o próprio site mostra "restam N". Exagero aqui só queima a próxima.
 */
export function backInStockTemplate(
  storeName: string,
  storefrontUrl: string,
  data: { productName: string; slug: string; color: string; size: string }
): EmailTemplate {
  const body = `
    <p style="color:#333;font-size:14px;line-height:1.6;">
      A peça que você pediu para avisar voltou:
      <strong>${data.productName}</strong>, ${data.color}, tamanho ${data.size}.
    </p>
    <p style="margin:24px 0;">
      <a href="${storefrontUrl}/produtos/${data.slug}"
         style="display:inline-block;background:#0b0b0d;color:#fff;text-decoration:none;
                padding:14px 28px;font-size:12px;font-weight:bold;letter-spacing:2px;
                text-transform:uppercase;">Ver a peça</a>
    </p>
    <p style="color:#888;font-size:12px;line-height:1.6;">
      Você recebeu este e-mail porque pediu para ser avisada sobre esta peça. Foi o único uso do seu
      endereço, e ele sai da nossa lista agora que o aviso foi enviado.
    </p>`;

  return {
    subject: `${data.productName} voltou — ${data.color}, ${data.size}`,
    html: layout(storeName, 'Voltou ao estoque', body, storefrontUrl),
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
  // Link com token: abre a avaliação sem login. A loja é de compra sem
  // cadastro, então o botão antigo — que apontava para /conta — levava o
  // cliente a uma tela de login que ele não tinha como passar. Pedido antigo,
  // sem token, ainda cai em /conta.
  const destino = order.reviewToken ? `${storefrontUrl}/avaliar/${order.reviewToken}` : `${storefrontUrl}/conta`;

  const body = `
    <p style="color:#333;font-size:14px;line-height:1.6;">
      ${firstName(order.customerName)}, esperamos que esteja treinando bem com o que comprou no pedido
      <strong>#${order.orderNumber}</strong>! Que tal contar o que achou? Ajuda muito quem está em
      dúvida no tamanho — e se quiser mandar uma foto usando, melhor ainda.
    </p>
    <a href="${destino}" style="display:inline-block;margin-top:12px;background:#111;color:#fff;padding:12px 20px;border-radius:999px;font-size:13px;font-weight:700;text-decoration:none;">
      Avaliar minha compra
    </a>`;
  return {
    subject: `O que achou da sua compra na ${storeName}?`,
    html: layout(storeName, 'Conta pra gente o que achou', body, storefrontUrl),
  };
}

export function abandonedCartTemplate(
  storeName: string,
  storefrontUrl: string,
  // `id` alimenta o link de descadastro: e-mail de marketing sem saída de um
  // clique não respeita o direito de oposição do titular.
  cart: AbandonedCartForEmail & { id?: string }
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
    <a href="${storefrontUrl}/checkout" style="display:inline-block;margin-top:20px;background:#111;color:#fff;padding:14px 28px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;text-decoration:none;">
      Finalizar compra
    </a>
    ${
      cart.id
        ? `<p style="margin-top:28px;font-size:11px;color:#888;line-height:1.6;">
             Não quer mais receber este lembrete?
             <a href="${storefrontUrl}/descadastro?c=${encodeURIComponent(cart.id)}" style="color:#888;">
               Descadastre-se aqui
             </a>.
           </p>`
        : ''
    }`;
  return {
    subject: `Você esqueceu algo no carrinho — ${storeName}`,
    html: layout(storeName, 'Seu carrinho está te esperando', body, storefrontUrl),
  };
}
