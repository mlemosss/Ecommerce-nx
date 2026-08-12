/** Área do cliente: nada aqui deve ser indexado. */
export const metadata = {
  title: 'Minha conta — NO EXCUSE',
  robots: { index: false, follow: false },
};

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return children;
}
