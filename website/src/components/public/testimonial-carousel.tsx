import Image from 'next/image';
import { Quote } from 'lucide-react';
import { getLocale } from 'next-intl/server';

import { Carousel } from '@/components/public/carousel';
import { translateTestimonialAuthor } from '@/lib/testimonial-labels';
import type { Testimonial } from '@/types/public';

/** design/05-Wireframes.md: the whole section unmounts if there are zero
 * published testimonials (FR-HOME-05) — never a fabricated fallback quote. */
export async function TestimonialCarousel({ testimonials }: { testimonials: Testimonial[] }) {
  if (testimonials.length === 0) return null;

  const locale = await getLocale();

  return (
    <Carousel className="mx-auto max-w-3xl pb-10" autoAdvanceMs={8000} dotVariant="dark">
      {testimonials.map((testimonial) => {
        const quote =
          locale === 'te' && testimonial.quoteTe ? testimonial.quoteTe : testimonial.quoteEn;
        const { authorName, authorRole } = translateTestimonialAuthor(testimonial, locale);
        return (
          <div key={testimonial.id} className="px-2 py-4">
            <div className="pub-glass shadow-pub-lg relative flex flex-col items-center gap-4 rounded-[var(--radius-pub-lg)] px-8 py-10 text-center sm:px-14">
              <span className="pub-gradient-gold shadow-pub-sm flex size-14 items-center justify-center rounded-full">
                <Quote className="text-pub-primary-950 size-6" fill="currentColor" />
              </span>
              <p className="font-pub-heading text-pub-primary-950 dark:text-pub-neutral-900 text-xl leading-relaxed italic sm:text-2xl">
                &ldquo;{quote}&rdquo;
              </p>
              <span className="pub-divider-gold" />
              <div className="mt-1 flex items-center gap-3">
                {testimonial.photoUrl && (
                  <Image
                    src={testimonial.photoUrl}
                    alt={authorName}
                    width={52}
                    height={52}
                    className="ring-pub-gold-300 size-13 rounded-full object-cover ring-2 ring-offset-2"
                  />
                )}
                <div className="text-left">
                  <p className="text-pub-primary-900 dark:text-pub-neutral-900 text-sm font-semibold">
                    {authorName}
                  </p>
                  {authorRole && <p className="text-pub-neutral-500 text-xs">{authorRole}</p>}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </Carousel>
  );
}
