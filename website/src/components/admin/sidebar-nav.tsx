'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';

import { adminNavGroups } from '@/lib/admin-nav';
import { useMe } from '@/hooks/use-auth';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * The admin nav itself — rendered inside the persistent desktop sidebar, the
 * tablet icon rail, and the mobile Sheet drawer (see admin-sidebar.tsx /
 * admin-header.tsx), so it's factored out as its own component rather than
 * duplicated. Items are gated by permission (hidden, not just disabled) —
 * this is a UX nicety only; the backend enforces every permission on every
 * request regardless. Groups that end up with zero visible items (e.g. a
 * narrowly-scoped custom role) are hidden entirely.
 *
 * `collapsed` renders the tablet icon-only rail variant (see
 * `admin-sidebar.tsx`'s `AdminSidebarRail`) — same data, same active/hover
 * logic, just icon-centered rows with a tooltip standing in for the label.
 */
export function SidebarNav({
  onNavigate,
  collapsed = false,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const { data: user } = useMe();
  const reducedMotion = useReducedMotion();

  const visibleGroups = adminNavGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !item.permission || user?.permissions.includes(item.permission),
      ),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <nav className={cn('flex flex-col gap-7 py-6', collapsed ? 'px-2' : 'px-4')}>
      {visibleGroups.map((group, groupIndex) => (
        <motion.div
          key={group.label}
          initial={reducedMotion ? false : { opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, delay: groupIndex * 0.05, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col gap-1.5"
        >
          <div className={cn('mb-2 flex flex-col gap-2', collapsed ? 'px-0.5' : 'px-2.5')}>
            {collapsed ? (
              <span className="from-admin-border via-admin-border/50 h-px w-full bg-gradient-to-r to-transparent" />
            ) : (
              <>
                <span className="text-admin-label text-[11px] font-bold tracking-[0.15em] uppercase">
                  {group.label}
                </span>
                <span className="from-admin-border via-admin-border/50 h-px w-full bg-gradient-to-r to-transparent" />
              </>
            )}
          </div>

          {group.items.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            const link = (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'group focus-visible:ring-admin-gold-500 focus-visible:ring-offset-admin-sidebar relative flex h-[52px] items-center gap-3 rounded-[14px] text-sm transition-all duration-300 ease-out focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
                  collapsed ? 'w-[52px] justify-center' : 'px-3.5',
                  isActive
                    ? 'text-admin-active-text font-semibold'
                    : cn(
                        'text-admin-muted hover:text-admin-active-text',
                        !collapsed && 'hover:translate-x-1.5',
                      ),
                )}
              >
                {isActive ? (
                  <motion.span
                    layoutId={collapsed ? 'admin-nav-active-rail' : 'admin-nav-active'}
                    transition={
                      reducedMotion
                        ? { duration: 0 }
                        : { type: 'spring', stiffness: 380, damping: 32 }
                    }
                    className="admin-nav-active border-admin-border shadow-admin-md absolute inset-0 rounded-[14px] border"
                  />
                ) : (
                  <span
                    aria-hidden
                    className="admin-gradient-emerald shadow-admin-md pointer-events-none absolute inset-0 rounded-[14px] opacity-0 transition-opacity duration-300 group-hover:opacity-15"
                  />
                )}
                {isActive && (
                  <span
                    aria-hidden
                    className="bg-admin-gold-500 shadow-admin-glow-gold absolute inset-y-2.5 left-0 w-[3px] rounded-full"
                  />
                )}
                <Icon
                  className={cn(
                    'relative size-5 shrink-0 transition-colors duration-300',
                    isActive
                      ? 'text-admin-active-icon drop-shadow-admin-glow-icon'
                      : 'admin-nav-icon',
                  )}
                  strokeWidth={2}
                />
                <span className={cn('relative truncate', collapsed && 'sr-only')}>
                  {item.label}
                </span>
              </Link>
            );

            if (!collapsed) return link;

            return (
              <Tooltip key={item.href}>
                <TooltipTrigger render={link} />
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            );
          })}
        </motion.div>
      ))}
    </nav>
  );
}
