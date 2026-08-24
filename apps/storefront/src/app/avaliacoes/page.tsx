import type { Metadata } from 'next';
import Link from 'next/link';
import { getAvaliacoesPublicas, getMural, getTestimonials } from '../../lib/api';
import { MuralDeFotos } from '../../components/mural-de-fotos';
import { FotoDaAvaliacao } from '../../components/foto-da-avaliacao';

export const metadata: Metadata = {
  title: 'Avaliações de quem já usa — NO EXCUSE',
  description:
    'O que as clientes NO EXCUSE dizem sobre as peças: caimento, tecido, compressão e atendimento, com fotos de quem comprou.',
  alternates: { canonical: '/avaliacoes' },
};

function Estrelas({ nota, className = '' }: { nota: number; className?: string }) {
  return (
    <span aria-label={`${nota} de 5 estrelas`} className={className}>
      <span aria-hidden className="text-ink">
        {'★'.repeat(Math.round(nota))}
        <span className="text-ink/20">{'★'.repeat(5 - Math.round(nota))}</span>
      </span>
    </span>
  );
}

function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

/**
 * Uma página só de avaliações.
 *
 * As opiniões existiam espalhadas, uma peça por vez — e dez avaliações
 * divididas entre dez produtos parecem dez lojas com uma avaliação cada.
 * Juntas, com a média e o total logo na entrada, viram o número que a pessoa
 * procura antes de comprar de uma marca que nunca viu.
 *
 * Deliberadamente sem dado estruturado de nota agregada: o Google desconta
 * avaliação que a própria loja hospeda e declara sobre si mesma, e o risco de
 * penalização não compensa a estrelinha no resultado de busca.
 */
export default async function AvaliacoesPage() {
  const [{ total, media, avaliacoes }, fotos, depoimentos] = await Promise.all([
    getAvaliacoesPublicas(),
    getMural(),
    getTestimonials(),
  ]);

  const totalGeral = total + depoimentos.length;

  // A média tem que cobrir as mesmas avaliações que o total ao lado dela.
  // Somando só as de peça, o número grande diria uma coisa e a contagem outra
  // — e é justamente esse par que a pessoa lê antes de decidir se confia.
  const mediaGeral = totalGeral
    ? (media * total + depoimentos.reduce((soma, d) => soma + d.rating, 0)) / totalGeral
    : 0;

  return (
    <div className="container-page py-10 sm:py-14">
      <nav className="mb-8 text-[11px] uppercase tracking-[0.14em] text-ink/60">
        <Link href="/" className="underline-offset-4 hover:underline">
          Início
        </Link>{' '}
        / <span className="text-ink">Avaliações</span>
      </nav>

      <p className="eyebrow text-ink/50">Quem já treina com a gente</p>
      <h1 className="page-title mt-3">Avaliações</h1>

      {totalGeral > 0 ? (
        <div className="mt-8 flex flex-wrap items-end gap-x-8 gap-y-4 border-y border-line py-6">
          <div>
            <p className="text-5xl font-black leading-none tracking-[-0.03em]">
              {mediaGeral.toFixed(1).replace('.', ',')}
            </p>
            <Estrelas nota={mediaGeral} className="mt-2 block text-sm tracking-[0.15em]" />
          </div>
          <p className="text-sm leading-relaxed text-ink/70">
            {totalGeral} {totalGeral === 1 ? 'avaliação' : 'avaliações'} de clientes
            <br />
            <Link href="/avaliar-loja" className="underline underline-offset-4">
              Já usou uma peça nossa? Escreva a sua
            </Link>
          </p>
        </div>
      ) : (
        <div className="mt-8 border-y border-line py-6">
          <p className="text-sm leading-relaxed text-ink/70">
            Ainda estamos reunindo as primeiras avaliações.{' '}
            <Link href="/avaliar-loja" className="underline underline-offset-4">
              Se você já usou uma peça nossa, conte como foi
            </Link>{' '}
            — é o que ajuda quem chega depois.
          </p>
        </div>
      )}

      <MuralDeFotos fotos={fotos} mostrarLinkParaTodas={false} />

      {/* Depoimentos da loja: sobre atendimento, entrega e embalagem, e não
          sobre uma peça específica. Vêm de quem comprou antes do site existir,
          então não têm produto para linkar. */}
      {depoimentos.length > 0 && (
        <section className="mt-20">
          <p className="eyebrow text-ink/50">Sobre comprar aqui</p>
          <h2 className="section-title mt-3">A experiência</h2>

          <div className="mt-10 grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-3">
            {depoimentos.map((d) => (
              <figure key={d.id} className="flex flex-col bg-white p-6">
                <Estrelas nota={d.rating} className="text-sm tracking-[0.2em]" />
                <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-ink/75">
                  &ldquo;{d.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-6 border-t border-line pt-4 text-[11px] uppercase tracking-[0.12em] text-ink/60">
                  {d.customerName}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {avaliacoes.length > 0 && (
        <section className="mt-20">
          <p className="eyebrow text-ink/50">Peça por peça</p>
          <h2 className="section-title mt-3">O que dizem das roupas</h2>

          <ul className="mt-10 divide-y divide-line border-y border-line">
            {avaliacoes.map((a) => (
              <li key={a.id} className="flex gap-5 py-6">
                {a.photoUrl && (
                  <FotoDaAvaliacao
                    foto={{
                      url: a.photoUrl,
                      autor: a.customerName,
                      rating: a.rating,
                      texto: a.comment,
                      productName: a.productName,
                      productSlug: a.productSlug,
                    }}
                    className="h-28 w-24 shrink-0 overflow-hidden"
                  />
                )}

                <div className="min-w-0">
                  <Estrelas nota={a.rating} className="text-sm tracking-[0.15em]" />
                  <p className="mt-2 text-sm leading-relaxed text-ink/75">{a.comment}</p>

                  <p className="mt-3 text-[11px] uppercase tracking-[0.12em] text-ink/60">
                    {a.customerName} · {formatarData(a.createdAt)} ·{' '}
                    <Link
                      href={`/produtos/${a.productSlug}`}
                      className="text-ink underline underline-offset-4"
                    >
                      {a.productName}
                    </Link>
                  </p>

                  {/* Veio pelo link do pedido: há uma compra por trás. É a
                      diferença entre "alguém escreveu" e "alguém que comprou
                      escreveu", e é a única marca de confiança que a loja pode
                      dar sem mentir. */}
                  {a.compraVerificada && (
                    <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/45">
                      ✓ Compra verificada
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-20 bg-paper px-6 py-12 text-center">
        <h2 className="section-title">Já treina com uma NO EXCUSE?</h2>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-ink/70">
          Sua avaliação — e principalmente sua foto — é o que ajuda a próxima a acertar o tamanho.
          Vale também para quem comprou com a gente antes do site existir.
        </p>
        <Link href="/avaliar-loja" className="btn-primary mt-8 inline-flex">
          Escrever minha avaliação
        </Link>
      </section>
    </div>
  );
}
