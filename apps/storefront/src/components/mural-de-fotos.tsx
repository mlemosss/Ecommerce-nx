import Link from 'next/link';
import type { FotoDoMural } from '../lib/api';

/**
 * O mural: as clientes usando as peças, com o que escreveram.
 *
 * A loja tem foto de estúdio, que é bonita e não convence ninguém do caimento.
 * O que convence é a peça num corpo parecido com o de quem está olhando, na
 * luz do quarto, no espelho do banheiro — e isso a loja só consegue quando a
 * cliente manda. Estava tudo enterrado no fim da página de cada produto, uma
 * foto por vez: quem abria a legging nunca via a foto de quem comprou o top.
 *
 * Reunidas viram parede, e parede é outra coisa: mostra que a marca é usada.
 *
 * Sem JavaScript de propósito. A legenda aparece no hover por CSS no
 * computador e fica sempre visível no celular, onde hover não existe — cada
 * foto é um link para a peça, então o dedo que toca já está comprando.
 */
export function MuralDeFotos({ fotos }: { fotos: FotoDoMural[] }) {
  if (fotos.length === 0) return null;

  return (
    <section className="mt-20">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-ink/50">Na vida real</p>
          <h2 className="section-title mt-3">Em quem usa</h2>
        </div>
        <Link
          href="/avaliar-loja"
          className="text-sm font-semibold underline underline-offset-4 hover:no-underline"
        >
          Mandar a minha foto
        </Link>
      </div>

      <div className="mt-10 grid grid-cols-2 gap-px bg-line sm:grid-cols-3 lg:grid-cols-4">
        {fotos.map((foto) => (
          <Link
            key={foto.id}
            href={`/produtos/${foto.productSlug}`}
            className="group relative block aspect-[4/5] overflow-hidden bg-paper"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={foto.photoUrl}
              alt={`${foto.customerName} usando ${foto.productName}`}
              loading="lazy"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
            />

            {/* Véu de baixo para cima: o texto precisa de fundo escuro para ser
                legível sobre qualquer foto, mas escurecer a imagem inteira
                mataria justamente o que a pessoa veio ver. */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-4 pt-10 text-white">
              <p aria-hidden className="text-[11px] tracking-[0.2em]">
                {'★'.repeat(foto.rating)}
                <span className="text-white/35">{'★'.repeat(5 - foto.rating)}</span>
              </p>

              <p className="mt-1.5 line-clamp-2 text-[13px] leading-snug">
                &ldquo;{foto.comment}&rdquo;
              </p>

              <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-white/80">
                {foto.customerName} · {foto.productName}
              </p>
            </div>
          </Link>
        ))}
      </div>

      <p className="mt-6 text-xs leading-relaxed text-ink/50">
        Fotos enviadas por clientes, publicadas com autorização delas.
      </p>
    </section>
  );
}
