import { Router } from 'express';

import { healthRouter } from '@routes/v1/health.routes';
import { authRouter } from '@routes/v1/auth.routes';
import { usersRouter } from '@routes/v1/users.routes';
import { rolesRouter } from '@routes/v1/roles.routes';
import { permissionsRouter } from '@routes/v1/permissions.routes';
import { profileRouter } from '@routes/v1/profile.routes';

import { siteSettingsRouter } from '@routes/v1/site-settings.routes';
import { pageContentRouter } from '@routes/v1/page-content.routes';
import { heroBannersRouter } from '@routes/v1/hero-banners.routes';
import { testimonialsRouter } from '@routes/v1/testimonials.routes';
import { socialLinksRouter } from '@routes/v1/social-links.routes';
import { navigationRouter } from '@routes/v1/navigation.routes';
import { activitiesRouter } from '@routes/v1/activities.routes';
import { committeeRouter } from '@routes/v1/committee.routes';

import { donationCategoriesRouter } from '@routes/v1/donation-categories.routes';
import { appealsRouter } from '@routes/v1/appeals.routes';
import { donationsRouter } from '@routes/v1/donations.routes';
import { bankTransfersRouter } from '@routes/v1/bank-transfers.routes';

import { volunteersRouter } from '@routes/v1/volunteers.routes';
import { volunteerAssignmentsRouter } from '@routes/v1/volunteer-assignments.routes';

import { eventCategoriesRouter } from '@routes/v1/event-categories.routes';
import { eventsRouter } from '@routes/v1/events.routes';
import { eventRegistrationsRouter } from '@routes/v1/event-registrations.routes';

import { newsRouter } from '@routes/v1/news.routes';
import { galleryRouter } from '@routes/v1/gallery.routes';
import { documentsRouter } from '@routes/v1/documents.routes';
import { mediaRouter } from '@routes/v1/media.routes';

/**
 * API v1 router — the versioning root described in documentation/13-API-Requirements.md
 * and design/13-API-Architecture.md §6. All v1 resource routers mount here.
 */
export const v1Router = Router();

v1Router.use('/health', healthRouter);
v1Router.use('/auth', authRouter);
v1Router.use('/users', usersRouter);
v1Router.use('/roles', rolesRouter);
v1Router.use('/permissions', permissionsRouter);
v1Router.use('/profile', profileRouter);

// Content Management System
v1Router.use('/site-settings', siteSettingsRouter);
v1Router.use('/page-content', pageContentRouter);
v1Router.use('/hero-banners', heroBannersRouter);
v1Router.use('/testimonials', testimonialsRouter);
v1Router.use('/social-links', socialLinksRouter);
v1Router.use('/navigation', navigationRouter);
v1Router.use('/activities', activitiesRouter);
v1Router.use('/committee', committeeRouter);

// Donation module
v1Router.use('/donation-categories', donationCategoriesRouter);
v1Router.use('/appeals', appealsRouter);
v1Router.use('/donations', donationsRouter);
v1Router.use('/bank-transfers', bankTransfersRouter);

// Volunteer module
v1Router.use('/volunteers', volunteersRouter);
v1Router.use('/volunteer-assignments', volunteerAssignmentsRouter);

// Event module
v1Router.use('/event-categories', eventCategoriesRouter);
v1Router.use('/events', eventsRouter);
v1Router.use('/event-registrations', eventRegistrationsRouter);

// News, Gallery, Documents
v1Router.use('/news', newsRouter);
v1Router.use('/gallery', galleryRouter);
v1Router.use('/documents', documentsRouter);

// Generic media utility (see media.routes.ts doc-comment)
v1Router.use('/media', mediaRouter);
