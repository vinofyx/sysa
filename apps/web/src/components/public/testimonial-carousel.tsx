import Image from 'next/image';
import { Quote } from 'lucide-react';
import { getLocale } from 'next-intl/server';

import { Carousel } from '@/components/public/carousel';
import type { Testimonial } from '@/types/public';

/** design/05-Wireframes.md: the whole section unmounts if there are zero
 * published testimonials (FR-HOME-05) — never a fabricated fallback quote. */
export async function TestimonialCarousel({ testimonials }: { testimonials: Testimonial[] }) {
  if (testimonials.length === 0) return null;

  const locale = await getLocale();

  return (
    <Carousel className="mx-auto max-w-2xl" autoAdvanceMs={8000}>
      {testimonials.map((testimonial) => {
        const quote =
          locale === 'te' && testimonial.quoteTe ? testimonial.quoteTe : testimonial.quoteEn;
        return (
          <div
            key={testimonial.id}
            className="flex flex-col items-center gap-4 px-10 py-8 text-center"
          >
            <Quote className="text-pub-gold-500 size-8" />
            <p className="font-pub-heading text-pub-primary-900 text-lg italic">
              &ldquo;{quote}&rdquo;
            </p>
            <div className="mt-2 flex items-center gap-3">
              {testimonial.photoUrl && (
                <Image
                  src={testimonial.photoUrl}
                  alt={testimonial.authorName}
                  width={44}
                  height={44}
                  unoptimized
                  className="size-11 rounded-full object-cover"
                />
              )}
              <div className="text-left">
                <p className="text-pub-primary-900 text-sm font-semibold">
                  {testimonial.authorName}
                </p>
                {testimonial.authorRole && (
                  <p className="text-pub-neutral-500 text-xs">{testimonial.authorRole}</p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </Carousel>
  );
}
