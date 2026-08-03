'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { adminNavGroups } from '@/lib/admin-nav';
import { useMe } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

/**
 * The admin nav itself — rendered inside both the persistent desktop sidebar
 * and the mobile Sheet drawer (see admin-sidebar.tsx), so it's factored out as
 * its own component rather than duplicated. Items are gated by permission
 * (hidden, not just disabled) — this is a UX nicety only; the backend enforces
 * every permission on every request regardless. Groups that end up with zero
 * visible items (e.g. a narrowly-scoped custom role) are hidden entirely.
 */
export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { data: user } = useMe();

  const visibleGroups = adminNavGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !item.permission || user?.permissions.includes(item.permission),
      ),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <nav className="flex flex-col gap-6 px-2 py-4">
      {visibleGroups.map((group) => (
        <div key={group.label} className="flex flex-col gap-1">
          <span className="text-muted-foreground px-3 text-xs font-semibold tracking-wide uppercase">
            {group.label}
          </span>
          {group.items.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-muted',
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
