import './global.css';
import { BottomNav } from '../components/bottom-nav';

export const metadata = {
  title: 'No Excuses — Gerencial',
  description: 'Painel de gestão da loja No Excuses: produtos, estoque, clientes, vendas e despesas.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="flex min-h-screen flex-col font-sans">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
          <div className="flex-1 pb-4">{children}</div>
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
