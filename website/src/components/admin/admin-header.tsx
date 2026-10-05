'use client';

import { usePathname } from 'next/navigation';
import { Menu, ShieldCheck, XIcon } from 'lucide-react';
import { useState } from 'react';

import { Breadcrumb } from '@/components/shared/breadcrumb';
import { SidebarNav } from '@/components/admin/sidebar-nav';
import { ProfileMenu } from '@/components/admin/profile-menu';
import { ThemeSwitcher } from '@/components/admin/theme-switcher';
import { Button } from '@/components/ui/button';
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { adminNavGroups } from '@/lib/admin-nav';

function currentPageLabel(pathname: string): string {
  for (const group of adminNavGroups) {
    const match = group.items.find((item) => item.href === pathname);
    if (match) return match.label;
  }
  return 'Dashboard';
}

export function AdminHeader() {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pageLabel = currentPageLabel(pathname);

  return (
    <header className="admin-topbar admin-glass border-admin-border shadow-admin-md sticky top-0 z-10 flex h-16 items-center gap-3 border-b px-4 lg:h-20 lg:px-6">
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="size-11 lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="size-5" />
            </Button>
          }
        />
        <SheetContent
          side="left"
          showCloseButton={false}
          className="admin-gradient-sidebar border-admin-border text-admin-text w-[min(88vw,320px)] border-r p-0 data-[side=left]:w-[min(88vw,320px)]"
        >
          <div className="border-admin-border relative flex h-20 shrink-0 items-center border-b px-5">
            <span className="admin-gradient-emerald shadow-admin-glow-emerald flex size-11 shrink-0 items-center justify-center rounded-full ring-1 ring-white/10">
              <ShieldCheck className="text-admin-gold-300 size-5" strokeWidth={2} />
            </span>
            <div className="ml-3 flex min-w-0 flex-col">
              <SheetTitle className="font-admin-heading text-admin-text truncate text-base leading-tight font-semibold tracking-tight">
                Sai Yadadri Seva Ashram
              </SheetTitle>
              <span className="text-admin-label text-[11px] font-semibold tracking-[0.15em] uppercase">
                Administration Portal
              </span>
            </div>
            <SheetClose
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-admin-muted hover:text-admin-text hover:bg-admin-border absolute top-3 right-3 size-11"
                  aria-label="Close menu"
                />
              }
            >
              <XIcon className="size-4" />
              <span className="sr-only">Close menu</span>
            </SheetClose>
          </div>
          <div className="admin-scroll flex-1 overflow-y-auto overscroll-contain">
            <SidebarNav onNavigate={() => setMobileNavOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <Breadcrumb
        items={
          pathname === '/admin'
            ? [{ label: 'Dashboard' }]
            : [{ label: 'Dashboard', href: '/admin' }, { label: pageLabel }]
        }
      />

      <div className="ml-auto flex items-center gap-2">
        <ThemeSwitcher />
        <ProfileMenu />
      </div>
    </header>
  );
}
