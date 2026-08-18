import Link from 'next/link';
import type { Testimonial } from '../lib/api';

export function TestimonialsSection({ testimonials }: { testimonials: Testimonial[] }) {
  if (testimonials.length === 0) return null;

  return (
    <section className="container-page py-20 sm:py-24">
      <p className="eyebrow text-ink/50">Quem já treina com a gente</p>
      <h2 className="section-title mt-3">O que dizem nossos clientes</h2>

      <div className="mt-10 grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-3">
        {testimonials.map((testimonial) => (
          <figure key={testimonial.id} className="flex flex-col bg-white">
            {/* A foto que a cliente manda é dela usando a peça — é a prova
                social que mais decide compra em moda. Cabia numa bolinha de 36
                pixels ao lado do nome, onde não dava para ver nem a roupa nem o
                caimento. Agora abre o cartão, no tamanho em que serve para
                alguma coisa. `unoptimized`: vem como dataURL do banco. */}
            {testimonial.photoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={testimonial.photoUrl}
                alt={`Foto enviada por ${testimonial.customerName}`}
                className="aspect-[4/5] w-full object-cover"
              />
            )}

            <div className="flex flex-1 flex-col p-6">
            <div className="text-sm tracking-[0.2em] text-ink" aria-label={`${testimonial.rating} de 5 estrelas`}>
              <span aria-hidden>
                {'★'.repeat(testimonial.rating)}
                <span className="text-ink/25">{'★'.repeat(5 - testimonial.rating)}</span>
              </span>
            </div>
            <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-ink/75">
              &ldquo;{testimonial.quote}&rdquo;
            </blockquote>
            <figcaption className="mt-6 flex items-center gap-3 border-t border-line pt-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-paper text-xs font-bold text-ink/70">
                {testimonial.customerName.charAt(0).toUpperCase()}
              </span>
              <span className="text-xs font-semibold uppercase tracking-wide">
                {testimonial.customerName}
              </span>
            </figcaption>
            </div>
          </figure>
        ))}
      </div>

      {/* Quem lê avaliação é quem mais tende a escrever uma — e quem quer ler
          mais precisa de um lugar que reúna tudo. Os dois caminhos ficam no fim
          da seção, depois de ela ver que outras escreveram. */}
      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
        <Link href="/avaliacoes" className="btn-secondary">
          Confira as avaliações
        </Link>
        <Link
          href="/avaliar-loja"
          className="text-sm text-ink/60 underline-offset-4 hover:underline"
        >
          Também já treinou com uma peça nossa? Conte como foi
        </Link>
      </div>
    </section>
  );
}
