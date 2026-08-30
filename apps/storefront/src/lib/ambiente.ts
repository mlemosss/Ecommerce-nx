/**
 * Este navegador está na loja de verdade?
 *
 * O pixel estava instalado em quatro domínios: `www.noexcusenx.com.br`,
 * `noexcusenx.com.br`, o preview da Vercel e `localhost`. Os dois últimos
 * somavam 84 eventos — cerca de 8% do total. Isso não é detalhe de arrumação:
 * cada teste nosso vira uma pessoa falsa no público, e a Meta aprende com
 * quem nunca ia comprar. Com 35 adições ao carrinho por mês, oito por cento de
 * lixo pesa.
 *
 * A checagem é pelo endereço no navegador, e não por variável de ambiente. A
 * variável some do bundle do cliente quando não tem o prefixo `NEXT_PUBLIC_`,
 * e uma checagem que falha calada volta a deixar tudo passar. O domínio é o
 * que a Meta enxerga, então é por ele que se decide.
 *
 * Vale para o Pixel, o GTM, o Google Ads e o Clarity: gravação de sessão de
 * desenvolvedor testando checkout também não ajuda ninguém.
 */

const DOMINIO_DA_LOJA = (
  process.env.NEXT_PUBLIC_STOREFRONT_URL || 'https://www.noexcusenx.com.br'
).replace(/^https?:\/\//, '').replace(/\/$/, '');

export function ehALojaDeVerdade(): boolean {
  if (typeof window === 'undefined') return false;

  const host = window.location.hostname.toLowerCase();
  const canonico = DOMINIO_DA_LOJA.toLowerCase();
  const semWww = canonico.replace(/^www\./, '');

  // `noexcusenx.com.br` sem www é redirecionamento para o canônico, e a Meta
  // já registra eventos dele. Continua valendo; o que sai são preview e
  // localhost.
  return host === canonico || host === semWww || host === `www.${semWww}`;
}
