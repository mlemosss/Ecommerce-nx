import { NextRequest, NextResponse } from 'next/server';
import { hashEmail, hashPhoneBR } from '../../../lib/meta-hash';

/**
 * API de Conversões da Meta — o caminho do servidor.
 *
 * O navegador nunca fala com a Graph API direto: o token é credencial de
 * servidor e no bundle do cliente ele estaria à vista de qualquer um. Então o
 * navegador manda o evento para cá, e daqui ele sai com o token.
 *
 * MAS UM HANDLER QUE ACEITA QUALQUER COISA É PIOR QUE O PROBLEMA QUE RESOLVE.
 * Uma rota aberta é um endpoint público de injeção de conversão: abre o
 * DevTools, acha o caminho, dispara `Purchase` de R$ 999.999 em laço, e a
 * campanha passa a otimizar para um comprador que não existe. Sabotagem barata
 * e quase indetectável — o painel fica verde enquanto o dinheiro escorre.
 *
 * Por isso: lista de eventos permitidos, validação do conteúdo, teto de valor,
 * limite por IP, e `Purchase` fora da lista — esse sai do servidor, na
 * confirmação do pedido.
 *
 * Este arquivo roda no Node, nunca no navegador: fica sob `app/api/`, e o
 * `crypto` do hashing só existe aqui.
 */

/**
 * Só estes três podem vir do cliente.
 *
 * `Purchase` fica de fora de propósito. Ele é o evento que decide orçamento de
 * campanha, e é justamente o que um atacante iria querer forjar.
 */
const EVENTOS_PERMITIDOS = new Set(['ViewContent', 'AddToCart', 'InitiateCheckout']);

/** Nenhum carrinho legítimo desta loja chega perto. Ticket médio é R$ 143,65. */
const VALOR_MAXIMO = 10_000;

/** Versão da Graph API. v26.0 é a atual (29/07/2026). */
const GRAPH_VERSION = 'v26.0';

/**
 * Limite por IP, na memória da instância.
 *
 * Não é proteção completa e não finge ser: em serverless cada instância tem a
 * própria contagem, então um ataque distribuído passa. O que ele barra é o
 * caso comum — uma aba disparando em laço. A proteção que vale é a lista de
 * eventos e o teto de valor logo abaixo; isto aqui só evita que uma instância
 * seja usada como megafone.
 */
const JANELA_MS = 60_000;
const MAX_POR_JANELA = 60;
const contagem = new Map<string, { ate: number; n: number }>();

function passouDoLimite(ip: string): boolean {
  const agora = Date.now();
  const atual = contagem.get(ip);

  if (!atual || atual.ate < agora) {
    contagem.set(ip, { ate: agora + JANELA_MS, n: 1 });
    // A cada janela nova, limpa o que venceu: sem isto o Map cresce sem parar
    // numa instância de vida longa.
    if (contagem.size > 5_000) {
      for (const [chave, valor] of contagem) {
        if (valor.ate < agora) contagem.delete(chave);
      }
    }
    return false;
  }

  atual.n += 1;
  return atual.n > MAX_POR_JANELA;
}

/**
 * Sempre 200, sempre `ok`.
 *
 * Rastreamento não pode derrubar a loja, e a resposta também não conta ao
 * cliente o que passou ou não na validação — devolver "evento rejeitado"
 * ensinaria a quem está testando o que ajustar para passar.
 */
const ok = () => NextResponse.json({ ok: true });

export async function POST(req: NextRequest) {
  const token = process.env.META_CAPI_TOKEN;
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? process.env.META_PIXEL_ID;
  // Sem token configurado a rota existe e não faz nada. É o estado de hoje, e
  // não pode virar erro na tela de ninguém.
  if (!token || !pixelId) return ok();

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (ip && passouDoLimite(ip)) return ok();

  const body = await req.json().catch(() => null);
  if (!body) return ok();

  if (!EVENTOS_PERMITIDOS.has(body.eventName)) return ok();
  if (typeof body.eventId !== 'string' || !body.eventId) return ok();

  const cd = body.customData ?? {};
  const ids: unknown = cd.content_ids;
  if (!Array.isArray(ids) || ids.length === 0 || ids.some((i) => typeof i !== 'string' || !i)) {
    return ok();
  }

  const valor = Number(cd.value);
  if (!Number.isFinite(valor) || valor < 0 || valor > VALOR_MAXIMO) return ok();

  /**
   * `event_time` vem do cliente porque é lá que o evento aconteceu — mas com
   * limite. Relógio de navegador erra, e evento com mais de 7 dias faz a Meta
   * recusar a requisição inteira, derrubando junto os eventos válidos do lote.
   */
  const agora = Math.floor(Date.now() / 1000);
  const enviado = Number(body.eventTime);
  const eventTime =
    Number.isFinite(enviado) && enviado <= agora && enviado > agora - 6 * 24 * 3600
      ? enviado
      : agora;

  // Cookies de primeira parte: chegam porque esta rota vive no domínio da
  // loja. Numa rota em outro domínio eles não viriam, e a correspondência
  // cairia junto.
  const fbp = req.cookies.get('_fbp')?.value;
  const fbc = req.cookies.get('_fbc')?.value;

  const em = hashEmail(body.email);
  const ph = hashPhoneBR(body.phone);
  const ua = req.headers.get('user-agent') ?? undefined;

  const payload = {
    data: [
      {
        event_name: body.eventName,
        event_time: eventTime,
        // Mesmo valor que o `fbq` mandou em `eventID`. É só isso que a Meta usa
        // para não contar o evento duas vezes.
        event_id: body.eventId,
        event_source_url: typeof body.sourceUrl === 'string' ? body.sourceUrl : undefined,
        action_source: 'website',
        user_data: {
          ...(em ? { em: [em] } : {}),
          ...(ph ? { ph: [ph] } : {}),
          // IP e user-agent NÃO são hasheados. Hashear quebra a correspondência.
          ...(ip ? { client_ip_address: ip } : {}),
          ...(ua ? { client_user_agent: ua } : {}),
          ...(fbp ? { fbp } : {}),
          ...(fbc ? { fbc } : {}),
        },
        custom_data: {
          content_ids: ids,
          content_type: 'product',
          ...(Array.isArray(cd.contents) ? { contents: cd.contents } : {}),
          ...(Number.isFinite(Number(cd.num_items)) ? { num_items: Number(cd.num_items) } : {}),
          value: valor,
          currency: 'BRL',
        },
      },
    ],
    // No corpo, nunca na query: a URL vaza para log de acesso, APM e trace de
    // proxy — e o próprio log de erro costuma imprimir a URL inteira.
    access_token: token,
  };

  try {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${pixelId}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      // Token revogado derruba 100% da CAPI enquanto o Gerenciador de Eventos
      // continua verde por causa do pixel do navegador — ninguém percebe. Só o
      // status: a resposta de erro da Meta pode ecoar o payload, e ali dentro
      // vão os hashes.
      console.error(`[capi] recusado pela Meta: HTTP ${res.status}`);
    }
  } catch (err) {
    console.error(`[capi] falha de rede: ${err instanceof Error ? err.message : err}`);
  }

  return ok();
}
