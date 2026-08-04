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
import { LanguageSwitcher } from '@/components/public/language-switcher';
import type { NavItem } from '@/types/public';

export function MobileMenu({ items }: { items: NavItem[] }) {
  const locale = useLocale();
  const t = useTranslations('Nav');
  const [open, setOpen] = React.useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={<Button variant="ghost" size="icon" aria-label={t('menu')} className="lg:hidden" />}
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
              render={
                <Link
                  href={item.url}
                  className="hover:bg-pub-primary-100 rounded-lg px-3 py-2.5 text-sm font-medium"
                />
              }
            >
              {locale === 'te' && item.labelTe ? item.labelTe : item.labelEn}
            </SheetClose>
          ))}
        </nav>
        <div className="mt-auto flex items-center justify-between px-4 pb-4">
          <LanguageSwitcher />
        </div>
      </SheetContent>
    </Sheet>
  );
}
