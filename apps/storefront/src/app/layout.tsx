import './global.css';
import { CartProvider } from '../lib/cart-context';
import { ProductsProvider } from '../lib/products-context';
import { CustomerAuthProvider } from '../lib/customer-auth-context';
import { Analytics } from '../components/analytics';
import { AnnouncementBar } from '../components/announcement-bar';
import { CookieBanner } from '../components/cookie-banner';
import { PromoBanner } from '../components/promo-banner';
import { Header } from '../components/header';
import { Footer } from '../components/footer';
import { WhatsappButton } from '../components/whatsapp-button';
import { getSettings } from '../lib/api';

const STOREFRONT_URL = (
  process.env.NEXT_PUBLIC_STOREFRONT_URL || 'https://www.noexcusenx.com.br'
).replace(/\/$/, '');

export const metadata = {
  metadataBase: new URL(STOREFRONT_URL),
  // Sem `template`: as páginas já trazem o sufixo no próprio título, e o
  // template somaria um segundo ("Sale — NO EXCUSE — NO EXCUSE").
  title: 'NO EXCUSE — Roupas de Academia',
  description:
    'Leggings, tops e shorts de academia com compressão certa e caimento que aguenta o treino. Frete para todo o Brasil.',
  // Sem `alternates` aqui de propósito. Um canonical no layout vale para toda
  // página que não sobrescreva — e só a página de produto sobrescrevia. O
  // resultado era /produtos, /sale e /quem-somos declarando ao Google que são
  // a home, o que é um pedido explícito para desindexá-las. Cada página traz o
  // seu; sem canonical, o Google usa a própria URL, que é o certo.
  openGraph: {
    type: 'website',
    siteName: 'NO EXCUSE',
    locale: 'pt_BR',
    url: STOREFRONT_URL,
    title: 'NO EXCUSE — Roupas de Academia',
    description:
      'Leggings, tops e shorts de academia com compressão certa e caimento que aguenta o treino.',
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getSettings();

  return (
    <html lang="pt-BR">
      <body className="flex min-h-screen flex-col font-sans">
        {/* Os scripts de medição vivem aqui dentro, atrás do consentimento.
            O fallback <noscript> foi retirado de propósito: ele dispararia sem
            passar pelo banner, e é exatamente isso que não pode acontecer. */}
        <Analytics
          gtmId={settings.gtmId}
          metaPixelId={settings.metaPixelId}
          googleAdsId={settings.googleAdsId}
        />
        <ProductsProvider>
          <CustomerAuthProvider>
            <CartProvider>
              <PromoBanner
                text={settings.promoBannerText}
                endsAt={settings.promoBannerEndsAt}
                progressiveDiscount={settings.progressiveDiscount}
              />
              <AnnouncementBar
                freeShippingThreshold={settings.freeShippingThreshold}
                maxInstallments={settings.maxInstallments}
              />
              <Header />
              <main className="flex-1">{children}</main>
              <Footer settings={settings} />
              <WhatsappButton phone={settings.contactWhatsapp} />
              <CookieBanner />
            </CartProvider>
          </CustomerAuthProvider>
        </ProductsProvider>
      </body>
    </html>
  );
}
