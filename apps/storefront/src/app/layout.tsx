import Script from 'next/script';
import './global.css';
import { CartProvider } from '../lib/cart-context';
import { ProductsProvider } from '../lib/products-context';
import { CustomerAuthProvider } from '../lib/customer-auth-context';
import { AnnouncementBar } from '../components/announcement-bar';
import { Header } from '../components/header';
import { Footer } from '../components/footer';
import { getSettings } from '../lib/api';

export const metadata = {
  title: 'NO EXCUSE — Roupas de Academia',
  description:
    'Loja de roupas e acessórios para academia: leggings, tops, shorts, camisetas, jaquetas e acessórios.',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getSettings();

  return (
    <html lang="pt-BR">
      {settings.gtmId && (
        <Script id="gtm" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${settings.gtmId}');`}
        </Script>
      )}
      {settings.metaPixelId && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${settings.metaPixelId}');fbq('track','PageView');`}
        </Script>
      )}
      <body className="flex min-h-screen flex-col font-sans">
        {settings.gtmId && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${settings.gtmId}`}
              height="0"
              width="0"
              style={{ display: 'none', visibility: 'hidden' }}
            />
          </noscript>
        )}
        {settings.metaPixelId && (
          <noscript>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              height="1"
              width="1"
              alt=""
              style={{ display: 'none' }}
              src={`https://www.facebook.com/tr?id=${settings.metaPixelId}&ev=PageView&noscript=1`}
            />
          </noscript>
        )}
        <ProductsProvider>
          <CustomerAuthProvider>
            <CartProvider>
              <AnnouncementBar
                freeShippingThreshold={settings.freeShippingThreshold}
                maxInstallments={settings.maxInstallments}
              />
              <Header />
              <main className="flex-1">{children}</main>
              <Footer settings={settings} />
            </CartProvider>
          </CustomerAuthProvider>
        </ProductsProvider>
      </body>
    </html>
  );
}
