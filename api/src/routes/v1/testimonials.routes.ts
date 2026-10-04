import { buildSimpleCrudRouter } from '@lib/simple-crud-router';
import * as testimonialRepo from '@repositories/testimonial.repository';
import { createTestimonialSchema, updateTestimonialSchema } from '@validation/testimonial.schema';

export const testimonialsRouter = buildSimpleCrudRouter(testimonialRepo, {
  entityType: 'testimonial',
  viewPermission: 'testimonials:view',
  managePermission: 'testimonials:manage',
  createSchema: createTestimonialSchema,
  updateSchema: updateTestimonialSchema,
  supportsReorder: true,
});
