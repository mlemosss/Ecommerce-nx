import './global.css';
import { CartProvider } from '../lib/cart-context';
import { ProductsProvider } from '../lib/products-context';
import { CustomerAuthProvider } from '../lib/customer-auth-context';
import { Analytics } from '../components/analytics';
import { AnnouncementBar } from '../components/announcement-bar';
import { CookieBanner } from '../components/cookie-banner';
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
              <AnnouncementBar
                freeShippingThreshold={settings.freeShippingThreshold}
                maxInstallments={settings.maxInstallments}
              />
              <Header />
              <main className="flex-1">{children}</main>
              <Footer settings={settings} />
              <CookieBanner />
            </CartProvider>
          </CustomerAuthProvider>
        </ProductsProvider>
      </body>
    </html>
  );
}
