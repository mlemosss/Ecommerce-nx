'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';
import { CONSENT_EVENT, getConsent } from '../lib/cookie-consent';
import { ehALojaDeVerdade } from '../lib/ambiente';

/**
 * GTM e Meta Pixel só entram na página depois do aceite.
 *
 * Antes eles eram injetados no layout e subiam para todo visitante, antes de
 * qualquer aviso — que é justamente o que a LGPD não permite em rastreamento
 * publicitário. O banner é a parte visível; este componente é o que de fato
 * impede o carregamento.
 */
export function Analytics({
  gtmId,
  metaPixelId,
  googleAdsId,
  clarityProjectId,
}: {
  gtmId: string | null;
  metaPixelId: string | null;
  googleAdsId: string | null;
  clarityProjectId: string | null;
}) {
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    // Duas condições, e as duas precisam ser verdade: a pessoa aceitou, e este
    // navegador está na loja de verdade. O preview da Vercel e o localhost
    // respondiam ao aceite como se fossem a loja, e cada teste nosso virava um
    // visitante falso no público da Meta.
    const sync = () => setAccepted(getConsent() === 'accepted' && ehALojaDeVerdade());
    sync();
    window.addEventListener(CONSENT_EVENT, sync);
    return () => window.removeEventListener(CONSENT_EVENT, sync);
  }, []);

  /**
   * Guarda o clique do anúncio como cookie `_fbc`.
   *
   * Quem chega por um anúncio do Meta vem com `?fbclid=` na URL. Esse é o
   * identificador mais forte de atribuição que existe — é o que liga a compra
   * ao anúncio que a trouxe. O pixel grava sozinho quando carrega; se ele for
   * bloqueado, ninguém grava, e a venda vira "tráfego direto".
   *
   * O formato tem quatro partes: `fb.1.<quando>.<fbclid>`. Grava-se uma vez, e
   * não a cada evento — refazer a cada disparo produziria um `creation_time`
   * diferente para o mesmo clique, e a Meta usa esse tempo na conta.
   *
   * O `fbclid` vai como veio: é sensível a maiúsculas e não aceita nenhuma
   * alteração. Nada de `trim`, nada de minúsculo, nada de decodificar.
   *
   * Roda depois do aceite, junto com o resto — é identificador publicitário.
   */
  useEffect(() => {
    if (!accepted) return;
    const fbclid = new URLSearchParams(window.location.search).get('fbclid');
    if (!fbclid) return;
    if (document.cookie.includes('_fbc=')) return;

    const noventaDias = 90 * 24 * 60 * 60;
    document.cookie =
      `_fbc=fb.1.${Date.now()}.${fbclid}; path=/; max-age=${noventaDias}; SameSite=Lax`;
  }, [accepted]);

  if (!accepted) return null;

  return (
    <>
      {/* Mapa de cliques e gravação de sessão (Microsoft Clarity).
          Mostra onde a cliente clica, até onde rola e onde desiste — é o que
          responde "por que ela não comprou" quando o número sozinho não conta.
          Entra junto com o resto: sem aceite de cookies, não carrega. */}
      {clarityProjectId && (
        <Script id="clarity" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${clarityProjectId}");`}
        </Script>
      )}
      {gtmId && (
        <Script id="gtm" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');`}
        </Script>
      )}
      {googleAdsId && (
        <>
          <Script
            id="gtag-src"
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${googleAdsId}`}
          />
          <Script id="gtag-config" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${googleAdsId}');`}
          </Script>
        </>
      )}
      {metaPixelId && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${metaPixelId}');fbq('track','PageView');`}
        </Script>
      )}
    </>
  );
}
