import Link from 'next/link';
import { categories } from '../lib/products';

export function Footer() {
  return (
    <footer className="mt-24 border-t border-black/10 bg-ink text-white">
      <div className="container-page grid grid-cols-2 gap-8 py-12 sm:grid-cols-4">
        <div className="col-span-2 sm:col-span-1">
          <p className="text-xl font-black tracking-tighter">
            NO <span className="text-volt2">EXCUSE</span>
          </p>
          <p className="mt-3 text-sm text-white/60">
            Roupas e acessórios de academia feitos para quem não pula treino.
          </p>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-white/80">Categorias</p>
          <ul className="mt-3 space-y-2 text-sm text-white/60">
            {categories.map((c) => (
              <li key={c.value}>
                <Link href={`/produtos?categoria=${c.value}`} className="hover:text-white">
                  {c.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-white/80">Ajuda</p>
          <ul className="mt-3 space-y-2 text-sm text-white/60">
            <li><Link href="/produtos" className="hover:text-white">Todos os produtos</Link></li>
            <li><Link href="/carrinho" className="hover:text-white">Meu carrinho</Link></li>
            <li><a href="mailto:contato@noexcuse.com.br" className="hover:text-white">contato@noexcuse.com.br</a></li>
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-white/80">Pagamento</p>
          <p className="mt-3 text-sm text-white/60">
            Pix, cartão em até 3x sem juros e boleto. Ambiente de compra simulado para fins de demonstração.
          </p>
        </div>
      </div>
      <div className="border-t border-white/10 py-4">
        <p className="container-page text-xs text-white/40">
          © {new Date().getFullYear()} NO EXCUSE. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}
