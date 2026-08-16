import Link from 'next/link';
import { categories } from '../lib/products';
import type { StoreSettings } from '../lib/api';

/**
 * Contato e redes vêm de Configurações. Antes havia um e-mail chumbado no
 * código — e num domínio diferente do que a loja usa hoje. Sem endereço
 * cadastrado, é melhor não mostrar nenhum do que mostrar um que não responde.
 */
/**
 * Identificação legal da loja.
 *
 * O Decreto 7.962/2013 (o "decreto do e-commerce") exige nome empresarial,
 * CNPJ e endereço físico visíveis em toda página. Fica aqui como padrão, e não
 * só no banco, porque é dado que não muda e que a loja não pode ficar sem — se
 * o campo em Configurações estiver vazio, a exigência continua cumprida.
 *
 * O que a lojista escrever em Configurações ganha destes valores.
 *
 * "51.141.534 LAYANE CARDOSO MARIANO" é a razão social mesmo: empresário
 * individual recebe o nome no formato número-do-CNPJ + nome civil. É o que
 * consta na Receita e é o que precisa aparecer.
 */
const IDENTIFICACAO = {
  legalName: '51.141.534 LAYANE CARDOSO MARIANO',
  cnpj: '51.141.534/0001-79',
  endereco: 'R. Tupi, 103 — Santa Cecília — São Paulo/SP — CEP 01233-001',
};

/**
 * "5511999520369" vira "(11) 99952-0369".
 *
 * O número guardado tem o 55 na frente porque é assim que o link do WhatsApp
 * precisa dele. Mostrar o número cru para o cliente afasta em vez de aproximar:
 * quem lê quer reconhecer um telefone, não um identificador.
 */
function formatarWhatsapp(digits?: string): string | null {
  if (!digits) return null;
  const nacional = digits.startsWith('55') ? digits.slice(2) : digits;
  const m = nacional.match(/^(\d{2})(\d{4,5})(\d{4})$/);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : null;
}

export function Footer({ settings }: { settings: StoreSettings }) {
  const social = [
    { href: settings.instagramUrl, label: 'Instagram' },
    { href: settings.facebookUrl, label: 'Facebook' },
  ].filter((item): item is { href: string; label: string } => Boolean(item.href));

  const whatsappDigits = settings.contactWhatsapp?.replace(/\D/g, '');
  const whatsappLegivel = formatarWhatsapp(whatsappDigits);

  return (
    <footer className="mt-24 bg-ink text-white">
      <div className="container-page grid grid-cols-2 gap-10 py-14 sm:grid-cols-4">
        <div className="col-span-2 sm:col-span-1">
          <p className="text-xl font-black uppercase tracking-tighter">NO EXCUSE</p>
          {/* Assinatura da marca, no lugar da descrição genérica de antes. Aqui
              ela aparece em toda página sem competir com nada. */}
          <p className="mt-3 text-sm font-semibold text-white/85">
            Vista sua força. Viva seu movimento.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-white/60">
            Roupas de academia pensadas por mulheres, para mulheres que treinam de verdade.
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

      {/* Fecho da página: quem somos e onde estamos.
          Loja pequena e desconhecida precisa provar que tem gente do outro
          lado — número que atende e endereço de verdade fazem mais pela
          conversão do que qualquer selo. */}
      <div className="border-t border-white/10 py-6">
        <div className="container-page flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            {whatsappDigits && (
              <p className="text-sm">
                <span className="text-white/55">Fale com a gente no WhatsApp: </span>
                <a
                  href={`https://wa.me/${whatsappDigits}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-white underline underline-offset-4 transition hover:no-underline"
                >
                  {whatsappLegivel ?? 'clique aqui'}
                </a>
              </p>
            )}
            <p className="mt-2 text-sm text-white/55">
              São Paulo/SP — nosso estoque fica em Higienópolis.
            </p>

            {/* Identificação de quem vende. Exigida pelo Decreto 7.962/2013, e
                antes disso: rodapé sem CNPJ derruba a confiança de quem ainda
                não conhece a marca e está decidindo se digita o cartão. */}
            <p className="mt-3 text-xs leading-relaxed text-white/45">
              {settings.legalName || IDENTIFICACAO.legalName}
              <br />
              CNPJ {settings.cnpj || IDENTIFICACAO.cnpj}
              <br />
              {IDENTIFICACAO.endereco}
            </p>
          </div>

          <p className="text-[11px] uppercase tracking-[0.14em] text-white/60">
            © {new Date().getFullYear()} NO EXCUSE. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
