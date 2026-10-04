'use client';

import { useTheme } from 'next-themes';
import { Moon, Sun, MonitorSmartphone } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/** Light / Dark / System toggle — see design/06-Design-System.md for the token pairs this switches between. */
export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoids a hydration mismatch: the real theme is only known client-side.
  useEffect(() => setMounted(true), []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="size-11 lg:size-8"
            aria-label="Toggle theme"
          >
            {mounted && theme === 'dark' ? (
              <Moon className="size-4" />
            ) : mounted && theme === 'light' ? (
              <Sun className="size-4" />
            ) : (
              <MonitorSmartphone className="size-4" />
            )}
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('light')}>
          <Sun className="mr-2 size-4" /> Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>
          <Moon className="mr-2 size-4" /> Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>
          <MonitorSmartphone className="mr-2 size-4" /> System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
