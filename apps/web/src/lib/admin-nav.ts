import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  FileText,
  Wallet,
  Users,
  CalendarDays,
  Image as ImageIcon,
  BarChart3,
  ShieldCheck,
  Settings,
  UserCog,
} from 'lucide-react';

export interface AdminNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Permission code required to see this item as active; undefined = always available. */
  permission?: string;
  /** Business modules not yet built (Phase 5/6+) render disabled with a "Soon" badge. */
  comingSoon?: boolean;
}

export interface AdminNavGroup {
  label: string;
  items: AdminNavItem[];
}

/**
 * Grouped by job function (Content / Finance / Engagement / System), matching
 * design/01-Information-Architecture.md §6 — each seeded role in
 * apps/api/prisma/seed.ts naturally lands in one group. Business-module items
 * are listed (so the shell reads as complete) but marked `comingSoon` until
 * their routes/pages ship in the feature-development phase — see
 * DEVELOPMENT_PROGRESS.md.
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
        label: 'Pages',
        href: '/admin/content',
        icon: FileText,
        permission: 'content:view',
        comingSoon: true,
      },
      {
        label: 'Events & News',
        href: '/admin/events',
        icon: CalendarDays,
        permission: 'events:view',
        comingSoon: true,
      },
      {
        label: 'Gallery',
        href: '/admin/gallery',
        icon: ImageIcon,
        permission: 'gallery:view',
        comingSoon: true,
      },
    ],
  },
  {
    label: 'Finance',
    items: [
      {
        label: 'Donations',
        href: '/admin/donations',
        icon: Wallet,
        permission: 'donations:view',
        comingSoon: true,
      },
      {
        label: 'Reports',
        href: '/admin/reports',
        icon: BarChart3,
        permission: 'reports:generate',
        comingSoon: true,
      },
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
        comingSoon: true,
      },
    ],
  },
  {
    label: 'System',
    items: [
      {
        label: 'Users',
        href: '/admin/users',
        icon: UserCog,
        permission: 'users:view',
        comingSoon: true,
      },
      {
        label: 'Roles & Permissions',
        href: '/admin/roles',
        icon: ShieldCheck,
        permission: 'roles:view',
        comingSoon: true,
      },
      { label: 'Settings', href: '/admin/settings', icon: Settings },
    ],
  },
];
