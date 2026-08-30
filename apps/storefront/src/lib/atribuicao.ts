import { getConsent } from './cookie-consent';

const CHAVE = 'no-excuse:atribuicao';

/**
 * Por quanto tempo um clique continua respondendo pela venda.
 *
 * Trinta dias é a janela que o Meta e o Google usam para clique, então usar a
 * mesma torna os números comparáveis — quando o painel deles disser cinco
 * vendas e o nosso disser três, a diferença é de atribuição, não de calendário.
 */
const JANELA_EM_DIAS = 30;

export interface Atribuicao {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  gclid?: string;
  referrer?: string;
  landingPage?: string;
  /** Quando este clique foi registrado, para a janela expirar sozinha. */
  em?: string;
}

/** Corta o que for longo demais para ser rótulo de campanha — é lixo ou ataque. */
function limpar(valor: string | null): string | undefined {
  const v = valor?.trim();
  if (!v || v.length > 200) return undefined;
  return v;
}

/**
 * Guarda de onde a pessoa veio, na primeira página da visita.
 *
 * **Último clique de campanha vence.** Se ela chegou pelo Instagram na semana
 * passada e hoje voltou por um anúncio do Google, a venda é do Google — foi ele
 * que a trouxe de volta. Visita direta não sobrescreve nada: quem digita o
 * endereço não "descobriu" a loja de novo, só voltou.
 *
 * O `gclid` só é guardado com consentimento, pela mesma regra do `_fbc`: ele
 * identifica a pessoa, e não a campanha. Os `utm_*` continuam sempre — eles
 * descrevem o link, não quem clicou.
 */
export function registrarOrigem(): void {
  if (typeof window === 'undefined') return;

  try {
    const params = new URLSearchParams(window.location.search);
    const consentiu = getConsent() === 'accepted';

    const nova: Atribuicao = {
      utmSource: limpar(params.get('utm_source')),
      utmMedium: limpar(params.get('utm_medium')),
      utmCampaign: limpar(params.get('utm_campaign')),
      utmContent: limpar(params.get('utm_content')),
      utmTerm: limpar(params.get('utm_term')),
      gclid: consentiu ? limpar(params.get('gclid')) : undefined,
    };

    const temCampanha = Boolean(nova.utmSource || nova.utmCampaign || nova.gclid);
    if (!temCampanha) {
      // Sem campanha na URL: registra a origem só se ainda não houver nenhuma.
      // O referrer de uma visita direta não pode apagar o anúncio que trouxe a
      // pessoa ontem.
      if (lerOrigem()) return;
    }

    /**
     * Só o domínio de onde ela veio, nunca o endereço inteiro.
     *
     * O referrer completo carrega a query string do outro site, e ali cabe
     * qualquer coisa — um e-mail num link de newsletter, um token, o termo que
     * alguém digitou. Nada disso é da conta da loja, e guardar por descuido é
     * como um vazamento começa.
     *
     * Para o que a atribuição precisa saber — se veio do Instagram, do Google
     * ou de fora — o domínio basta.
     */
    const referrer = document.referrer;
    let externo: string | undefined;
    if (referrer && !referrer.startsWith(window.location.origin)) {
      try {
        externo = new URL(referrer).hostname.replace(/^www\./, '') || undefined;
      } catch {
        externo = undefined;
      }
    }

    window.localStorage.setItem(
      CHAVE,
      JSON.stringify({
        ...nova,
        referrer: externo,
        landingPage: window.location.pathname,
        em: new Date().toISOString(),
      })
    );
  } catch {
    // Armazenamento bloqueado: a loja funciona igual, só sem saber a origem.
  }
}

/** A origem guardada, se ainda estiver dentro da janela. */
export function lerOrigem(): Atribuicao | null {
  if (typeof window === 'undefined') return null;

  try {
    const guardado = window.localStorage.getItem(CHAVE);
    if (!guardado) return null;

    const dados = JSON.parse(guardado) as Atribuicao;
    if (!dados.em) return dados;

    const idadeEmDias = (Date.now() - new Date(dados.em).getTime()) / (1000 * 60 * 60 * 24);
    if (idadeEmDias > JANELA_EM_DIAS) {
      window.localStorage.removeItem(CHAVE);
      return null;
    }

    return dados;
  } catch {
    return null;
  }
}

/** O que vai junto com o pedido. Sem o carimbo de tempo, que é só interno. */
export function origemDoPedido(): Omit<Atribuicao, 'em'> {
  const { em: _ignorado, ...resto } = lerOrigem() ?? {};
  return resto;
}

/**
 * Em qual canal esta visita entra.
 *
 * O mesmo critério do servidor, para os dois números baterem. Pago antes de
 * orgânico, sempre: quem chega por anúncio do Instagram traz o referrer do
 * Instagram junto, e classificar pelo referrer creditaria ao orgânico uma
 * visita que foi paga — que é o erro que faz o anúncio parecer inútil.
 */
export function canalDaVisita(): string {
  const origem = lerOrigem();
  if (!origem) return 'Direto';

  const fonte = (origem.utmSource ?? '').toLowerCase();
  const meio = (origem.utmMedium ?? '').toLowerCase();
  const pago = /cpc|ppc|paid|ads|anuncio|anúncio/.test(meio);

  if (origem.gclid) return 'Google Ads';
  if (/facebook|instagram|meta|fb|ig/.test(fonte) && (pago || !meio)) return 'Meta Ads';
  if (fonte === 'google' && pago) return 'Google Ads';

  if (fonte) {
    if (/instagram|ig/.test(fonte)) return 'Instagram';
    if (/facebook|fb/.test(fonte)) return 'Facebook';
    if (fonte === 'google') return 'Google';
    return 'Outros';
  }

  if (origem.referrer) {
    // Já é só o domínio: guardar o endereço inteiro carregaria a query string
    // de outro site, e ali cabe e-mail, token e o que mais tiverem colado.
    const host = origem.referrer.toLowerCase();
    if (/instagram\./.test(host)) return 'Instagram';
    if (/facebook\.|fb\./.test(host)) return 'Facebook';
    if (/google\./.test(host)) return 'Google';
    if (host) return 'Outros';
  }

  return 'Direto';
}
