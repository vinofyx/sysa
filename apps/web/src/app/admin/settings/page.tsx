'use client';

import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const THEME_OPTIONS = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
] as const;

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Preferences for your account and this device.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Choose how the admin dashboard looks on this device.</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          {THEME_OPTIONS.map((option) => (
            <Button
              key={option.value}
              variant={mounted && theme === option.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTheme(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account security</CardTitle>
          <CardDescription>Password and active session management.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" render={<Link href="/admin/profile#security" />}>
            Manage on Profile page
          </Button>
        </CardContent>
      </Card>

      <Card className={cn('border-dashed')}>
        <CardHeader>
          <CardTitle className="text-muted-foreground">More settings coming soon</CardTitle>
          <CardDescription>
            Notification recipients, payment gateway configuration, and SEO defaults (see
            documentation/09-Admin-Modules.md §16) are added alongside their respective business
            modules.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
