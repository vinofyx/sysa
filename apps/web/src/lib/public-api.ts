import axios from 'axios';

import { env } from '@/lib/env';
import type {
  Activity,
  Appeal,
  CommitteeMember,
  DonationCategory,
  GalleryAlbum,
  HeroBanner,
  NavigationTree,
  NewsPost,
  PageContent,
  PublicDocument,
  PublicEvent,
  SiteSettings,
  SocialLink,
  Testimonial,
} from '@/types/public';

/**
 * Separate, lighter Axios instance for the public site's read-only calls —
 * unlike `lib/api-client.ts` (the admin/auth client), these endpoints never
 * return 401, so the silent-refresh interceptor there would be dead weight.
 * Safe to call from both Server Components (direct `await`) and Client
 * Components (via TanStack Query).
 */
export const publicApiClient = axios.create({
  baseURL: `${env.NEXT_PUBLIC_API_URL}/api/v1`,
  timeout: 15_000,
});

/** Next.js Server Components can only pass plain, serializable values down to
 * Client Component error boundaries (e.g. `app/error.tsx`) — an uncaught
 * `AxiosError` (which carries non-serializable fields like the Axios config's
 * `transformRequest` functions) crashes with a confusing secondary "Only
 * plain objects can be passed to Client Components" error that masks the
 * real failure (e.g. the backend being unreachable). Converting to a plain
 * `Error` here keeps the actual message intact and serializable. */
publicApiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const message = axios.isAxiosError(error)
      ? ((error.response?.data as { error?: { message?: string } } | undefined)?.error?.message ??
        error.message)
      : 'Request failed';
    throw new Error(message);
  },
);

export async function getSiteSettings(): Promise<SiteSettings> {
  const { data } = await publicApiClient.get<{ settings: SiteSettings }>('/site-settings/public');
  return data.settings;
}

export type PageKey =
  | 'home'
  | 'about'
  | 'contact'
  | 'privacy-policy'
  | 'terms-conditions'
  | 'refund-policy'
  | 'disclaimer';

export async function getPageContent(pageKey: PageKey): Promise<PageContent> {
  const { data } = await publicApiClient.get<{ content: PageContent }>(
    `/page-content/public/${pageKey}`,
  );
  return data.content;
}

export async function getHeroBanners(): Promise<HeroBanner[]> {
  const { data } = await publicApiClient.get<{ banners: HeroBanner[] }>('/hero-banners/public');
  return data.banners;
}

export async function getTestimonials(): Promise<Testimonial[]> {
  const { data } = await publicApiClient.get<{ testimonials: Testimonial[] }>(
    '/testimonials/public',
  );
  return data.testimonials;
}

export async function getActivities(): Promise<Activity[]> {
  const { data } = await publicApiClient.get<{ activities: Activity[] }>('/activities/public');
  return data.activities;
}

export async function getActivityBySlug(slug: string): Promise<Activity | null> {
  try {
    const { data } = await publicApiClient.get<{ activity: Activity }>(
      `/activities/public/${slug}`,
    );
    return data.activity;
  } catch {
    return null;
  }
}

export async function getCommitteeMembers(): Promise<CommitteeMember[]> {
  const { data } = await publicApiClient.get<{ members: CommitteeMember[] }>('/committee/public');
  return data.members;
}

export async function getSocialLinks(): Promise<SocialLink[]> {
  const { data } = await publicApiClient.get<{ links: SocialLink[] }>('/social-links/public');
  return data.links;
}

export async function getNavigation(): Promise<NavigationTree> {
  const { data } = await publicApiClient.get<NavigationTree>('/navigation/public');
  return data;
}

export async function getDonationCategories(): Promise<DonationCategory[]> {
  const { data } = await publicApiClient.get<{ categories: DonationCategory[] }>(
    '/donation-categories/public',
  );
  return data.categories;
}

export async function getAppeals(): Promise<Appeal[]> {
  const { data } = await publicApiClient.get<{ appeals: Appeal[] }>('/appeals/public');
  return data.appeals;
}

export async function getPublicDocuments(category?: string): Promise<PublicDocument[]> {
  const { data } = await publicApiClient.get<{ data: PublicDocument[] }>('/documents/public', {
    params: category ? { category } : undefined,
  });
  return data.data;
}

export async function getPublicEvents(): Promise<PublicEvent[]> {
  const { data } = await publicApiClient.get<{ events: PublicEvent[] }>('/events/public');
  return data.events;
}

export async function getPublicEventBySlug(slug: string): Promise<PublicEvent | null> {
  try {
    const { data } = await publicApiClient.get<{ event: PublicEvent }>(`/events/public/${slug}`);
    return data.event;
  } catch {
    return null;
  }
}

export async function getPublicNewsPosts(category?: string): Promise<NewsPost[]> {
  const { data } = await publicApiClient.get<{ posts: NewsPost[] }>('/news/public', {
    params: category ? { category } : undefined,
  });
  return data.posts;
}

export async function getPublicNewsPostBySlug(slug: string): Promise<NewsPost | null> {
  try {
    const { data } = await publicApiClient.get<{ post: NewsPost }>(`/news/public/${slug}`);
    return data.post;
  } catch {
    return null;
  }
}

export async function getGalleryAlbums(): Promise<GalleryAlbum[]> {
  const { data } = await publicApiClient.get<{ albums: GalleryAlbum[] }>('/gallery/public');
  return data.albums;
}
