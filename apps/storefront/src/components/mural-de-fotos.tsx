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
export function MuralDeFotos({
  fotos,
  /** Desligado dentro da própria página de avaliações, que já é o destino. */
  mostrarLinkParaTodas = true,
}: {
  fotos: FotoDoMural[];
  mostrarLinkParaTodas?: boolean;
}) {
  if (fotos.length === 0) return null;

  return (
    <section className="mt-20">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-ink/50">Na vida real</p>
          <h2 className="section-title mt-3">Em quem usa</h2>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          {mostrarLinkParaTodas && (
            <Link href="/avaliacoes" className="font-semibold underline underline-offset-4 hover:no-underline">
              Confira as avaliações
            </Link>
          )}
          <Link
            href="/avaliar-loja"
            className="text-ink/60 underline-offset-4 hover:underline"
          >
            Mandar a minha foto
          </Link>
        </div>
      </div>

      {/* Grade com espaço entre as fotos, e não a malha de 1px do resto do
          site. Aquela pinta o fundo do container inteiro e conta com as células
          cobrirem tudo — com duas fotos numa fileira de quatro, o que sobra
          vira um bloco cinza do tamanho da tela. Aqui o que falta é só branco,
          e o mural funciona com duas fotos ou com quarenta. */}
      <div className="mt-10 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
        {fotos.map((foto) => {
          // Foto de avaliação da loja não tem peça atrás, então não tem para
          // onde levar. Vira quadro em vez de link — clicar e não acontecer
          // nada é pior do que não parecer clicável.
          const Quadro = foto.productSlug ? Link : 'div';
          const props = foto.productSlug ? { href: `/produtos/${foto.productSlug}` } : {};

          return (
          <Quadro
            key={foto.id}
            {...(props as { href: string })}
            className="group relative block aspect-[4/5] overflow-hidden bg-paper"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={foto.photoUrl}
              alt={
                foto.productName
                  ? `${foto.customerName} usando ${foto.productName}`
                  : `Foto enviada por ${foto.customerName}`
              }
              loading="lazy"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
            />

            {/* Etiqueta da peça, como a marcação de produto numa foto do
                Instagram. Não é enfeite: sem ela a pessoa vê um corpo bonito
                numa roupa preta e não sabe qual das nossas é — e a foto que
                deveria vender vira só decoração. */}
            {foto.productName && (
              <span className="absolute left-3 top-3 bg-white/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-ink">
                {foto.productName}
              </span>
            )}

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
                {foto.customerName}
              </p>
            </div>
          </Quadro>
          );
        })}
      </div>

      <p className="mt-6 text-xs leading-relaxed text-ink/50">
        Fotos enviadas por clientes, publicadas com autorização delas.
      </p>
    </section>
  );
}
