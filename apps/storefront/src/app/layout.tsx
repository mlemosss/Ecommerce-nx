import './global.css';
import { CartProvider } from '../lib/cart-context';
import { Header } from '../components/header';
import { Footer } from '../components/footer';

export const metadata = {
  title: 'GRITWEAR — Roupas de Academia',
  description:
    'Loja de roupas e acessórios para academia: leggings, tops, shorts, camisetas, jaquetas e acessórios.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="flex min-h-screen flex-col font-sans">
        <CartProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
