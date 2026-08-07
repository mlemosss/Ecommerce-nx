import type { Testimonial } from '../lib/api';

export function TestimonialsSection({ testimonials }: { testimonials: Testimonial[] }) {
  if (testimonials.length === 0) return null;

  return (
    <section className="container-page py-20 sm:py-24">
      <p className="eyebrow text-ink/50">Quem já treina com a gente</p>
      <h2 className="section-title mt-3">O que dizem nossos clientes</h2>

      <div className="mt-10 grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-3">
        {testimonials.map((testimonial) => (
          <figure key={testimonial.id} className="flex flex-col bg-white p-6">
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
              {testimonial.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={testimonial.photoUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-paper text-xs font-bold text-ink/70">
                  {testimonial.customerName.charAt(0).toUpperCase()}
                </span>
              )}
              <span className="text-xs font-semibold uppercase tracking-wide">
                {testimonial.customerName}
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
