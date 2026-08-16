import './global.css';
import { BottomNav } from '../components/bottom-nav';
import { Sidebar } from '../components/sidebar';
import { AuthGuard } from '../components/auth-guard';

export const metadata = {
  title: 'NO EXCUSE — Gerencial',
  description: 'Painel de gestão da loja NO EXCUSE: produtos, estoque, clientes, vendas e despesas.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="flex min-h-screen font-sans">
        <Sidebar />
        <div className="flex min-h-screen flex-1 flex-col">
          <div className="mx-auto w-full max-w-5xl flex-1 pb-24 md:pb-8">
            <AuthGuard>{children}</AuthGuard>
          </div>
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
