'use client';

import * as React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Menu } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { PremiumButton } from '@/components/public/premium-button';
import { ThemeToggle } from '@/components/public/theme-toggle';
import { resolveNavLabel } from '@/lib/nav-labels';
import type { NavItem } from '@/types/public';

export function MobileMenu({ items }: { items: NavItem[] }) {
  const locale = useLocale();
  const t = useTranslations('Nav');
  const tCommon = useTranslations('Common');
  const [open, setOpen] = React.useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={<Button variant="ghost" size="icon" aria-label={t('menu')} className="xl:hidden" />}
      >
        <Menu />
      </SheetTrigger>
      <SheetContent side="right" className="w-72">
        <SheetHeader>
          <SheetTitle>{t('menu')}</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 px-4">
          {items.map((item) => (
            <SheetClose
              key={item.id}
              nativeButton={false}
              render={
                <Link
                  href={item.url}
                  className="hover:bg-pub-gold-100 dark:hover:bg-pub-gold-800/20 hover:text-pub-gold-700 dark:hover:text-pub-gold-300 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
                />
              }
            >
              {resolveNavLabel(item, locale, t)}
            </SheetClose>
          ))}
        </nav>
        <div className="mt-2 px-4">
          <SheetClose
            nativeButton={false}
            render={
              <PremiumButton render={<Link href="/donate#online-donation" />} className="w-full" />
            }
          >
            {tCommon('donateNow')}
          </SheetClose>
        </div>
        <div className="mt-auto flex items-center justify-end px-4 pb-4">
          <ThemeToggle />
        </div>
      </SheetContent>
    </Sheet>
  );
}
