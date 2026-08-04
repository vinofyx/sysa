import { Router } from 'express';

import { prisma } from '@lib/prisma';

/**
 * Public read-only endpoints for the six CMS modules built on
 * `buildSimpleCrudRouter` (Hero Banners, Testimonials, Activities, Committee,
 * Social Links, Navigation). That factory calls `router.use(authenticate)`
 * unconditionally as its first line, so there is no way to carve out an
 * unauthenticated route on those routers themselves — these six endpoints
 * live on a dedicated, always-public router instead, mounted in
 * `routes/v1/index.ts` BEFORE the six admin routers so an exact-path match
 * here (e.g. `GET /hero-banners/public`) short-circuits before Express ever
 * reaches the admin router's `authenticate` middleware for that same path
 * prefix.
 *
 * Phase 6 (public website) integration — see DEVELOPMENT_PROGRESS.md.
 */
export const publicContentRouter = Router();

publicContentRouter.get('/hero-banners/public', async (_req, res, next) => {
  try {
    const banners = await prisma.heroBanner.findMany({
      where: { active: true, deletedAt: null },
      orderBy: { displayOrder: 'asc' },
    });
    res.status(200).json({ banners });
  } catch (error) {
    next(error);
  }
});

publicContentRouter.get('/testimonials/public', async (_req, res, next) => {
  try {
    const testimonials = await prisma.testimonial.findMany({
      where: { active: true, deletedAt: null },
      orderBy: { displayOrder: 'asc' },
    });
    res.status(200).json({ testimonials });
  } catch (error) {
    next(error);
  }
});

publicContentRouter.get('/activities/public', async (_req, res, next) => {
  try {
    const activities = await prisma.activity.findMany({
      where: { active: true, deletedAt: null },
      include: { linkedCategory: true },
      orderBy: { displayOrder: 'asc' },
    });
    res.status(200).json({ activities });
  } catch (error) {
    next(error);
  }
});

publicContentRouter.get('/activities/public/:slug', async (req, res, next) => {
  try {
    const activity = await prisma.activity.findFirst({
      where: { slug: req.params.slug, active: true, deletedAt: null },
      include: { linkedCategory: true },
    });
    if (!activity) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Activity not found' } });
      return;
    }
    res.status(200).json({ activity });
  } catch (error) {
    next(error);
  }
});

publicContentRouter.get('/committee/public', async (_req, res, next) => {
  try {
    const members = await prisma.committeeMember.findMany({
      where: { active: true, deletedAt: null },
      orderBy: { displayOrder: 'asc' },
    });
    res.status(200).json({ members });
  } catch (error) {
    next(error);
  }
});

publicContentRouter.get('/social-links/public', async (_req, res, next) => {
  try {
    const links = await prisma.socialMediaLink.findMany({
      where: { active: true },
      orderBy: { displayOrder: 'asc' },
    });
    res.status(200).json({ links });
  } catch (error) {
    next(error);
  }
});

interface NavItem {
  id: string;
  labelEn: string;
  labelTe: string | null;
  url: string;
  parentId: string | null;
  displayOrder: number;
  children: NavItem[];
}

function buildNavTree(items: Omit<NavItem, 'children'>[]): NavItem[] {
  const byId = new Map<string, NavItem>(items.map((item) => [item.id, { ...item, children: [] }]));
  const roots: NavItem[] = [];
  for (const item of byId.values()) {
    if (item.parentId && byId.has(item.parentId)) {
      byId.get(item.parentId)!.children.push(item);
    } else {
      roots.push(item);
    }
  }
  return roots;
}

publicContentRouter.get('/navigation/public', async (_req, res, next) => {
  try {
    const items = await prisma.navigationMenuItem.findMany({
      where: { active: true, deletedAt: null },
      orderBy: { displayOrder: 'asc' },
      select: {
        id: true,
        labelEn: true,
        labelTe: true,
        url: true,
        parentId: true,
        displayOrder: true,
        location: true,
      },
    });
    const header = buildNavTree(items.filter((item) => item.location === 'header'));
    const footer = buildNavTree(items.filter((item) => item.location === 'footer'));
    res.status(200).json({ header, footer });
  } catch (error) {
    next(error);
  }
});
