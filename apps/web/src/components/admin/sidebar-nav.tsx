'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';

import { adminNavGroups } from '@/lib/admin-nav';
import { useMe } from '@/hooks/use-auth';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { cn } from '@/lib/utils';

/**
 * The admin nav itself — rendered inside both the persistent desktop sidebar
 * and the mobile Sheet drawer (see admin-sidebar.tsx / admin-header.tsx), so
 * it's factored out as its own component rather than duplicated. Items are
 * gated by permission (hidden, not just disabled) — this is a UX nicety
 * only; the backend enforces every permission on every request regardless.
 * Groups that end up with zero visible items (e.g. a narrowly-scoped custom
 * role) are hidden entirely.
 */
export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
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
    <nav className="flex flex-col gap-7 px-4 py-6">
      {visibleGroups.map((group, groupIndex) => (
        <motion.div
          key={group.label}
          initial={reducedMotion ? false : { opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, delay: groupIndex * 0.05, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col gap-1.5"
        >
          <div className="mb-2 flex flex-col gap-2 px-2.5">
            <span className="text-admin-gold-500 text-[11px] font-bold tracking-[0.15em] uppercase">
              {group.label}
            </span>
            <span className="h-px w-full bg-gradient-to-r from-white/10 via-white/5 to-transparent" />
          </div>

          {group.items.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'group focus-visible:ring-admin-gold-500 focus-visible:ring-offset-admin-sidebar relative flex h-[52px] items-center gap-3 rounded-[14px] px-3.5 text-sm transition-all duration-300 ease-out focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
                  isActive
                    ? 'text-admin-text font-semibold'
                    : 'text-admin-muted hover:text-admin-text hover:translate-x-1.5',
                )}
              >
                {isActive ? (
                  <motion.span
                    layoutId="admin-nav-active"
                    transition={
                      reducedMotion
                        ? { duration: 0 }
                        : { type: 'spring', stiffness: 380, damping: 32 }
                    }
                    className="admin-glass border-admin-border shadow-admin-md absolute inset-0 rounded-[14px] border"
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
                      ? 'text-admin-gold-500 drop-shadow-[0_0_6px_rgba(200,155,60,0.55)]'
                      : 'group-hover:text-admin-emerald-500',
                  )}
                  strokeWidth={2}
                />
                <span className="relative truncate">{item.label}</span>
              </Link>
            );
          })}
        </motion.div>
      ))}
    </nav>
  );
}
