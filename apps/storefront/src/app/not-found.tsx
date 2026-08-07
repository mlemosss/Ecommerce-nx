import Link from 'next/link';

export const metadata = {
  title: 'Página não encontrada — NO EXCUSE',
};

export default function NotFound() {
  return (
    <div className="container-page flex flex-col items-center gap-5 py-28 text-center">
      <p className="eyebrow text-ink/50">Erro 404</p>
      <h1 className="section-title">Essa página saiu de linha</h1>
      <p className="max-w-md text-sm leading-relaxed text-ink/60">
        O endereço não existe ou o produto saiu do catálogo. Dá uma olhada no que temos agora.
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-4">
        <Link href="/produtos" className="btn-primary">
          Ver produtos
        </Link>
        <Link href="/" className="link-ghost">
          Voltar para a home
          <span aria-hidden>→</span>
        </Link>
      </div>
    </div>
  );
}
