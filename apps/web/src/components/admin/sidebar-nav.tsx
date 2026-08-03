'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { adminNavGroups } from '@/lib/admin-nav';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/**
 * The admin nav itself — rendered inside both the persistent desktop sidebar
 * and the mobile Sheet drawer (see admin-sidebar.tsx), so it's factored out as
 * its own component rather than duplicated.
 */
export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-6 px-2 py-4">
      {adminNavGroups.map((group) => (
        <div key={group.label} className="flex flex-col gap-1">
          <span className="text-muted-foreground px-3 text-xs font-semibold tracking-wide uppercase">
            {group.label}
          </span>
          {group.items.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            if (item.comingSoon) {
              return (
                <span
                  key={item.href}
                  aria-disabled="true"
                  className="text-muted-foreground/60 flex cursor-not-allowed items-center gap-3 rounded-md px-3 py-2 text-sm"
                  title="Coming soon"
                >
                  <Icon className="size-4" />
                  <span className="flex-1">{item.label}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    Soon
                  </Badge>
                </span>
              );
            }

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
