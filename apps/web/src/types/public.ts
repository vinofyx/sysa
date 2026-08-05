/** Shared response shapes for the public (unauthenticated) API surface —
 * centralized here (unlike the admin pattern of per-page local interfaces)
 * since Phase 6 reuses these same shapes across dozens of public pages. */

export interface SiteSettings {
  siteNameEn: string;
  siteNameTe: string | null;
  taglineEn: string | null;
  taglineTe: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  contactAddressEn: string | null;
  contactAddressTe: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  contactHoursEn: string | null;
  whatsappNumber: string | null;
  mapLatitude: string | null;
  mapLongitude: string | null;
  defaultMetaTitle: string | null;
  defaultMetaDescription: string | null;
  defaultOgImageUrl: string | null;
  footerTextEn: string | null;
  footerTextTe: string | null;
  copyrightText: string | null;
  maintenanceMode: boolean;
  bankAccountName: string | null;
  bankAccountNumber: string | null;
  bankIfscCode: string | null;
  bankName: string | null;
  bankBranch: string | null;
  upiId: string | null;
  upiQrImageUrl: string | null;
}

export interface PageContent {
  pageKey: string;
  blocksEn: Record<string, unknown>;
  blocksTe: Record<string, unknown> | null;
  updatedAt: string | null;
}

export interface HeroBanner {
  id: string;
  titleEn: string;
  titleTe: string | null;
  subtitleEn: string | null;
  subtitleTe: string | null;
  imageUrl: string;
  ctaLabelEn: string | null;
  ctaLabelTe: string | null;
  ctaUrl: string | null;
  displayOrder: number;
}

export interface Testimonial {
  id: string;
  authorName: string;
  authorRole: string | null;
  quoteEn: string;
  quoteTe: string | null;
  photoUrl: string | null;
  displayOrder: number;
}

export interface DonationCategoryRef {
  id: string;
  code: string;
  nameEn: string;
  nameTe: string | null;
}

export interface Activity {
  id: string;
  slug: string;
  titleEn: string;
  titleTe: string | null;
  descriptionEn: string | null;
  descriptionTe: string | null;
  iconOrImageUrl: string | null;
  linkedCategoryId: string | null;
  linkedCategory: DonationCategoryRef | null;
  displayOrder: number;
}

export interface CommitteeMember {
  id: string;
  name: string;
  designation: string;
  photoUrl: string | null;
  bioEn: string | null;
  bioTe: string | null;
  mobile: string | null;
  displayOrder: number;
}

export type SocialPlatform =
  'facebook' | 'instagram' | 'twitter' | 'youtube' | 'linkedin' | 'whatsapp';

export interface SocialLink {
  id: string;
  platform: SocialPlatform;
  url: string;
  displayOrder: number;
}

export interface NavItem {
  id: string;
  labelEn: string;
  labelTe: string | null;
  url: string;
  parentId: string | null;
  displayOrder: number;
  children: NavItem[];
}

export interface NavigationTree {
  header: NavItem[];
  footer: NavItem[];
}

export interface DonationCategory {
  id: string;
  code: string;
  nameEn: string;
  nameTe: string | null;
  descriptionEn: string | null;
  descriptionTe: string | null;
  hasPresetTiers: boolean;
}

export interface Appeal {
  id: string;
  titleEn: string;
  titleTe: string | null;
  descriptionEn: string | null;
  descriptionTe: string | null;
  targetAmount: string;
  raisedAmountCache: string;
  startDate: string | null;
  endDate: string | null;
  status: 'active' | 'completed' | 'archived';
  category: DonationCategoryRef;
}

export interface PublicDocument {
  id: string;
  category: string;
  titleEn: string;
  fileUrl: string;
  publishedDate: string | null;
}

export type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed';

export interface EventCategory {
  id: string;
  nameEn: string;
  nameTe: string | null;
  slug: string;
}

export interface PublicEvent {
  id: string;
  categoryId: string | null;
  category: EventCategory | null;
  titleEn: string;
  titleTe: string | null;
  descriptionEn: string | null;
  descriptionTe: string | null;
  slug: string;
  startDate: string;
  endDate: string | null;
  location: string | null;
  capacity: number | null;
  registrationDeadline: string | null;
  featuredImageUrl: string | null;
  status: EventStatus;
  metaTitleEn: string | null;
  metaDescriptionEn: string | null;
  _count?: { registrations: number };
}

export type PostStatus = 'draft' | 'published' | 'archived';

export interface NewsPost {
  id: string;
  titleEn: string;
  titleTe: string | null;
  bodyEn: string | null;
  bodyTe: string | null;
  slug: string;
  publishedAt: string | null;
  status: PostStatus;
  featuredImageUrl: string | null;
  category: string | null;
  tags: string[];
  metaTitleEn: string | null;
  metaDescriptionEn: string | null;
}

export type MediaType = 'image' | 'video';

export interface GalleryItem {
  id: string;
  mediaType: MediaType;
  mediaUrl: string;
  altTextEn: string | null;
  altTextTe: string | null;
  displayOrder: number;
}

export interface GalleryAlbum {
  id: string;
  nameEn: string;
  nameTe: string | null;
  category: string | null;
  displayOrder: number;
  items: GalleryItem[];
}

export interface CheckoutSession {
  donationId: string;
  razorpayOrderId: string;
  amount: number;
  currency: string;
  keyId: string;
  statusToken: string;
}

export type DonationPaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface DonationStatusResult {
  id: string;
  status: DonationPaymentStatus;
  amount: number;
  currency: string;
  category: string;
  failureReason: string | null;
  receiptAvailable: boolean;
  razorpayOrderId: string | null;
}

export interface DonationReceipt {
  receiptNumber: string;
  pdfUrl: string;
}

export interface MyDonation {
  id: string;
  amount: string;
  currency: string;
  status: DonationPaymentStatus;
  paymentMethod: string | null;
  frequency: 'one_time' | 'monthly';
  createdAt: string;
  completedAt: string | null;
  category: { nameEn: string };
  appeal: { titleEn: string } | null;
  receiptAvailable: boolean;
  receiptToken: string | null;
}
