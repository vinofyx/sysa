import axios from 'axios';

import { env } from '@/lib/env';
import { isStaticExport } from '@/lib/static-mode';
import * as staticSite from '@/content/site';
import { activities as staticActivities } from '@/content/activities';
import { committeeMembers as staticCommitteeMembers } from '@/content/committee';
import { events as staticEvents } from '@/content/events';
import { newsPosts as staticNewsPosts } from '@/content/news';
import {
  donationCategories as staticDonationCategories,
  appeals as staticAppeals,
} from '@/content/donations';
import { galleryAlbums as staticGalleryAlbums } from '@/content/gallery';
import type { PaginatedResult } from '@/types/pagination';
import type {
  Activity,
  Appeal,
  CheckoutSession,
  CommitteeMember,
  DonationCategory,
  DonationReceipt,
  DonationStatusResult,
  GalleryAlbum,
  HeroBanner,
  MyDonation,
  NavigationTree,
  NewsPost,
  PageContent,
  PublicDocument,
  PublicEvent,
  SiteSettings,
  SmsDeliveryStatus,
  SocialLink,
  SubscriptionSession,
  Testimonial,
} from '@/types/public';

/**
 * Separate, lighter Axios instance for the public site's read-only calls —
 * unlike `lib/api-client.ts` (the admin/auth client), these endpoints never
 * return 401, so the silent-refresh interceptor there would be dead weight.
 * Safe to call from both Server Components (direct `await`) and Client
 * Components (via TanStack Query). `withCredentials` is needed for the
 * donor-history cookie session (Phase 7) — every other call here is
 * unauthenticated and unaffected by it.
 */
export const publicApiClient = axios.create({
  baseURL: `${env.NEXT_PUBLIC_API_URL}/api/v1`,
  timeout: 15_000,
  withCredentials: true,
});

/** Plain, serializable error shape every `publicApiClient` call rejects
 * with — see the interceptor below for why this exists instead of the raw
 * `AxiosError`. `status`/`code` are primitives (safe across the Server
 * Component boundary) and let callers branch on the failure type (network
 * vs. 4xx vs. 5xx) instead of only ever seeing one generic message. */
export class ApiRequestError extends Error {
  readonly status?: number;
  readonly code?: string;

  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
  }
}

/** Next.js Server Components can only pass plain, serializable values down to
 * Client Component error boundaries (e.g. `app/error.tsx`) — an uncaught
 * `AxiosError` (which carries non-serializable fields like the Axios config's
 * `transformRequest` functions) crashes with a confusing secondary "Only
 * plain objects can be passed to Client Components" error that masks the
 * real failure (e.g. the backend being unreachable). Converting to a plain
 * `ApiRequestError` here keeps the message *and* the status/code intact and
 * serializable — earlier this only kept the message, which silently broke
 * every Client Component's `error.response?.data?.error?.message` read
 * (`.response` no longer existed) and left every mutation error falling back
 * to a generic "Something went wrong" instead of the real backend message. */
publicApiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const data = error.response?.data as
        { error?: { message?: string; code?: string } } | undefined;
      throw new ApiRequestError(
        data?.error?.message ?? error.message,
        error.response?.status,
        data?.error?.code,
      );
    }
    throw new ApiRequestError('Request failed');
  },
);

/** Every getter below branches on `isStaticExport` first: in the Hostinger
 * static build there is no reachable backend at visitor runtime, so these
 * return the `website/src/content/*` build-time snapshot instead of calling
 * the live API. Normal `standalone`/Docker mode is unaffected — the branch is
 * skipped entirely and behavior is unchanged. Function signatures are kept
 * identical so callers (every public page) don't need to change. */

export async function getSiteSettings(): Promise<SiteSettings> {
  if (isStaticExport) return staticSite.siteSettings;
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
  if (isStaticExport) return staticSite.pageContents[pageKey];
  const { data } = await publicApiClient.get<{ content: PageContent }>(
    `/page-content/public/${pageKey}`,
  );
  return data.content;
}

export async function getHeroBanners(): Promise<HeroBanner[]> {
  if (isStaticExport) return staticSite.heroBanners;
  const { data } = await publicApiClient.get<{ banners: HeroBanner[] }>('/hero-banners/public');
  return data.banners;
}

export async function getTestimonials(): Promise<Testimonial[]> {
  if (isStaticExport) return staticSite.testimonials;
  const { data } = await publicApiClient.get<{ testimonials: Testimonial[] }>(
    '/testimonials/public',
  );
  return data.testimonials;
}

export async function getActivities(): Promise<Activity[]> {
  if (isStaticExport) return staticActivities;
  const { data } = await publicApiClient.get<{ activities: Activity[] }>('/activities/public');
  return data.activities;
}

export async function getActivityBySlug(slug: string): Promise<Activity | null> {
  if (isStaticExport) return staticActivities.find((a) => a.slug === slug) ?? null;
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
  if (isStaticExport) return staticCommitteeMembers;
  const { data } = await publicApiClient.get<{ members: CommitteeMember[] }>('/committee/public');
  return data.members;
}

export async function getSocialLinks(): Promise<SocialLink[]> {
  if (isStaticExport) return staticSite.socialLinks;
  const { data } = await publicApiClient.get<{ links: SocialLink[] }>('/social-links/public');
  return data.links;
}

export async function getNavigation(): Promise<NavigationTree> {
  if (isStaticExport) return staticSite.navigation;
  const { data } = await publicApiClient.get<NavigationTree>('/navigation/public');
  return data;
}

export async function getDonationCategories(): Promise<DonationCategory[]> {
  if (isStaticExport) return staticDonationCategories;
  const { data } = await publicApiClient.get<{ categories: DonationCategory[] }>(
    '/donation-categories/public',
  );
  return data.categories;
}

export async function getAppeals(): Promise<Appeal[]> {
  if (isStaticExport) return staticAppeals;
  const { data } = await publicApiClient.get<{ appeals: Appeal[] }>('/appeals/public');
  return data.appeals;
}

export async function getPublicDocuments(category?: string): Promise<PublicDocument[]> {
  if (isStaticExport) {
    return category
      ? staticSite.documents.filter((d) => d.category === category)
      : staticSite.documents;
  }
  const { data } = await publicApiClient.get<{ data: PublicDocument[] }>('/documents/public', {
    params: category ? { category } : undefined,
  });
  return data.data;
}

export async function getPublicEvents(): Promise<PublicEvent[]> {
  if (isStaticExport) return staticEvents;
  const { data } = await publicApiClient.get<{ events: PublicEvent[] }>('/events/public');
  return data.events;
}

export async function getPublicEventBySlug(slug: string): Promise<PublicEvent | null> {
  if (isStaticExport) return staticEvents.find((e) => e.slug === slug) ?? null;
  try {
    const { data } = await publicApiClient.get<{ event: PublicEvent }>(`/events/public/${slug}`);
    return data.event;
  } catch {
    return null;
  }
}

export async function getPublicNewsPosts(category?: string): Promise<NewsPost[]> {
  if (isStaticExport) {
    return category ? staticNewsPosts.filter((p) => p.category === category) : staticNewsPosts;
  }
  const { data } = await publicApiClient.get<{ posts: NewsPost[] }>('/news/public', {
    params: category ? { category } : undefined,
  });
  return data.posts;
}

export async function getPublicNewsPostBySlug(slug: string): Promise<NewsPost | null> {
  if (isStaticExport) return staticNewsPosts.find((p) => p.slug === slug) ?? null;
  try {
    const { data } = await publicApiClient.get<{ post: NewsPost }>(`/news/public/${slug}`);
    return data.post;
  } catch {
    return null;
  }
}

export async function getGalleryAlbums(): Promise<GalleryAlbum[]> {
  if (isStaticExport) return staticGalleryAlbums;
  const { data } = await publicApiClient.get<{ albums: GalleryAlbum[] }>('/gallery/public');
  return data.albums;
}

export interface InitiateDonationPayload {
  donorName: string;
  donorPhone: string;
  donorEmail?: string;
  panNumber: string;
  aadhaarNumber: string;
  donorAddress?: string;
  donorCity?: string;
  donorPincode?: string;
  donorState?: string;
  categoryId: string;
  appealId?: string;
  amount: number;
  idempotencyKey: string;
}

export async function initiateDonation(payload: InitiateDonationPayload): Promise<CheckoutSession> {
  const { data } = await publicApiClient.post<{ data: CheckoutSession }>(
    '/donations/initiate',
    payload,
  );
  return data.data;
}

export interface VerifyDonationPayload {
  donationId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export async function verifyDonationPayment(payload: VerifyDonationPayload): Promise<{
  id: string;
  status: string;
  receiptNumber: string | null;
  receiptUrl: string | null;
  emailStatus: SmsDeliveryStatus | null;
  whatsappStatus: SmsDeliveryStatus | null;
  smsStatus: SmsDeliveryStatus | null;
}> {
  const { data } = await publicApiClient.post<{
    data: {
      id: string;
      status: string;
      receiptNumber: string | null;
      receiptUrl: string | null;
      emailStatus: SmsDeliveryStatus | null;
      whatsappStatus: SmsDeliveryStatus | null;
      smsStatus: SmsDeliveryStatus | null;
    };
  }>('/donations/verify', payload);
  return data.data;
}

export interface CreateSubscriptionPayload {
  donorName: string;
  donorPhone: string;
  donorEmail?: string;
  panNumber: string;
  aadhaarNumber: string;
  donorAddress?: string;
  donorCity?: string;
  donorPincode?: string;
  donorState?: string;
  categoryId: string;
  amount: number;
}

export async function createSubscription(
  payload: CreateSubscriptionPayload,
): Promise<SubscriptionSession> {
  const { data } = await publicApiClient.post<{ data: SubscriptionSession }>(
    '/donations/subscriptions',
    payload,
  );
  return data.data;
}

export interface VerifySubscriptionPayload {
  subscriptionRecordId: string;
  razorpayPaymentId: string;
  razorpaySubscriptionId: string;
  razorpaySignature: string;
}

export async function verifySubscription(
  payload: VerifySubscriptionPayload,
): Promise<{ id: string; status: string }> {
  const { data } = await publicApiClient.post<{ data: { id: string; status: string } }>(
    '/donations/subscriptions/verify',
    payload,
  );
  return data.data;
}

export async function retryDonationPayment(donationId: string): Promise<CheckoutSession> {
  const { data } = await publicApiClient.post<{ data: CheckoutSession }>(
    `/donations/${donationId}/retry`,
  );
  return data.data;
}

export async function getDonationStatus(
  donationId: string,
  token: string,
): Promise<DonationStatusResult> {
  const { data } = await publicApiClient.get<{ data: DonationStatusResult }>(
    `/donations/${donationId}/status`,
    { params: { token } },
  );
  return data.data;
}

export async function getDonationReceipt(
  donationId: string,
  token?: string,
): Promise<DonationReceipt> {
  const { data } = await publicApiClient.get<{ data: DonationReceipt }>(
    `/donations/${donationId}/receipt`,
    { params: token ? { token } : undefined },
  );
  return data.data;
}

export async function retryDonationSms(
  donationId: string,
  token?: string,
): Promise<{ smsStatus: SmsDeliveryStatus }> {
  const { data } = await publicApiClient.post<{ data: { smsStatus: SmsDeliveryStatus } }>(
    `/donations/${donationId}/retry-sms`,
    undefined,
    { params: token ? { token } : undefined },
  );
  return data.data;
}

export async function retryDonationEmail(
  donationId: string,
  token?: string,
): Promise<{ emailStatus: SmsDeliveryStatus }> {
  const { data } = await publicApiClient.post<{ data: { emailStatus: SmsDeliveryStatus } }>(
    `/donations/${donationId}/retry-email`,
    undefined,
    { params: token ? { token } : undefined },
  );
  return data.data;
}

export async function retryDonationWhatsApp(
  donationId: string,
  token?: string,
): Promise<{ whatsappStatus: SmsDeliveryStatus }> {
  const { data } = await publicApiClient.post<{ data: { whatsappStatus: SmsDeliveryStatus } }>(
    `/donations/${donationId}/retry-whatsapp`,
    undefined,
    { params: token ? { token } : undefined },
  );
  return data.data;
}

export async function retryFailedDeliveries(
  donationId: string,
  token?: string,
): Promise<{ emailStatus: SmsDeliveryStatus | null; whatsappStatus: SmsDeliveryStatus | null }> {
  const { data } = await publicApiClient.post<{
    data: { emailStatus: SmsDeliveryStatus | null; whatsappStatus: SmsDeliveryStatus | null };
  }>(`/donations/${donationId}/retry-deliveries`, undefined, {
    params: token ? { token } : undefined,
  });
  return data.data;
}

export async function requestDonorOtp(email: string): Promise<void> {
  await publicApiClient.post('/donor-auth/request-otp', { email });
}

export async function verifyDonorOtp(email: string, otp: string): Promise<void> {
  await publicApiClient.post('/donor-auth/verify-otp', { email, otp });
}

export async function donorLogout(): Promise<void> {
  await publicApiClient.post('/donor-auth/logout');
}

export async function getMyDonations(page: number, pageSize: number) {
  const { data } = await publicApiClient.get<PaginatedResult<MyDonation>>('/donors/me/donations', {
    params: { page, pageSize },
  });
  return data;
}
