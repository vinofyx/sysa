import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Home,
  BookOpen,
  Contact,
  HeartHandshake,
  Building2,
  MessageSquareQuote,
  Image as ImageIcon,
  Menu,
  Share2,
  Newspaper,
  Images,
  Wallet,
  Landmark,
  Target,
  Banknote,
  BarChart3,
  Users,
  ClipboardList,
  CalendarDays,
  CalendarCheck,
  FolderOpen,
  UserCog,
  ShieldCheck,
  KeyRound,
  Settings,
} from 'lucide-react';

export interface AdminNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Permission code required to see this item; undefined = always available. */
  permission?: string;
}

export interface AdminNavGroup {
  label: string;
  items: AdminNavItem[];
}

/**
 * Grouped by job function (Content / Finance / Engagement / Documents / System),
 * matching design/01-Information-Architecture.md §6. Every item below now has a
 * real page behind it (Phase 5) — visibility is gated purely by `permission`
 * (checked against the caller's session in sidebar-nav.tsx), no more
 * `comingSoon` placeholders.
 */
export const adminNavGroups: AdminNavGroup[] = [
  {
    label: 'Overview',
    items: [{ label: 'Dashboard', href: '/admin', icon: LayoutDashboard }],
  },
  {
    label: 'Content',
    items: [
      {
        label: 'Home Content',
        href: '/admin/content/home',
        icon: Home,
        permission: 'content:view',
      },
      {
        label: 'About Ashram',
        href: '/admin/content/about',
        icon: BookOpen,
        permission: 'content:view',
      },
      {
        label: 'Contact Page',
        href: '/admin/content/contact',
        icon: Contact,
        permission: 'content:view',
      },
      {
        label: 'Activities & Services',
        href: '/admin/content/activities',
        icon: HeartHandshake,
        permission: 'activities:view',
      },
      {
        label: 'Managing Committee',
        href: '/admin/content/committee',
        icon: Building2,
        permission: 'committee:view',
      },
      {
        label: 'Testimonials',
        href: '/admin/content/testimonials',
        icon: MessageSquareQuote,
        permission: 'testimonials:view',
      },
      {
        label: 'Hero Banners',
        href: '/admin/content/hero-banners',
        icon: ImageIcon,
        permission: 'banners:view',
      },
      {
        label: 'Navigation Menus',
        href: '/admin/content/navigation',
        icon: Menu,
        permission: 'navigation:view',
      },
      {
        label: 'Social Links',
        href: '/admin/content/social-links',
        icon: Share2,
        permission: 'social_links:view',
      },
      { label: 'News', href: '/admin/news', icon: Newspaper, permission: 'news:view' },
      { label: 'Gallery', href: '/admin/gallery', icon: Images, permission: 'gallery:view' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { label: 'Donations', href: '/admin/donations', icon: Wallet, permission: 'donations:view' },
      {
        label: 'Donation Categories',
        href: '/admin/donations/categories',
        icon: Landmark,
        permission: 'donations:view',
      },
      {
        label: 'Donation Campaigns',
        href: '/admin/donations/campaigns',
        icon: Target,
        permission: 'appeals:view',
      },
      {
        label: 'Bank Transfers',
        href: '/admin/donations/bank-transfers',
        icon: Banknote,
        permission: 'bank_transfers:view',
      },
      { label: 'Reports', href: '/admin/reports', icon: BarChart3, permission: 'donations:view' },
    ],
  },
  {
    label: 'Engagement',
    items: [
      {
        label: 'Volunteers',
        href: '/admin/volunteers',
        icon: Users,
        permission: 'volunteers:view',
      },
      {
        label: 'Volunteer Assignments',
        href: '/admin/volunteers/assignments',
        icon: ClipboardList,
        permission: 'volunteer_assignments:view',
      },
      { label: 'Events', href: '/admin/events', icon: CalendarDays, permission: 'events:view' },
      {
        label: 'Event Registrations',
        href: '/admin/events/registrations',
        icon: CalendarCheck,
        permission: 'event_registrations:view',
      },
    ],
  },
  {
    label: 'Documents',
    items: [
      {
        label: 'Documents',
        href: '/admin/documents',
        icon: FolderOpen,
        permission: 'documents:view',
      },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Users', href: '/admin/users', icon: UserCog, permission: 'users:view' },
      {
        label: 'Roles & Permissions',
        href: '/admin/roles',
        icon: ShieldCheck,
        permission: 'roles:view',
      },
      {
        label: 'Permissions',
        href: '/admin/permissions',
        icon: KeyRound,
        permission: 'permissions:view',
      },
      { label: 'Settings', href: '/admin/settings', icon: Settings },
    ],
  },
];
