/**
 * Carrinho não deve aparecer no Google: não traz visita útil e a página só faz
 * sentido com a sessão da pessoa. O robots.txt pede; esta meta tag garante.
 */
export const metadata = {
  title: 'Meu carrinho — NO EXCUSE',
  robots: { index: false, follow: true },
};

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children;
}
