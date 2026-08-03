'use client';

import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { useState } from 'react';

import { Breadcrumb } from '@/components/shared/breadcrumb';
import { SidebarNav } from '@/components/admin/sidebar-nav';
import { ProfileMenu } from '@/components/admin/profile-menu';
import { ThemeSwitcher } from '@/components/admin/theme-switcher';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
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
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 flex h-16 items-center gap-3 border-b px-4 backdrop-blur">
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetTrigger
          render={
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
              <Menu className="size-5" />
            </Button>
          }
        />
        <SheetContent side="left" className="w-64 p-0">
          <SheetHeader className="border-b px-4 py-4">
            <SheetTitle className="text-sm">Sai Yadadri Seva Ashram</SheetTitle>
          </SheetHeader>
          <SidebarNav onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <Breadcrumb items={[{ label: 'Dashboard', href: '/admin' }, { label: pageLabel }]} />

      <div className="ml-auto flex items-center gap-2">
        <ThemeSwitcher />
        <ProfileMenu />
      </div>
    </header>
  );
}
