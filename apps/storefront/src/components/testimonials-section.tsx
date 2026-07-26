import type { Testimonial } from '../lib/api';

export function TestimonialsSection({ testimonials }: { testimonials: Testimonial[] }) {
  if (testimonials.length === 0) return null;

  return (
    <section className="container-page py-16">
      <h2 className="section-title text-center">O que dizem nossos clientes</h2>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {testimonials.map((testimonial) => (
          <figure key={testimonial.id} className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
            <div aria-hidden className="text-volt2/80">
              {'★'.repeat(testimonial.rating)}
              {'☆'.repeat(5 - testimonial.rating)}
            </div>
            <blockquote className="mt-3 text-sm text-black/70">&ldquo;{testimonial.quote}&rdquo;</blockquote>
            <figcaption className="mt-4 flex items-center gap-3">
              {testimonial.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={testimonial.photoUrl}
                  alt=""
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/5 text-lg">
                  🙂
                </div>
              )}
              <span className="text-sm font-semibold">{testimonial.customerName}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
