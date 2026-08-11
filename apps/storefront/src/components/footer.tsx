import Link from 'next/link';
import { categories } from '../lib/products';
import type { StoreSettings } from '../lib/api';

/**
 * Contato e redes vêm de Configurações. Antes havia um e-mail chumbado no
 * código — e num domínio diferente do que a loja usa hoje. Sem endereço
 * cadastrado, é melhor não mostrar nenhum do que mostrar um que não responde.
 */
export function Footer({ settings }: { settings: StoreSettings }) {
  const social = [
    { href: settings.instagramUrl, label: 'Instagram' },
    { href: settings.facebookUrl, label: 'Facebook' },
  ].filter((item): item is { href: string; label: string } => Boolean(item.href));

  const whatsappDigits = settings.contactWhatsapp?.replace(/\D/g, '');

  return (
    <footer className="mt-24 bg-ink text-white">
      <div className="container-page grid grid-cols-2 gap-10 py-14 sm:grid-cols-4">
        <div className="col-span-2 sm:col-span-1">
          <p className="text-xl font-black uppercase tracking-tighter">No Excuse</p>
          <p className="mt-4 text-sm leading-relaxed text-white/60">
            Roupas e acessórios de academia feitos para quem não pula treino.
          </p>
        </div>

        <div>
          <p className="eyebrow text-white/50">Categorias</p>
          <ul className="mt-4 space-y-2.5 text-sm text-white/70">
            {categories.map((c) => (
              <li key={c.value}>
                <Link
                  href={`/produtos?categoria=${c.value}`}
                  className="underline-offset-4 transition hover:text-white hover:underline"
                >
                  {c.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="eyebrow text-white/50">Ajuda</p>
          <ul className="mt-4 space-y-2.5 text-sm text-white/70">
            <li>
              <Link href="/produtos" className="underline-offset-4 transition hover:text-white hover:underline">
                Todos os produtos
              </Link>
            </li>
            <li>
              <Link href="/carrinho" className="underline-offset-4 transition hover:text-white hover:underline">
                Meu carrinho
              </Link>
            </li>
            <li>
              <Link href="/conta" className="underline-offset-4 transition hover:text-white hover:underline">
                Minha conta
              </Link>
            </li>
            <li>
              <Link
                href="/quem-somos"
                className="underline-offset-4 transition hover:text-white hover:underline"
              >
                Quem somos
              </Link>
            </li>
            <li>
              <Link
                href="/privacidade"
                className="underline-offset-4 transition hover:text-white hover:underline"
              >
                Privacidade e cookies
              </Link>
            </li>
            {settings.contactEmail && (
              <li>
                <a
                  href={`mailto:${settings.contactEmail}`}
                  className="underline-offset-4 transition hover:text-white hover:underline"
                >
                  {settings.contactEmail}
                </a>
              </li>
            )}
            {whatsappDigits && (
              <li>
                <a
                  href={`https://wa.me/${whatsappDigits}`}
                  target="_blank"
                  rel="noreferrer"
                  className="underline-offset-4 transition hover:text-white hover:underline"
                >
                  WhatsApp
                </a>
              </li>
            )}
          </ul>
        </div>

        <div>
          <p className="eyebrow text-white/50">Pagamento</p>
          <p className="mt-4 text-sm leading-relaxed text-white/70">
            Pix, cartão em até {settings.maxInstallments}x sem juros e boleto. Compra 100% segura.
          </p>
          {social.length > 0 && (
            <ul className="mt-5 flex gap-4 text-sm text-white/70">
              {social.map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className="underline-offset-4 transition hover:text-white hover:underline"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="border-t border-white/10 py-5">
        <p className="container-page text-[11px] uppercase tracking-[0.14em] text-white/60">
          © {new Date().getFullYear()} No Excuse. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}
